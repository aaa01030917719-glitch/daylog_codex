import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) return NextResponse.json({ events: [] });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const events = await prisma.event.findMany({
    where: {
      workspaceId,
      ...(from && to
        ? { startAt: { gte: new Date(from), lte: new Date(to) } }
        : {}),
    },
    include: { creator: { select: { name: true } } },
    orderBy: { startAt: "asc" },
  });

  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "워크스페이스 없음" }, { status: 400 });

  const body = await req.json();
  const { title, description, startAt, endAt, allDay, color, isImportant } = body;

  if (!title || !startAt || !endAt) {
    return NextResponse.json({ error: "필수 항목 누락" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      title,
      description: description ?? null,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      allDay: allDay ?? false,
      color: color ?? "#F56B23",
      isImportant: isImportant ?? false,
      workspaceId,
      creatorId: session.user.id,
    },
    include: { creator: { select: { name: true } } },
  });

  // 중요 일정이면 ADMIN/OWNER에게 컨펌 요청 생성
  if (isImportant) {
    await prisma.approval.create({
      data: {
        type: "IMPORTANT_EVENT",
        title: `[중요 일정] ${title}`,
        description: description ?? null,
        requesterId: session.user.id,
        eventId: event.id,
      },
    });

    // ADMIN/OWNER에게 알림 발송
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
        data: admins.map((a) => ({
          userId: a.userId,
          type: "APPROVAL_REQUEST" as const,
          title: "중요 일정 컨펌 요청이 도착했습니다.",
          body: title,
          link: "/admin/dashboard",
        })),
      });
    }
  }

  return NextResponse.json({ event }, { status: 201 });
}
