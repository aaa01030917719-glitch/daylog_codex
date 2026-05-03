export interface AttendanceRecord {
  id: string;
  date: string | Date;
  checkIn: string | Date | null;
  checkOut: string | Date | null;
  workMinutes: number | null;
  status: string;
  memo: string | null;
  user: { id: string; name: string | null; image: string | null };
}

export interface AttendanceMember {
  id: string;
  name: string | null;
  image: string | null;
}

export interface TodayAttendanceRow {
  id: string;
  name: string;
  checkIn: string | Date | null;
  checkOut: string | Date | null;
  status: string;
  memo: string | null;
}

export interface AttendanceEditRequestSummary {
  id: string;
  title: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  isWithdrawn: boolean;
  createdAt: string;
  decidedAt: string | null;
  decisionNote: string | null;
  requesterId: string;
  requesterName: string;
  requestDate: string;
  originalCheckIn: string | null;
  originalCheckOut: string | null;
  requestedCheckIn: string | null;
  requestedCheckOut: string | null;
  reason: string;
}

export interface AttendanceEditRequestPayload {
  date: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
}

export const ATTENDANCE_EDIT_REQUEST_TITLE_PREFIX = "근무시간 수정 요청";
export const ATTENDANCE_EDIT_WITHDRAW_MARKER = "__ATTENDANCE_EDIT_WITHDRAWN__";

type AttendanceStatusBadgeVariant =
  | "request"
  | "pending"
  | "review"
  | "approved"
  | "rejected"
  | "neutral";

export const ATTENDANCE_STATUS_STYLES: Record<
  string,
  { label: string; bg: string; text: string; dot: string; variant: AttendanceStatusBadgeVariant }
> = {
  NORMAL: { label: "정상 출근", bg: "#DCFCE7", text: "#15803D", dot: "#22C55E", variant: "approved" },
  LATE: { label: "지각", bg: "#FEF3C7", text: "#92400E", dot: "#F59E0B", variant: "review" },
  EARLY_LEAVE: { label: "반차", bg: "#EDE9FE", text: "#6D28D9", dot: "#8B5CF6", variant: "request" },
  ABSENT: { label: "부재", bg: "#FDECEA", text: "#D93025", dot: "#EF4444", variant: "rejected" },
  OVERTIME: { label: "추가 근무", bg: "#FEF0E8", text: "#C05621", dot: "#F97316", variant: "review" },
  HOLIDAY: { label: "연차", bg: "#EEF4FF", text: "#3158C6", dot: "#4F7CFF", variant: "request" },
  UNRECORDED: { label: "미기록", bg: "#F3F4F6", text: "#6B7280", dot: "#94A3B8", variant: "neutral" },
};

export function formatAttendanceTime(value: string | Date | null): string {
  if (!value) return "-";
  const date = new Date(value);
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function formatAttendanceMinutes(value: number | null): string {
  if (!value) return "-";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

export function getAttendanceStatusStyle(status: string | null | undefined) {
  return ATTENDANCE_STATUS_STYLES[status ?? "UNRECORDED"] ?? ATTENDANCE_STATUS_STYLES.UNRECORDED;
}

export function hasAnnualLeave(record: Pick<AttendanceRecord, "status" | "memo"> | null) {
  if (!record) return false;
  return record.status === "HOLIDAY" || (record.memo?.includes("연차") ?? false);
}

export function hasHalfDay(record: Pick<AttendanceRecord, "status" | "memo"> | null) {
  if (!record) return false;
  return record.status === "EARLY_LEAVE" || (record.memo?.includes("반차") ?? false);
}

export function readErrorMessage(data: unknown, fallback: string) {
  if (typeof data === "object" && data && "error" in data && typeof data.error === "string") {
    return data.error;
  }

  return fallback;
}

export function parseAttendanceDecisionNote(decisionNote: string | null) {
  if (!decisionNote) {
    return { isWithdrawn: false, text: null };
  }

  if (!decisionNote.startsWith(ATTENDANCE_EDIT_WITHDRAW_MARKER)) {
    return { isWithdrawn: false, text: decisionNote };
  }

  const text = decisionNote
    .slice(ATTENDANCE_EDIT_WITHDRAW_MARKER.length)
    .replace(/^\s*::\s*/, "")
    .trim();

  return {
    isWithdrawn: true,
    text: text || null,
  };
}

export function getAttendanceEditRequestStatusInfo(request: Pick<AttendanceEditRequestSummary, "status" | "isWithdrawn">) {
  if (request.isWithdrawn) {
    return {
      label: "철회",
      variant: "neutral" as const,
    };
  }

  if (request.status === "APPROVED") {
    return {
      label: "승인",
      variant: "approved" as const,
    };
  }

  if (request.status === "REJECTED") {
    return {
      label: "반려",
      variant: "rejected" as const,
    };
  }

  return {
    label: "대기",
    variant: "pending" as const,
  };
}
