import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "OWNER";
}

export async function GET(
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
      { error: "워크스페이스를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const approval = await prisma.approval.findUnique({
    where: { id: params.id },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          image: true,
          members: {
            where: { workspaceId },
            select: { workspaceId: true },
            take: 1,
          },
        },
      },
      decider: {
        select: { id: true, name: true, image: true },
      },
      task: {
        select: { id: true, title: true },
      },
      event: {
        select: { id: true, title: true },
      },
    },
  });

  if (!approval || approval.requester.members.length === 0) {
    return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
  }

  const canView =
    isAdminRole(session.user.role) || approval.requesterId === session.user.id;

  if (!canView) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  return NextResponse.json({
    approval: {
      id: approval.id,
      type: approval.type,
      title: approval.title,
      description: approval.description,
      status: approval.status,
      decidedAt: approval.decidedAt?.toISOString() ?? null,
      decisionNote: approval.decisionNote,
      createdAt: approval.createdAt.toISOString(),
      requesterId: approval.requesterId,
      deciderId: approval.deciderId,
      leaveType: approval.leaveType,
      leaveStart: approval.leaveStart?.toISOString() ?? null,
      leaveEnd: approval.leaveEnd?.toISOString() ?? null,
      requester: {
        id: approval.requester.id,
        name: approval.requester.name,
        image: approval.requester.image,
      },
      decider: approval.decider
        ? {
            id: approval.decider.id,
            name: approval.decider.name,
            image: approval.decider.image,
          }
        : null,
      task: approval.task,
      event: approval.event,
      document: null,
    },
  });
}
