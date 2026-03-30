import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";


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

  return <div>Docs page</div>;
}
