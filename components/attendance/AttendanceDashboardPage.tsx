"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { AttendanceDashboardCalendar } from "@/components/attendance/AttendanceDashboardCalendar";
import { AttendanceDashboardList } from "@/components/attendance/AttendanceDashboardList";
import { AttendanceExportAction } from "@/components/attendance/AttendanceExportAction";
import { TodayAttendanceCard } from "@/components/attendance/TodayAttendanceCard";
import {
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
  members: AttendanceMember[];
  isAdmin: boolean;
  currentUserId: string;
  currentUserName: string;
  currentDate: string;
}

type ViewMode = "calendar" | "list";

type FeedbackState = { type: "success" | "error"; message: string } | null;

function toTodayRows(
  todayRecords: AttendanceRecord[],
  members: AttendanceMember[],
  isAdmin: boolean,
  currentUserId: string,
  currentUserName: string
) {
  if (isAdmin) {
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

function RequestCard({
  request,
  isAdmin,
  decisionLoadingId,
  onApprove,
  onReject,
}: {
  request: AttendanceEditRequestSummary;
  isAdmin: boolean;
  decisionLoadingId: string | null;
  onApprove: (request: AttendanceEditRequestSummary) => void;
  onReject: (request: AttendanceEditRequestSummary) => void;
}) {
  const badgeClassName =
    request.status === "APPROVED"
      ? "status-badge status-badge--success"
      : request.status === "REJECTED"
        ? "status-badge status-badge--danger"
        : "status-badge status-badge--warning";

  return (
    <article className="list-card">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={badgeClassName}>
              {request.status === "APPROVED" ? "승인" : request.status === "REJECTED" ? "반려" : "대기"}
            </span>
            <span className="status-badge status-badge--neutral">{request.requestDate}</span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">{request.title}</h3>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--text-secondary)]">
            <span>요청자 {request.requesterName}</span>
            <span>생성 {format(new Date(request.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              출근 시간 {request.requestedCheckIn ? format(new Date(request.requestedCheckIn), "HH:mm", { locale: ko }) : "-"}
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              퇴근 시간 {request.requestedCheckOut ? format(new Date(request.requestedCheckOut), "HH:mm", { locale: ko }) : "-"}
            </div>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{request.reason}</p>
          {request.decisionNote ? (
            <p className="mt-4 text-sm text-[var(--text-secondary)]">처리 메모: {request.decisionNote}</p>
          ) : null}
        </div>
        {isAdmin && request.status === "PENDING" ? (
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => onApprove(request)} disabled={decisionLoadingId === request.id} className="success-button px-3 py-2 text-sm">
              승인
            </button>
            <button type="button" onClick={() => onReject(request)} disabled={decisionLoadingId === request.id} className="danger-button px-3 py-2 text-sm">
              반려
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function AttendanceDashboardPage({
  initialRecords,
  initialTodayRecords,
  members,
  isAdmin,
  currentUserId,
  currentUserName,
  currentDate,
}: AttendanceDashboardPageProps) {
  const [view, setView] = useState<ViewMode>("calendar");
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [todayRecords, setTodayRecords] = useState<AttendanceRecord[]>(initialTodayRecords);
  const [selectedUserId, setSelectedUserId] = useState(currentUserId);
  const [selectedUserName, setSelectedUserName] = useState(currentUserName);
  const [currentYear, setCurrentYear] = useState(new Date(currentDate).getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date(currentDate).getMonth());
  const [loading, setLoading] = useState(false);
  const [editRequests, setEditRequests] = useState<AttendanceEditRequestSummary[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState<AttendanceEditRequestPayload>(() => defaultRequestForm(currentDate));
  const [decisionTarget, setDecisionTarget] = useState<AttendanceEditRequestSummary | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionLoadingId, setDecisionLoadingId] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const todayRows = useMemo<TodayAttendanceRow[]>(
    () => toTodayRows(todayRecords, members, isAdmin, currentUserId, currentUserName),
    [currentUserId, currentUserName, todayRecords, isAdmin, members]
  );

  const currentUserTodayRow = useMemo(
    () => todayRows.find((row) => row.id === currentUserId) ?? null,
    [currentUserId, todayRows]
  );

  const currentStatusLabel = getAttendanceStatusStyle(currentUserTodayRow?.status).label;
  const visibleRequests = isAdmin ? editRequests : editRequests.filter((request) => request.requesterId === currentUserId);

  useEffect(() => {
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
  }, []);

  function syncAttendanceRecord(nextRecord: AttendanceRecord) {
    const normalized = normalizeAttendanceRecord(nextRecord);

    if (isSameMonth(normalized.date, currentYear, currentMonth) && normalized.user.id === selectedUserId) {
      setRecords((current) => upsertRecord(current, normalized));
    }

    if (isSameDay(normalized.date, currentDate)) {
      setTodayRecords((current) => upsertRecord(current, normalized));
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

  function handleUserChange(userId: string) {
    const member = members.find((item) => item.id === userId);
    setSelectedUserId(userId);
    setSelectedUserName(member?.name ?? currentUserName);
    void fetchRecords(userId, currentYear, currentMonth);
  }

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

  function openRequestModal() {
    setRequestError(null);
    setRequestForm({
      date: currentDate.slice(0, 10),
      requestedCheckIn: currentUserTodayRow?.checkIn ? format(new Date(currentUserTodayRow.checkIn), "HH:mm", { locale: ko }) : "09:00",
      requestedCheckOut: currentUserTodayRow?.checkOut ? format(new Date(currentUserTodayRow.checkOut), "HH:mm", { locale: ko }) : "18:00",
      reason: "",
    });
    setRequestModalOpen(true);
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

  return (
    <div className="page-shell">
      <section className="page-header">
        <div className="page-header__meta">
          <div className="page-header__eyebrow">Attendance Dashboard</div>
          <h1 className="page-title">{isAdmin ? "근무 관리" : "전직원 출퇴근"}</h1>
          <p className="page-subtitle">
            {isAdmin
              ? "월간 근무 현황과 오늘 출퇴근 기록, 수정 요청 처리 현황을 한 화면에서 관리하세요."
              : "오늘 출퇴근 처리와 월간 근무 기록, 수정 요청 상태를 같은 화면에서 확인하세요."}
          </p>
        </div>

        <div className="page-actions">
          {isAdmin && members.length > 0 ? (
            <select
              value={selectedUserId}
              onChange={(event) => handleUserChange(event.target.value)}
              className="form-select min-w-[220px]"
            >
              <option value={currentUserId}>{currentUserName} (본인)</option>
              {members
                .filter((member) => member.id !== currentUserId)
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
            </select>
          ) : null}
          <div className="view-toggle">
            <button type="button" onClick={() => setView("calendar")} className={`view-chip ${view === "calendar" ? "is-active" : ""}`}>
              달력
            </button>
            <button type="button" onClick={() => setView("list")} className={`view-chip ${view === "list" ? "is-active" : ""}`}>
              리스트
            </button>
          </div>
          <AttendanceExportAction
            records={records}
            userName={selectedUserName}
            year={currentYear}
            month={currentMonth}
          />
        </div>
      </section>

      {isAdmin && feedback ? (
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
          <p className="empty-panel__title">근무 기록을 불러오는 중입니다.</p>
          <p className="empty-panel__description">선택한 기간의 근무 데이터를 정리하고 있습니다.</p>
        </div>
      ) : null}

      {!loading && view === "calendar" ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.05fr_1fr]">
          <AttendanceDashboardCalendar
            records={records}
            year={currentYear}
            month={currentMonth}
            onMonthChange={handleMonthChange}
          />
          <TodayAttendanceCard
            rows={todayRows}
            isAdmin={isAdmin}
            currentDate={format(new Date(currentDate), "yyyy.MM.dd", { locale: ko })}
            memberActions={
              !isAdmin
                ? {
                    canCheckIn: !currentUserTodayRow?.checkIn,
                    canCheckOut: Boolean(currentUserTodayRow?.checkIn) && !currentUserTodayRow?.checkOut,
                    checkingIn,
                    checkingOut,
                    currentStatusLabel,
                    feedback,
                    onCheckIn: handleCheckIn,
                    onCheckOut: handleCheckOut,
                    onOpenEditRequest: openRequestModal,
                  }
                : undefined
            }
          />
        </div>
      ) : null}

      {!loading && view === "list" ? (
        <AttendanceDashboardList
          records={records}
          year={currentYear}
          month={currentMonth}
          onMonthChange={handleMonthChange}
          title={selectedUserName}
        />
      ) : null}

      <section className="card-panel">
        <div className="card-header">
          <div>
            <div className="subtle-label">Attendance Edit Requests</div>
            <h2 className="card-title mt-2">근무시간 수정 요청</h2>
            <p className="card-description">
              {isAdmin
                ? "직원의 수정 요청을 확인하고 승인 또는 반려할 수 있습니다."
                : "근무시간 수정 요청 현황과 처리 상태를 확인할 수 있습니다."}
            </p>
          </div>
          {!isAdmin ? (
            <button type="button" onClick={openRequestModal} className="secondary-button">
              수정 요청
            </button>
          ) : null}
        </div>

        <div className="card-body space-y-4">
          {requestsLoading ? (
            <div className="empty-panel min-h-[180px]">
              <p className="empty-panel__title">수정 요청 목록을 불러오는 중입니다.</p>
              <p className="empty-panel__description">잠시만 기다려 주세요.</p>
            </div>
          ) : visibleRequests.length === 0 ? (
            <div className="empty-panel min-h-[180px]">
              <p className="empty-panel__title">표시할 수정 요청이 없습니다.</p>
              <p className="empty-panel__description">
                {isAdmin
                  ? "직원들이 근무시간 수정을 요청하면 이 영역에서 바로 확인할 수 있습니다."
                  : "근무시간 수정 요청을 등록하면 처리 상태가 이 영역에 표시됩니다."}
              </p>
            </div>
          ) : (
            visibleRequests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                isAdmin={isAdmin}
                decisionLoadingId={decisionLoadingId}
                onApprove={(target) => void handleDecision("APPROVED", target)}
                onReject={(target) => {
                  setDecisionTarget(target);
                  setDecisionNote("");
                }}
              />
            ))
          )}
        </div>
      </section>

      {requestModalOpen ? (
        <div className="modal-shell" onClick={() => !requestSubmitting && setRequestModalOpen(false)}>
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
                <button type="button" onClick={() => setRequestModalOpen(false)} className="secondary-button" disabled={requestSubmitting}>
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
        <div className="modal-shell" onClick={() => !decisionLoadingId && setDecisionTarget(null)}>
          <div className="modal-overlay" />
          <div className="modal-card max-w-xl" onClick={(event) => event.stopPropagation()}>
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
              <button type="button" onClick={() => setDecisionTarget(null)} className="secondary-button" disabled={!!decisionLoadingId}>
                취소
              </button>
              <button type="button" onClick={() => void handleDecision("REJECTED", decisionTarget)} className="danger-button" disabled={!!decisionLoadingId}>
                {decisionLoadingId ? "처리 중..." : "반려 처리"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
