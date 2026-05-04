"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type ApprovalType =
  | "LEAVE_REQUEST"
  | "IMPORTANT_EVENT"
  | "DEADLINE_CHANGE"
  | "BUDGET_TASK"
  | "PROJECT_REVIEW";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
type LeaveType = "FULL_DAY" | "HALF_AM" | "HALF_PM" | null;

interface ApprovalDetail {
  id: string;
  type: ApprovalType;
  title: string;
  description: string | null;
  status: ApprovalStatus;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  leaveType: LeaveType;
  leaveStart: string | null;
  leaveEnd: string | null;
  requester: { id: string; name: string | null; image: string | null };
  decider: { id: string; name: string | null; image: string | null } | null;
  task?: { id: string; title: string } | null;
  event?: { id: string; title: string } | null;
  document?: { id: string; title: string } | null;
}

interface ApprovalDetailClientProps {
  initialApproval: ApprovalDetail;
  canDecide: boolean;
  currentUserName: string;
}

const TYPE_LABELS: Record<ApprovalType, string> = {
  LEAVE_REQUEST: "연차/반차",
  IMPORTANT_EVENT: "중요 일정",
  DEADLINE_CHANGE: "마감 변경",
  BUDGET_TASK: "예산 사용",
  PROJECT_REVIEW: "프로젝트 검토",
};

const STATUS_LABELS: Record<ApprovalStatus, string> = {
  PENDING: "검토 중",
  APPROVED: "승인됨",
  REJECTED: "반려됨",
};

const LEAVE_TYPE_LABELS: Record<Exclude<LeaveType, null>, string> = {
  FULL_DAY: "연차",
  HALF_AM: "오전 반차",
  HALF_PM: "오후 반차",
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return format(new Date(value), "yyyy.MM.dd HH:mm", { locale: ko });
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return format(new Date(value), "yyyy.MM.dd", { locale: ko });
}

function statusBadgeClass(status: ApprovalStatus) {
  switch (status) {
    case "APPROVED":
      return "status-badge status-badge--success";
    case "REJECTED":
      return "status-badge status-badge--danger";
    default:
      return "status-badge status-badge--warning";
  }
}

function typeBadgeClass(type: ApprovalType) {
  switch (type) {
    case "LEAVE_REQUEST":
      return "status-badge status-badge--neutral";
    case "IMPORTANT_EVENT":
      return "status-badge status-badge--accent";
    case "DEADLINE_CHANGE":
      return "status-badge status-badge--danger";
    case "BUDGET_TASK":
      return "status-badge status-badge--warning";
    default:
      return "status-badge status-badge--neutral";
  }
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4">
      <span className="text-sm font-semibold text-[var(--text-primary)]">{label}</span>
      <span className="text-sm text-[var(--text-secondary)]">{value}</span>
    </div>
  );
}

export function ApprovalDetailClient({
  initialApproval,
  canDecide,
  currentUserName,
}: ApprovalDetailClientProps) {
  const [approval, setApproval] = useState(initialApproval);
  const [decisionLoading, setDecisionLoading] = useState<ApprovalStatus | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canApprove = canDecide && approval.status === "PENDING";

  async function handleDecision(status: ApprovalStatus) {
    if (status === "REJECTED" && !rejectOpen) {
      setRejectOpen(true);
      return;
    }

    setDecisionLoading(status);
    setError(null);

    try {
      const response = await fetch(`/api/approvals/${approval.id}/decide`, {
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

      setApproval((current) => ({
        ...current,
        status,
        decidedAt: new Date().toISOString(),
        decisionNote: status === "REJECTED" ? decisionNote.trim() || null : null,
        decider: {
          id: current.decider?.id ?? "current-user",
          name: currentUserName,
          image: current.decider?.image ?? null,
        },
      }));
      setRejectOpen(false);
      setDecisionNote("");
    } catch (decisionError) {
      console.error("[APPROVAL_DETAIL_DECIDE]", decisionError);
      setError("결재 상태를 업데이트하지 못했습니다.");
    } finally {
      setDecisionLoading(null);
    }
  }

  return (
    <>
      <div className="page-shell">
        <section className="page-header">
          <div className="page-header__meta">
            <div className="page-header__eyebrow">Approval Detail</div>
            <h1 className="page-title">결재 요청 상세</h1>
            <p className="page-subtitle">
              요청 내용과 사유를 확인하고 필요한 승인 작업을 이어갈 수 있어요.
            </p>
          </div>
          <div className="page-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                window.location.href = "/notifications";
              }}
            >
              전달함으로
            </button>
            {canApprove ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => void handleDecision("APPROVED")}
                disabled={decisionLoading !== null}
              >
                {decisionLoading === "APPROVED" ? "처리 중..." : "승인"}
              </button>
            ) : null}
          </div>
        </section>

        {error ? <div className="error-bar">{error}</div> : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="card-panel p-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className={typeBadgeClass(approval.type)}>{TYPE_LABELS[approval.type]}</span>
              <span className={statusBadgeClass(approval.status)}>
                {STATUS_LABELS[approval.status]}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
              {approval.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
              신청자 {approval.requester.name ?? "이름 없음"} · 신청일{" "}
              {formatDateTime(approval.createdAt)}
            </p>

            <div className="mt-5 space-y-3">
              {approval.type === "LEAVE_REQUEST" ? (
                <>
                  <DetailRow
                    label="휴가 종류"
                    value={approval.leaveType ? LEAVE_TYPE_LABELS[approval.leaveType] : "-"}
                  />
                  <DetailRow
                    label="기간"
                    value={
                      approval.leaveStart && approval.leaveEnd
                        ? `${formatDate(approval.leaveStart)} - ${formatDate(approval.leaveEnd)}`
                        : approval.leaveStart
                          ? formatDate(approval.leaveStart)
                          : "-"
                    }
                  />
                </>
              ) : null}

              {approval.document ? (
                <DetailRow label="연결 문서" value={approval.document.title} />
              ) : null}
              {approval.task ? <DetailRow label="연결 태스크" value={approval.task.title} /> : null}
              {approval.event ? <DetailRow label="연결 일정" value={approval.event.title} /> : null}
              <DetailRow
                label="처리자"
                value={approval.decider?.name ?? "아직 처리 전이에요"}
              />
              <DetailRow
                label="처리 시간"
                value={approval.decidedAt ? formatDateTime(approval.decidedAt) : "-"}
              />
            </div>

            <div className="mt-6 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4">
              <div className="text-sm font-semibold text-[var(--text-primary)]">사유</div>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                {approval.description || "사유 없음"}
              </div>
            </div>

            {approval.decisionNote ? (
              <div className="mt-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4">
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  처리 메모
                </div>
                <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                  {approval.decisionNote}
                </div>
              </div>
            ) : null}
          </section>

          <aside className="card-panel p-6">
            <div className="field-label">현재 상태</div>
            <div className="mt-2">
              <span className={statusBadgeClass(approval.status)}>
                {STATUS_LABELS[approval.status]}
              </span>
            </div>

            {canApprove ? (
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  className="primary-button w-full justify-center"
                  onClick={() => void handleDecision("APPROVED")}
                  disabled={decisionLoading !== null}
                >
                  {decisionLoading === "APPROVED" ? "승인 중..." : "승인"}
                </button>
                <button
                  type="button"
                  className="danger-button w-full justify-center"
                  onClick={() => setRejectOpen(true)}
                  disabled={decisionLoading !== null}
                >
                  반려
                </button>
              </div>
            ) : null}
          </aside>
        </div>
      </div>

      {rejectOpen ? (
        <div className="modal-shell" onClick={() => setRejectOpen(false)}>
          <div className="modal-overlay" />
          <div
            className="modal-card w-full max-w-[520px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 className="modal-title">반려 사유를 적어주세요</h2>
                <p className="modal-subtitle">
                  비워둘 수도 있지만, 요청자가 확인할 수 있게 남겨두면 좋아요.
                </p>
              </div>
            </div>
            <div className="modal-body">
              <textarea
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                className="form-textarea min-h-[140px]"
                placeholder="반려 사유를 입력해 주세요"
              />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setRejectOpen(false)}
                disabled={decisionLoading !== null}
              >
                취소
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => void handleDecision("REJECTED")}
                disabled={decisionLoading !== null}
              >
                {decisionLoading === "REJECTED" ? "반려 중..." : "반려"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
