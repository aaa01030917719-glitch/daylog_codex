import { AttendanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId: session.user.id, date: today } },
    });

    if (existing?.checkIn) {
      return NextResponse.json({ error: "오늘은 이미 출근 처리되었습니다." }, { status: 409 });
    }

    let status: AttendanceStatus = AttendanceStatus.NORMAL;
    const workspaceId = session.user.workspaceId ?? "";

    if (workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { workStartTime: true },
      });

      if (workspace?.workStartTime) {
        const [hoursText, minutesText] = workspace.workStartTime.split(":");
        const lateThreshold = Number.parseInt(hoursText, 10) * 60 + Number.parseInt(minutesText, 10) + 10;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        if (currentMinutes > lateThreshold) {
          status = AttendanceStatus.LATE;
        }
      }
    }

    const attendance = await prisma.attendance.upsert({
      where: { userId_date: { userId: session.user.id, date: today } },
      create: {
        userId: session.user.id,
        workspaceId,
        date: today,
        checkIn: now,
        status,
      },
      update: {
        checkIn: now,
        status,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({
      ...attendance,
      date: attendance.date.toISOString(),
      checkIn: attendance.checkIn?.toISOString() ?? null,
      checkOut: attendance.checkOut?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[CHECK-IN]", error);
    return NextResponse.json({ error: "출근 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
