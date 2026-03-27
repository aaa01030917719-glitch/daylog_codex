import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  try {
    const attendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId: session.user.id, date: today } },
    });

    if (!attendance?.checkIn) {
      return NextResponse.json({ error: "출근 기록이 없습니다." }, { status: 400 });
    }

    if (attendance.checkOut) {
      return NextResponse.json({ error: "이미 퇴근 기록이 있습니다." }, { status: 409 });
    }

    const workMinutes = Math.floor(
      (now.getTime() - attendance.checkIn.getTime()) / 60000
    );

    // 초과근무 판정: workMinutes > workHoursPerDay × 60 + 30분
    let status = attendance.status;
    const workspaceId = session.user.workspaceId ?? "";

    if (workspaceId && status === "NORMAL") {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { workHoursPerDay: true },
      });
      if (workspace) {
        const overtimeThreshold = workspace.workHoursPerDay * 60 + 30;
        if (workMinutes > overtimeThreshold) {
          status = "OVERTIME";
        }
      }
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkOut: now, workMinutes, status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[CHECK-OUT]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
