"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { AttendanceDashboardCalendar } from "@/components/attendance/AttendanceDashboardCalendar";
import { AttendanceDashboardList } from "@/components/attendance/AttendanceDashboardList";
import { AttendanceExportAction } from "@/components/attendance/AttendanceExportAction";
import { TodayAttendanceCard } from "@/components/attendance/TodayAttendanceCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useDirtyLeaveGuard } from "@/hooks/useDirtyLeaveGuard";
import {
  formatAttendanceTime,
  getAttendanceEditRequestStatusInfo,
  getAttendanceStatusStyle,
  readErrorMessage,
  type AttendanceEditRequestPayload,
  type AttendanceEditRequestSummary,
  type AttendanceMember,
  type AttendanceRecord,
  type TodayAttendanceRow,
} from "@/components/attendance/attendance-utils";

interface AttendanceDashboardPageProps {
  initialRecords: AttendanceRecord[];
  initialTodayRecords: AttendanceRecord[];
  initialTeamMonthRecords: AttendanceRecord[];
  members: AttendanceMember[];
  isAdmin: boolean;
  isOwner: boolean;
  currentUserId: string;
  currentUserName: string;
  currentDate: string;
}

type ViewMode = "calendar" | "list";

type FeedbackState = { type: "success" | "error"; message: string } | null;

function toTodayRows(
  todayRecords: AttendanceRecord[],
  members: AttendanceMember[],
  currentUserId: string,
  currentUserName: string,
  showTeamRows: boolean
) {
  if (showTeamRows && members.length > 0) {
    const todayRecordMap = new Map(todayRecords.map((record) => [record.user.id, record]));

    return members
      .map((member) => {
        const record = todayRecordMap.get(member.id);
        return {
          id: member.id,
          name: member.name ?? "이름 없음",
          checkIn: record?.checkIn ?? null,
          checkOut: record?.checkOut ?? null,
          status: record?.status ?? "UNRECORDED",
          memo: record?.memo ?? null,
        } satisfies TodayAttendanceRow;
      })
      .sort((left, right) => {
        const leftCheckIn = left.checkIn ? new Date(left.checkIn).getTime() : Number.MAX_SAFE_INTEGER;
        const rightCheckIn = right.checkIn ? new Date(right.checkIn).getTime() : Number.MAX_SAFE_INTEGER;
        return leftCheckIn - rightCheckIn;
      });
  }

  const todayRecord = todayRecords.find((record) => record.user.id === currentUserId) ?? null;
  return [
    {
      id: currentUserId,
      name: currentUserName,
      checkIn: todayRecord?.checkIn ?? null,
      checkOut: todayRecord?.checkOut ?? null,
      status: todayRecord?.status ?? "UNRECORDED",
      memo: todayRecord?.memo ?? null,
    },
  ];
}

function isSameDay(left: string | Date, right: string | Date) {
  const leftDate = new Date(left);
  const rightDate = new Date(right);

  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function isSameMonth(value: string | Date, year: number, month: number) {
  const date = new Date(value);
  return date.getFullYear() === year && date.getMonth() === month;
}

function upsertRecord(records: AttendanceRecord[], nextRecord: AttendanceRecord) {
  const existingIndex = records.findIndex((record) => record.id === nextRecord.id || (record.user.id === nextRecord.user.id && isSameDay(record.date, nextRecord.date)));

  if (existingIndex === -1) {
    return [nextRecord, ...records].sort(
      (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime()
    );
  }

  const next = [...records];
  next[existingIndex] = nextRecord;
  return next;
}

function normalizeAttendanceRecord(record: AttendanceRecord) {
  return {
    ...record,
    date: new Date(record.date).toISOString(),
    checkIn: record.checkIn ? new Date(record.checkIn).toISOString() : null,
    checkOut: record.checkOut ? new Date(record.checkOut).toISOString() : null,
  } satisfies AttendanceRecord;
}

function defaultRequestForm(currentDate: string): AttendanceEditRequestPayload {
  return {
    date: currentDate.slice(0, 10),
    requestedCheckIn: "09:00",
    requestedCheckOut: "18:00",
    reason: "",
  };
}

function formatRequestDateTitle(dateText: string) {
  const date = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateText;
  }

  return format(date, "yyyy. MM. dd.", { locale: ko });
}

function formatRequestDateTime(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  return format(new Date(value), "yyyy.MM.dd HH:mm", { locale: ko });
}

function formatAttendanceRange(checkIn: string | Date | null, checkOut: string | Date | null) {
  const start = formatAttendanceTime(checkIn);
  const end = formatAttendanceTime(checkOut);

  if (start === "-" && end === "-") {
    return null;
  }

  return `${start}~${end}`;
}

function requestDetailStatusLabel(request: AttendanceEditRequestSummary | null) {
  if (request?.isWithdrawn) {
    return "철회";
  }

  switch (request?.status) {
    case "APPROVED":
      return "승인됨";
    case "REJECTED":
      return "반려됨";
    case "PENDING":
      return "대기 중";
    default:
      return "검토 중";
  }
}

function isRequestProcessed(request: AttendanceEditRequestSummary) {
  return request.isWithdrawn || request.status === "APPROVED" || request.status === "REJECTED";
}

function getRequestRequesterName(
  request: AttendanceEditRequestSummary,
  members: AttendanceMember[]
) {
  const unsafeRequest = request as AttendanceEditRequestSummary & {
    requester?: { name?: string | null } | null;
    user?: { name?: string | null } | null;
    member?: { name?: string | null } | null;
  };

  return (
    unsafeRequest.requester?.name?.trim() ||
    unsafeRequest.user?.name?.trim() ||
    unsafeRequest.member?.name?.trim() ||
    request.requesterName?.trim() ||
    members.find((member) => member.id === request.requesterId)?.name?.trim() ||
    "알 수 없음"
  );
}

function DetailInfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  const isEmpty = !value || value === "-";

  return (
    <div className="detail-info-row">
      <span className="detail-info-label">{label}</span>
      <span className={`detail-info-value ${isEmpty ? "empty" : ""}`}>
        {isEmpty ? "없음" : value}
      </span>
    </div>
  );
}

function findRecordForDate(records: AttendanceRecord[], dateText: string) {
  return (
    records.find((record) => {
      const date = new Date(record.date);
      const normalized = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate()
      ).padStart(2, "0")}`;
      return normalized === dateText;
    }) ?? null
  );
}

function RequestCard({
  request,
  requesterName,
  onSelect,
}: {
  request: AttendanceEditRequestSummary;
  requesterName: string;
  onSelect: (request: AttendanceEditRequestSummary) => void;
}) {
  const statusInfo = getAttendanceEditRequestStatusInfo(request);
  const requestTitle = request.reason.trim() || request.title;
  const requestedRange = formatAttendanceRange(
    request.requestedCheckIn,
    request.requestedCheckOut
  );
  const isProcessed = isRequestProcessed(request);
  const titleClass = isProcessed
    ? "text-[var(--text-secondary)]"
    : "text-[var(--text-primary)]";
  const metaClass = isProcessed
    ? "text-[var(--text-muted)]"
    : "text-[var(--text-secondary)]";
  const requesterClass = isProcessed
    ? "text-[var(--text-muted)]"
    : "text-[var(--text-muted)]";
  const cardClassName = isProcessed
    ? "border-[var(--border-light)] bg-[var(--surface-2)]/55"
    : "border-[var(--border)] bg-[var(--surface)]";

  return (
    <button
      type="button"
      onClick={() => onSelect(request)}
      className={`w-full cursor-pointer rounded-[14px] border px-4 py-3 text-left transition hover:border-[var(--border)] hover:bg-[var(--surface-2)] ${cardClassName}`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <StatusBadge variant={statusInfo.variant}>{statusInfo.label}</StatusBadge>
            <span className="status-badge status-badge--neutral">{request.requestDate}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <p className={`min-w-0 flex-1 truncate text-sm font-semibold leading-6 ${titleClass}`}>
            {requestTitle}
          </p>
          <p className={`shrink-0 text-xs leading-6 sm:pl-4 sm:text-right ${metaClass}`}>
            {requestedRange ? `수정시간 ${requestedRange}` : "수정시간 없음"}
          </p>
        </div>

        <p className={`mt-2 text-xs font-medium ${requesterClass}`}>{requesterName}</p>
      </div>
    </button>
  );
}

export function AttendanceDashboardPage({
  initialRecords,
  initialTodayRecords,
  initialTeamMonthRecords,
  members,
  isAdmin,
  isOwner,
  currentUserId,
  currentUserName,
  currentDate,
}: AttendanceDashboardPageProps) {
  const [view, setView] = useState<ViewMode>("calendar");
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>(initialTodayRecords);
  const [teamMonthRecords, setTeamMonthRecords] = useState<AttendanceRecord[]>(initialTeamMonthRecords);
  const selectedUserId = currentUserId;
  const selectedUserName = currentUserName;
  const [currentYear, setCurrentYear] = useState(new Date(currentDate).getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date(currentDate).getMonth());
  const [loading, setLoading] = useState(false);
  const [editRequests, setEditRequests] = useState<AttendanceEditRequestSummary[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState<AttendanceEditRequestPayload>(() => defaultRequestForm(currentDate));
  const [requestInitialForm, setRequestInitialForm] = useState<AttendanceEditRequestPayload>(() =>
    defaultRequestForm(currentDate)
  );
  const [historyDate, setHistoryDate] = useState<string | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [decisionTarget, setDecisionTarget] = useState<AttendanceEditRequestSummary | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionLoadingId, setDecisionLoadingId] = useState<string | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<AttendanceEditRequestSummary | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [uploadGuideOpen, setUploadGuideOpen] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const todayRows = useMemo<TodayAttendanceRow[]>(
    () => toTodayRows(todayRecords, members, currentUserId, currentUserName, isAdmin),
    [currentUserId, currentUserName, isAdmin, todayRecords, members]
  );

  const currentUserTodayRow = useMemo(
    () => todayRows.find((row) => row.id === currentUserId) ?? null,
    [currentUserId, todayRows]
  );

  const canUseAttendanceButtons = !isOwner;
  const canReviewEditRequests = isAdmin;
  const canViewEditRequests = canReviewEditRequests || !isOwner;
  const currentStatusTone = getAttendanceStatusStyle(currentUserTodayRow?.status);
  const currentStatusLabel = currentStatusTone.label;
  const visibleRequests = canReviewEditRequests
    ? editRequests
    : editRequests.filter((request) => request.requesterId === currentUserId);
  const sortedVisibleRequests = useMemo(
    () =>
      [...visibleRequests].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      ),
    [visibleRequests]
  );
  const previewRequests = useMemo(
    () => sortedVisibleRequests.slice(0, 3),
    [sortedVisibleRequests]
  );
  const currentUserDateRequests = useMemo(
    () =>
      [...editRequests]
        .filter((request) => request.requesterId === selectedUserId)
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        ),
    [editRequests, selectedUserId]
  );
  const calendarEditRequests = canReviewEditRequests ? editRequests : currentUserDateRequests;
  const canManageOwnRequests = !isOwner && selectedUserId === currentUserId;
  const historyRequests = useMemo(() => {
    const filtered = editRequests
      .filter((request) => canReviewEditRequests || request.requesterId === selectedUserId)
      .sort((left, right) => {
        if (historyDate) {
          const leftMatches = left.requestDate === historyDate ? 1 : 0;
          const rightMatches = right.requestDate === historyDate ? 1 : 0;
          if (leftMatches !== rightMatches) {
            return rightMatches - leftMatches;
          }
        }

        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });

    return filtered;
  }, [canReviewEditRequests, editRequests, historyDate, selectedUserId]);
  const selectedRequest =
    editRequests.find((request) => request.id === selectedRequestId) ?? null;
  const requestFormDirty =
    requestModalOpen &&
    JSON.stringify(requestForm) !== JSON.stringify(requestInitialForm);
  const { requestClose } = useDirtyLeaveGuard({
    isDirty: requestFormDirty,
    onDiscard: () => setRequestModalOpen(false),
    disabled: requestSubmitting || !requestModalOpen,
  });
  const { requestClose: requestRejectClose } = useDirtyLeaveGuard({
    isDirty: Boolean(decisionTarget) && decisionNote.trim().length > 0,
    onDiscard: () => {
      setDecisionTarget(null);
      setDecisionNote("");
    },
    disabled: !!decisionLoadingId || !decisionTarget,
  });

  useEffect(() => {
    if (!canViewEditRequests) {
      setRequestsLoading(false);
      setEditRequests([]);
      return;
    }

    let ignore = false;

    async function loadEditRequests() {
      try {
        setRequestsLoading(true);
        const response = await fetch("/api/attendance/edit-requests");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(readErrorMessage(data, "근무시간 수정 요청 목록을 불러오지 못했습니다."));
        }
        if (!ignore) {
          setEditRequests(data as AttendanceEditRequestSummary[]);
        }
      } catch (error) {
        console.error("[ATTENDANCE_EDIT_REQUESTS]", error);
        if (!ignore) {
          setFeedback({ type: "error", message: "근무시간 수정 요청 목록을 불러오지 못했습니다." });
        }
      } finally {
        if (!ignore) {
          setRequestsLoading(false);
        }
      }
    }

    void loadEditRequests();

    return () => {
      ignore = true;
    };
  }, [canViewEditRequests]);

  function syncAttendanceRecord(nextRecord: AttendanceRecord) {
    const normalized = normalizeAttendanceRecord(nextRecord);

    if (isSameMonth(normalized.date, currentYear, currentMonth) && normalized.user.id === selectedUserId) {
      setRecords((current) => upsertRecord(current, normalized));
    }

    if (isSameDay(normalized.date, currentDate)) {
      setTodayRecords((current) => upsertRecord(current, normalized));
    }

    if (isAdmin && isSameMonth(normalized.date, currentYear, currentMonth)) {
      setTeamMonthRecords((current) => upsertRecord(current, normalized));
    }
  }

  async function fetchRecords(userId: string, year: number, month: number) {
    setLoading(true);
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const params = new URLSearchParams({ userId, from, to });

    try {
      const response = await fetch(`/api/attendance?${params}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(readErrorMessage(data, "근무 기록을 불러오지 못했습니다."));
      }
      setRecords(data.records as AttendanceRecord[]);
    } catch (error) {
      console.error("[ATTENDANCE_FETCH]", error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "근무 기록을 불러오지 못했습니다." });
    } finally {
      setLoading(false);
    }
  }

  const fetchTeamMonthRecords = useCallback(async (year: number, month: number) => {
    if (!isAdmin) {
      return;
    }

    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const params = new URLSearchParams({ from, to, team: "true" });

    try {
      const response = await fetch(`/api/attendance?${params}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(readErrorMessage(data, "팀 근무 기록을 불러오지 못했습니다."));
      }

      setTeamMonthRecords(data.records as AttendanceRecord[]);
    } catch (error) {
      console.error("[ATTENDANCE_TEAM_FETCH]", error);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "팀 근무 기록을 불러오지 못했습니다.",
      });
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    void fetchTeamMonthRecords(currentYear, currentMonth);
  }, [currentMonth, currentYear, fetchTeamMonthRecords, isAdmin]);

  function handleMonthChange(year: number, month: number) {
    setCurrentYear(year);
    setCurrentMonth(month);
    void fetchRecords(selectedUserId, year, month);
  }

  async function handleCheckIn() {
    setCheckingIn(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/attendance/check-in", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(readErrorMessage(data, "출근 처리에 실패했습니다."));
      }

      syncAttendanceRecord(data as AttendanceRecord);
      setFeedback({ type: "success", message: "출근 처리가 완료되었습니다." });
    } catch (error) {
      console.error("[ATTENDANCE_CHECK_IN]", error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "출근 처리에 실패했습니다." });
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    setCheckingOut(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/attendance/check-out", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(readErrorMessage(data, "퇴근 처리에 실패했습니다."));
      }

      syncAttendanceRecord(data as AttendanceRecord);
      setFeedback({ type: "success", message: "퇴근 처리가 완료되었습니다." });
    } catch (error) {
      console.error("[ATTENDANCE_CHECK_OUT]", error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "퇴근 처리에 실패했습니다." });
    } finally {
      setCheckingOut(false);
    }
  }

  function openRequestModal(dateText = currentDate.slice(0, 10)) {
    setRequestError(null);
    const targetRecord =
      dateText === currentDate.slice(0, 10)
        ? currentUserTodayRow
        : findRecordForDate(records, dateText);
    const nextForm = {
      date: dateText,
      requestedCheckIn: targetRecord?.checkIn ? format(new Date(targetRecord.checkIn), "HH:mm", { locale: ko }) : "09:00",
      requestedCheckOut: targetRecord?.checkOut ? format(new Date(targetRecord.checkOut), "HH:mm", { locale: ko }) : "18:00",
      reason: "",
    };
    setRequestForm(nextForm);
    setRequestInitialForm(nextForm);
    setRequestModalOpen(true);
  }

  function openHistoryModal(dateText: string | null = null) {
    setHistoryDate(dateText);
    setHistoryModalOpen(true);
  }

  async function handleCreateRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestSubmitting(true);
    setRequestError(null);

    try {
      const response = await fetch("/api/attendance/edit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestForm),
      });
      const data = await response.json();
      if (!response.ok) {
        setRequestError(readErrorMessage(data, "근무시간 수정 요청을 저장하지 못했습니다."));
        return;
      }

      setEditRequests((current) => [data as AttendanceEditRequestSummary, ...current]);
      setRequestModalOpen(false);
      setFeedback({ type: "success", message: "근무시간 수정 요청이 등록되었습니다." });
    } catch (error) {
      console.error("[ATTENDANCE_EDIT_REQUEST_CREATE]", error);
      setRequestError("근무시간 수정 요청을 저장하지 못했습니다.");
    } finally {
      setRequestSubmitting(false);
    }
  }

  async function handleDecision(status: "APPROVED" | "REJECTED", request: AttendanceEditRequestSummary) {
    setDecisionLoadingId(request.id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/attendance/edit-requests/${request.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, decisionNote }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(readErrorMessage(data, "근무시간 수정 요청을 처리하지 못했습니다."));
      }

      const nextRequest = data.request as AttendanceEditRequestSummary;
      setEditRequests((current) => current.map((item) => (item.id === nextRequest.id ? nextRequest : item)));
      if (data.attendance) {
        syncAttendanceRecord(data.attendance as AttendanceRecord);
      }
      setDecisionTarget(null);
      setDecisionNote("");
      setFeedback({ type: "success", message: status === "APPROVED" ? "수정 요청을 승인했습니다." : "수정 요청을 반려했습니다." });
    } catch (error) {
      console.error("[ATTENDANCE_EDIT_REQUEST_DECIDE]", error);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "근무시간 수정 요청을 처리하지 못했습니다." });
    } finally {
      setDecisionLoadingId(null);
    }
  }

  async function handleWithdrawRequest(request: AttendanceEditRequestSummary) {
    setWithdrawingId(request.id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/attendance/edit-requests/${request.id}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readErrorMessage(data, "수정 요청을 철회하지 못했습니다."));
      }

      setEditRequests((current) =>
        current.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status: "REJECTED",
                isWithdrawn: true,
                decidedAt: new Date().toISOString(),
                decisionNote: null,
              }
            : item
        )
      );
      setSelectedRequestId(null);
      setWithdrawTarget(null);
      setFeedback({ type: "success", message: "수정 요청이 철회되었습니다." });
    } catch (error) {
      console.error("[ATTENDANCE_EDIT_REQUEST_WITHDRAW]", error);
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "수정 요청을 철회하지 못했습니다.",
      });
    } finally {
      setWithdrawingId(null);
    }
  }

  return (
    <div className="page-shell attendance-page-shell">
      <section className="page-header">
        <div className="page-header__meta">
          <div className="page-header__eyebrow">Attendance Dashboard</div>
          <h1 className="page-title">{isAdmin ? "팀 출퇴근 현황" : "내 출퇴근"}</h1>
          <p className="page-subtitle">
            {isAdmin
              ? "출퇴근 기록을 한눈에 볼 수 있어요"
              : "출퇴근 기록을 한눈에 볼 수 있어요"}
          </p>
        </div>

        <div className="page-actions">
          <div className="view-toggle">
            <button type="button" onClick={() => setView("calendar")} className={`view-chip ${view === "calendar" ? "is-active" : ""}`}>
              달력
            </button>
            <button type="button" onClick={() => setView("list")} className={`view-chip ${view === "list" ? "is-active" : ""}`}>
              목록
            </button>
          </div>
          <AttendanceExportAction
            records={records}
            userName={selectedUserName}
            year={currentYear}
            month={currentMonth}
          />
          <button type="button" onClick={() => setUploadGuideOpen(true)} className="secondary-button">
            내려받기 가이드
          </button>
        </div>
      </section>

                {feedback ? (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                      feedback.type === "success"
                        ? "border border-[#b7e4c7] bg-[var(--success-light)] text-[#15803d]"
                        : "border border-[#fecaca] bg-[var(--danger-light)] text-[#b42318]"
                    }`}
                  >
                    {feedback.message}
                  </div>
                ) : null}

                {loading ? (
                  <div className="empty-panel min-h-[220px]">
                    <p className="empty-panel__title">출퇴근 기록을 불러오는 중이에요.</p>
                    <p className="empty-panel__description">선택한 기간의 데이터를 정리하고 있어요.</p>
                  </div>
                ) : null}

                {!loading && view === "calendar" ? (
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.05fr_1fr]">
              {/* 왼쪽: 달력 */}
              <AttendanceDashboardCalendar
                records={records}
                teamRecords={teamMonthRecords}
                editRequests={calendarEditRequests}
                year={currentYear}
                month={currentMonth}
                onMonthChange={handleMonthChange}
                ownerActions={
                  canViewEditRequests
                    ? {
                        canRequest: canManageOwnRequests,
                        onRequest: openRequestModal,
                      }
                    : undefined
                }
              />

              {/* 오른쪽: 오늘출퇴근 + 수정요청 */}
              <div className="flex min-w-0 flex-col gap-4">
                <TodayAttendanceCard
                  rows={todayRows}
                  isAdmin={isAdmin}
                  currentDate={format(new Date(currentDate), "yyyy.MM.dd", { locale: ko })}
                  memberActions={
                    canUseAttendanceButtons
                      ? {
                          canCheckIn: !currentUserTodayRow?.checkIn,
                          canCheckOut:
                            Boolean(currentUserTodayRow?.checkIn) &&
                            !currentUserTodayRow?.checkOut,
                          canOpenEditRequest: false,
                          checkingIn,
                          checkingOut,
                          currentStatusLabel,
                          currentStatusVariant: currentStatusTone.variant,
                          feedback,
                          onCheckIn: handleCheckIn,
                          onCheckOut: handleCheckOut,
                          onOpenEditRequest: () => openRequestModal(),
                        }
                      : undefined
                  }
                />

                {canViewEditRequests ? (
                <section className="card-panel min-h-[420px]">
                <div className="card-header">
                  <div>
                    
                    <h2 className="card-title mt-2">근무시간 수정 요청</h2>
                    <p className="card-description">
                      {canReviewEditRequests
                        ? "직원의 수정 요청을 확인하고 처리할 수 있어요."
                        : "요청 현황과 처리 상태를 확인할 수 있어요."}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openHistoryModal()}
                      className="secondary-button"
                    >
                      전체 보기
                    </button>
                    {canManageOwnRequests ? (
                      <button
                        type="button"
                        onClick={() => openRequestModal()}
                        className="secondary-button"
                      >
                        수정요청
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="card-body space-y-4">
                  {requestsLoading ? (
                    <div className="empty-panel min-h-[180px]">
                      <p className="empty-panel__title">
                        수정 요청을 불러오는 중이에요.
                      </p>
                      <p className="empty-panel__description">
                        잠시만 기다려 주세요.
                      </p>
                    </div>
                  ) : sortedVisibleRequests.length === 0 ? (
                    <div className="empty-panel min-h-[180px]">
                      <p className="empty-panel__title">
                        표시할 수정 요청이 없어요.
                      </p>
                      <p className="empty-panel__description">
                        {canReviewEditRequests
                          ? "직원들이 근무시간 수정을 요청하면 이 영역에서 바로 확인할 수 있습니다."
                          : "근무시간 수정 요청을 등록하면 처리 상태가 이 영역에 표시됩니다."}
                      </p>
                    </div>
                  ) : (
                    previewRequests.map((request) => (
                      <RequestCard
                        key={request.id}
                        request={request}
                        requesterName={getRequestRequesterName(request, members)}
                        onSelect={(target) =>
                          setSelectedRequestId(target.id)
                        }
                      />
                    ))
                  )}
                </div>
              </section>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* 리스트뷰는 그대로 유지 */}
          {!loading && view === "list" ? (
            <AttendanceDashboardList
              records={records}
              year={currentYear}
              month={currentMonth}
              onMonthChange={handleMonthChange}
              title={selectedUserName}
            />
      ) : null}
      {selectedRequest ? (
        <div className="detail-modal-overlay" onClick={() => setSelectedRequestId(null)}>
          <div className="detail-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="detail-modal-header">
              <div className="detail-modal-badge-row">
                <span className="detail-modal-type-badge">근무시간 수정</span>
                <StatusBadge variant={getAttendanceEditRequestStatusInfo(selectedRequest).variant}>
                  {requestDetailStatusLabel(selectedRequest)}
                </StatusBadge>
              </div>

              <div className="detail-modal-title">{selectedRequest.title}</div>
              <div className="detail-modal-sub">
                신청일 {formatRequestDateTime(selectedRequest.createdAt)}
              </div>

              <button
                type="button"
                className="detail-modal-close"
                onClick={() => setSelectedRequestId(null)}
                aria-label="근무시간 수정 요청 상세 닫기"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1 1l12 12M13 1L1 13"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="detail-modal-body">
              <div className="py-1">
                <DetailInfoRow label="신청자" value={selectedRequest.requesterName} />
                <DetailInfoRow label="신청일" value={selectedRequest.requestDate} />
                <DetailInfoRow
                  label="기존 출·퇴근 시간"
                  value={formatAttendanceRange(
                    selectedRequest.originalCheckIn,
                    selectedRequest.originalCheckOut
                  )}
                />
                <DetailInfoRow
                  label="수정 출·퇴근 시간"
                  value={formatAttendanceRange(
                    selectedRequest.requestedCheckIn,
                    selectedRequest.requestedCheckOut
                  )}
                />
              </div>

              <div className="detail-section-divider" />

              <div className="detail-reason-section">
                <div className="detail-reason-label">수정 사유</div>
                <div className={`detail-reason-text ${selectedRequest.reason ? "" : "empty"}`}>
                  {selectedRequest.reason || "사유가 입력되지 않았습니다."}
                </div>
              </div>

              {selectedRequest.decisionNote ? (
                <>
                  <div className="detail-section-divider" />
                  <div className="detail-reason-section">
                    <div className="detail-reason-label">처리 메모</div>
                    <div className="detail-reason-text">{selectedRequest.decisionNote}</div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="detail-modal-footer">
              {isRequestProcessed(selectedRequest) ? (
                <div
                  className={`detail-done-notice ${
                    selectedRequest.status === "APPROVED"
                      ? "approved"
                      : selectedRequest.status === "REJECTED"
                        ? "rejected"
                        : "neutral"
                  }`}
                >
                  {selectedRequest.isWithdrawn
                    ? "철회된 요청입니다."
                    : selectedRequest.status === "APPROVED"
                      ? "승인 완료된 요청입니다."
                      : "반려된 요청입니다."}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => setSelectedRequestId(null)}
                className="detail-btn detail-btn-ghost"
              >
                닫기
              </button>
              {selectedRequest.requesterId === currentUserId &&
              selectedRequest.status === "PENDING" &&
              !selectedRequest.isWithdrawn ? (
                <button
                  type="button"
                  className="detail-btn detail-btn-reject"
                  onClick={() => setWithdrawTarget(selectedRequest)}
                  disabled={withdrawingId === selectedRequest.id}
                >
                  철회
                </button>
              ) : null}
              {canReviewEditRequests && selectedRequest.status === "PENDING" && !selectedRequest.isWithdrawn ? (
                <>
                  <button
                    type="button"
                    className="detail-btn detail-btn-reject"
                    onClick={() => {
                      setSelectedRequestId(null);
                      setDecisionTarget(selectedRequest);
                      setDecisionNote("");
                    }}
                    disabled={decisionLoadingId === selectedRequest.id}
                  >
                    반려
                  </button>
                  <button
                    type="button"
                    className="detail-btn detail-btn-approve"
                    onClick={() => void handleDecision("APPROVED", selectedRequest)}
                    disabled={decisionLoadingId === selectedRequest.id}
                  >
                    {decisionLoadingId === selectedRequest.id ? "처리 중..." : "승인"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {historyModalOpen ? (
        <div className="modal-shell" onClick={() => setHistoryModalOpen(false)}>
          <div className="modal-overlay" />
          <div className="modal-card max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">수정요청 기록</h3>
                <p className="modal-subtitle">
                  {historyDate
                    ? `${formatRequestDateTitle(historyDate)} 기준으로 최신순 이력을 확인할 수 있어요.`
                    : "최신순으로 요청 이력을 확인할 수 있어요."}
                </p>
              </div>
            </div>
            <div className="modal-body max-h-[60vh] space-y-3 overflow-y-auto">
              {historyRequests.length === 0 ? (
                <div className="empty-panel min-h-[220px]">
                  <p className="empty-panel__title">아직 수정요청 기록이 없습니다.</p>
                  <p className="empty-panel__description">요청을 남기면 이곳에서 처리 상태를 확인할 수 있어요.</p>
                </div>
              ) : (
                historyRequests.map((request) => {
                  const statusInfo = getAttendanceEditRequestStatusInfo(request);
                  const isHighlighted = historyDate === request.requestDate;

                  return (
                    <article
                      key={request.id}
                      className={`list-card ${isHighlighted ? "border-[var(--accent)] bg-[var(--accent-light)]/30" : ""}`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge variant={statusInfo.variant}>{statusInfo.label}</StatusBadge>
                          <span className="status-badge status-badge--neutral">{request.requestDate}</span>
                          {isHighlighted ? (
                            <span className="status-badge status-badge--accent">선택한 날짜</span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                          {request.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                          {`출근 ${formatAttendanceTime(request.requestedCheckIn)} / 퇴근 ${formatAttendanceTime(
                            request.requestedCheckOut
                          )} · 요청일 ${request.requestDate}`}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-secondary)]">
                          {request.reason}
                        </p>
                        <p className="mt-3 text-xs font-medium text-[var(--text-muted)]">
                          {format(new Date(request.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                        </p>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="secondary-button"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {withdrawTarget ? (
        <div className="modal-shell" onClick={() => !withdrawingId && setWithdrawTarget(null)}>
          <div className="modal-overlay" />
          <div className="modal-card max-w-lg" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">수정 요청을 철회할까요?</h3>
                <p className="modal-subtitle">철회하면 요청 내용은 삭제되며 다시 복구할 수 없습니다.</p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setWithdrawTarget(null)}
                className="secondary-button"
                disabled={!!withdrawingId}
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleWithdrawRequest(withdrawTarget)}
                className="danger-button"
                disabled={!!withdrawingId}
              >
                {withdrawingId ? "철회 중..." : "철회하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {requestModalOpen ? (
        <div className="modal-shell" onClick={requestClose}>
          <div className="modal-overlay" />
          <div className="modal-card max-w-xl" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">근무시간 수정 요청</h3>
                <p className="modal-subtitle">수정할 날짜와 출퇴근 시간을 입력하고 요청 사유를 남겨 주세요.</p>
              </div>
            </div>
            <form onSubmit={handleCreateRequest}>
              <div className="modal-body space-y-4">
                <div className="field">
                  <label className="field-label" htmlFor="attendance-request-date">날짜</label>
                  <input
                    id="attendance-request-date"
                    type="date"
                    value={requestForm.date}
                    onChange={(event) => setRequestForm((current) => ({ ...current, date: event.target.value }))}
                    className="form-input"
                    required
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="field">
                    <label className="field-label" htmlFor="attendance-request-checkin">출근 시간</label>
                    <input
                      id="attendance-request-checkin"
                      type="time"
                      value={requestForm.requestedCheckIn}
                      onChange={(event) => setRequestForm((current) => ({ ...current, requestedCheckIn: event.target.value }))}
                      className="form-input"
                    />
                  </div>
                  <div className="field">
                    <label className="field-label" htmlFor="attendance-request-checkout">퇴근 시간</label>
                    <input
                      id="attendance-request-checkout"
                      type="time"
                      value={requestForm.requestedCheckOut}
                      onChange={(event) => setRequestForm((current) => ({ ...current, requestedCheckOut: event.target.value }))}
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="attendance-request-reason">요청 사유</label>
                  <textarea
                    id="attendance-request-reason"
                    value={requestForm.reason}
                    onChange={(event) => setRequestForm((current) => ({ ...current, reason: event.target.value }))}
                    className="form-textarea min-h-[140px]"
                    placeholder="누락된 출퇴근 기록이나 수정이 필요한 사유를 입력해 주세요"
                    required
                  />
                </div>
                {requestError ? (
                  <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
                    {requestError}
                  </div>
                ) : null}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={requestClose} className="secondary-button" disabled={requestSubmitting}>
                  취소
                </button>
                <button type="submit" className="primary-button" disabled={requestSubmitting}>
                  {requestSubmitting ? "요청 등록 중..." : "수정 요청 등록"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {decisionTarget ? (
        <div className="modal-shell" onClick={requestRejectClose}>
          <div className="modal-overlay" />
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">수정 요청 반려</h3>
                <p className="modal-subtitle">반려 사유를 입력하면 요청자에게 그대로 전달됩니다.</p>
              </div>
            </div>
            <div className="modal-body space-y-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                {decisionTarget.requesterName} · {decisionTarget.requestDate}
              </div>
              <textarea
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                className="form-textarea min-h-[140px]"
                placeholder="반려 사유를 입력해 주세요"
              />
            </div>
            <div className="modal-footer">
              <button type="button" onClick={requestRejectClose} className="secondary-button" disabled={!!decisionLoadingId}>
                취소
              </button>
              <button type="button" onClick={() => void handleDecision("REJECTED", decisionTarget)} className="danger-button" disabled={!!decisionLoadingId}>
                {decisionLoadingId ? "처리 중..." : "반려 처리"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {uploadGuideOpen ? (
        <div className="modal-shell" onClick={() => setUploadGuideOpen(false)}>
          <div className="modal-overlay" />
          <div className="modal-card modal-card--form" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">출근내역 업로드 안내</h3>
                <p className="modal-subtitle">현재는 업로드 형식 안내와 템플릿 기준만 먼저 제공합니다.</p>
              </div>
            </div>
            <div className="modal-body space-y-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                <p className="font-semibold text-[var(--text-primary)]">권장 파일 형식</p>
                <p className="mt-2">CSV 또는 XLSX</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-white px-4 py-4 text-sm text-[var(--text-secondary)]">
                <p className="font-semibold text-[var(--text-primary)]">권장 컬럼</p>
                <p className="mt-2">사용자명, 날짜, 출근시간, 퇴근시간, 메모</p>
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  상태, 근무시간, 사용자 식별값 컬럼은 후속 확장 시 함께 받을 수 있습니다.
                </p>
              </div>
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 text-xs text-[var(--text-muted)]">
                실제 업로드 저장 로직은 현재 출퇴근 데이터 구조와 컬럼 매핑을 더 확인한 뒤 연결할 예정입니다.
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setUploadGuideOpen(false)} className="secondary-button">
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
