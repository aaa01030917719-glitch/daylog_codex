import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const approvals = await prisma.approval.findMany({
    where: { requesterId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { requester: { select: { name: true, image: true } } },
  });

  return NextResponse.json(approvals);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { type, title, description, taskId, eventId } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "type과 title은 필수입니다." }, { status: 400 });
    }

    const approval = await prisma.approval.create({
      data: {
        type,
        title,
        description: description ?? null,
        requesterId: session.user.id,
        taskId: taskId ?? null,
        eventId: eventId ?? null,
      },
      include: {
        requester: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    });

    // ADMIN/OWNER에게 알림 발송
    if (session.user.workspaceId) {
      const admins = await prisma.workspaceMember.findMany({
        where: {
          workspaceId: session.user.workspaceId,
          role: { in: ["ADMIN", "OWNER"] },
          userId: { not: session.user.id },
        },
        select: { userId: true },
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((a) => ({
            userId: a.userId,
            type: "APPROVAL_REQUEST",
            title: "컨펌 요청이 도착했습니다.",
            body: title,
            link: "/admin/dashboard",
          })),
        });
      }
    }

    return NextResponse.json({ approval }, { status: 201 });
  } catch (error) {
    console.error("[APPROVAL CREATE]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
