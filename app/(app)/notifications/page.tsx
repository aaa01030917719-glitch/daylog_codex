import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";
import { NotificationsClientPage } from "@/components/notifications/NotificationsClientPage";

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "OWNER";
}

function extractApprovalId(link: string | null) {
  if (!link) {
    return null;
  }

  const match = link.match(/^\/approvals\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function startOfCurrentMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfNextMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const userId = session.user.id;
  const userRole = session.user.role ?? null;
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const approvalIds = Array.from(
    new Set(
      notifications
        .map((notification) => extractApprovalId(notification.link))
        .filter((value): value is string => Boolean(value))
    )
  );

  const isAdmin = isAdminRole(userRole);
  const workspaceId = isAdmin
    ? await resolveWorkspaceIdForUser(userId, session.user.workspaceId)
    : session.user.workspaceId ?? "";

  const monthlyApprovalWhere =
    isAdmin && workspaceId
      ? {
          createdAt: {
            gte: startOfCurrentMonth(),
            lt: startOfNextMonth(),
          },
          requester: {
            members: {
              some: { workspaceId },
            },
          },
        }
      : {
          createdAt: {
            gte: startOfCurrentMonth(),
            lt: startOfNextMonth(),
          },
          requesterId: userId,
        };

  const [approvals, monthlyApprovals] = await Promise.all([
    approvalIds.length > 0
      ? prisma.approval.findMany({
          where: { id: { in: approvalIds } },
          include: {
            requester: {
              select: { id: true, name: true, image: true },
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
        })
      : Promise.resolve([]),
    prisma.approval.findMany({
      where: monthlyApprovalWhere,
      select: {
        id: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return (
    <NotificationsClientPage
      initialNotifications={notifications.map((notification) => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      }))}
      initialApprovals={approvals.map((approval) => ({
        id: approval.id,
        type: approval.type,
        title: approval.title,
        description: approval.description,
        status: approval.status,
        decisionNote: approval.decisionNote,
        decidedAt: approval.decidedAt?.toISOString() ?? null,
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
      }))}
      monthlyApprovals={monthlyApprovals.map((approval) => ({
        id: approval.id,
        status: approval.status,
        createdAt: approval.createdAt.toISOString(),
      }))}
      currentUserId={userId}
      userRole={userRole}
    />
  );
}
