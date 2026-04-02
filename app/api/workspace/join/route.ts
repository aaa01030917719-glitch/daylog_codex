import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeInviteCode } from "@/lib/utils";

type TableExistsRow = { exists: boolean };

type InviteTarget =
  | {
      status: "VALID";
      workspaceId: string;
      workspaceName: string;
      role: "ADMIN" | "MEMBER";
      inviteTokenId: string | null;
    }
  | { status: "EXPIRED" }
  | { status: "INVALID" };

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

async function resolveInviteTarget(inviteCode: string): Promise<InviteTarget> {
  if (await inviteTokenTableExists()) {
    const inviteLink = await prisma.inviteToken.findUnique({
      where: { token: inviteCode },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (inviteLink) {
      if (inviteLink.expiresAt && inviteLink.expiresAt.getTime() < Date.now()) {
        return { status: "EXPIRED" };
      }

      return {
        status: "VALID",
        workspaceId: inviteLink.workspaceId,
        workspaceName: inviteLink.workspace.name,
        role: inviteLink.role === "ADMIN" ? "ADMIN" : "MEMBER",
        inviteTokenId: inviteLink.id,
      };
    }
  }

  const workspace = await prisma.workspace.findUnique({
    where: { inviteCode },
    select: {
      id: true,
      name: true,
    },
  });

  if (!workspace) {
    return { status: "INVALID" };
  }

  return {
    status: "VALID",
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    role: "MEMBER",
    inviteTokenId: null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { inviteCode } = await req.json();
    const normalizedInviteCode = normalizeInviteCode(String(inviteCode ?? ""));
    if (!normalizedInviteCode) {
      return NextResponse.json(
        { error: "초대 링크가 올바르지 않습니다.", code: "INVITE_INVALID" },
        { status: 400 }
      );
    }

    const inviteTarget = await resolveInviteTarget(normalizedInviteCode);
    if (inviteTarget.status === "EXPIRED") {
      return NextResponse.json(
        { error: "만료되었거나 비활성화된 초대 링크입니다.", code: "INVITE_EXPIRED" },
        { status: 410 }
      );
    }

    if (inviteTarget.status === "INVALID") {
      return NextResponse.json(
        { error: "유효하지 않은 초대 링크입니다.", code: "INVITE_INVALID" },
        { status: 404 }
      );
    }

    const existing = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    if (existing?.workspaceId === inviteTarget.workspaceId) {
      return NextResponse.json(
        {
          workspaceId: existing.workspaceId,
          workspaceName: inviteTarget.workspaceName,
          alreadyExists: true,
          sameWorkspace: true,
        },
        { status: 200 }
      );
    }

    if (existing && existing.workspaceId !== inviteTarget.workspaceId) {
      return NextResponse.json(
        {
          error: "이미 다른 워크스페이스에 참여 중입니다.",
          code: "ALREADY_IN_OTHER_WORKSPACE",
          workspaceId: existing.workspaceId,
          workspaceName: existing.workspace.name,
        },
        { status: 409 }
      );
    }

    await prisma.workspaceMember.create({
      data: {
        userId: session.user.id,
        workspaceId: inviteTarget.workspaceId,
        role: inviteTarget.role,
      },
    });

    if (inviteTarget.inviteTokenId) {
      await prisma.inviteToken.update({
        where: { id: inviteTarget.inviteTokenId },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      });
    }

    return NextResponse.json({
      workspaceId: inviteTarget.workspaceId,
      workspaceName: inviteTarget.workspaceName,
      joined: true,
    });
  } catch (error) {
    console.error("[WORKSPACE JOIN]", error);
    return NextResponse.json(
      { error: "워크스페이스 참여 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
