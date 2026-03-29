import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const tomorrow   = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 0, 0, 0, 0);

  const [urgentTasks, pendingApprovals, recentNotices, todayAttendance] = await Promise.all([
    prisma.task.findMany({
      where: {
        project: { workspaceId },
        status: { not: "DONE" },
        dueDate: { lte: tomorrow },
        NOT: { dueDate: null },
      },
      include: { project: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.approval.findMany({
      where: {
        status: "PENDING",
        requester: { members: { some: { workspaceId } } },
      },
      include: { requester: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.boardPost.findMany({
      where: { workspaceId, type: "NOTICE" },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
    prisma.attendance.findMany({
      where: { workspaceId, date: { gte: todayStart, lte: todayEnd } },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { checkIn: "asc" },
    }),
  ]);

  return NextResponse.json({
    urgentTasks,
    overBudgetProjects: [],
    pendingApprovals,
    recentNotices,
    todayAttendance: todayAttendance.map((a) => ({
      user: a.user,
      attendance: a,
      status: a.status === "NORMAL" ? "PRESENT"
        : a.status === "LATE" ? "LATE"
        : a.status === "HOLIDAY" ? "HOLIDAY"
        : "ABSENT",
    })),
  });
}
