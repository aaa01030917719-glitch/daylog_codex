import { CalendarEventGroupKind } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  canManageEvent,
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

function parseGroupKind(value: unknown, fallback: CalendarEventGroupKind) {
  if (
    value === CalendarEventGroupKind.PERSONAL ||
    value === CalendarEventGroupKind.COMPANY_ALL ||
    value === CalendarEventGroupKind.TEAM_SHARED ||
    value === CalendarEventGroupKind.PROJECT ||
    value === CalendarEventGroupKind.CUSTOM
  ) {
    return value;
  }

  return fallback;
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const event = await prisma.event.findUnique({
    where: { id: params.id },
  });

  if (!event || event.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
  }

  if (
    !canManageEvent({
      event,
      userId: session.user.id,
      userRole: session.user.role ?? "MEMBER",
    })
  ) {
    return NextResponse.json(
      { error: "이 일정을 수정할 권한이 없습니다." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const title = normalizeText(body.title);
    const description = normalizeText(body.description);
    const startDate = parseDateOnly(body.startDate);
    const endDate = parseDateOnly(body.endDate);
    const groupKind = parseGroupKind(body.groupKind, event.groupKind);
    const customGroupId = normalizeText(body.customGroupId) || null;
    const projectId = normalizeText(body.projectId) || null;

    if (startDate && endDate && endDate < startDate) {
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

    const palette = body.color
      ? getPresetPalette(normalizeText(body.color) || "#4f7cff")
      : { color: event.color, textColor: event.textColor };

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: {
        ...(title ? { title } : {}),
        ...(body.description !== undefined ? { description: description || null } : {}),
        ...(startDate ? { startAt: startDate } : {}),
        ...(endDate ? { endAt: toEndOfDay(endDate) } : {}),
        ...(body.allDay !== undefined ? { allDay: Boolean(body.allDay) } : {}),
        ...(body.color ? { color: palette.color, textColor: palette.textColor } : {}),
        groupKind,
        customGroupId: groupKind === CalendarEventGroupKind.CUSTOM ? customGroupId : null,
        projectId: groupKind === CalendarEventGroupKind.PROJECT ? projectId : null,
      },
    });

    return NextResponse.json({ event: updated });
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

    console.error("[CALENDAR_EVENT_UPDATE]", error);
    return NextResponse.json(
      { error: "일정을 수정하지 못했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const event = await prisma.event.findUnique({
    where: { id: params.id },
  });

  if (!event || event.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
  }

  if (
    !canManageEvent({
      event,
      userId: session.user.id,
      userRole: session.user.role ?? "MEMBER",
    })
  ) {
    return NextResponse.json(
      { error: "이 일정을 삭제할 권한이 없습니다." },
      { status: 403 }
    );
  }

  try {
    await prisma.event.delete({
      where: { id: event.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CALENDAR_EVENT_DELETE]", error);
    return NextResponse.json(
      { error: "일정을 삭제하지 못했습니다." },
      { status: 500 }
    );
  }
}
