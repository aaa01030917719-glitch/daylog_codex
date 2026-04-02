"use client";

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays, FileText, Send, X } from "lucide-react";
import { DocsClientPage } from "@/components/docs/DocsClientPage";
import {
  approvalStatusFilters,
  approvalStatusLabels,
  approvalTypeLabels,
  type ApprovalFilterStatus,
  type ApprovalSummary,
  type ApprovalTypeValue,
  docsHubTabs,
  leaveTypeLabels,
  type LeaveRequestType,
  type PageSummary,
  workApprovalTypes,
} from "@/components/docs/docsHubTypes";

interface DocsHubClientPageProps {
  initialPages: PageSummary[];
  initialApprovals: ApprovalSummary[];
  currentUserId: string;
  isAdmin: boolean;
}

type DialogMode = "LEAVE" | "WORK" | null;
type WorkType = Exclude<ApprovalTypeValue, "LEAVE_REQUEST">;

function isLeave(approval: ApprovalSummary) {
  return approval.type === "LEAVE_REQUEST";
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return format(new Date(value), "yyyy.MM.dd", { locale: ko });
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return format(new Date(value), "yyyy.MM.dd HH:mm", { locale: ko });
}

function addOneDay(value: string) {
  const date = new Date(value);
  date.setDate(date.getDate() + 1);
  return date.toISOString();
}

function statusClassName(status: ApprovalSummary["status"]) {
  switch (status) {
    case "APPROVED":
      return "status-badge status-badge--success";
    case "REJECTED":
      return "status-badge status-badge--danger";
    default:
      return "status-badge status-badge--warning";
  }
}

function StatCard({
  label,
  value,
  helper,
  icon,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card-panel p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--accent-light)] text-[var(--accent)]">
        {icon}
      </div>
      <div className="mt-4 text-xs font-medium text-[var(--text-muted)]">{label}</div>
      <div className="mt-2 text-[28px] font-bold leading-none text-[var(--text-primary)]">{value}</div>
      <div className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{helper}</div>
    </div>
  );
}

function DetailRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={`rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 ${multiline ? "space-y-2" : "flex items-center justify-between gap-4"}`}>
      <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
      <div className={`text-sm text-[var(--text-secondary)] ${multiline ? "whitespace-pre-wrap leading-7" : "text-right"}`}>
        {value}
      </div>
    </div>
  );
}

export default function DocsHubClientPage({ initialPages, initialApprovals, currentUserId, isAdmin }: DocsHubClientPageProps) {
  const [activeTab, setActiveTab] = useState<(typeof docsHubTabs)[number]["value"]>("DOCS");
  const [statusFilter, setStatusFilter] = useState<ApprovalFilterStatus>("ALL");
  const [approvals, setApprovals] = useState(initialApprovals);
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaveDateError, setLeaveDateError] = useState<string | null>(null);
  const [leaveType, setLeaveType] = useState<LeaveRequestType>("FULL_DAY");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveDescription, setLeaveDescription] = useState("");
  const [workType, setWorkType] = useState<WorkType>("IMPORTANT_EVENT");
  const [workTitle, setWorkTitle] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [selectedLeaveApprovalId, setSelectedLeaveApprovalId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionLoadingId, setDecisionLoadingId] = useState<string | null>(null);

  const filteredApprovals = approvals.filter((approval) => {
    if (statusFilter !== "ALL" && approval.status !== statusFilter) return false;
    if (activeTab === "ALL") return true;
    if (activeTab === "LEAVE" || activeTab === "CALENDAR") return isLeave(approval);
    if (activeTab === "WORK") return !isLeave(approval);
    return true;
  });

  const leaveApprovals = filteredApprovals.filter(isLeave);
  const counts = {
    ALL: approvals.length,
    LEAVE: approvals.filter(isLeave).length,
    WORK: approvals.filter((approval) => !isLeave(approval)).length,
    CALENDAR: approvals.filter(isLeave).length,
  };
  const selectedLeaveApproval =
    approvals.find((approval) => approval.id === selectedLeaveApprovalId && isLeave(approval)) ?? null;

  async function handleCreate() {
    setError(null);
    setLeaveDateError(null);

    if (dialogMode === "LEAVE" && !leaveStart) {
      setLeaveDateError("날짜를 선택해주세요");
      return;
    }

    setSubmitting(true);
    try {
      const payload = dialogMode === "LEAVE"
        ? {
            type: "LEAVE_REQUEST",
            leaveType,
            leaveStart,
            leaveEnd: leaveEnd || leaveStart,
            description: leaveDescription.trim(),
          }
        : {
            type: workType,
            title: workTitle.trim(),
            description: workDescription.trim(),
          };

      const response = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string; approval?: ApprovalSummary };
      if (!response.ok || !data.approval) {
        setError(data.error ?? "결재 요청을 저장하지 못했습니다.");
        return;
      }

      setApprovals((current) => [data.approval as ApprovalSummary, ...current]);
      setDialogMode(null);
      setLeaveType("FULL_DAY");
      setLeaveStart("");
      setLeaveEnd("");
      setLeaveDescription("");
      setWorkType("IMPORTANT_EVENT");
      setWorkTitle("");
      setWorkDescription("");
    } catch (createError) {
      console.error("[DOCS_HUB_CREATE]", createError);
      setError("결재 요청을 저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecision(status: "APPROVED" | "REJECTED", approvalId: string) {
    setDecisionLoadingId(approvalId);
    try {
      const response = await fetch(`/api/approvals/${approvalId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          decisionNote: status === "REJECTED" ? decisionNote.trim() : undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "결재 상태를 업데이트하지 못했습니다.");
        return;
      }

      setApprovals((current) =>
        current.map((approval) =>
          approval.id === approvalId
            ? {
                ...approval,
                status,
                decidedAt: new Date().toISOString(),
                decisionNote: status === "REJECTED" ? decisionNote.trim() || null : null,
                deciderId: currentUserId,
                decider: approval.decider ?? { id: currentUserId, name: "관리자" },
              }
            : approval
        )
      );
      setRejectingId(null);
      setDecisionNote("");
    } catch (decisionError) {
      console.error("[DOCS_HUB_DECIDE]", decisionError);
      setError("결재 상태를 업데이트하지 못했습니다.");
    } finally {
      setDecisionLoadingId(null);
    }
  }

  return (
    <div className="page-shell">
      <section className="page-header">
        <div className="page-header__meta">
          <div className="page-header__eyebrow">Documents</div>
          <h1 className="page-title">문서 허브</h1>
          <p className="page-subtitle">일반 문서와 결재 요청을 한 화면에서 관리하고, 연차와 반차 신청도 같은 흐름으로 처리할 수 있습니다.</p>
        </div>
        <div className="page-actions">
          <button onClick={() => { setDialogMode("LEAVE"); setError(null); setLeaveDateError(null); }} className="primary-button">연차/반차 신청</button>
          <button onClick={() => { setDialogMode("WORK"); setError(null); setLeaveDateError(null); }} className="secondary-button">업무 결재 요청</button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="일반 문서" value={`${initialPages.length}`} helper="현재 등록된 위키 문서" icon={<FileText size={18} />} />
        <StatCard label="전체 결재" value={`${counts.ALL}`} helper="연차와 업무 결재 요청" icon={<Send size={18} />} />
        <StatCard label="연차/반차" value={`${counts.LEAVE}`} helper="달력과 리스트에서 함께 확인" icon={<CalendarDays size={18} />} />
        <StatCard label="업무 결재" value={`${counts.WORK}`} helper={isAdmin ? "승인과 반려를 바로 처리" : "내 요청 상태 확인"} icon={<FileText size={18} />} />
      </section>

      <section className="page-control-strip">
        <div className="pill-group">
          {docsHubTabs.map((tab) => (
            <button key={tab.value} onClick={() => setActiveTab(tab.value)} className={`pill-tab ${activeTab === tab.value ? "is-active" : ""}`}>
              {tab.label}{tab.value !== "DOCS" ? ` (${counts[tab.value]})` : ""}
            </button>
          ))}
        </div>

        {activeTab !== "DOCS" ? (
          <div className="pill-group">
            {approvalStatusFilters.map((filter) => (
              <button key={filter.value} onClick={() => setStatusFilter(filter.value)} className={`filter-pill ${statusFilter === filter.value ? "is-active" : ""}`}>
                {filter.label}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {error ? <div className="error-bar">{error}</div> : null}

      {activeTab === "DOCS" ? (
        <DocsClientPage initialPages={initialPages} currentUserId={currentUserId} />
      ) : activeTab === "CALENDAR" ? (
        <section className="card-panel p-5">
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            locale="ko"
            height="auto"
            headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
            buttonText={{ today: "오늘" }}
            events={leaveApprovals.map((approval) => ({
              id: approval.id,
              title: `${approval.requester.name ?? "사용자"} · ${approval.leaveType ? leaveTypeLabels[approval.leaveType] : "연차"}`,
              start: approval.leaveStart ?? approval.createdAt,
              end: approval.leaveEnd ? addOneDay(approval.leaveEnd) : approval.leaveStart ?? approval.createdAt,
              allDay: true,
              backgroundColor:
                approval.status === "APPROVED"
                  ? "#22c55e"
                  : approval.status === "REJECTED"
                    ? "#ef4444"
                    : "#f97316",
              borderColor:
                approval.status === "APPROVED"
                  ? "#22c55e"
                  : approval.status === "REJECTED"
                    ? "#ef4444"
                    : "#f97316",
            }))}
          />
        </section>
      ) : (
        <section className="space-y-4">
          {filteredApprovals.length === 0 ? (
            <div className="empty-panel min-h-[220px]">
              <p className="empty-panel__title">표시할 결재 항목이 없습니다.</p>
              <p className="empty-panel__description">선택한 탭과 상태에 맞는 결재 요청이 생기면 이 영역에 표시됩니다.</p>
            </div>
          ) : (
            filteredApprovals.map((approval) => (
              <article
                key={approval.id}
                onClick={() => {
                  if (isLeave(approval)) {
                    setSelectedLeaveApprovalId(approval.id);
                  }
                }}
                className={`list-card ${isLeave(approval) ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="status-badge status-badge--neutral">{approvalTypeLabels[approval.type]}</span>
                      <span className={statusClassName(approval.status)}>{approvalStatusLabels[approval.status]}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{approval.title}</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {approval.requester.name ?? "이름 없음"} · {formatDateTime(approval.createdAt)}
                    </p>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {isLeave(approval)
                        ? `${approval.leaveType ? leaveTypeLabels[approval.leaveType] : "연차"} · ${formatDate(approval.leaveStart)} - ${formatDate(approval.leaveEnd)}`
                        : approval.task?.title ?? approval.event?.title ?? approvalTypeLabels[approval.type]}
                    </p>
                    {!isLeave(approval) && approval.description ? (
                      <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{approval.description}</p>
                    ) : null}
                    {isLeave(approval) ? (
                      <p className="mt-3 text-xs font-medium text-[var(--text-muted)]">카드를 클릭하면 요청 상세를 확인할 수 있습니다.</p>
                    ) : null}
                    {approval.status !== "PENDING" ? (
                      <p className="mt-4 text-xs font-medium text-[var(--text-muted)]">
                        처리 시간 {formatDateTime(approval.decidedAt)}
                        {approval.decisionNote ? ` · ${approval.decisionNote}` : ""}
                      </p>
                    ) : null}
                  </div>
                  {isAdmin && approval.status === "PENDING" ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDecision("APPROVED", approval.id);
                        }}
                        disabled={decisionLoadingId === approval.id}
                        className="success-button px-3 py-2 text-sm"
                      >
                        승인
                      </button>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          setRejectingId(approval.id);
                          setDecisionNote("");
                        }}
                        disabled={decisionLoadingId === approval.id}
                        className="danger-button px-3 py-2 text-sm"
                      >
                        반려
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </section>
      )}

      {selectedLeaveApproval ? (
        <div className="modal-shell" onClick={() => setSelectedLeaveApprovalId(null)}>
          <div className="modal-overlay" />
          <div className="modal-card max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">연차 신청 상세</h3>
                <p className="modal-subtitle">요청 기간, 사유, 처리 메모를 확인할 수 있습니다.</p>
              </div>
              <button onClick={() => setSelectedLeaveApprovalId(null)} className="icon-button" aria-label="닫기">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="status-badge status-badge--neutral">
                  {selectedLeaveApproval.leaveType ? leaveTypeLabels[selectedLeaveApproval.leaveType] : "연차"}
                </span>
                <span className={statusClassName(selectedLeaveApproval.status)}>{approvalStatusLabels[selectedLeaveApproval.status]}</span>
              </div>
              <div className="grid gap-3">
                <DetailRow label="신청자" value={selectedLeaveApproval.requester.name ?? "이름 없음"} />
                <DetailRow label="신청 일시" value={formatDateTime(selectedLeaveApproval.createdAt)} />
                <DetailRow label="기간" value={`${formatDate(selectedLeaveApproval.leaveStart)} - ${formatDate(selectedLeaveApproval.leaveEnd)}`} />
                <DetailRow label="신청 내용" value={selectedLeaveApproval.description || "입력된 내용이 없습니다."} multiline />
                <DetailRow label="처리 메모" value={selectedLeaveApproval.decisionNote || "-"} multiline />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {dialogMode ? (
        <div className="modal-shell" onClick={() => !submitting && setDialogMode(null)}>
          <div className="modal-overlay" />
          <div className="modal-card modal-card--form" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">{dialogMode === "LEAVE" ? "연차/반차 신청" : "업무 결재 요청"}</h3>
                <p className="modal-subtitle">필요한 정보를 입력해 결재 요청을 등록하세요.</p>
              </div>
              <button onClick={() => setDialogMode(null)} className="icon-button" aria-label="닫기">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body space-y-4">
              {dialogMode === "LEAVE" ? (
                <>
                  <select value={leaveType} onChange={(event) => setLeaveType(event.target.value as LeaveRequestType)} className="form-select">
                    {Object.entries(leaveTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      type="date"
                      value={leaveStart}
                      onChange={(event) => {
                        setLeaveStart(event.target.value);
                        if (event.target.value) {
                          setLeaveDateError(null);
                        }
                      }}
                      className="form-input"
                      aria-invalid={leaveDateError ? true : undefined}
                    />
                    <input
                      type="date"
                      value={leaveEnd}
                      onChange={(event) => {
                        setLeaveEnd(event.target.value);
                        if (leaveStart || event.target.value) {
                          setLeaveDateError(null);
                        }
                      }}
                      className="form-input"
                    />
                  </div>
                  {leaveDateError ? (
                    <p className="text-sm font-medium text-[#b42318]">{leaveDateError}</p>
                  ) : null}
                  <textarea
                    rows={4}
                    value={leaveDescription}
                    onChange={(event) => setLeaveDescription(event.target.value)}
                    placeholder="신청 사유를 입력해 주세요"
                    className="form-textarea min-h-[120px]"
                  />
                </>
              ) : (
                <>
                  <select value={workType} onChange={(event) => setWorkType(event.target.value as WorkType)} className="form-select">
                    {workApprovalTypes.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <input value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} placeholder="결재 제목을 입력해 주세요" className="form-input" />
                  <textarea
                    rows={5}
                    value={workDescription}
                    onChange={(event) => setWorkDescription(event.target.value)}
                    placeholder="결재 내용을 입력해 주세요"
                    className="form-textarea min-h-[140px]"
                  />
                </>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setDialogMode(null)} className="secondary-button" disabled={submitting}>취소</button>
              <button onClick={() => void handleCreate()} className="primary-button" disabled={submitting}>
                {submitting ? "저장 중..." : "요청 등록"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {rejectingId ? (
        <div className="modal-shell" onClick={() => !decisionLoadingId && setRejectingId(null)}>
          <div className="modal-overlay" />
          <div className="modal-card max-w-xl" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">반려 사유 입력</h3>
                <p className="modal-subtitle">반려 사유는 요청자에게 그대로 전달됩니다.</p>
              </div>
            </div>
            <div className="modal-body">
              <textarea
                rows={5}
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                placeholder="반려 사유를 입력해 주세요"
                className="form-textarea min-h-[140px]"
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setRejectingId(null)} className="secondary-button" disabled={!!decisionLoadingId}>취소</button>
              <button onClick={() => void handleDecision("REJECTED", rejectingId)} className="danger-button" disabled={!!decisionLoadingId}>
                {decisionLoadingId ? "처리 중..." : "반려 처리"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
