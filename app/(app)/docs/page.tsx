import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DocsHubClientPage } from "@/components/docs/DocsHubClientPage";

export default async function DocsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspaceId = session.user.workspaceId ?? "";
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";

  const [pages, approvals] = await Promise.all([
    prisma.page.findMany({
      where: { workspaceId },
      include: {
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { children: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    workspaceId
      ? prisma.approval.findMany({
          where: isAdmin
            ? { requester: { members: { some: { workspaceId } } } }
            : { requesterId: session.user.id },
          include: {
            requester: { select: { id: true, name: true, image: true } },
            decider: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <DocsHubClientPage
      initialPages={pages.map((page) => ({
        ...page,
        updatedAt: page.updatedAt.toISOString(),
      }))}
      initialApprovals={approvals.map((approval) => ({
        ...approval,
        createdAt: approval.createdAt.toISOString(),
        decidedAt: approval.decidedAt?.toISOString() ?? null,
        leaveStart: approval.leaveStart?.toISOString() ?? null,
        leaveEnd: approval.leaveEnd?.toISOString() ?? null,
      }))}
      currentUserId={session.user.id}
      isAdmin={isAdmin}
    />
  );
}
