import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AttendanceDashboardPage } from "@/components/attendance/AttendanceDashboardPage";

export default async function AttendancePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";
  const isOwner = session.user.role === "OWNER";
  const workspaceId = session.user.workspaceId ?? "";

  const now = new Date();
  const fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const membersWhere = isAdmin ? { workspaceId } : { workspaceId, userId: session.user.id };
  const todayRecordsWhere = isAdmin
    ? { workspaceId, date: { gte: todayStart, lte: todayEnd } }
    : {
        workspaceId,
        userId: session.user.id,
        date: { gte: todayStart, lte: todayEnd },
      };

  const [records, members, todayRecords, teamMonthRecords] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        userId: session.user.id,
        workspaceId,
        date: { gte: fromDate, lte: toDate },
      },
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: membersWhere,
      include: { user: { select: { id: true, name: true, image: true } } },
    }),
    prisma.attendance.findMany({
      where: todayRecordsWhere,
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { checkIn: "asc" },
    }),
    isAdmin
      ? prisma.attendance.findMany({
          where: {
            workspaceId,
            date: { gte: fromDate, lte: toDate },
            user: {
              members: {
                some: {
                  workspaceId,
                  role: { in: ["ADMIN", "MEMBER"] },
                },
              },
            },
          },
          include: { user: { select: { id: true, name: true, image: true } } },
          orderBy: [{ date: "desc" }, { checkIn: "asc" }],
        })
      : Promise.resolve([]),
  ]);

  return (
    <AttendanceDashboardPage
      initialRecords={records}
      initialTodayRecords={todayRecords}
      initialTeamMonthRecords={teamMonthRecords}
      members={members.map((m) => m.user)}
      isAdmin={isAdmin}
      isOwner={isOwner}
      currentUserId={session.user.id}
      currentUserName={session.user.name ?? ""}
      currentDate={now.toISOString()}
    />
  );
}
