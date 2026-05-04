import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveCalendarWorkspaceId } from "@/lib/calendar/server";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = await resolveCalendarWorkspaceId({
    userId: session.user.id,
    sessionWorkspaceId: session.user.workspaceId,
  });

  if (!workspaceId) {
    return NextResponse.json({ groups: [] });
  }

  const groups = await prisma.calendarGroup.findMany({
    where: {
      workspaceId,
      ownerId: session.user.id,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = await resolveCalendarWorkspaceId({
    userId: session.user.id,
    sessionWorkspaceId: session.user.workspaceId,
  });

  if (!workspaceId) {
    return NextResponse.json(
      { error: "워크스페이스 정보를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const name = normalizeText(body.name);
    const color = normalizeText(body.color) || "#4f7cff";

    if (!name) {
      return NextResponse.json({ error: "그룹 이름을 입력해 주세요." }, { status: 400 });
    }

    const group = await prisma.calendarGroup.create({
      data: {
        name,
        color,
        ownerId: session.user.id,
        workspaceId,
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("[CALENDAR_GROUP_CREATE]", error);
    return NextResponse.json(
      { error: "일정 그룹을 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
