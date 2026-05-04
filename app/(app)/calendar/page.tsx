import { auth } from "@/auth";
import { CalendarPageClient } from "@/components/calendar/CalendarPageClient";
import { getCalendarPageData } from "@/lib/calendar/server";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const now = new Date();
  const data = await getCalendarPageData({
    userId: session.user.id,
    userRole: session.user.role ?? "MEMBER",
    sessionWorkspaceId: session.user.workspaceId,
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  return (
    <CalendarPageClient
      initialGroups={data.groups}
      initialItems={data.items}
      projects={data.projects}
      currentUserId={session.user.id}
      userRole={session.user.role ?? "MEMBER"}
      initialYear={now.getFullYear()}
      initialMonth={now.getMonth()}
    />
  );
}
