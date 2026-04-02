export type DocsHubTab = "DOCS" | "ALL" | "LEAVE" | "WORK" | "CALENDAR";
export type ApprovalFilterStatus = "ALL" | "PENDING" | "APPROVED" | "REJECTED";
export type ApprovalCategory = "ALL" | "LEAVE" | "WORK";
export type ApprovalTypeValue =
  | "LEAVE_REQUEST"
  | "IMPORTANT_EVENT"
  | "DEADLINE_CHANGE"
  | "BUDGET_TASK"
  | "PROJECT_REVIEW";
export type LeaveRequestType = "FULL_DAY" | "HALF_AM" | "HALF_PM";

export interface PageSummary {
  id: string;
  title: string;
  emoji: string | null;
  isPublic: boolean;
  parentId: string | null;
  updatedAt: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
  };
  _count: {
    children: number;
  };
}

export interface ApprovalActorSummary {
  id: string;
  name: string | null;
  image?: string | null;
}

export interface ApprovalRelatedEntitySummary {
  id: string;
  title: string;
}

export interface ApprovalSummary {
  id: string;
  type: ApprovalTypeValue;
  title: string;
  description: string | null;
  status: Exclude<ApprovalFilterStatus, "ALL">;
  createdAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  leaveType: LeaveRequestType | null;
  leaveStart: string | null;
  leaveEnd: string | null;
  requesterId?: string;
  deciderId?: string | null;
  requester: ApprovalActorSummary;
  decider: ApprovalActorSummary | null;
  task?: ApprovalRelatedEntitySummary | null;
  event?: ApprovalRelatedEntitySummary | null;
}

export const docsHubTabs: Array<{ value: DocsHubTab; label: string }> = [
  { value: "DOCS", label: "일반 문서" },
  { value: "ALL", label: "전체" },
  { value: "LEAVE", label: "연차" },
  { value: "WORK", label: "결재" },
  { value: "CALENDAR", label: "달력" },
];

export const approvalStatusFilters: Array<{
  value: ApprovalFilterStatus;
  label: string;
}> = [
  { value: "ALL", label: "전체" },
  { value: "PENDING", label: "대기" },
  { value: "APPROVED", label: "승인" },
  { value: "REJECTED", label: "반려" },
];

export const workApprovalTypes: Array<{
  value: Exclude<ApprovalTypeValue, "LEAVE_REQUEST">;
  label: string;
}> = [
  { value: "IMPORTANT_EVENT", label: "중요 일정 결재" },
  { value: "DEADLINE_CHANGE", label: "마감 변경 결재" },
  { value: "BUDGET_TASK", label: "예산 사용 결재" },
  { value: "PROJECT_REVIEW", label: "프로젝트 검토 결재" },
];

export const approvalTypeLabels: Record<ApprovalTypeValue, string> = {
  LEAVE_REQUEST: "연차/반차",
  IMPORTANT_EVENT: "중요 일정",
  DEADLINE_CHANGE: "마감 변경",
  BUDGET_TASK: "예산 사용",
  PROJECT_REVIEW: "프로젝트 검토",
};

export const leaveTypeLabels: Record<LeaveRequestType, string> = {
  FULL_DAY: "연차",
  HALF_AM: "오전 반차",
  HALF_PM: "오후 반차",
};

export const approvalStatusLabels: Record<Exclude<ApprovalFilterStatus, "ALL">, string> = {
  PENDING: "대기",
  APPROVED: "승인",
  REJECTED: "반려",
};
