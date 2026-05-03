import { AttendanceStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (session.user.role === "OWNER") {
    return NextResponse.json(
      { error: "OWNER 계정은 퇴근 기록을 생성할 수 없습니다." },
      { status: 403 }
    );
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    const attendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId: session.user.id, date: today } },
    });

    if (!attendance?.checkIn) {
      return NextResponse.json({ error: "먼저 출근 처리를 해 주세요." }, { status: 400 });
    }

    if (attendance.checkOut) {
      return NextResponse.json({ error: "오늘은 이미 퇴근 처리되었습니다." }, { status: 409 });
    }

    const workMinutes = Math.max(0, Math.floor((now.getTime() - attendance.checkIn.getTime()) / 60000));
    let status = attendance.status;
    const workspaceId = session.user.workspaceId ?? "";

    if (workspaceId && status === AttendanceStatus.NORMAL) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { workHoursPerDay: true },
      });

      if (workspace && workMinutes > workspace.workHoursPerDay * 60 + 30) {
        status = AttendanceStatus.OVERTIME;
      }
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkOut: now, workMinutes, status },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({
      ...updated,
      date: updated.date.toISOString(),
      checkIn: updated.checkIn?.toISOString() ?? null,
      checkOut: updated.checkOut?.toISOString() ?? null,
    });
  } catch (error) {
    console.error("[CHECK-OUT]", error);
    return NextResponse.json({ error: "퇴근 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
