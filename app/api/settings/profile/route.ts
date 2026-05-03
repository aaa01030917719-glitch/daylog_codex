import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizeThemeColor } from "@/lib/utils";

async function requireWorkspaceMember() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      userId: true,
      workspaceId: true,
    },
  });

  if (!membership) {
    return null;
  }

  return {
    session,
    membership,
  };
}

function parseRequestedValues(request: NextRequest, key: "userIds" | "emails" | "names") {
  return request.nextUrl.searchParams
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseRequestedLookup(request: NextRequest, currentUserId: string) {
  const userIds = parseRequestedValues(request, "userIds");
  const emails = parseRequestedValues(request, "emails");
  const names = parseRequestedValues(request, "names");

  if (userIds.length === 0 && emails.length === 0 && names.length === 0) {
    return {
      userIds: [currentUserId],
      emails: [],
      names: [],
    };
  }

  return {
    userIds: Array.from(new Set(userIds)),
    emails: Array.from(new Set(emails)),
    names: Array.from(new Set(names)),
  };
}

export async function GET(request: NextRequest) {
  const context = await requireWorkspaceMember();
  if (!context) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const lookup = parseRequestedLookup(request, context.membership.userId);
  const orFilters: Prisma.WorkspaceMemberWhereInput[] = [];

  if (lookup.userIds.length > 0) {
    orFilters.push({ userId: { in: lookup.userIds } });
  }

  if (lookup.emails.length > 0) {
    orFilters.push({ user: { email: { in: lookup.emails } } });
  }

  if (lookup.names.length > 0) {
    orFilters.push({ user: { name: { in: lookup.names } } });
  }

  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: context.membership.workspaceId,
      ...(orFilters.length === 1 ? orFilters[0] : { OR: orFilters }),
    },
    select: {
      userId: true,
      joinedAt: true,
      personalColor: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({
    profiles: members.map((member) => ({
      userId: member.userId,
      name: member.user.name ?? undefined,
      email: member.user.email ?? undefined,
      joinedAt: member.joinedAt.toISOString(),
      personalColor: member.personalColor ?? undefined,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const context = await requireWorkspaceMember();
  if (!context) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    personalColor?: string | null;
  } | null;

  const requestedColor = body?.personalColor ? normalizeThemeColor(body.personalColor) : null;

  if (requestedColor) {
    const duplicate = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: context.membership.workspaceId,
        personalColor: requestedColor,
        NOT: { id: context.membership.id },
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      return NextResponse.json(
        { error: "이미 다른 사용자가 사용 중인 색상입니다." },
        { status: 409 }
      );
    }
  }

  try {
    const updated = await prisma.workspaceMember.update({
      where: { id: context.membership.id },
      data: {
        personalColor: requestedColor,
      },
      select: {
        id: true,
        userId: true,
        joinedAt: true,
        personalColor: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      profile: {
        userId: updated.userId,
        name: updated.user.name ?? undefined,
        email: updated.user.email ?? undefined,
        joinedAt: updated.joinedAt.toISOString(),
        personalColor: updated.personalColor ?? undefined,
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "이미 다른 사용자가 사용 중인 색상입니다." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "개인 색상을 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
