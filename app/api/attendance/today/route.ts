import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ hasCheckIn: false, hasCheckOut: false });
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const attendance = await prisma.attendance.findUnique({
    where: { userId_date: { userId: session.user.id, date: today } },
    select: { checkIn: true, checkOut: true },
  });

  return NextResponse.json({
    hasCheckIn: !!attendance?.checkIn,
    hasCheckOut: !!attendance?.checkOut,
  });
}
