import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type TableExistsRow = { exists: boolean };

async function requireOwnerWorkspace() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  return prisma.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
      role: "OWNER",
    },
    select: {
      workspaceId: true,
    },
  });
}

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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { linkId: string } }
) {
  const owner = await requireOwnerWorkspace();
  if (!owner) {
    return NextResponse.json({ error: "OWNER만 초대 링크를 관리할 수 있습니다." }, { status: 403 });
  }

  if (!(await tableExists("InviteToken"))) {
    return NextResponse.json(
      { error: "초대 링크 기능을 사용하려면 settings-migration.sql을 먼저 적용해 주세요." },
      { status: 409 }
    );
  }

  const target = await prisma.inviteToken.findUnique({
    where: { id: params.linkId },
  });

  if (!target || target.workspaceId !== owner.workspaceId) {
    return NextResponse.json({ error: "초대 링크를 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await prisma.inviteToken.update({
    where: { id: params.linkId },
    data: {
      expiresAt: new Date(),
    },
  });

  return NextResponse.json({
    link: {
      id: updated.id,
      token: updated.token,
      role: updated.role as "ADMIN" | "MEMBER",
      expiresAt: updated.expiresAt?.toISOString() ?? null,
      usedCount: updated.usedCount,
      memo: updated.memo ?? null,
      expired: true,
    },
  });
}
