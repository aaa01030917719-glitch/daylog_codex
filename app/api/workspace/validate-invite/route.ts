import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeInviteCode } from "@/lib/utils";

type TableExistsRow = { exists: boolean };

async function inviteTokenTableExists() {
  const rows = await prisma.$queryRaw<TableExistsRow[]>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'InviteToken'
    ) AS exists
  `;

  return rows[0]?.exists ?? false;
}

export async function POST(req: NextRequest) {
  try {
    const { inviteCode } = await req.json();
    const normalizedInviteCode = normalizeInviteCode(String(inviteCode ?? ""));
    if (!normalizedInviteCode) {
      return NextResponse.json({ valid: false, reason: "INVALID" }, { status: 400 });
    }

    if (await inviteTokenTableExists()) {
      const inviteLink = await prisma.inviteToken.findUnique({
        where: { token: normalizedInviteCode },
        select: {
          expiresAt: true,
          role: true,
          workspace: {
            select: {
              name: true,
              members: {
                where: { role: "OWNER" },
                select: { user: { select: { name: true } } },
                take: 1,
              },
            },
          },
        },
      });

      if (inviteLink) {
        if (inviteLink.expiresAt && inviteLink.expiresAt.getTime() < Date.now()) {
          return NextResponse.json({ valid: false, reason: "EXPIRED" });
        }

        return NextResponse.json({
          valid: true,
          workspaceName: inviteLink.workspace.name,
          ownerName: inviteLink.workspace.members[0]?.user?.name ?? null,
          inviteRole: inviteLink.role,
        });
      }
    }

    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode: normalizedInviteCode },
      select: {
        name: true,
        members: {
          where: { role: "OWNER" },
          select: { user: { select: { name: true } } },
          take: 1,
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ valid: false, reason: "INVALID" });
    }

    return NextResponse.json({
      valid: true,
      workspaceName: workspace.name,
      ownerName: workspace.members[0]?.user?.name ?? null,
      inviteRole: "MEMBER",
    });
  } catch (error) {
    console.error("[VALIDATE INVITE]", error);
    return NextResponse.json({ valid: false, reason: "ERROR" }, { status: 500 });
  }
}