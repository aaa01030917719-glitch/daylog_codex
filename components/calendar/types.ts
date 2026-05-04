export type CalendarGroupType = "personal" | "company" | "project" | "custom";

export type CalendarView = "month";

export type CalendarItemSource =
  | "calendarEvent"
  | "attendance"
  | "leave"
  | "holiday"
  | "project";

export type CalendarItemKind =
  | "personal"
  | "company"
  | "project"
  | "custom"
  | "attendance"
  | "leave";

export type CalendarEventGroupKindValue =
  | "PERSONAL"
  | "COMPANY_ALL"
  | "TEAM_SHARED"
  | "PROJECT"
  | "CUSTOM";

export type CalendarSystemGroupKey =
  | "personal"
  | "attendance"
  | "leave"
  | "holiday"
  | "companyAll"
  | "teamShared";

export interface CalendarGroup {
  id: string;
  name: string;
  type: CalendarGroupType;
  color: string;
  isVisible: boolean;
  isFilterable?: boolean;
  projectId?: string | null;
  ownerId?: string | null;
  readOnly?: boolean;
  systemKey?: CalendarSystemGroupKey | null;
  canCreateEvent?: boolean;
  canManageGroup?: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  allDay: boolean;
  color: string;
  textColor: string;
  groupId: string;
  groupType: CalendarGroupType;
  groupKind?: CalendarEventGroupKindValue;
  source?: "calendarEvent";
  readOnly?: boolean;
  creatorId?: string | null;
  projectId?: string | null;
  customGroupId?: string | null;
}

export interface CalendarItem {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  allDay: boolean;
  color: string;
  textColor: string;
  groupId: string;
  groupType: CalendarItemKind;
  source: CalendarItemSource;
  readOnly?: boolean;
  detailRefId?: string;
  status?: string;
  creatorId?: string | null;
  projectId?: string | null;
  projectName?: string | null;
  customGroupId?: string | null;
  approverName?: string | null;
  leaveType?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  workMinutes?: number | null;
  actionHref?: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
  groupKind?: CalendarEventGroupKindValue;
}

export interface CalendarProjectSummary {
  id: string;
  name: string;
  color: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CreateEventPayload {
  title: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  groupId: string;
  groupKind?: CalendarEventGroupKindValue;
  color: string;
  textColor?: string;
  description?: string;
  customGroupId?: string | null;
  projectId?: string | null;
}

export interface CreateCalendarGroupPayload {
  name: string;
  color: string;
}

export interface UpdateCalendarGroupPayload {
  name?: string;
  color?: string;
}

export interface CalendarFeedResponse {
  items: CalendarItem[];
}
