import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NotificationsClientPage } from "@/app/components/notifications/NotificationsClientPage";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return <NotificationsClientPage initialNotifications={notifications} />;
}
