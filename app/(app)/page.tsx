import { auth } from "@/auth";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { redirect } from "next/navigation";
import {
  WorkspaceDashboard,
  buildDashboardStatCards,
} from "@/components/dashboard/WorkspaceDashboard";
import { mapProjectRecordToSummary } from "@/components/projects/project-data-mappers";
import { getProjectBaseSelect, getProjectColumnSupport } from "@/lib/project-column-support";
import { prisma } from "@/lib/prisma";
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
      return { label: "추가근무", background: "var(--accent-light)", color: "#C05621" };
    case "ABSENT":
      return { label: "부재", background: "#FDECEA", color: "#D93025" };
    default:
      return { label: "미기록", background: "#F3F4F6", color: "#6B7280" };
  }
}

function getNoticeBadgeTone(badge: string) {
  switch (badge) {
    case "SCHEDULE":
      return { label: "일정", background: "#EFF6FF", color: "#2563EB" };
    case "FACILITY":
      return { label: "시설", background: "#EEFBF3", color: "#15803D" };
    case "NOTICE":
      return { label: "공지", background: "var(--accent-light)", color: "var(--accent)" };
    case "WORK":
      return { label: "업무", background: "#F5F3FF", color: "#7C3AED" };
    default:
      return { label: "기타", background: "#F3F4F6", color: "#4B5563" };
  }
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
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  if (!workspaceId) {
    const emptyTone = getAttendanceTone();

    return (
      <WorkspaceDashboard
        userName={userName}
        userRole={userRole}
        stats={buildDashboardStatCards({
          ongoingProjects: 0,
          totalProjects: 0,
          ideaCount: 0,
          pendingDocs: 0,
          remainingLeave: "준비중",
        })}
        attendance={{
          isAdmin,
          dateLabel: format(now, "yyyy.MM.dd (eee)", { locale: ko }),
          currentStatusLabel: emptyTone.label,
          currentStatusTone: {
            background: emptyTone.background,
            color: emptyTone.color,
          },
          checkInLabel: "-",
          checkOutLabel: "-",
          summaryLabel: "워크스페이스 정보가 없습니다.",
          hasCheckIn: false,
          hasCheckOut: false,
          statusCode: null,
          teamCheckedIn: 0,
          teamTotal: 0,
          lateCount: 0,
          holidayCount: 0,
          todayRows: [],
        }}
        notices={[]}
        events={[]}
        leaveMarkers={[]}
        projects={[]}
      />
    );
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
        endAt: { gte: todayStart },
      }
    : {
        workspaceId,
        endAt: { gte: todayStart },
        OR: [{ creatorId: userId }, { isImportant: true }],
    };

  const projectColumnSupport = await getProjectColumnSupport();

  const [
    todayAttendance,
    pendingDocsCount,
    ideaCount,
    notices,
    events,
    leaveRecords,
    rawProjects,
    todayTeamRecords,
    teamMemberCount,
  ] = await Promise.all([
    prisma.attendance.findUnique({
      where: { userId_date: { userId, date: todayStart } },
      select: { checkIn: true, checkOut: true, status: true },
    }),
    prisma.approval.count({
      where: approvalWhere,
    }),
    prisma.boardPost.count({
      where: {
        workspaceId,
        type: "IDEA",
        OR: [{ visibility: "SHARED" }, { visibility: "PRIVATE", authorId: userId }],
      },
    }),
    prisma.notice.findMany({
      where: {
        workspaceId,
      },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.event.findMany({
      where: eventWhere,
      orderBy: [{ startAt: "asc" }, { createdAt: "desc" }],
      take: 5,
    }),
    prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: monthStart, lte: monthEnd },
        status: { in: ["HOLIDAY", "EARLY_LEAVE"] },
      },
      select: {
        date: true,
        status: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.project.findMany({
      where: { workspaceId },
      select: {
        ...getProjectBaseSelect(projectColumnSupport),
        _count: { select: { tasks: true } },
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            createdAt: true,
            dueDate: true,
            assignee: { select: { name: true } },
            tags: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
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
          take: 5,
        })
      : Promise.resolve([]),
    isAdmin
      ? prisma.workspaceMember.count({
          where: { workspaceId },
        })
      : Promise.resolve(0),
  ]);

  const projectSummaries = rawProjects.map((project) =>
    mapProjectRecordToSummary(project, projectColumnSupport)
  );

  const ongoingProjects = projectSummaries.filter((project) => project.boardStatus === "ONGOING");

  const currentAttendanceTone = getAttendanceTone(todayAttendance?.status);
  const attendance = {
    isAdmin,
    dateLabel: format(now, "yyyy.MM.dd (eee)", { locale: ko }),
    currentStatusLabel: currentAttendanceTone.label,
    currentStatusTone: {
      background: currentAttendanceTone.background,
      color: currentAttendanceTone.color,
    },
    checkInLabel: formatTimeLabel(todayAttendance?.checkIn),
    checkOutLabel: formatTimeLabel(todayAttendance?.checkOut),
    summaryLabel: todayAttendance?.checkIn
      ? todayAttendance.checkOut
        ? "오늘 기록이 완료되었습니다."
        : "오늘 출근 기록이 등록되었습니다."
      : "아직 출근 기록이 없습니다.",
    hasCheckIn: Boolean(todayAttendance?.checkIn),
    hasCheckOut: Boolean(todayAttendance?.checkOut),
    statusCode: todayAttendance?.status ?? null,
    teamCheckedIn: todayTeamRecords.filter((record) => Boolean(record.checkIn)).length,
    teamTotal: teamMemberCount,
    lateCount: todayTeamRecords.filter((record) => record.status === "LATE").length,
    holidayCount: todayTeamRecords.filter((record) => record.status === "HOLIDAY").length,
    todayRows: isAdmin
      ? todayTeamRecords.map((record) => {
          const tone = getAttendanceTone(record.status);
          return {
            id: record.id,
            name: record.user.name ?? "이름 없음",
            statusLabel: tone.label,
            tone: { background: tone.background, color: tone.color },
            checkInLabel: formatTimeLabel(record.checkIn),
          };
        })
      : [
          {
            id: userId,
            name: userName,
            statusLabel: currentAttendanceTone.label,
            tone: {
              background: currentAttendanceTone.background,
              color: currentAttendanceTone.color,
            },
            checkInLabel: formatTimeLabel(todayAttendance?.checkIn),
          },
        ],
  };

  return (
    <WorkspaceDashboard
      userName={userName}
      userRole={userRole}
      stats={buildDashboardStatCards({
        ongoingProjects: ongoingProjects.length,
        totalProjects: rawProjects.length,
        ideaCount,
        pendingDocs: pendingDocsCount,
        remainingLeave: "준비중",
      })}
      attendance={attendance}
      notices={notices.map((notice) => {
        const badgeTone = getNoticeBadgeTone(notice.badge);
        return {
          id: notice.id,
          title: notice.title,
          badgeLabel: badgeTone.label,
          badgeTone: {
            background: badgeTone.background,
            color: badgeTone.color,
          },
          createdAt: format(new Date(notice.createdAt), "M/d", { locale: ko }),
        };
      })}
      events={events.map((event) => ({
        id: event.id,
        title: event.title,
        startAt: event.startAt.toISOString(),
        endAt: event.endAt.toISOString(),
        allDay: event.allDay,
        scheduleLabel: event.allDay
          ? `${format(new Date(event.startAt), "M/d (EEE)", { locale: ko })} · 종일`
          : `${format(new Date(event.startAt), "M/d (EEE) HH:mm", {
              locale: ko,
            })} - ${format(new Date(event.endAt), "HH:mm", { locale: ko })}`,
        color: event.color,
      }))}
      leaveMarkers={leaveRecords.map((record) => ({
        date: format(record.date, "yyyy-MM-dd"),
        kind: record.status === "HOLIDAY" ? "leave" : "half",
      }))}
      projects={ongoingProjects.slice(0, 3).map((project) => ({
        id: project.id,
        name: project.name,
        subtitle: project.subtitle,
        progress: project.progress,
        assigneeLabel:
          project.assigneeNames.length > 0
            ? `담당자 ${project.assigneeNames.slice(0, 2).join(", ")}`
            : "담당자 미지정",
        tagLabel: project.tags.length > 0 ? `#${project.tags[0]}` : "#태그없음",
        color: project.color,
      }))}
    />
  );
}
