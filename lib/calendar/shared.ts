import type {
  CalendarEventGroupKindValue,
  CalendarGroup,
  CalendarProjectSummary,
} from "@/components/calendar/types";

export const CALENDAR_GROUP_IDS = {
  personal: "system-personal",
  attendance: "system-attendance",
  leave: "system-leave",
  holiday: "system-holiday",
  companyAll: "system-company-all",
  teamShared: "system-team-shared",
} as const;

export const CALENDAR_COLOR_SWATCHES = [
  "#4f7cff",
  "#2A8C50",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
  "#eab308",
] as const;

const PROJECT_TEXT_COLOR_DARK = "rgb(75, 85, 99)";
const PROJECT_TEXT_COLOR_LIGHT = "#fff";

const COLOR_PALETTE_MAP: Record<string, { color: string; textColor: string; swatch: string }> = {
  "#4f7cff": { color: "#eef2ff", textColor: "#3158C6", swatch: "#4f7cff" },
  "#eef2ff": { color: "#eef2ff", textColor: "#3158C6", swatch: "#4f7cff" },
  "#2a8c50": { color: "#dcfce7", textColor: "#2A8C50", swatch: "#2A8C50" },
  "#dcfce7": { color: "#dcfce7", textColor: "#2A8C50", swatch: "#2A8C50" },
  "#f97316": { color: "#fff0e6", textColor: "#c05621", swatch: "#f97316" },
  "#fff0e6": { color: "#fff0e6", textColor: "#c05621", swatch: "#f97316" },
  "#ef4444": { color: "#fee2e2", textColor: "#ef4444", swatch: "#ef4444" },
  "#fee2e2": { color: "#fee2e2", textColor: "#ef4444", swatch: "#ef4444" },
  "#8b5cf6": { color: "#f3f0ff", textColor: "#7c3aed", swatch: "#8b5cf6" },
  "#f3f0ff": { color: "#f3f0ff", textColor: "#7c3aed", swatch: "#8b5cf6" },
  "#eab308": { color: "#fef9c3", textColor: "#a16207", swatch: "#eab308" },
  "#fef9c3": { color: "#fef9c3", textColor: "#a16207", swatch: "#eab308" },
};

export function isManagerRole(role?: string | null) {
  return role === "ADMIN" || role === "OWNER";
}

export function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string) {
  return new Date(`${value}T00:00:00`);
}

export function startOfDate(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);
}

export function endOfDate(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate(), 23, 59, 59, 999);
}

export function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((firstDay + lastDate) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    if (index < firstDay) {
      const day = prevLastDate - firstDay + index + 1;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      return { year: prevYear, month: prevMonth, day, isCurrentMonth: false };
    }

    if (index >= firstDay + lastDate) {
      const day = index - firstDay - lastDate + 1;
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      return { year: nextYear, month: nextMonth, day, isCurrentMonth: false };
    }

    return { year, month, day: index - firstDay + 1, isCurrentMonth: true };
  });
}

export function getMonthVisibleRange(year: number, month: number) {
  const days = buildCalendarDays(year, month);
  const first = days[0];
  const last = days[days.length - 1];

  return {
    start: new Date(first.year, first.month, first.day),
    end: new Date(last.year, last.month, last.day),
  };
}

export function formatCalendarMonthLabel(year: number, month: number) {
  return `${year}년 ${month + 1}월`;
}

export function getProjectGroupId(projectId: string) {
  return `project-${projectId}`;
}

export function getCustomGroupUiId(groupId: string) {
  return `custom-${groupId}`;
}

export function resolveEventPalette(color: string, textColor?: string | null) {
  const normalized = color.trim().toLowerCase();
  const palette = COLOR_PALETTE_MAP[normalized];

  if (palette) {
    return {
      color: palette.color,
      textColor: textColor?.trim() || palette.textColor,
      swatch: palette.swatch,
    };
  }

  return {
    color,
    textColor: textColor?.trim() || "#4b5563",
    swatch: color,
  };
}

export function getPresetPalette(swatch: string) {
  return resolveEventPalette(swatch);
}

function normalizePaletteHex(color: string | null | undefined) {
  return color?.trim().toLowerCase() ?? "";
}

function getProjectPaletteIndex(seed: string) {
  return Array.from(seed).reduce((sum, character) => sum + character.charCodeAt(0), 0) %
    CALENDAR_COLOR_SWATCHES.length;
}

export function resolveProjectCalendarPalette(params: {
  projectId?: string | null;
  projectName?: string | null;
  projectColor?: string | null;
}) {
  const normalizedProjectColor = normalizePaletteHex(params.projectColor);
  const matchedSwatch = CALENDAR_COLOR_SWATCHES.find(
    (swatch) => swatch.toLowerCase() === normalizedProjectColor
  );
  const swatch =
    matchedSwatch ??
    CALENDAR_COLOR_SWATCHES[
      getProjectPaletteIndex(params.projectId || params.projectName || "project")
    ];

  return {
    color: swatch,
    textColor:
      swatch.toLowerCase() === "#eab308" ? PROJECT_TEXT_COLOR_DARK : PROJECT_TEXT_COLOR_LIGHT,
    swatch,
  };
}

export function buildCalendarGroups(params: {
  customGroups: Array<{ id: string; name: string; color: string; ownerId: string }>;
  projects: CalendarProjectSummary[];
  userRole: string;
}) {
  const { customGroups, projects, userRole } = params;
  const canManageCompany = isManagerRole(userRole);

  const groups: CalendarGroup[] = [
    {
      id: CALENDAR_GROUP_IDS.personal,
      name: "개인 일정",
      type: "personal",
      color: "#4f7cff",
      isVisible: true,
      systemKey: "personal",
      canCreateEvent: true,
      canManageGroup: false,
      readOnly: false,
    },
    {
      id: CALENDAR_GROUP_IDS.attendance,
      name: "내 근태 기록",
      type: "personal",
      color: "#2A8C50",
      isVisible: true,
      systemKey: "attendance",
      canCreateEvent: false,
      canManageGroup: false,
      readOnly: true,
    },
    {
      id: CALENDAR_GROUP_IDS.leave,
      name: "내 휴가/연차 기록",
      type: "personal",
      color: "#8b5cf6",
      isVisible: true,
      systemKey: "leave",
      canCreateEvent: false,
      canManageGroup: false,
      readOnly: true,
    },
    {
      id: CALENDAR_GROUP_IDS.holiday,
      name: "공휴일",
      type: "company",
      color: "#2A8C50",
      isVisible: true,
      isFilterable: false,
      systemKey: "holiday",
      canCreateEvent: false,
      canManageGroup: false,
      readOnly: true,
    },
    {
      id: CALENDAR_GROUP_IDS.companyAll,
      name: "전사 일정",
      type: "company",
      color: "#2A8C50",
      isVisible: true,
      systemKey: "companyAll",
      canCreateEvent: canManageCompany,
      canManageGroup: false,
      readOnly: false,
    },
    {
      id: CALENDAR_GROUP_IDS.teamShared,
      name: "팀 공용 일정",
      type: "company",
      color: "#2A8C50",
      isVisible: true,
      systemKey: "teamShared",
      canCreateEvent: canManageCompany,
      canManageGroup: false,
      readOnly: false,
    },
    ...projects.map((project) => ({
      id: getProjectGroupId(project.id),
      name: project.name,
      type: "project" as const,
      color: resolveProjectCalendarPalette({
        projectId: project.id,
        projectName: project.name,
        projectColor: project.color,
      }).swatch,
      isVisible: false,
      projectId: project.id,
      canCreateEvent: false,
      canManageGroup: false,
      readOnly: false,
    })),
    ...customGroups.map((group) => ({
      id: getCustomGroupUiId(group.id),
      name: group.name,
      type: "custom" as const,
      color: group.color,
      isVisible: true,
      ownerId: group.ownerId,
      canCreateEvent: true,
      canManageGroup: true,
      readOnly: false,
    })),
  ];

  return groups;
}

export function getGroupIdForEvent(params: {
  groupKind: CalendarEventGroupKindValue;
  customGroupId?: string | null;
  projectId?: string | null;
}) {
  const { groupKind, customGroupId, projectId } = params;

  switch (groupKind) {
    case "PERSONAL":
      return CALENDAR_GROUP_IDS.personal;
    case "COMPANY_ALL":
      return CALENDAR_GROUP_IDS.companyAll;
    case "TEAM_SHARED":
      return CALENDAR_GROUP_IDS.teamShared;
    case "PROJECT":
      return projectId ? getProjectGroupId(projectId) : CALENDAR_GROUP_IDS.companyAll;
    case "CUSTOM":
      return customGroupId ? getCustomGroupUiId(customGroupId) : CALENDAR_GROUP_IDS.personal;
    default:
      return CALENDAR_GROUP_IDS.personal;
  }
}
