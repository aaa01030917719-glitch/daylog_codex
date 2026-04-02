import { randomUUID } from "node:crypto";
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

function serializeInviteLink(link: {
  id: string;
  token: string;
  role: string;
  expiresAt: Date | null;
  usedCount: number;
  memo: string | null;
}) {
  return {
    id: link.id,
    token: link.token,
    role: link.role as "ADMIN" | "MEMBER",
    expiresAt: link.expiresAt?.toISOString() ?? null,
    usedCount: link.usedCount,
    memo: link.memo ?? null,
    expired: link.expiresAt ? link.expiresAt.getTime() < Date.now() : false,
  };
}

export async function GET() {
  const owner = await requireOwnerWorkspace();
  if (!owner) {
    return NextResponse.json({ error: "OWNER만 초대 링크를 조회할 수 있습니다." }, { status: 403 });
  }

  if (!(await tableExists("InviteToken"))) {
    return NextResponse.json({ links: [] });
  }

  const links = await prisma.inviteToken.findMany({
    where: { workspaceId: owner.workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ links: links.map(serializeInviteLink) });
}

export async function POST(req: NextRequest) {
  const owner = await requireOwnerWorkspace();
  if (!owner) {
    return NextResponse.json({ error: "OWNER만 초대 링크를 발급할 수 있습니다." }, { status: 403 });
  }

  if (!(await tableExists("InviteToken"))) {
    return NextResponse.json(
      { error: "초대 링크 기능을 사용하려면 settings-migration.sql을 먼저 적용해 주세요." },
      { status: 409 }
    );
  }

  const body = await req.json();
  const role = body.role;
  const expireDays = Number(body.expireDays ?? 7);
  const memo = typeof body.memo === "string" && body.memo.trim().length > 0 ? body.memo.trim() : null;

  if (role !== "ADMIN" && role !== "MEMBER") {
    return NextResponse.json({ error: "초대 링크 권한은 ADMIN 또는 MEMBER만 가능합니다." }, { status: 400 });
  }

  const token = `daylog_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const expiresAt = expireDays > 0 ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000) : null;

  const link = await prisma.inviteToken.create({
    data: {
      workspaceId: owner.workspaceId,
      token,
      role,
      expiresAt,
      memo,
      usedCount: 0,
    },
  });

  return NextResponse.json({ link: serializeInviteLink(link) }, { status: 201 });
}
