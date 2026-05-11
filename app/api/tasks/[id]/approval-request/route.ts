import { NextRequest, NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

function canRequestTaskApproval(task: { assigneeId: string | null; creatorId: string }, userId: string) {
  return task.creatorId === userId;
}

function buildTaskInclude() {
  return {
    id: true,
    title: true,
    status: true,
    progress: true,
    requiresApproval: true,
    isApprovalRequested: true,
    approvedBy: true,
    approvedAt: true,
    rejectedReason: true,
    assigneeId: true,
    creatorId: true,
    projectId: true,
    assignee: { select: { id: true, name: true, image: true } },
    creator: { select: { id: true, name: true } },
    project: { select: { id: true, name: true, color: true, workspaceId: true } },
    tags: { select: { id: true, name: true, color: true } },
  };
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  if (!workspaceId) {
    return NextResponse.json(
      { error: "워크스페이스 정보를 확인하지 못했습니다." },
      { status: 400 }
    );
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      select: buildTaskInclude(),
    });

    if (!task) {
      return NextResponse.json({ error: "업무를 찾을 수 없습니다." }, { status: 404 });
    }

    if (task.project.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (!canRequestTaskApproval(task, session.user.id)) {
      return NextResponse.json({ error: "확인 요청 권한이 없습니다." }, { status: 403 });
    }

    if (task.status === TaskStatus.DONE) {
      return NextResponse.json({ error: "이미 완료된 업무입니다." }, { status: 400 });
    }

    if (
      task.status === TaskStatus.IN_REVIEW &&
      (task.requiresApproval || task.isApprovalRequested)
    ) {
      return NextResponse.json(
        { error: "이미 확인 요청이 진행 중입니다." },
        { status: 409 }
      );
    }

    const reviewers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        role: { in: ["OWNER", "ADMIN"] },
        userId: { not: session.user.id },
      },
      select: { userId: true },
    });

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: TaskStatus.IN_REVIEW,
        progress: Math.min(task.progress ?? 0, 99),
        requiresApproval: true,
        isApprovalRequested: true,
        approvedBy: null,
        approvedAt: null,
        rejectedReason: null,
      },
      select: buildTaskInclude(),
    });

    if (reviewers.length > 0) {
      try {
        await prisma.notification.createMany({
          data: reviewers.map((reviewer) => ({
            userId: reviewer.userId,
            type: "TASK_APPROVAL_REQUEST",
            title: "업무 확인 요청",
            body: `${task.title} 확인 요청이 도착했어요.`,
            link: `/projects/${task.projectId}?taskId=${task.id}`,
          })),
        });
      } catch (notificationError) {
        console.error("[TASK APPROVAL REQUEST][NOTIFICATION]", notificationError);
      }
    }

    return NextResponse.json({
      task: {
        ...updated,
        isApprovalRequested: true,
        approvedBy: null,
        approvedAt: null,
        rejectedReason: null,
        project: {
          id: updated.project.id,
          name: updated.project.name,
          color: updated.project.color,
        },
      },
    });
  } catch (error) {
    console.error("[TASK APPROVAL REQUEST]", error);
    return NextResponse.json({ error: "확인 요청을 보내지 못했습니다." }, { status: 500 });
  }
}
