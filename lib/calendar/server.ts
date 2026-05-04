import "server-only";

import {
  ApprovalStatus,
  ApprovalType,
  CalendarEventGroupKind,
  LeaveType,
  type Event,
} from "@prisma/client";
import type {
  CalendarEventGroupKindValue,
  CalendarGroup,
  CalendarItem,
  CalendarProjectSummary,
} from "@/components/calendar/types";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";
import { getHolidayItemsInRange } from "@/lib/calendar/holidays";
import {
  CALENDAR_GROUP_IDS,
  buildCalendarGroups,
  endOfDate,
  getGroupIdForEvent,
  getMonthVisibleRange,
  isManagerRole,
  resolveProjectCalendarPalette,
  resolveEventPalette,
  toDateKey,
} from "@/lib/calendar/shared";

function formatTimeLabel(value: Date | null) {
  if (!value) {
    return "없음";
  }

  return `${value.getHours().toString().padStart(2, "0")}:${value
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function formatLeaveLabel(leaveType: LeaveType | null) {
  switch (leaveType) {
    case "HALF_AM":
      return "오전 반차";
    case "HALF_PM":
      return "오후 반차";
    case "FULL_DAY":
    default:
      return "연차";
  }
}

function getEventItemGroupType(groupKind: CalendarEventGroupKindValue) {
  switch (groupKind) {
    case "CUSTOM":
      return "custom" as const;
    case "PROJECT":
      return "project" as const;
    case "COMPANY_ALL":
    case "TEAM_SHARED":
      return "company" as const;
    case "PERSONAL":
    default:
      return "personal" as const;
  }
}

function normalizeDateRange(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function createDateFromEvent(value: Date) {
  return toDateKey(new Date(value.getFullYear(), value.getMonth(), value.getDate()));
}

export async function resolveCalendarWorkspaceId(params: {
  userId: string;
  sessionWorkspaceId?: string | null;
}) {
  return resolveWorkspaceIdForUser(params.userId, params.sessionWorkspaceId ?? undefined);
}

export async function getCalendarProjects(workspaceId: string) {
  const projects = await prisma.project.findMany({
    where: {
      workspaceId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      color: true,
      startDate: true,
      endDate: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return projects.map(
    (project): CalendarProjectSummary => ({
      id: project.id,
      name: project.name,
      color: project.color,
      startDate: project.startDate ? createDateFromEvent(project.startDate) : null,
      endDate: project.endDate ? createDateFromEvent(project.endDate) : null,
    })
  );
}

export async function getCustomCalendarGroups(workspaceId: string, userId: string) {
  return prisma.calendarGroup.findMany({
    where: {
      workspaceId,
      ownerId: userId,
    },
    select: {
      id: true,
      name: true,
      color: true,
      ownerId: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getCalendarGroups(params: {
  workspaceId: string;
  userId: string;
  userRole: string;
}) {
  const [projects, customGroups] = await Promise.all([
    getCalendarProjects(params.workspaceId),
    getCustomCalendarGroups(params.workspaceId, params.userId),
  ]);

  return buildCalendarGroups({
    customGroups,
    projects,
    userRole: params.userRole,
  });
}

export function canCreateEventKind(params: {
  groupKind: CalendarEventGroupKindValue;
  userRole: string;
}) {
  if (isManagerRole(params.userRole)) {
    return true;
  }

  return params.groupKind === "PERSONAL" || params.groupKind === "CUSTOM";
}

export function canManageEvent(params: {
  event: Pick<Event, "creatorId" | "groupKind">;
  userId: string;
  userRole: string;
}) {
  if (
    params.event.groupKind === CalendarEventGroupKind.COMPANY_ALL ||
    params.event.groupKind === CalendarEventGroupKind.TEAM_SHARED ||
    params.event.groupKind === CalendarEventGroupKind.PROJECT
  ) {
    return isManagerRole(params.userRole);
  }

  return params.event.creatorId === params.userId;
}

export async function validateCalendarGroupSelection(params: {
  workspaceId: string;
  userId: string;
  userRole: string;
  groupKind: CalendarEventGroupKindValue;
  customGroupId?: string | null;
  projectId?: string | null;
}) {
  if (!canCreateEventKind({ groupKind: params.groupKind, userRole: params.userRole })) {
    throw new Error("FORBIDDEN:이 일정 유형을 생성할 권한이 없습니다.");
  }

  if (params.groupKind === "CUSTOM") {
    if (!params.customGroupId) {
      throw new Error("BAD_REQUEST:추가한 일정 그룹을 선택해 주세요.");
    }

    const customGroup = await prisma.calendarGroup.findFirst({
      where: {
        id: params.customGroupId,
        workspaceId: params.workspaceId,
        ownerId: params.userId,
      },
      select: { id: true },
    });

    if (!customGroup) {
      throw new Error("FORBIDDEN:선택한 추가 일정 그룹에 접근할 수 없습니다.");
    }
  }

  if (params.groupKind === "PROJECT") {
    if (!params.projectId) {
      throw new Error("BAD_REQUEST:연결할 프로젝트를 선택해 주세요.");
    }

    const project = await prisma.project.findFirst({
      where: {
        id: params.projectId,
        workspaceId: params.workspaceId,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (!project) {
      throw new Error("BAD_REQUEST:활성 프로젝트를 찾을 수 없습니다.");
    }
  }
}

function serializeCalendarEventItem(params: {
  event: Event & {
    project: { id: string; name: string; color: string } | null;
    customGroup: { id: string; color: string } | null;
  };
  userId: string;
  userRole: string;
}): CalendarItem {
  const { event, userId, userRole } = params;
  const palette =
    event.groupKind === CalendarEventGroupKind.PROJECT
      ? resolveProjectCalendarPalette({
          projectId: event.projectId,
          projectName: event.project?.name,
          projectColor: event.project?.color ?? event.color,
        })
      : event.groupKind === CalendarEventGroupKind.CUSTOM
        ? resolveEventPalette(event.customGroup?.color ?? event.color)
      : resolveEventPalette(event.color, event.textColor);
  const canManage = canManageEvent({
    event,
    userId,
    userRole,
  });

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startDate: toDateKey(event.startAt),
    endDate: toDateKey(event.endAt),
    allDay: event.allDay,
    color: palette.color,
    textColor: palette.textColor,
    groupId: getGroupIdForEvent({
      groupKind: event.groupKind,
      customGroupId: event.customGroupId,
      projectId: event.projectId,
    }),
    groupType: getEventItemGroupType(event.groupKind),
    source: "calendarEvent",
    readOnly: false,
    detailRefId: event.id,
    creatorId: event.creatorId,
    projectId: event.projectId,
    projectName: event.project?.name ?? null,
    customGroupId: event.customGroupId,
    canEdit: canManage,
    canDelete: canManage,
    groupKind: event.groupKind,
  };
}

export async function getCalendarFeed(params: {
  workspaceId: string;
  userId: string;
  userRole: string;
  start: Date;
  end: Date;
}) {
  const rangeStart = normalizeDateRange(params.start);
  const rangeEnd = endOfDate(params.end);

  const [projects, events, attendances, leaves] = await Promise.all([
    getCalendarProjects(params.workspaceId),
    prisma.event.findMany({
      where: {
        workspaceId: params.workspaceId,
        startAt: { lte: rangeEnd },
        endAt: { gte: rangeStart },
        OR: [
          {
            groupKind: {
              in: [
                CalendarEventGroupKind.COMPANY_ALL,
                CalendarEventGroupKind.TEAM_SHARED,
                CalendarEventGroupKind.PROJECT,
              ],
            },
          },
          {
            creatorId: params.userId,
            groupKind: {
              in: [CalendarEventGroupKind.PERSONAL, CalendarEventGroupKind.CUSTOM],
            },
          },
        ],
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        customGroup: {
          select: {
            id: true,
            color: true,
          },
        },
      },
      orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.attendance.findMany({
      where: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        date: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      orderBy: { date: "asc" },
    }),
    prisma.approval.findMany({
      where: {
        requesterId: params.userId,
        type: ApprovalType.LEAVE_REQUEST,
        status: {
          in: [ApprovalStatus.APPROVED, ApprovalStatus.PENDING],
        },
        leaveStart: { lte: rangeEnd },
        leaveEnd: { gte: rangeStart },
      },
      include: {
        decider: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ leaveStart: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const eventItems = events.map((event) =>
    serializeCalendarEventItem({
      event,
      userId: params.userId,
      userRole: params.userRole,
    })
  );

  const attendanceItems: CalendarItem[] = attendances.map((attendance) => ({
    id: `attendance-${attendance.id}`,
    title: `출근 ${formatTimeLabel(attendance.checkIn)} · 퇴근 ${formatTimeLabel(
      attendance.checkOut
    )}`,
    description: attendance.memo,
    startDate: toDateKey(attendance.date),
    endDate: toDateKey(attendance.date),
    allDay: true,
    color: "#eef2ff",
    textColor: "#3158C6",
    groupId: CALENDAR_GROUP_IDS.attendance,
    groupType: "attendance",
    source: "attendance",
    readOnly: true,
    detailRefId: attendance.id,
    status: attendance.status,
    checkIn: attendance.checkIn?.toISOString() ?? null,
    checkOut: attendance.checkOut?.toISOString() ?? null,
    workMinutes: attendance.workMinutes,
    actionHref: "/attendance",
  }));

  const leaveItems: CalendarItem[] = leaves.map((leave) => {
    const label = formatLeaveLabel(leave.leaveType);
    const isPending = leave.status === ApprovalStatus.PENDING;

    return {
      id: `leave-${leave.id}`,
      title: isPending ? `${label} · 대기` : label,
      description: leave.description,
      startDate: leave.leaveStart ? toDateKey(leave.leaveStart) : toDateKey(new Date()),
      endDate: leave.leaveEnd ? toDateKey(leave.leaveEnd) : toDateKey(new Date()),
      allDay: true,
      color: isPending ? "#f3f4f6" : "#f3f0ff",
      textColor: isPending ? "#6b7280" : "#7c3aed",
      groupId: CALENDAR_GROUP_IDS.leave,
      groupType: "leave",
      source: "leave",
      readOnly: true,
      detailRefId: leave.id,
      status: leave.status,
      leaveType: leave.leaveType,
      approverName: leave.decider?.name ?? null,
      actionHref: "/docs",
    };
  });

  const projectItems: CalendarItem[] = projects
    .filter((project) => project.startDate && project.endDate)
    .filter((project) => {
      if (!project.startDate || !project.endDate) {
        return false;
      }

      return project.startDate <= toDateKey(rangeEnd) && project.endDate >= toDateKey(rangeStart);
    })
    .map((project) => {
      const palette = resolveProjectCalendarPalette({
        projectId: project.id,
        projectName: project.name,
        projectColor: project.color,
      });

      return {
        id: `project-${project.id}`,
        title: project.name,
        description: "프로젝트 기간 일정",
        startDate: project.startDate ?? toDateKey(rangeStart),
        endDate: project.endDate ?? toDateKey(rangeEnd),
        allDay: true,
        color: palette.color,
        textColor: palette.textColor,
        groupId: getGroupIdForEvent({
          groupKind: "PROJECT",
          projectId: project.id,
        }),
        groupType: "project",
        source: "project",
        readOnly: true,
        detailRefId: project.id,
        projectId: project.id,
        projectName: project.name,
        actionHref: `/projects/${project.id}`,
      };
    });

  const holidayItems = getHolidayItemsInRange(rangeStart, rangeEnd);

  const items = [
    ...holidayItems,
    ...projectItems,
    ...eventItems,
    ...attendanceItems,
    ...leaveItems,
  ].sort((left, right) => {
    if (left.startDate === right.startDate) {
      return left.title.localeCompare(right.title, "ko");
    }

    return left.startDate.localeCompare(right.startDate);
  });

  return items;
}

export async function getCalendarPageData(params: {
  userId: string;
  userRole: string;
  sessionWorkspaceId?: string | null;
  year?: number;
  month?: number;
}) {
  const workspaceId = await resolveCalendarWorkspaceId({
    userId: params.userId,
    sessionWorkspaceId: params.sessionWorkspaceId,
  });

  if (!workspaceId) {
    return {
      workspaceId: "",
      groups: [] as CalendarGroup[],
      items: [] as CalendarItem[],
      projects: [] as CalendarProjectSummary[],
    };
  }

  const today = new Date();
  const year = params.year ?? today.getFullYear();
  const month = params.month ?? today.getMonth();
  const range = getMonthVisibleRange(year, month);

  const [projects, groups, items] = await Promise.all([
    getCalendarProjects(workspaceId),
    getCalendarGroups({
      workspaceId,
      userId: params.userId,
      userRole: params.userRole,
    }),
    getCalendarFeed({
      workspaceId,
      userId: params.userId,
      userRole: params.userRole,
      start: range.start,
      end: range.end,
    }),
  ]);

  return {
    workspaceId,
    groups,
    items,
    projects,
  };
}
