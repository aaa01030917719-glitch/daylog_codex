import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CalendarClientPage } from "@/app/components/calendar/CalendarClientPage";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const workspaceId = session.user.workspaceId ?? "";
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [events, memberRows] = await Promise.all([
    prisma.event.findMany({
      where: {
        workspaceId,
        startAt: { gte: from, lte: to },
      },
      include: { creator: { select: { name: true } } },
      orderBy: { startAt: "asc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { id: true, name: true, image: true } } },
    }),
  ]);

  const members = memberRows.map((m) => m.user);

  return (
    <CalendarClientPage
      initialEvents={events}
      members={members}
    />
  );
}
