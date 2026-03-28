"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

type ApprovalType = "LEAVE_REQUEST" | "IMPORTANT_EVENT" | "DEADLINE_CHANGE" | "BUDGET_TASK" | "PROJECT_REVIEW";

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

type FilterTab = "ALL" | ApprovalType;

const TYPE_LABELS: Record<string, string> = {
  LEAVE_REQUEST: "휴가·반차",
  IMPORTANT_EVENT: "중요일정",
  DEADLINE_CHANGE: "마감변경",
  BUDGET_TASK: "예산",
  PROJECT_REVIEW: "완성본검토",
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "LEAVE_REQUEST", label: "휴가·반차" },
  { key: "IMPORTANT_EVENT", label: "중요일정" },
  { key: "DEADLINE_CHANGE", label: "마감변경" },
  { key: "BUDGET_TASK", label: "예산" },
  { key: "PROJECT_REVIEW", label: "완성본검토" },
];

export function ApprovalActionsPanel({ initialApprovals }: Props) {
  const [approvals, setApprovals] = useState<Approval[]>(initialApprovals);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("ALL");
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = activeFilter === "ALL" ? approvals : approvals.filter((a) => a.type === activeFilter);

  async function handleApprove(id: string) {
    setLoading(id);
    try {
      const res = await fetch(`/api/approvals/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (res.ok) {
        setApprovals((prev) => prev.filter((a) => a.id !== id));
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    if (!rejectModal) return;
    setLoading(rejectModal);
    try {
      const res = await fetch(`/api/approvals/${rejectModal}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED", decisionNote }),
      });
      if (res.ok) {
        setApprovals((prev) => prev.filter((a) => a.id !== rejectModal));
        setRejectModal(null);
        setDecisionNote("");
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "0.375rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        {FILTER_TABS.map((tab) => {
          const count = tab.key === "ALL" ? approvals.length : approvals.filter((a) => a.type === tab.key).length;
          if (tab.key !== "ALL" && count === 0) return null;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              style={{
                padding: "0.375rem 0.75rem",
                border: activeFilter === tab.key ? "none" : "1px solid #E8E0C8",
                borderRadius: "9999px",
                background: activeFilter === tab.key ? "#F56B23" : "#fff",
                color: activeFilter === tab.key ? "#fff" : "#555",
                fontSize: "0.8125rem",
                fontWeight: activeFilter === tab.key ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {tab.label} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      {/* Approval cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.875rem" }}>
        {filtered.map((a) => (
          <div
            key={a.id}
            style={{
              border: "1px solid #E8E0C8",
              borderRadius: "0.625rem",
              padding: "1rem",
              background: "#FAF7EE",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.625rem" }}>
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  padding: "0.125rem 0.5rem",
                  borderRadius: "9999px",
                  background: "#FEF0E8",
                  color: "#F56B23",
                  flexShrink: 0,
                }}
              >
                {TYPE_LABELS[a.type] ?? a.type}
              </span>
              <span style={{ fontSize: "0.8125rem", color: "#555", fontWeight: 500, flexShrink: 0 }}>
                {a.requester.name}
              </span>
            </div>

            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "0.375rem", lineHeight: 1.4 }}>
              {a.title}
            </p>

            {a.description && (
              <p style={{ fontSize: "0.8125rem", color: "#555", marginBottom: "0.75rem", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {a.description}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.375rem" }}>
              <button
                onClick={() => handleApprove(a.id)}
                disabled={loading === a.id}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.25rem",
                  padding: "0.5rem",
                  border: "none",
                  borderRadius: "0.5rem",
                  background: "#2A8C50",
                  color: "#fff",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: loading === a.id ? 0.7 : 1,
                }}
              >
                <Check size={14} />
                승인
              </button>
              <button
                onClick={() => { setRejectModal(a.id); setDecisionNote(""); }}
                disabled={loading === a.id}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.25rem",
                  padding: "0.5rem",
                  border: "none",
                  borderRadius: "0.5rem",
                  background: "#D93025",
                  color: "#fff",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: loading === a.id ? 0.7 : 1,
                }}
              >
                <X size={14} />
                거절
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setRejectModal(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: "0.75rem", padding: "1.5rem", maxWidth: "24rem", width: "calc(100% - 2rem)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "0.75rem" }}>
              거절 사유 입력
            </h3>
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="거절 사유를 입력하세요 (선택)"
              rows={4}
              style={{
                width: "100%",
                border: "1px solid #E8E0C8",
                borderRadius: "0.5rem",
                padding: "0.625rem 0.75rem",
                fontSize: "0.875rem",
                outline: "none",
                resize: "none",
                marginBottom: "1rem",
                boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setRejectModal(null)}
                style={{
                  flex: 1,
                  padding: "0.625rem",
                  border: "1px solid #E8E0C8",
                  borderRadius: "0.5rem",
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: "0.875rem",
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
                  borderRadius: "0.5rem",
                  background: "#D93025",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  opacity: loading === rejectModal ? 0.7 : 1,
                }}
              >
                {loading === rejectModal ? "처리 중..." : "거절하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
