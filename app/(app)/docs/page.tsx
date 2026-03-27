import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DocsClientPage } from "@/app/components/docs/DocsClientPage";

export default async function DocsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const workspaceId = session.user.workspaceId ?? "";

  const pages = await prisma.page.findMany({
    where: { workspaceId },
    include: {
      author: { select: { id: true, name: true, image: true } },
      _count: { select: { children: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <DocsClientPage
      initialPages={pages}
      currentUserId={session.user.id}
    />
  );
}
