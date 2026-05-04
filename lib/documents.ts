export const DOCUMENT_TYPE_VALUES = [
  "LEAVE",
  "HALF_DAY",
  "AM_HALF_DAY",
  "PM_HALF_DAY",
  "OUT_OF_OFFICE",
  "EARLY_LEAVE",
  "APPROVAL",
  "OTHER",
] as const;
export const DOCUMENT_STATUS_VALUES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;
export const HALF_DAY_PERIOD_VALUES = ["AM", "PM"] as const;

export type DocumentTypeValue = (typeof DOCUMENT_TYPE_VALUES)[number];
export type DocumentStatusValue = (typeof DOCUMENT_STATUS_VALUES)[number];
export type HalfDayPeriodValue = (typeof HALF_DAY_PERIOD_VALUES)[number];

export interface DocumentSummary {
  id: string;
  title: string;
  type: DocumentTypeValue;
  status: DocumentStatusValue;
  halfDayPeriod: HalfDayPeriodValue | null;
  reason: string;
  amount: number | null;
  costType: string | null;
  attachmentName: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  authorId: string;
  authorName: string;
  approverName: string;
  ccUserId: string | null;
  ccUserName: string | null;
  approvalId: string | null;
  rejectionReason: string | null;
  canCancel: boolean;
  isMine: boolean;
}

export interface DocumentMemberOption {
  id: string;
  name: string;
  role: string;
}

export interface DocumentStats {
  annualLeave: number;
  usedDays: number;
  remainingDays: number;
  pendingCount: number;
  submittedThisMonth: number;
  approvedThisMonth: number;
  rejectedThisMonth: number;
  upcomingDays: number;
}

export interface DocumentCreatePayload {
  title: string | null;
  type: DocumentTypeValue;
  halfDayPeriod: HalfDayPeriodValue | null;
  startDate: string | null;
  endDate: string | null;
  reason: string;
  amount: number | null;
  costType: string | null;
  attachmentName: string | null;
  ccUserId: string | null;
}

interface AttendanceEditReasonPayload {
  kind?: string;
  date?: string | null;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  reason?: string | null;
}

export function isDocumentType(value: unknown): value is DocumentTypeValue {
  return typeof value === "string" && DOCUMENT_TYPE_VALUES.includes(value as DocumentTypeValue);
}

export function isDocumentStatus(value: unknown): value is DocumentStatusValue {
  return (
    typeof value === "string" &&
    DOCUMENT_STATUS_VALUES.includes(value as DocumentStatusValue)
  );
}

export function isHalfDayPeriod(value: unknown): value is HalfDayPeriodValue {
  return (
    typeof value === "string" &&
    HALF_DAY_PERIOD_VALUES.includes(value as HalfDayPeriodValue)
  );
}

export function getDocumentTypeLabel(value: DocumentTypeValue) {
  if (value === "AM_HALF_DAY") {
    return "오전반차";
  }

  if (value === "PM_HALF_DAY") {
    return "오후반차";
  }

  if (value === "OUT_OF_OFFICE") {
    return "외근";
  }

  if (value === "EARLY_LEAVE") {
    return "조퇴";
  }

  switch (value) {
    case "LEAVE":
      return "연차";
    case "HALF_DAY":
      return "반차";
    case "APPROVAL":
      return "결재 요청";
    default:
      return "기타 문서";
  }
}

export function getDocumentStatusLabel(value: DocumentStatusValue) {
  switch (value) {
    case "APPROVED":
      return "승인됨";
    case "REJECTED":
      return "반려됨";
    case "CANCELLED":
      return "취소";
    default:
      return "검토 중";
  }
}

export function getDocumentIcon(value: DocumentTypeValue) {
  if (value === "OUT_OF_OFFICE") {
    return "외근";
  }

  if (value === "EARLY_LEAVE") {
    return "조퇴";
  }

  if (value === "AM_HALF_DAY" || value === "PM_HALF_DAY") {
    return "반차";
  }

  switch (value) {
    case "LEAVE":
      return "연차";
    case "HALF_DAY":
      return "반차";
    case "APPROVAL":
      return "결재";
    default:
      return "문서";
  }
}

export function getHalfDayPeriodLabel(value: HalfDayPeriodValue | null) {
  if (value === "AM") {
    return "오전 반차";
  }

  if (value === "PM") {
    return "오후 반차";
  }

  return "-";
}

export function calculateLeaveDays(
  type: DocumentTypeValue,
  startDate: Date | null,
  endDate: Date | null
) {
  if (!startDate || !endDate) {
    return 0;
  }

  if (type === "HALF_DAY" || type === "AM_HALF_DAY" || type === "PM_HALF_DAY") {
    return 0.5;
  }

  if (type !== "LEAVE") {
    return 0;
  }

  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function formatLeaveSummaryDays(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function formatDateDots(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}.${month}.${day}`;
}

function formatTimeLabel(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export function parseAttendanceEditReasonPayload(
  value: string | null | undefined
): AttendanceEditReasonPayload | null {
  const trimmed = value?.trim();
  if (!trimmed || !trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as AttendanceEditReasonPayload;
    if (parsed.kind !== "ATTENDANCE_EDIT") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function getAttendanceEditDisplay(value: string | null | undefined) {
  const parsed = parseAttendanceEditReasonPayload(value);
  if (!parsed) {
    return null;
  }

  const dateLabel = formatDateDots(parsed.date);
  const checkInText = formatTimeLabel(parsed.requestedCheckIn) ?? "-";
  const checkOutText = formatTimeLabel(parsed.requestedCheckOut) ?? "-";
  const reasonText = parsed.reason?.trim() ?? "";

  return {
    dateLabel,
    periodLabel: `출근 ${checkInText} / 퇴근 ${checkOutText}`,
    reasonText,
  };
}

export function formatDocumentReasonPreview(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const attendanceEdit = getAttendanceEditDisplay(value);
  if (!attendanceEdit) {
    return value;
  }

  const reasonSuffix = attendanceEdit.reasonText
    ? ` (사유: ${attendanceEdit.reasonText})`
    : "";

  return `${attendanceEdit.dateLabel ? `${attendanceEdit.dateLabel} · ` : ""}${attendanceEdit.periodLabel}${reasonSuffix}`;
}

export function buildDocumentTitle(params: {
  type: DocumentTypeValue;
  startDate: Date | null;
  endDate: Date | null;
  halfDayPeriod: HalfDayPeriodValue | null;
  amount: number | null;
}) {
  const { type, startDate, endDate, halfDayPeriod, amount } = params;

  if (type === "APPROVAL") {
    return amount ? `결재 요청 · ${amount.toLocaleString("ko-KR")}원` : "결재 요청";
  }

  if (type === "OTHER") {
    return "기타 문서";
  }

  if (!startDate) {
    return getDocumentTypeLabel(type);
  }

  const startLabel = `${startDate.getMonth() + 1}/${startDate.getDate()}`;
  const endLabel = endDate
    ? `${endDate.getMonth() + 1}/${endDate.getDate()}`
    : startLabel;

  if (type === "HALF_DAY") {
    return `${getHalfDayPeriodLabel(halfDayPeriod)} · ${startLabel}`;
  }

  if (
    type === "AM_HALF_DAY" ||
    type === "PM_HALF_DAY" ||
    type === "OUT_OF_OFFICE" ||
    type === "EARLY_LEAVE"
  ) {
    return `${getDocumentTypeLabel(type)} 쨌 ${startLabel}`;
  }

  return startLabel === endLabel
    ? `${getDocumentTypeLabel(type)} · ${startLabel}`
    : `${getDocumentTypeLabel(type)} · ${startLabel} - ${endLabel}`;
}

export function resolveDocumentStatus(
  currentStatus: string,
  approvalStatus?: string | null
): DocumentStatusValue {
  if (currentStatus === "CANCELLED") {
    return "CANCELLED";
  }

  if (approvalStatus === "APPROVED") {
    return "APPROVED";
  }

  if (approvalStatus === "REJECTED") {
    return "REJECTED";
  }

  return "PENDING";
}
