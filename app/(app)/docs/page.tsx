import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DocsHubClientPage from "@/components/docs/DocsHubClientPage";
import type {
  ApprovalSummary,
  PageSummary,
} from "@/components/docs/docsHubTypes";
import { prisma } from "@/lib/prisma";

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "OWNER";
}

export default async function DocsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const workspaceId = session.user.workspaceId;
  const currentUserId = session.user.id;
  const isAdmin = isAdminRole(session.user.role);

  let initialPages: PageSummary[] = [];
  let initialApprovals: ApprovalSummary[] = [];

  if (workspaceId) {
    const approvalWhere: Prisma.ApprovalWhereInput = isAdmin
      ? { requester: { members: { some: { workspaceId } } } }
      : { requesterId: currentUserId };

    const [pages, approvals] = await Promise.all([
      prisma.page.findMany({
        where: { workspaceId },
        orderBy: [{ parentId: "asc" }, { updatedAt: "desc" }],
        include: {
          author: {
            select: { id: true, name: true, image: true },
          },
          _count: {
            select: { children: true },
          },
        },
      }),
      prisma.approval.findMany({
        where: approvalWhere,
        orderBy: { createdAt: "desc" },
        include: {
          requester: { select: { id: true, name: true, image: true } },
          decider: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
          event: { select: { id: true, title: true } },
        },
      }),
    ]);

    initialPages = pages.map((page) => ({
      id: page.id,
      title: page.title,
      emoji: page.emoji,
      isPublic: page.isPublic,
      parentId: page.parentId,
      updatedAt: page.updatedAt.toISOString(),
      author: {
        id: page.author.id,
        name: page.author.name,
        image: page.author.image,
      },
      _count: {
        children: page._count.children,
      },
    }));

    initialApprovals = approvals.map((approval) => ({
      id: approval.id,
      type: approval.type,
      title: approval.title,
      description: approval.description,
      status: approval.status,
      createdAt: approval.createdAt.toISOString(),
      decidedAt: approval.decidedAt?.toISOString() ?? null,
      decisionNote: approval.decisionNote,
      leaveType: approval.leaveType,
      leaveStart: approval.leaveStart?.toISOString() ?? null,
      leaveEnd: approval.leaveEnd?.toISOString() ?? null,
      requesterId: approval.requesterId,
      deciderId: approval.deciderId,
      requester: {
        id: approval.requester.id,
        name: approval.requester.name,
        image: approval.requester.image,
      },
      decider: approval.decider
        ? {
            id: approval.decider.id,
            name: approval.decider.name,
          }
        : null,
      task: approval.task
        ? {
            id: approval.task.id,
            title: approval.task.title,
          }
        : null,
      event: approval.event
        ? {
            id: approval.event.id,
            title: approval.event.title,
          }
        : null,
    }));
  }

  return (
    <DocsHubClientPage
      initialPages={initialPages}
      initialApprovals={initialApprovals}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
    />
  );
}
