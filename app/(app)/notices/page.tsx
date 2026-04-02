import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NoticesPageClient } from "@/components/notices/NoticesPageClient";
import type { NoticeSummary } from "@/components/notices/types";
import { prisma } from "@/lib/prisma";

export default async function NoticesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;

  let initialNotices: NoticeSummary[] = [];

  if (workspaceId) {
    const notices = await prisma.notice.findMany({
      where: { workspaceId },
      include: {
        author: {
          select: { name: true },
        },
      },
      orderBy: [{ createdAt: "desc" }, { startDate: "desc" }],
    });

    initialNotices = notices.map((notice) => ({
      id: notice.id,
      title: notice.title,
      content: notice.content,
      badge: notice.badge,
      startDate: notice.startDate.toISOString(),
      endDate: notice.endDate.toISOString(),
      createdAt: notice.createdAt.toISOString(),
      authorId: notice.authorId,
      authorName: notice.author.name ?? "이름 없음",
    }));
  }

  return <NoticesPageClient initialNotices={initialNotices} />;
}