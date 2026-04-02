import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AttendanceDashboardPage } from "@/components/attendance/AttendanceDashboardPage";

export default async function AttendancePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";
  const workspaceId = session.user.workspaceId ?? "";

  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const [records, members, todayRecords] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        userId: session.user.id,
        workspaceId,
        date: { gte: fromDate, lte: toDate },
      },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { date: "asc" },
    }),
    isAdmin
      ? prisma.workspaceMember.findMany({
          where: { workspaceId },
          include: { user: { select: { id: true, name: true, image: true } } },
        })
      : Promise.resolve([]),
    prisma.attendance.findMany({
      where: {
        workspaceId,
        ...(isAdmin
          ? { date: { gte: todayStart, lte: todayEnd } }
          : { userId: session.user.id, date: { gte: todayStart, lte: todayEnd } }),
      },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { checkIn: "asc" },
    }),
  ]);

  return (
    <AttendanceDashboardPage
      initialRecords={records}
      initialTodayRecords={todayRecords}
      members={isAdmin ? members.map((m) => m.user) : []}
      isAdmin={isAdmin}
      currentUserId={session.user.id}
      currentUserName={session.user.name ?? ""}
      currentDate={now.toISOString()}
    />
  );
}
