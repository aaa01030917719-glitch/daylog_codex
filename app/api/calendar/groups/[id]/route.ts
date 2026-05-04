import { CalendarEventGroupKind } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveCalendarWorkspaceId } from "@/lib/calendar/server";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

  const group = await prisma.calendarGroup.findFirst({
    where: {
      id: params.id,
      workspaceId,
      ownerId: session.user.id,
    },
  });

  if (!group) {
    return NextResponse.json({ error: "일정 그룹을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    const body = await req.json();
    const name = normalizeText(body.name);
    const color = normalizeText(body.color);

    const updated = await prisma.calendarGroup.update({
      where: { id: group.id },
      data: {
        ...(name ? { name } : {}),
        ...(color ? { color } : {}),
      },
    });

    return NextResponse.json({ group: updated });
  } catch (error) {
    console.error("[CALENDAR_GROUP_UPDATE]", error);
    return NextResponse.json(
      { error: "일정 그룹을 수정하지 못했습니다." },
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

  const group = await prisma.calendarGroup.findFirst({
    where: {
      id: params.id,
      workspaceId,
      ownerId: session.user.id,
    },
  });

  if (!group) {
    return NextResponse.json({ error: "일정 그룹을 찾을 수 없습니다." }, { status: 404 });
  }

  try {
    await prisma.$transaction([
      prisma.event.updateMany({
        where: {
          workspaceId,
          creatorId: session.user.id,
          customGroupId: group.id,
        },
        data: {
          groupKind: CalendarEventGroupKind.PERSONAL,
          customGroupId: null,
          projectId: null,
        },
      }),
      prisma.calendarGroup.delete({
        where: { id: group.id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CALENDAR_GROUP_DELETE]", error);
    return NextResponse.json(
      { error: "일정 그룹을 삭제하지 못했습니다." },
      { status: 500 }
    );
  }
}
