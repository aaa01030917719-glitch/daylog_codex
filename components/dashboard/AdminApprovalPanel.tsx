"use client";

import { useState } from "react";

type ApprovalType = "LEAVE_REQUEST" | "IMPORTANT_EVENT" | "DEADLINE_CHANGE" | "BUDGET_TASK" | "PROJECT_REVIEW";
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

const TYPE_LABELS: Record<string, string> = {
  LEAVE_REQUEST: "휴가·반차",
  IMPORTANT_EVENT: "일정",
  DEADLINE_CHANGE: "마감변경",
  BUDGET_TASK: "예산",
  PROJECT_REVIEW: "완성본검토",
};

const TYPE_ICON: Record<string, string> = {
  LEAVE_REQUEST: "🏖️",
  IMPORTANT_EVENT: "📅",
  DEADLINE_CHANGE: "⏰",
  BUDGET_TASK: "💰",
  PROJECT_REVIEW: "📝",
};

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "ALL", label: "전체" },
  { key: "LEAVE_REQUEST", label: "휴가·반차" },
  { key: "IMPORTANT_EVENT", label: "일정" },
  { key: "DEADLINE_CHANGE", label: "마감변경" },
  { key: "BUDGET_TASK", label: "예산" },
];

export function AdminApprovalPanel({ initialApprovals }: Props) {
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
      if (res.ok) setApprovals((prev) => prev.filter((a) => a.id !== id));
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
      {/* 탭 필터 */}
      <div style={{ display: "flex", borderBottom: "1.5px solid #E8E0C8", marginBottom: "1rem", gap: "0", overflowX: "auto" }}>
        {FILTER_TABS.map((tab) => {
          const count = tab.key === "ALL" ? approvals.length : approvals.filter((a) => a.type === tab.key).length;
          if (tab.key !== "ALL" && count === 0) return null;
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
              {tab.label}{count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* 카드 목록 */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {filtered.length === 0 && (
          <p style={{ fontSize: "13px", color: "#999", textAlign: "center", padding: "1rem 0" }}>
            해당 항목이 없습니다.
          </p>
        )}
        {filtered.map((a) => (
          <div
            key={a.id}
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
            {/* 아이콘 */}
            <div style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: "#FEF0E8", display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0, fontSize: "16px",
            }}>
              {TYPE_ICON[a.type] ?? "📋"}
            </div>

            {/* 텍스트 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#0D0D0D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {a.title}
              </div>
              <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                {a.requester.name} · {TYPE_LABELS[a.type] ?? a.type}
              </div>
            </div>

            {/* 버튼 */}
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              <button
                onClick={() => handleApprove(a.id)}
                disabled={loading === a.id}
                style={{
                  background: "#FEF0E8",
                  color: "#C05621",
                  border: "1px solid #FED7AA",
                  borderRadius: "7px",
                  padding: "5px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: loading === a.id ? 0.7 : 1,
                }}
              >
                승인
              </button>
              <button
                onClick={() => { setRejectModal(a.id); setDecisionNote(""); }}
                disabled={loading === a.id}
                style={{
                  background: "#F1EFE8",
                  color: "#888",
                  border: "1px solid #E8E0C8",
                  borderRadius: "7px",
                  padding: "5px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  cursor: "pointer",
                  opacity: loading === a.id ? 0.7 : 1,
                }}
              >
                거절
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 거절 모달 */}
      {rejectModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setRejectModal(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: "12px", padding: "1.5rem", maxWidth: "24rem", width: "calc(100% - 2rem)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "0.75rem" }}>
              거절 사유 입력
            </h3>
            <textarea
              value={decisionNote}
              onChange={(e) => setDecisionNote(e.target.value)}
              placeholder="거절 사유를 입력하세요 (선택)"
              rows={4}
              style={{
                width: "100%", border: "1px solid #E8E0C8", borderRadius: "7px",
                padding: "9px 12px", fontSize: "13px", outline: "none",
                resize: "none", marginBottom: "1rem", boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
              onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
            />
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setRejectModal(null)}
                style={{
                  flex: 1, padding: "0.625rem", border: "1px solid #E8E0C8",
                  borderRadius: "7px", background: "#fff", cursor: "pointer",
                  fontSize: "13px", color: "#555",
                }}
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={loading === rejectModal}
                style={{
                  flex: 1, padding: "0.625rem", border: "none",
                  borderRadius: "7px", background: "#F56B23", color: "#fff",
                  cursor: "pointer", fontSize: "13px", fontWeight: 600,
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
