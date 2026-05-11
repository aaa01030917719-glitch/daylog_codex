import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NoticePage } from "@/components/notices/NoticePage";
import type {
  NoticeMinuteSummary,
  NoticePageLeaveStatus,
  NoticePageNotice,
} from "@/components/notices/noticePageTypes";
import { calculateLeaveDays } from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "OWNER";
}

function isOwnerRole(role?: string | null) {
  return role === "OWNER";
}

export default async function NoticesPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  const currentUserId = session.user.id;
  const isAdmin = isAdminRole(session.user.role);
  const isOwner = isOwnerRole(session.user.role);

  let initialNotices: NoticePageNotice[] = [];
  let initialLeaveStatuses: NoticePageLeaveStatus[] = [];
  let initialMinutes: NoticeMinuteSummary[] = [];

  if (workspaceId) {
    const [noticeRows, memberRows, leaveApprovals, minuteRows] = await Promise.all([
      prisma.notice.findMany({
        where: { workspaceId },
        include: {
          author: {
            select: { name: true },
          },
          reads: {
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
            orderBy: { readAt: "asc" },
          },
        },
        orderBy: [{ createdAt: "desc" }],
      }),
      prisma.workspaceMember.findMany({
        where: { workspaceId },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        select: {
          userId: true,
          role: true,
          annualLeave: true,
          user: {
            select: { id: true, name: true },
          },
        },
      }),
      isOwner
        ? prisma.approval.findMany({
            where: {
              type: "LEAVE_REQUEST",
              requester: {
                members: {
                  some: {
                    workspaceId,
                  },
                },
              },
            },
            include: {
              requester: {
                select: { id: true, name: true },
              },
            },
            orderBy: [{ leaveStart: "desc" }, { createdAt: "desc" }],
          })
        : Promise.resolve([]),
      prisma.page.findMany({
        where: {
          workspaceId,
          OR: [
            { title: { contains: "회의록", mode: "insensitive" } },
            { emoji: "📝" },
          ],
        },
        include: {
          author: {
            select: { name: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      }),
    ]);

    const commentCounts =
      noticeRows.length > 0
        ? await prisma.detailComment.groupBy({
            by: ["targetId"],
            where: {
              targetType: "notice",
              targetId: { in: noticeRows.map((notice) => notice.id) },
            },
            _count: { _all: true },
          })
        : [];

    const commentCountMap = new Map(
      commentCounts.map((item) => [item.targetId, item._count._all])
    );

    initialNotices = noticeRows.map((notice) => {
      const targetMemberCount = Math.max(memberRows.length - 1, 0);
      const isRead =
        notice.authorId === currentUserId ||
        notice.reads.some((read) => read.userId === currentUserId);

      return {
        id: notice.id,
        title: notice.title,
        content: notice.content,
        badge: notice.badge,
        category: notice.category as NoticePageNotice["category"],
        priority: notice.priority as NoticePageNotice["priority"],
        target: notice.target,
        requireReadConfirm: notice.requireReadConfirm,
        startDate: notice.startDate.toISOString(),
        endDate: notice.endDate.toISOString(),
        createdAt: notice.createdAt.toISOString(),
        authorId: notice.authorId,
        authorName: notice.author.name ?? "이름 없음",
        canManage: isAdmin,
        commentCount: commentCountMap.get(notice.id) ?? 0,
        readBy: notice.reads.map((read) => ({
          userId: read.user.id,
          name: read.user.name ?? "이름 없음",
          readAt: read.readAt.toISOString(),
        })),
        isRead,
        targetMemberCount,
      };
    });

    const currentYear = new Date().getFullYear();
    const visibleMembers = isOwner ? memberRows : [];

    initialLeaveStatuses = visibleMembers.map((member) => {
      const memberApprovals = leaveApprovals.filter(
        (approval) =>
          approval.requester.id === member.userId &&
          approval.leaveStart &&
          approval.leaveEnd &&
          approval.leaveType &&
          approval.leaveStart.getFullYear() === currentYear
      );

      const usedAnnualLeave = memberApprovals.reduce((total, approval) => {
        if (!approval.leaveStart || !approval.leaveEnd || approval.status !== "APPROVED") {
          return total;
        }

        return (
          total +
          calculateLeaveDays(
            approval.leaveType === "FULL_DAY" ? "LEAVE" : "HALF_DAY",
            approval.leaveStart,
            approval.leaveEnd
          )
        );
      }, 0);

      const plannedApproval = memberApprovals.find(
        (approval) =>
          approval.status === "PENDING" &&
          approval.leaveStart &&
          approval.leaveStart >= new Date()
      );

      const plannedLabel =
        plannedApproval?.leaveStart && plannedApproval.leaveEnd
          ? `${plannedApproval.leaveStart.getMonth() + 1}/${plannedApproval.leaveStart.getDate()} - ${
              plannedApproval.leaveEnd.getMonth() + 1
            }/${plannedApproval.leaveEnd.getDate()}`
          : "-";

      const remainingAnnualLeave = Math.max(member.annualLeave - usedAnnualLeave, 0);

      return {
        memberId: member.user.id,
        memberName: member.user.name ?? "이름 없음",
        totalAnnualLeave: member.annualLeave,
        usedAnnualLeave: Number.isInteger(usedAnnualLeave)
          ? usedAnnualLeave
          : Number(usedAnnualLeave.toFixed(1)),
        remainingAnnualLeave: Number.isInteger(remainingAnnualLeave)
          ? remainingAnnualLeave
          : Number(remainingAnnualLeave.toFixed(1)),
        plannedLabel,
        statusLabel: remainingAnnualLeave === 0 ? "소진" : "정상",
      };
    });

    initialMinutes = minuteRows.map((page) => ({
      id: page.id,
      title: page.title,
      updatedAt: page.updatedAt.toISOString(),
      authorName: page.author.name ?? "이름 없음",
    }));
  }

  return (
    <NoticePage
      initialNotices={initialNotices}
      initialLeaveStatuses={initialLeaveStatuses}
      initialMinutes={initialMinutes}
      isAdmin={isAdmin}
      isOwner={isOwner}
    />
  );
}
