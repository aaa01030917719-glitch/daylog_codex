export type NoticeBadgeValue =
  | "SCHEDULE"
  | "FACILITY"
  | "NOTICE"
  | "WORK"
  | "OTHER";

export type NoticeTab = "NOTICES" | "LEAVE" | "MINUTES";

export interface NoticeSummary {
  id: string;
  title: string;
  content: string;
  badge: NoticeBadgeValue;
  startDate: string;
  endDate: string;
  createdAt: string;
  authorId: string;
  authorName: string;
}

export interface NoticePayload {
  title: string;
  content: string;
  badge: NoticeBadgeValue;
  startDate: string;
  endDate: string;
}

export const NOTICE_BADGE_OPTIONS: Array<{
  value: NoticeBadgeValue;
  label: string;
}> = [
  { value: "SCHEDULE", label: "일정" },
  { value: "FACILITY", label: "시설" },
  { value: "NOTICE", label: "공지" },
  { value: "WORK", label: "업무" },
  { value: "OTHER", label: "기타" },
];
