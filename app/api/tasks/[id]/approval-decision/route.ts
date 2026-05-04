import { NextRequest, NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function isReviewerRole(role?: string | null) {
  return role === "OWNER" || role === "ADMIN";
}

function buildTaskInclude() {
  return {
    id: true,
    title: true,
    status: true,
    progress: true,
    requiresApproval: true,
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
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "워크스페이스 정보가 없습니다." }, { status: 400 });
  }

  if (!isReviewerRole(session.user.role)) {
    return NextResponse.json({ error: "확인 처리 권한이 없습니다." }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      decision?: string;
      reason?: string;
    };
    const decision = body.decision === "REJECT" ? "REJECT" : "APPROVE";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

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

    const targetUserId = task.assigneeId || task.creatorId;
    const updated = await prisma.$transaction(async (tx) => {
      const nextTask = await tx.task.update({
        where: { id: task.id },
        data:
          decision === "APPROVE"
            ? {
                status: TaskStatus.DONE,
                progress: 100,
                requiresApproval: false,
              }
            : {
                status: TaskStatus.IN_PROGRESS,
                progress: Math.min(task.progress ?? 0, 99),
                requiresApproval: false,
              },
        select: buildTaskInclude(),
      });

      if (targetUserId && targetUserId !== session.user.id) {
        await tx.notification.create({
          data: {
            userId: targetUserId,
            type: "APPROVAL_RESULT",
            title: decision === "APPROVE" ? "확인 완료되었습니다" : "수정 요청이 전달되었습니다",
            body:
              decision === "APPROVE"
                ? `${task.title} 확인이 완료되었어요.`
                : `${task.title} 수정 요청이 도착했어요.${reason ? ` ${reason}` : ""}`,
            link: `/projects/${task.projectId}?taskId=${task.id}`,
          },
        });
      }

      return nextTask;
    });

    return NextResponse.json({
      task: {
        ...updated,
        isApprovalRequested: false,
        approvedBy: decision === "APPROVE" ? session.user.id : null,
        approvedAt: decision === "APPROVE" ? new Date() : null,
        rejectedReason: decision === "REJECT" ? reason || null : null,
        project: {
          id: updated.project.id,
          name: updated.project.name,
          color: updated.project.color,
        },
      },
    });
  } catch (error) {
    console.error("[TASK APPROVAL DECISION]", error);
    return NextResponse.json({ error: "확인 처리를 완료하지 못했습니다." }, { status: 500 });
  }
}
