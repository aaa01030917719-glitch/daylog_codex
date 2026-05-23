import { auth } from "@/auth";
import {
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import { redirect } from "next/navigation";
import { CalendarEventGroupKind } from "@prisma/client";
import {
  HomeDashboardClient,
  type HomeApprovalItem,
  type HomeAttendanceItem,
  type HomeDashboardData,
  type HomeNoticeItem,
  type HomeRequestItem,
  type HomeScheduleItem,
  type HomeTaskItem,
} from "@/components/home/HomeDashboardClient";
import { prisma } from "@/lib/prisma";
import { getTaskColumnSupport } from "@/lib/task-column-support";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "OWNER";
}

function formatTimeLabel(value: Date | null | undefined) {
  if (!value) return "-";
  return format(new Date(value), "HH:mm", { locale: ko });
}

function getAttendanceTone(status?: string | null) {
  switch (status) {
    case "NORMAL":
      return { label: "출근", background: "#DCFCE7", color: "#15803D" };
    case "LATE":
      return { label: "지각", background: "#FEF3C7", color: "#92400E" };
    case "HOLIDAY":
      return { label: "연차", background: "#EEF4FF", color: "#3158C6" };
    case "EARLY_LEAVE":
      return { label: "반차", background: "#EDE9FE", color: "#6D28D9" };
    case "OVERTIME":
      return { label: "추가 근무", background: "var(--accent-light)", color: "#C05621" };
    case "ABSENT":
      return { label: "미출근", background: "#FDECEA", color: "#D93025" };
    default:
      return { label: "미기록", background: "#F3F4F6", color: "#6B7280" };
  }
}

function getNoticeBadgeTone(badge: string) {
  switch (badge) {
    case "SCHEDULE":
      return { label: "일정" };
    case "FACILITY":
      return { label: "시설" };
    case "NOTICE":
      return { label: "공지" };
    case "WORK":
      return { label: "업무" };
    default:
      return { label: "기타" };
  }
}

function getApprovalTypeLabel(type: string) {
  switch (type) {
    case "LEAVE_REQUEST":
      return "연차·반차";
    case "IMPORTANT_EVENT":
      return "일정 승인";
    case "DEADLINE_CHANGE":
      return "마감 변경";
    case "BUDGET_TASK":
      return "결재 요청";
    case "PROJECT_REVIEW":
      return "업무 검토";
    default:
      return "결재";
  }
}

function getApprovalStatusLabel(status: string) {
  switch (status) {
    case "APPROVED":
      return "승인";
    case "REJECTED":
      return "반려";
    default:
      return "대기";
  }
}

function getEventGroupLabel(groupKind?: string | null) {
  switch (groupKind) {
    case "COMPANY_ALL":
      return "전사";
    case "TEAM_SHARED":
      return "팀공용";
    case "PROJECT":
      return "프로젝트";
    case "CUSTOM":
      return "그룹";
    default:
      return "개인";
  }
}

function getTaskStatusLabel(status: string) {
  switch (status) {
    case "DONE":
      return "완료";
    case "IN_REVIEW":
      return "검토중";
    case "IN_PROGRESS":
      return "진행중";
    default:
      return "예정";
  }
}

function getTaskProgress(status: string) {
  switch (status) {
    case "DONE":
      return 100;
    case "IN_REVIEW":
      return 80;
    case "IN_PROGRESS":
      return 50;
    default:
      return 0;
  }
}

function normalizeProgressValue(value: number | null | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDueDateLabel(value: Date | null | undefined) {
  if (!value) return "마감일 없음";
  return format(new Date(value), "M월 d일", { locale: ko });
}

function formatScheduleLabel(startAt: Date, endAt: Date, allDay: boolean) {
  if (allDay) {
    return `${format(startAt, "M/d (EEE)", { locale: ko })} 종일`;
  }

  return `${format(startAt, "M/d (EEE) HH:mm", { locale: ko })} - ${format(endAt, "HH:mm", {
    locale: ko,
  })}`;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;
  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  const userRole = session.user.role;
  const isAdmin = isAdminRole(userRole);
  const userName = session.user.name ?? "사용자";

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  if (!workspaceId) {
    const emptyData: HomeDashboardData = {
      userName,
      currentUserId: userId,
      userRole,
      isAdmin,
      dateLabel: format(now, "yyyy.MM.dd (EEE)", { locale: ko }),
      approvals: [],
      reviewTasks: [],
      tasks: [],
      schedules: [],
      attendanceSummary: { checkedIn: 0, late: 0, absent: 0, leave: 0, total: 0 },
      attendanceRows: [],
      notices: [],
      requests: [],
    };

    return <HomeDashboardClient data={emptyData} />;
  }

  const approvalWhere = isAdmin
    ? {
        status: "PENDING" as const,
        requester: { members: { some: { workspaceId } } },
      }
    : {
        status: "PENDING" as const,
        requesterId: userId,
      };

  const eventWhere = isAdmin
    ? {
        workspaceId,
        startAt: { lte: weekEnd },
        endAt: { gte: weekStart },
      }
    : {
        workspaceId,
        startAt: { lte: weekEnd },
        endAt: { gte: weekStart },
        OR: [
          { creatorId: userId },
          { isImportant: true },
          { groupKind: { in: [CalendarEventGroupKind.COMPANY_ALL, CalendarEventGroupKind.TEAM_SHARED] } },
        ],
      };

  const taskColumnSupport = await getTaskColumnSupport();

  const [
    todayAttendance,
    pendingDocsCount,
    ideaCount,
    notices,
    events,
    approvedApprovals,
    leaveRecords,
    pendingApprovals,
    rawProjects,
    ongoingTasks,
    reviewTasks,
    todayTeamRecords,
    teamMembers,
    myRequests,
  ] = await Promise.all([
    prisma.attendance.findUnique({
      where: { userId_date: { userId, date: todayStart } },
      select: { checkIn: true, checkOut: true, status: true },
    }),
    prisma.approval.count({ where: approvalWhere }),
    prisma.boardPost.count({
      where: {
        workspaceId,
        type: "IDEA",
        OR: [{ visibility: "SHARED" }, { visibility: "PRIVATE", authorId: userId }],
      },
    }),
    prisma.notice.findMany({
      where: { workspaceId },
      include: { author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.event.findMany({
      where: eventWhere,
      orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
      take: 8,
    }),
    prisma.approval.findMany({
      where: {
        requesterId: userId,
        status: "APPROVED",
        OR: [
          { leaveStart: { gte: monthStart, lte: monthEnd } },
          { leaveEnd: { gte: monthStart, lte: monthEnd } },
          { decidedAt: { gte: monthStart, lte: monthEnd } },
        ],
      },
      select: {
        id: true,
        type: true,
        title: true,
        leaveType: true,
        leaveStart: true,
        leaveEnd: true,
        decidedAt: true,
      },
      orderBy: [{ leaveStart: "asc" }, { decidedAt: "desc" }],
      take: 12,
    }),
    prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: monthStart, lte: monthEnd },
        status: { in: ["HOLIDAY", "EARLY_LEAVE"] },
      },
      select: { date: true, status: true },
      orderBy: { date: "asc" },
    }),
    isAdmin
      ? prisma.approval.findMany({
          where: approvalWhere,
          include: {
            requester: { select: { id: true, name: true, image: true } },
            task: { select: { id: true, title: true, projectId: true } },
            event: { select: { id: true, title: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
        })
      : Promise.resolve([]),
    prisma.project.findMany({
      where: { workspaceId },
      select: { id: true },
    }),
    prisma.task.findMany({
      where: {
        project: { workspaceId },
        status: { not: "DONE" },
        ...(isAdmin ? {} : { assigneeId: userId }),
        OR: isAdmin
          ? [{ status: "IN_PROGRESS" }, { status: "IN_REVIEW" }, { progress: { gt: 0, lt: 100 } }]
          : [{ status: "TODO" }, { status: "IN_PROGRESS" }, { status: "IN_REVIEW" }, { progress: { gt: 0, lt: 100 } }],
      },
      select: {
        id: true,
        title: true,
        status: true,
        progress: true,
        requiresApproval: true,
        isApprovalRequested: true,
        ...(taskColumnSupport.startDate ? { startDate: true } : {}),
        createdAt: true,
        updatedAt: true,
        dueDate: true,
        assignee: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
      take: 8,
    }),
    isAdmin
      ? prisma.task.findMany({
          where: {
            project: { workspaceId },
            status: "IN_REVIEW",
            approvedAt: null,
            rejectedReason: null,
            OR: [{ requiresApproval: true }, { isApprovalRequested: true }],
          },
          select: {
            id: true,
            title: true,
            status: true,
            progress: true,
            requiresApproval: true,
            isApprovalRequested: true,
            approvedAt: true,
            rejectedReason: true,
            dueDate: true,
            assignee: { select: { id: true, name: true } },
            project: { select: { id: true, name: true, color: true } },
          },
          orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
          take: 8,
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.attendance.findMany({
          where: {
            workspaceId,
            date: { gte: todayStart, lte: todayEnd },
          },
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: [{ checkIn: "asc" }, { createdAt: "asc" }],
        })
      : Promise.resolve([]),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.approval.findMany({
      where: { requesterId: userId },
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  void pendingDocsCount;
  void ideaCount;
  void approvedApprovals;
  void leaveRecords;
  void rawProjects;

  const mapTask = (task: (typeof ongoingTasks)[number] | (typeof reviewTasks)[number]): HomeTaskItem => ({
    id: task.id,
    title: task.title,
    projectId: task.project.id,
    projectName: task.project.name,
    projectColor: task.project.color || "var(--accent)",
    assigneeName: task.assignee?.name?.trim() || "담당자 없음",
    dueDateLabel: formatDueDateLabel(task.dueDate),
    progress: normalizeProgressValue(task.progress, getTaskProgress(task.status)),
    status: task.status,
    statusLabel: getTaskStatusLabel(task.status),
    isReviewRequested: Boolean(task.requiresApproval || task.isApprovalRequested),
  });

  const approvalItems: HomeApprovalItem[] = pendingApprovals.map((approval) => ({
    id: approval.id,
    type: approval.type,
    title: approval.title,
    description: approval.description,
    status: approval.status,
    requesterId: approval.requesterId,
    requesterName: approval.requester.name ?? "이름 없음",
    leaveType: approval.leaveType,
    leaveStart: approval.leaveStart?.toISOString() ?? null,
    leaveEnd: approval.leaveEnd?.toISOString() ?? null,
    decisionNote: approval.decisionNote,
    createdAtIso: approval.createdAt.toISOString(),
    createdAtLabel: format(approval.createdAt, "M/d HH:mm", { locale: ko }),
    href: `/approvals/${approval.id}`,
  }));

  const taskItems = ongoingTasks.map(mapTask);
  const reviewTaskItems = reviewTasks.map(mapTask);

  const scheduleItems: HomeScheduleItem[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    scheduleLabel: formatScheduleLabel(event.startAt, event.endAt, event.allDay),
    dateDay: format(event.startAt, "d", { locale: ko }),
    dateWeekday: format(event.startAt, "EEE", { locale: ko }),
    groupLabel: getEventGroupLabel(event.groupKind),
    color: event.color || "var(--accent)",
    isToday: isSameDay(event.startAt, now) || isSameDay(event.endAt, now),
    href: "/calendar",
  }));

  const noticeItems: HomeNoticeItem[] = notices.map((notice) => {
    const badgeTone = getNoticeBadgeTone(notice.badge);
    return {
      id: notice.id,
      title: notice.title,
      badgeLabel: badgeTone.label,
      createdAtLabel: format(notice.createdAt, "M/d", { locale: ko }),
      authorName: notice.author.name ?? "작성자 없음",
      href: `/notices/${notice.id}`,
    };
  });

  const requestItems: HomeRequestItem[] = myRequests.map((request) => ({
    id: request.id,
    typeLabel: getApprovalTypeLabel(request.type),
    title: request.title,
    status: request.status,
    statusLabel: getApprovalStatusLabel(request.status),
    createdAtLabel: format(request.createdAt, "M/d", { locale: ko }),
    href: `/approvals/${request.id}`,
  }));

  const recordByUserId = new Map(todayTeamRecords.map((record) => [record.userId, record]));
  const attendanceRows: HomeAttendanceItem[] = isAdmin
    ? teamMembers
        .filter((member) => member.role !== "OWNER" || member.userId !== userId)
        .map((member) => {
          const record = recordByUserId.get(member.userId);
          const tone = getAttendanceTone(record?.status ?? "ABSENT");
          return {
            id: member.userId,
            name: member.user.name ?? "이름 없음",
            status: record?.status ?? "ABSENT",
            statusLabel: tone.label,
            checkInLabel: record?.checkIn ? formatTimeLabel(record.checkIn) : "-",
            tone: { background: tone.background, color: tone.color },
          };
        })
    : [
        {
          id: userId,
          name: userName,
          status: todayAttendance?.status ?? "ABSENT",
          statusLabel: getAttendanceTone(todayAttendance?.status ?? "ABSENT").label,
          checkInLabel: formatTimeLabel(todayAttendance?.checkIn),
          tone: {
            background: getAttendanceTone(todayAttendance?.status ?? "ABSENT").background,
            color: getAttendanceTone(todayAttendance?.status ?? "ABSENT").color,
          },
        },
      ];

  const attendanceSummary = {
    checkedIn: attendanceRows.filter((row) => row.status !== "ABSENT" && row.status !== "HOLIDAY").length,
    late: attendanceRows.filter((row) => row.status === "LATE").length,
    absent: attendanceRows.filter((row) => row.status === "ABSENT").length,
    leave: attendanceRows.filter((row) => row.status === "HOLIDAY" || row.status === "EARLY_LEAVE").length,
    total: attendanceRows.length,
  };

  const data: HomeDashboardData = {
    userName,
    currentUserId: userId,
    userRole,
    isAdmin,
    dateLabel: format(now, "yyyy.MM.dd (EEE)", { locale: ko }),
    approvals: approvalItems,
    reviewTasks: reviewTaskItems,
    tasks: taskItems,
    schedules: scheduleItems,
    attendanceSummary,
    attendanceRows,
    notices: noticeItems,
    requests: requestItems,
  };

  return <HomeDashboardClient data={data} />;
}
