import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { getWorkspaceSettings } from "@/app/(app)/settings/data";
import { prisma } from "@/lib/prisma";

type TableExistsRow = { exists: boolean };

async function tableExists(tableName: string) {
  const rows = await prisma.$queryRaw<TableExistsRow[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${tableName}
    ) AS exists
  `;

  return rows[0]?.exists ?? false;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const member = await prisma.workspaceMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { joinedAt: "asc" },
    select: { workspaceId: true },
  });

  if (!member) {
    return NextResponse.json({ error: "참여 중인 워크스페이스가 없습니다." }, { status: 404 });
  }

  const settings = await getWorkspaceSettings(member.workspaceId);
  return NextResponse.json({
    workspaceId: settings.id,
    name: settings.name,
    themeColor: settings.themeColor,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const ownerMember = await prisma.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
      role: "OWNER",
    },
    select: {
      workspaceId: true,
    },
  });

  if (!ownerMember) {
    return NextResponse.json({ error: "OWNER만 워크스페이스를 삭제할 수 있습니다." }, { status: 403 });
  }

  const workspaceId = ownerMember.workspaceId;
  const memberRows = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { userId: true },
  });
  const memberUserIds = memberRows.map((member) => member.userId);
  const hasInviteTokenTable = await tableExists("InviteToken");

  try {
    await prisma.$transaction(async (tx) => {
      const approvalDeleteWhere: Prisma.ApprovalWhereInput =
        memberUserIds.length > 0
          ? {
              OR: [
                { task: { project: { workspaceId } } },
                { event: { workspaceId } },
                { requesterId: { in: memberUserIds } },
              ],
            }
          : {
              OR: [
                { task: { project: { workspaceId } } },
                { event: { workspaceId } },
              ],
            };

      await tx.mention.deleteMany({
        where: {
          comment: {
            OR: [
              { task: { project: { workspaceId } } },
              { page: { workspaceId } },
            ],
          },
        },
      });

      await tx.comment.deleteMany({
        where: {
          OR: [
            { task: { project: { workspaceId } } },
            { page: { workspaceId } },
          ],
        },
      });

      await tx.approval.deleteMany({
        where: approvalDeleteWhere,
      });

      await tx.boardLike.deleteMany({
        where: { post: { workspaceId } },
      });

      await tx.boardRead.deleteMany({
        where: { post: { workspaceId } },
      });

      await tx.attendance.deleteMany({
        where: { workspaceId },
      });

      await tx.notice.deleteMany({
        where: { workspaceId },
      });

      await tx.boardPost.deleteMany({
        where: { workspaceId },
      });

      await tx.event.deleteMany({
        where: { workspaceId },
      });

      await tx.task.deleteMany({
        where: { project: { workspaceId } },
      });

      await tx.page.updateMany({
        where: { workspaceId },
        data: { parentId: null },
      });

      await tx.page.deleteMany({
        where: { workspaceId },
      });

      await tx.project.deleteMany({
        where: { workspaceId },
      });

      if (hasInviteTokenTable) {
        await tx.inviteToken.deleteMany({
          where: { workspaceId },
        });
      }

      if (memberUserIds.length > 0) {
        await tx.notification.deleteMany({
          where: { userId: { in: memberUserIds } },
        });
      }

      await tx.workspaceMember.deleteMany({
        where: { workspaceId },
      });

      await tx.workspace.delete({
        where: { id: workspaceId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WORKSPACE_DELETE]", error);
    return NextResponse.json(
      { error: "워크스페이스를 삭제하지 못했습니다. 연결된 데이터 상태를 먼저 확인해 주세요." },
      { status: 500 }
    );
  }
}
