export const NOTICE_PRIORITY_VALUES = ["normal", "important", "urgent"] as const;
export const NOTICE_CATEGORY_VALUES = ["공지", "일정", "시설", "인사", "기타"] as const;
export const NOTICE_TARGET_OPTIONS = [
  "전체 대상",
  "매니저",
  "개발팀",
  "디자인팀",
  "운영팀",
] as const;

export type NoticePriorityValue = (typeof NOTICE_PRIORITY_VALUES)[number];
export type NoticeCategoryValue = (typeof NOTICE_CATEGORY_VALUES)[number];
export type NoticeTargetValue = (typeof NOTICE_TARGET_OPTIONS)[number];

export function isNoticePriority(value: unknown): value is NoticePriorityValue {
  return (
    typeof value === "string" &&
    NOTICE_PRIORITY_VALUES.includes(value as NoticePriorityValue)
  );
}

export function isNoticeCategory(value: unknown): value is NoticeCategoryValue {
  return (
    typeof value === "string" &&
    NOTICE_CATEGORY_VALUES.includes(value as NoticeCategoryValue)
  );
}

export function mapCategoryToBadge(value: NoticeCategoryValue) {
  switch (value) {
    case "일정":
      return "SCHEDULE" as const;
    case "시설":
      return "FACILITY" as const;
    case "인사":
      return "WORK" as const;
    case "기타":
      return "OTHER" as const;
    default:
      return "NOTICE" as const;
  }
}

export function getPriorityLabel(value: NoticePriorityValue) {
  switch (value) {
    case "urgent":
      return "긴급";
    case "important":
      return "중요";
    default:
      return "일반";
  }
}
