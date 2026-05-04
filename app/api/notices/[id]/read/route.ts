import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";
import { isAdminRole, serializeNotice } from "../../_helpers";

export async function PATCH(
  _req: Request,
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

  const memberCount = await prisma.workspaceMember.count({
    where: { workspaceId },
  });

  const notice = await prisma.notice.findFirst({
    where: {
      id: params.id,
      workspaceId,
    },
    include: {
      author: {
        select: { name: true },
      },
      reads: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { readAt: "asc" },
      },
    },
  });

  if (!notice) {
    return NextResponse.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
  }

  if (notice.authorId !== session.user.id) {
    await prisma.noticeRead.upsert({
      where: {
        noticeId_userId: {
          noticeId: notice.id,
          userId: session.user.id,
        },
      },
      create: {
        noticeId: notice.id,
        userId: session.user.id,
      },
      update: {
        readAt: new Date(),
      },
    });
  }

  const updatedNotice = await prisma.notice.findFirst({
    where: {
      id: notice.id,
      workspaceId,
    },
    include: {
      author: {
        select: { name: true },
      },
      reads: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { readAt: "asc" },
      },
    },
  });

  if (!updatedNotice) {
    return NextResponse.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    notice: serializeNotice(updatedNotice, {
      currentUserId: session.user.id,
      canManage: isAdminRole(session.user.role),
      targetMemberCount: Math.max(memberCount - 1, 0),
    }),
  });
}
