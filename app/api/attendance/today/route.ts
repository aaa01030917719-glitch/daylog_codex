import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ hasCheckIn: false, hasCheckOut: false, attendance: null });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date: today } },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json({
    hasCheckIn: Boolean(attendance?.checkIn),
    hasCheckOut: Boolean(attendance?.checkOut),
    attendance: attendance
      ? {
          ...attendance,
          date: attendance.date.toISOString(),
          checkIn: attendance.checkIn?.toISOString() ?? null,
          checkOut: attendance.checkOut?.toISOString() ?? null,
        }
      : null,
  });
}
