import { CalendarEventGroupKind } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getCalendarFeed,
  resolveCalendarWorkspaceId,
  validateCalendarGroupSelection,
} from "@/lib/calendar/server";
import { getPresetPalette } from "@/lib/calendar/shared";
import { prisma } from "@/lib/prisma";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseGroupKind(value: unknown) {
  if (
    value === CalendarEventGroupKind.PERSONAL ||
    value === CalendarEventGroupKind.COMPANY_ALL ||
    value === CalendarEventGroupKind.TEAM_SHARED ||
    value === CalendarEventGroupKind.PROJECT ||
    value === CalendarEventGroupKind.CUSTOM
  ) {
    return value;
  }

  return CalendarEventGroupKind.PERSONAL;
}

function toEndOfDay(value: Date) {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    23,
    59,
    59,
    999
  );
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = await resolveCalendarWorkspaceId({
    userId: session.user.id,
    sessionWorkspaceId: session.user.workspaceId,
  });

  if (!workspaceId) {
    return NextResponse.json({ events: [] });
  }

  const searchParams = req.nextUrl.searchParams;
  const start = parseDateOnly(searchParams.get("startDate"));
  const end = parseDateOnly(searchParams.get("endDate"));

  if (!start || !end) {
    return NextResponse.json(
      { error: "조회 시작일과 종료일을 함께 전달해 주세요." },
      { status: 400 }
    );
  }

  const items = await getCalendarFeed({
    workspaceId,
    userId: session.user.id,
    userRole: session.user.role ?? "MEMBER",
    start,
    end,
  });

  const events = items.filter((item) => item.source === "calendarEvent");

  return NextResponse.json({ events });
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
    const title = normalizeText(body.title);
    const description = normalizeText(body.description) || null;
    const startDate = parseDateOnly(body.startDate);
    const endDate = parseDateOnly(body.endDate);
    const allDay = Boolean(body.allDay);
    const groupKind = parseGroupKind(body.groupKind);
    const customGroupId = normalizeText(body.customGroupId) || null;
    const projectId = normalizeText(body.projectId) || null;

    if (!title) {
      return NextResponse.json({ error: "일정 제목을 입력해 주세요." }, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "시작일과 종료일을 올바르게 입력해 주세요." },
        { status: 400 }
      );
    }

    if (endDate < startDate) {
      return NextResponse.json(
        { error: "종료일은 시작일보다 빠를 수 없습니다." },
        { status: 400 }
      );
    }

    await validateCalendarGroupSelection({
      workspaceId,
      userId: session.user.id,
      userRole: session.user.role ?? "MEMBER",
      groupKind,
      customGroupId,
      projectId,
    });

    const palette = getPresetPalette(normalizeText(body.color) || "#4f7cff");

    const event = await prisma.event.create({
      data: {
        title,
        description,
        startAt: startDate,
        endAt: toEndOfDay(endDate),
        allDay,
        color: palette.color,
        textColor: palette.textColor,
        workspaceId,
        creatorId: session.user.id,
        groupKind,
        customGroupId: groupKind === CalendarEventGroupKind.CUSTOM ? customGroupId : null,
        projectId: groupKind === CalendarEventGroupKind.PROJECT ? projectId : null,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BAD_REQUEST:")) {
      return NextResponse.json(
        { error: error.message.replace("BAD_REQUEST:", "").trim() },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.startsWith("FORBIDDEN:")) {
      return NextResponse.json(
        { error: error.message.replace("FORBIDDEN:", "").trim() },
        { status: 403 }
      );
    }

    console.error("[CALENDAR_EVENT_CREATE]", error);
    return NextResponse.json(
      { error: "일정을 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
