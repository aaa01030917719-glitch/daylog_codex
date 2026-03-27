import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) return NextResponse.json({ records: [] });

  const { searchParams } = new URL(req.url);
  const requestedUserId = searchParams.get("userId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";

  // Admin can query other users; members can only see own data
  const userId = isAdmin && requestedUserId ? requestedUserId : session.user.id;

  const records = await prisma.attendance.findMany({
    where: {
      workspaceId,
      userId,
      ...(from && to
        ? {
            date: {
              gte: new Date(from),
              lte: new Date(to),
            },
          }
        : {}),
    },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ records });
}
