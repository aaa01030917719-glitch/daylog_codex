import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ events: [] });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const events = await prisma.event.findMany({
    where: {
      workspaceId,
      ...(from && to
        ? {
            startAt: {
              gte: new Date(from),
              lte: new Date(to),
            },
          }
        : {}),
    },
    include: { creator: { select: { name: true } } },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "워크스페이스 정보를 찾을 수 없습니다." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const title = normalizeText(body.title);
    const description = normalizeText(body.description);
    const startAt = typeof body.startAt === "string" ? new Date(body.startAt) : null;
    const endAt = typeof body.endAt === "string" ? new Date(body.endAt) : null;
    const allDay = Boolean(body.allDay);
    const color = normalizeText(body.color) || "#4f7cff";
    const isImportant = Boolean(body.isImportant);

    if (!title) {
      return NextResponse.json({ error: "일정 제목을 입력해 주세요." }, { status: 400 });
    }

    if (!startAt || Number.isNaN(startAt.getTime()) || !endAt || Number.isNaN(endAt.getTime())) {
      return NextResponse.json({ error: "일정 날짜와 시간을 올바르게 입력해 주세요." }, { status: 400 });
    }

    if (endAt.getTime() <= startAt.getTime()) {
      return NextResponse.json({ error: "종료 시간은 시작 시간보다 늦어야 합니다." }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description: description || null,
        startAt,
        endAt,
        allDay,
        color,
        isImportant,
        requiresApproval: isImportant,
        workspaceId,
        creatorId: session.user.id,
      },
      include: { creator: { select: { name: true } } },
    });

    if (isImportant) {
      const approval = await prisma.approval.create({
        data: {
          type: "IMPORTANT_EVENT",
          title: `[중요 일정] ${title}`,
          description: description || null,
          requesterId: session.user.id,
          eventId: event.id,
        },
      });

      const admins = await prisma.workspaceMember.findMany({
        where: {
          workspaceId,
          role: { in: ["ADMIN", "OWNER"] },
          userId: { not: session.user.id },
        },
        select: { userId: true },
      });

      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.userId,
            type: "APPROVAL_REQUEST" as const,
            title: "중요 일정 결재 요청이 도착했습니다.",
            body: title,
            link: `/approvals/${approval.id}`,
          })),
        });
      }
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("[EVENT CREATE]", error);
    return NextResponse.json(
      { error: "일정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
