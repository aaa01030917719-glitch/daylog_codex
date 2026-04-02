"use client";

import { useEffect, useState } from "react";

type ApprovalType =
  | "LEAVE_REQUEST"
  | "IMPORTANT_EVENT"
  | "DEADLINE_CHANGE"
  | "BUDGET_TASK"
  | "PROJECT_REVIEW";
type FilterTab = "ALL" | ApprovalType;

interface Approval {
  id: string;
  type: ApprovalType;
  title: string;
  description: string | null;
  status: string;
  requester: { id: string; name: string | null; image: string | null };
}

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialApprovals: any[];
}

const TYPE_LABELS: Record<ApprovalType, string> = {
  LEAVE_REQUEST: "연차/반차",
  IMPORTANT_EVENT: "일정",
  DEADLINE_CHANGE: "마감 변경",
  BUDGET_TASK: "예산",
  PROJECT_REVIEW: "프로젝트 검토",
};

const TYPE_ICONS: Record<ApprovalType, string> = {
  LEAVE_REQUEST: "🗓️",
  IMPORTANT_EVENT: "📅",
  DEADLINE_CHANGE: "⏰",
  BUDGET_TASK: "💰",
  PROJECT_REVIEW: "📁",
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "LEAVE_REQUEST", label: "연차/반차" },
  { key: "IMPORTANT_EVENT", label: "일정" },
  { key: "DEADLINE_CHANGE", label: "마감 변경" },
  { key: "BUDGET_TASK", label: "예산" },
];

async function readError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      return data.error;
    }
  } catch {
    return null;
  }

  return null;
}

export function AdminApprovalPanel({ initialApprovals }: Props) {
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL");
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setApprovals(initialApprovals);
  }, [initialApprovals]);

  const filtered =
    activeFilter === "ALL" ? approvals : approvals.filter((approval) => approval.type === activeFilter);

  function showFeedback(message: string) {
    setFeedbackMessage(message);
    window.setTimeout(() => setFeedbackMessage(""), 2000);
  }

  async function handleApprove(id: string) {
    setLoading(id);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/approvals/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });

      if (!response.ok) {
        setErrorMessage((await readError(response)) ?? "승인 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      setApprovals((previous) => previous.filter((approval) => approval.id !== id));
      showFeedback("승인되었습니다.");
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectModal) {
      return;
    }

    setLoading(rejectModal);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/approvals/${rejectModal}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", decisionNote }),
      });

      if (!response.ok) {
        setErrorMessage((await readError(response)) ?? "거절 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      setApprovals((previous) => previous.filter((approval) => approval.id !== rejectModal));
      setRejectModal(null);
      setDecisionNote("");
      showFeedback("거절되었습니다.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      {feedbackMessage ? (
        <p style={{ marginBottom: "0.75rem", fontSize: "12px", fontWeight: 600, color: "#2A8C50" }}>
          {feedbackMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p style={{ marginBottom: "0.75rem", fontSize: "12px", fontWeight: 600, color: "#D93025" }}>
          {errorMessage}
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          borderBottom: "1.5px solid #E8E0C8",
          marginBottom: "1rem",
          gap: "0",
          overflowX: "auto",
        }}
      >
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === "ALL"
              ? approvals.length
              : approvals.filter((approval) => approval.type === tab.key).length;

          if (tab.key !== "ALL" && count === 0) {
            return null;
          }

          const isActive = activeFilter === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              style={{
                padding: "8px 14px",
                border: "none",
                borderBottom: isActive ? "2px solid #F56B23" : "2px solid transparent",
                background: "transparent",
                color: isActive ? "#F56B23" : "#999",
                fontSize: "13px",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
                whiteSpace: "nowrap",
                marginBottom: "-1.5px",
              }}
            >
              {tab.label}
              {count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#999", textAlign: "center", padding: "1rem 0" }}>
            해당 항목이 없습니다.
          </p>
        ) : null}

        {filtered.map((approval) => (
          <div
            key={approval.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              border: "1px solid #E8E0C8",
              borderRadius: "10px",
              padding: "10px 14px",
              background: "#fff",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "#FEF0E8",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "16px",
              }}
            >
              {TYPE_ICONS[approval.type] ?? "📄"}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#0D0D0D",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {approval.title}
              </div>
              <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                {approval.requester.name ?? "이름 없음"} · {TYPE_LABELS[approval.type] ?? approval.type}
              </div>
            </div>

            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              <button
                onClick={() => handleApprove(approval.id)}
                disabled={loading === approval.id}
                style={{
                  background: "#FEF0E8",
                  color: "#C05621",
                  border: "1px solid #FED7AA",
                  borderRadius: "7px",
                  padding: "5px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: loading === approval.id ? 0.7 : 1,
                }}
              >
                승인
              </button>
              <button
                onClick={() => {
                  setRejectModal(approval.id);
                  setDecisionNote("");
                }}
                disabled={loading === approval.id}
                style={{
                  background: "#F1EFE8",
                  color: "#888",
                  border: "1px solid #E8E0C8",
                  borderRadius: "7px",
                  padding: "5px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: loading === approval.id ? 0.7 : 1,
                }}
              >
                거절
              </button>
            </div>
          </div>
        ))}
      </div>

      {rejectModal ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setRejectModal(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "1.5rem",
              maxWidth: "24rem",
              width: "calc(100% - 2rem)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <h3
              style={{ fontSize: "1rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "0.75rem" }}
            >
              거절 사유 입력
            </h3>
            <textarea
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              placeholder="거절 사유를 입력해 주세요. (선택)"
              rows={4}
              style={{
                width: "100%",
                border: "1px solid #E8E0C8",
                borderRadius: "7px",
                padding: "9px 12px",
                fontSize: "13px",
                outline: "none",
                resize: "none",
                marginBottom: "1rem",
                boxSizing: "border-box",
              }}
              onFocus={(event) => {
                event.target.style.borderColor = "#F56B23";
              }}
              onBlur={(event) => {
                event.target.style.borderColor = "#E8E0C8";
              }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setRejectModal(null)}
                style={{
                  flex: 1,
                  padding: "0.625rem",
                  border: "1px solid #E8E0C8",
                  borderRadius: "7px",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#555",
                }}
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={loading === rejectModal}
                style={{
                  flex: 1,
                  padding: "0.625rem",
                  border: "none",
                  borderRadius: "7px",
                  background: "#F56B23",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  opacity: loading === rejectModal ? 0.7 : 1,
                }}
              >
                {loading === rejectModal ? "처리 중..." : "거절하기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
