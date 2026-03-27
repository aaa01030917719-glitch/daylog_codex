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
    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId: session.user.id, date: today } },
    });

    if (existing?.checkIn) {
      return NextResponse.json({ error: "이미 출근 기록이 있습니다." }, { status: 409 });
    }

    // workStartTime 기준 LATE 판정 (10분 초과)
    let status: "NORMAL" | "LATE" = "NORMAL";
    const workspaceId = session.user.workspaceId ?? "";

    if (workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { workStartTime: true },
      });

      if (workspace?.workStartTime) {
        const [hStr, mStr] = workspace.workStartTime.split(":");
        const startH = parseInt(hStr, 10);
        const startM = parseInt(mStr, 10);
        const workStartMinutes = startH * 60 + startM;
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        if (nowMinutes > workStartMinutes + 10) {
          status = "LATE";
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
      update: { checkIn: now, status },
    });

    return NextResponse.json(attendance);
  } catch (error) {
    console.error("[CHECK-IN]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
