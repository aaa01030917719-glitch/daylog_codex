export type NoticePriorityValue = "normal" | "important" | "urgent";
export type NoticeCategoryValue = "공지" | "일정" | "시설" | "인사" | "기타";

export interface NoticeReadSummary {
  userId: string;
  name: string;
  readAt: string;
}

export interface NoticePageNotice {
  id: string;
  title: string;
  content: string;
  badge: "SCHEDULE" | "FACILITY" | "NOTICE" | "WORK" | "OTHER";
  category: NoticeCategoryValue;
  priority: NoticePriorityValue;
  target: string[];
  requireReadConfirm: boolean;
  startDate: string;
  endDate: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  canManage: boolean;
  commentCount: number;
  readBy: NoticeReadSummary[];
  isRead: boolean;
  targetMemberCount: number;
}

export interface NoticePageLeaveStatus {
  memberId: string;
  memberName: string;
  totalAnnualLeave: number;
  usedAnnualLeave: number;
  remainingAnnualLeave: number;
  plannedLabel: string;
  statusLabel: "정상" | "소진";
}

export interface NoticeMinuteSummary {
  id: string;
  title: string;
  updatedAt: string;
  authorName: string;
}

export interface NoticeWritePayload {
  title: string;
  content: string;
  category: NoticeCategoryValue;
  priority: NoticePriorityValue;
  target: string[];
  requireReadConfirm: boolean;
  sendPush: boolean;
}
