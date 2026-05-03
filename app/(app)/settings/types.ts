export type SettingsTab =
  | "profile"
  | "general"
  | "members"
  | "subscriptions"
  | "workhours"
  | "attendance"
  | "notifications"
  | "danger";

export type MemberRoleValue = "OWNER" | "ADMIN" | "MEMBER";
export type NotificationLevel = "push" | "badge" | "off";

export interface WorkspaceMemberRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  image: string | null;
  role: MemberRoleValue;
  department: string | null;
  joinedAt: string;
  personalColor: string | null;
}

export interface InviteLinkRow {
  id: string;
  token: string;
  role: Exclude<MemberRoleValue, "OWNER">;
  expiresAt: string | null;
  usedCount: number;
  memo: string | null;
  expired: boolean;
}

export interface WeekdaySetting {
  dayIndex: number;
  label: string;
  checkInTime: string;
  checkOutTime: string;
  isOff: boolean;
}

export interface NotificationRule {
  key: string;
  level: NotificationLevel;
}

export interface WorkspaceSettings {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  teamSize: string | null;
  themeColor: string | null;
  logoUrl: string | null;
  inviteCode: string;
  createdAt: string;
  checkInTime: string;
  checkOutTime: string;
  lateGraceMinutes: number;
  workHoursPerDay: number;
  weekdaySettings: WeekdaySetting[];
  checkoutConfirmPopup: boolean;
  showAttendanceMemo: boolean;
  excludeOwnerAttendance: boolean;
  notifyCheckoutMissed: boolean;
  notifyNextDayMissing: boolean;
  checkoutAlertTime: string;
  missingAlertTime: string;
  notificationRules: NotificationRule[];
}

export interface NotificationItem {
  group: string;
  key: string;
  label: string;
  sub: string;
  defaultLevel: NotificationLevel;
}

export const SETTINGS_TAB_NAV: Array<{
  section: string;
  items: Array<{ id: SettingsTab; label: string }>;
}> = [
  {
    section: "계정",
    items: [{ id: "profile", label: "프로필 관리" }],
  },
  {
    section: "일반",
    items: [
      { id: "general", label: "기본 정보" },
      { id: "members", label: "멤버 관리·초대 링크" },
      { id: "subscriptions", label: "구독 서비스 관리" },
    ],
  },
  {
    section: "근무",
    items: [
      { id: "workhours", label: "근무 시간" },
      { id: "attendance", label: "출퇴근 설정" },
    ],
  },
  {
    section: "알림",
    items: [{ id: "notifications", label: "알림 설정" }],
  },
  {
    section: "고급",
    items: [{ id: "danger", label: "위험 구역" }],
  },
];

export function getSettingsTabNav(role?: MemberRoleValue) {
  if (role === "MEMBER" || role === "ADMIN") {
    return [
      {
        section: "내 설정",
        items: [
          { id: "profile" as const, label: "내 프로필" },
          { id: "workhours" as const, label: "내 근무 시간" },
          { id: "attendance" as const, label: "내 출퇴근 설정" },
          { id: "notifications" as const, label: "내 알림 설정" },
        ],
      },
    ];
  }

  return SETTINGS_TAB_NAV;
}

export const WEEKDAYS = [
  "월요일",
  "화요일",
  "수요일",
  "목요일",
  "금요일",
  "토요일",
  "일요일",
] as const;

export const INDUSTRY_OPTIONS = [
  "마케팅·광고",
  "IT·소프트웨어",
  "유통·커머스",
  "제조·생산",
  "교육·연구",
  "의료·서비스",
  "기타",
] as const;

export const TEAM_SIZE_OPTIONS = [
  "5명 이하",
  "6~10명",
  "11~20명",
  "21명 이상",
] as const;

export const THEME_COLORS = [
  { hex: "#4F7CFF", name: "기본 블루" },
  { hex: "#F56B23", name: "오렌지" },
  { hex: "#22C55E", name: "그린" },
  { hex: "#8B5CF6", name: "바이올렛" },
  { hex: "#EC4899", name: "핑크" },
  { hex: "#14B8A6", name: "민트" },
  { hex: "#EAB308", name: "옐로" },
  { hex: "#F97316", name: "앰버" },
  { hex: "#64748B", name: "슬레이트" },
  { hex: "#0EA5E9", name: "스카이" },
  { hex: "#FB7185", name: "로즈" },
  { hex: "#A3E635", name: "라임" },
] as const;

export const NOTIFICATION_ITEMS: NotificationItem[] = [
  {
    group: "즉시 확인",
    key: "confirm_request",
    label: "결재 요청",
    sub: "연차, 반차, 업무 결재 요청이 들어오면 바로 알려드립니다.",
    defaultLevel: "push",
  },
  {
    group: "즉시 확인",
    key: "deadline_d1",
    label: "마감 D-1",
    sub: "내일 마감하는 일정과 작업을 빠르게 확인할 수 있습니다.",
    defaultLevel: "push",
  },
  {
    group: "즉시 확인",
    key: "budget_over",
    label: "예산 초과",
    sub: "프로젝트 예산이 기준치를 넘기면 즉시 알려드립니다.",
    defaultLevel: "push",
  },
  {
    group: "업무 알림",
    key: "confirm_result",
    label: "결재 결과",
    sub: "요청이 승인되거나 반려되면 결과를 빠르게 확인할 수 있습니다.",
    defaultLevel: "badge",
  },
  {
    group: "업무 알림",
    key: "mention",
    label: "@멘션",
    sub: "문서와 전달함에서 멘션되면 배지로 표시합니다.",
    defaultLevel: "badge",
  },
  {
    group: "업무 알림",
    key: "notice_new",
    label: "새 공지",
    sub: "새 공지사항이 등록되면 워크스페이스 구성원에게 안내합니다.",
    defaultLevel: "badge",
  },
  {
    group: "참고 알림",
    key: "idea_like",
    label: "아이디어 반응",
    sub: "내 아이디어에 반응이 생기면 참고용으로 알려드립니다.",
    defaultLevel: "off",
  },
  {
    group: "참고 알림",
    key: "notice_read",
    label: "공지 읽음 현황",
    sub: "공지 읽음 현황은 배지 없이 참고 정보로만 표시합니다.",
    defaultLevel: "off",
  },
];

export const ROLE_LABELS: Record<MemberRoleValue, string> = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
};
