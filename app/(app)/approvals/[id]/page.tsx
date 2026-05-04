import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ApprovalDetailClient } from "@/components/approvals/ApprovalDetailClient";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "OWNER";
}

export default async function ApprovalDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );

  if (!workspaceId) {
    notFound();
  }

  const approval = await prisma.approval.findUnique({
    where: { id: params.id },
    include: {
      requester: {
        select: {
          id: true,
          name: true,
          image: true,
          members: {
            where: { workspaceId },
            select: { workspaceId: true },
            take: 1,
          },
        },
      },
      decider: {
        select: { id: true, name: true, image: true },
      },
      task: {
        select: { id: true, title: true },
      },
      event: {
        select: { id: true, title: true },
      },
    },
  });

  if (!approval || approval.requester.members.length === 0) {
    notFound();
  }

  const canView =
    isAdminRole(session.user.role) || approval.requesterId === session.user.id;

  if (!canView) {
    redirect("/notifications");
  }

  return (
    <ApprovalDetailClient
      initialApproval={{
        id: approval.id,
        type: approval.type,
        title: approval.title,
        description: approval.description,
        status: approval.status,
        decidedAt: approval.decidedAt?.toISOString() ?? null,
        decisionNote: approval.decisionNote,
        createdAt: approval.createdAt.toISOString(),
        leaveType: approval.leaveType,
        leaveStart: approval.leaveStart?.toISOString() ?? null,
        leaveEnd: approval.leaveEnd?.toISOString() ?? null,
        requester: {
          id: approval.requester.id,
          name: approval.requester.name,
          image: approval.requester.image,
        },
        decider: approval.decider
          ? {
              id: approval.decider.id,
              name: approval.decider.name,
              image: approval.decider.image,
            }
          : null,
        task: approval.task,
        event: approval.event,
        document: null,
      }}
      canDecide={isAdminRole(session.user.role)}
      currentUserName={session.user.name ?? "관리자"}
    />
  );
}
