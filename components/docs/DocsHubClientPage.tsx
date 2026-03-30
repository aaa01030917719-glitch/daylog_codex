"use client";

import type { CSSProperties, ReactNode } from "react";
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

const primaryButtonStyle: CSSProperties = {
  border: "1px solid #F56B23",
  background: "#F56B23",
  color: "#fff",
  borderRadius: "9999px",
  padding: "0.65rem 1rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  border: "1px solid #E8E0C8",
  background: "#fff",
  color: "#5B4636",
  borderRadius: "9999px",
  padding: "0.65rem 1rem",
  fontSize: "0.875rem",
  fontWeight: 600,
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  width: "100%",
  border: "1px solid #DCCDBE",
  borderRadius: "0.75rem",
  padding: "0.75rem 0.875rem",
  fontSize: "0.9rem",
  boxSizing: "border-box",
};

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

function StatCard({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: ReactNode }) {
  return (
    <div style={{ border: "1px solid #F0D8C4", borderRadius: "1rem", background: "rgba(255,255,255,0.78)", padding: "1rem" }}>
      <div style={{ width: "2rem", height: "2rem", borderRadius: "0.75rem", background: "#FEF0E8", color: "#C05621", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "0.75rem" }}>{icon}</div>
      <div style={{ fontSize: "0.8rem", color: "#7B614D" }}>{label}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#1F2937" }}>{value}</div>
      <div style={{ fontSize: "0.8rem", color: "#8A6F5A", marginTop: "0.25rem" }}>{helper}</div>
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
  const [leaveType, setLeaveType] = useState<LeaveRequestType>("FULL_DAY");
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveDescription, setLeaveDescription] = useState("");
  const [workType, setWorkType] = useState<WorkType>("IMPORTANT_EVENT");
  const [workTitle, setWorkTitle] = useState("");
  const [workDescription, setWorkDescription] = useState("");
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

  async function handleCreate() {
    setError(null);
    setSubmitting(true);
    try {
      const payload =
        dialogMode === "LEAVE"
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
        setError(data.error ?? "Failed to create approval.");
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
      setError("Failed to create approval.");
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
        body: JSON.stringify({ status, decisionNote: status === "REJECTED" ? decisionNote.trim() : undefined }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Failed to update approval.");
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
                decider: approval.decider ?? { id: currentUserId, name: "Admin" },
              }
            : approval
        )
      );
      setRejectingId(null);
      setDecisionNote("");
    } catch (decisionError) {
      console.error("[DOCS_HUB_DECIDE]", decisionError);
      setError("Failed to update approval.");
    } finally {
      setDecisionLoadingId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <section style={{ background: "linear-gradient(135deg, rgba(245,107,35,0.14), rgba(255,245,235,0.92))", border: "1px solid #F2D1BD", borderRadius: "1rem", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
          <div style={{ maxWidth: "42rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", color: "#C05621", marginBottom: "0.5rem" }}>DOCS HUB</div>
            <h2 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.9rem", fontWeight: 700, color: "#1F2937", marginBottom: "0.5rem" }}>문서와 결재를 한 화면으로 묶는 허브</h2>
            <p style={{ color: "#5B4636", lineHeight: 1.7, fontSize: "0.95rem" }}>This client component is aligned for the future docs hub wiring. The simple /docs page stays unchanged until the server page and prop mapping are ready.</p>
          </div>
          <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
            <button onClick={() => { setDialogMode("LEAVE"); setError(null); }} style={primaryButtonStyle}>Leave request</button>
            <button onClick={() => { setDialogMode("WORK"); setError(null); }} style={secondaryButtonStyle}>Work approval</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.875rem", marginTop: "1.25rem" }}>
          <StatCard label="일반 문서" value={`${initialPages.length}`} helper="existing wiki pages" icon={<FileText size={16} />} />
          <StatCard label="전체 신청" value={`${counts.ALL}`} helper="leave + work" icon={<Send size={16} />} />
          <StatCard label="연차/반차" value={`${counts.LEAVE}`} helper="calendar-ready" icon={<CalendarDays size={16} />} />
          <StatCard label="업무 결재" value={`${counts.WORK}`} helper={isAdmin ? "admin can decide" : "my items only"} icon={<FileText size={16} />} />
        </div>
      </section>

      <section style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "1rem", padding: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {docsHubTabs.map((tab) => (
            <button key={tab.value} onClick={() => setActiveTab(tab.value)} style={{ ...secondaryButtonStyle, background: activeTab === tab.value ? "#FEF0E8" : "#fff", borderColor: activeTab === tab.value ? "#F56B23" : "#E8E0C8", color: activeTab === tab.value ? "#C05621" : "#5B4636" }}>
              {tab.label}{tab.value !== "DOCS" ? ` (${counts[tab.value]})` : ""}
            </button>
          ))}
        </div>

        {activeTab !== "DOCS" && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {approvalStatusFilters.map((filter) => (
              <button key={filter.value} onClick={() => setStatusFilter(filter.value)} style={{ ...secondaryButtonStyle, background: statusFilter === filter.value ? "#F5EED5" : "#FAF7EE" }}>
                {filter.label}
              </button>
            ))}
          </div>
        )}

        {error && <div style={{ marginBottom: "1rem", borderRadius: "0.75rem", background: "#FFF3F2", color: "#9B2C2C", padding: "0.75rem 0.9rem", fontSize: "0.875rem" }}>{error}</div>}

        {activeTab === "DOCS" ? (
          <DocsClientPage initialPages={initialPages} currentUserId={currentUserId} />
        ) : activeTab === "CALENDAR" ? (
          <div style={{ border: "1px solid #E8E0C8", borderRadius: "0.875rem", padding: "1rem" }}>
            <FullCalendar
              plugins={[dayGridPlugin]}
              initialView="dayGridMonth"
              locale="ko"
              height="auto"
              headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
              buttonText={{ today: "오늘" }}
              events={leaveApprovals.map((approval) => ({
                id: approval.id,
                title: `${approval.requester.name ?? "User"} · ${approval.leaveType ? leaveTypeLabels[approval.leaveType] : "Leave"}`,
                start: approval.leaveStart ?? approval.createdAt,
                end: approval.leaveEnd ? addOneDay(approval.leaveEnd) : approval.leaveStart ?? approval.createdAt,
                allDay: true,
                backgroundColor: approval.status === "APPROVED" ? "#2F855A" : approval.status === "REJECTED" ? "#C53030" : "#C67C2E",
                borderColor: approval.status === "APPROVED" ? "#2F855A" : approval.status === "REJECTED" ? "#C53030" : "#C67C2E",
              }))}
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {filteredApprovals.length === 0 && <div style={{ border: "1px dashed #DCCDBE", borderRadius: "0.875rem", padding: "2rem 1rem", textAlign: "center", color: "#8A6F5A" }}>No approvals for this filter.</div>}
            {filteredApprovals.map((approval) => (
              <article key={approval.id} style={{ border: "1px solid #E8E0C8", borderRadius: "0.95rem", padding: "1rem", background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.45rem" }}>
                      <span style={{ borderRadius: "9999px", padding: "0.25rem 0.65rem", background: "#FAF7EE", color: "#7B614D", fontSize: "0.75rem", fontWeight: 600 }}>{approvalTypeLabels[approval.type]}</span>
                      <span style={{ borderRadius: "9999px", padding: "0.25rem 0.65rem", background: approval.status === "APPROVED" ? "#E6F7EC" : approval.status === "REJECTED" ? "#FDECEC" : "#FFF3DB", color: approval.status === "APPROVED" ? "#2F855A" : approval.status === "REJECTED" ? "#C53030" : "#C67C2E", fontSize: "0.75rem", fontWeight: 700 }}>{approvalStatusLabels[approval.status]}</span>
                    </div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1F2937", marginBottom: "0.35rem" }}>{approval.title}</h3>
                    <p style={{ fontSize: "0.875rem", color: "#7B614D", marginBottom: "0.5rem" }}>{approval.requester.name ?? "Unknown"} · {formatDateTime(approval.createdAt)}</p>
                    <p style={{ fontSize: "0.875rem", color: "#5B4636", marginBottom: approval.description ? "0.55rem" : 0 }}>
                      {isLeave(approval)
                        ? `${approval.leaveType ? leaveTypeLabels[approval.leaveType] : "Leave"} · ${formatDate(approval.leaveStart)} - ${formatDate(approval.leaveEnd)}`
                        : approval.task?.title ?? approval.event?.title ?? approvalTypeLabels[approval.type]}
                    </p>
                    {approval.description && <p style={{ fontSize: "0.9rem", color: "#1F2937", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{approval.description}</p>}
                    {approval.status !== "PENDING" && <p style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: "#7B614D" }}>Processed {formatDateTime(approval.decidedAt)}{approval.decisionNote ? ` · ${approval.decisionNote}` : ""}</p>}
                  </div>
                  {isAdmin && approval.status === "PENDING" && (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button onClick={() => handleDecision("APPROVED", approval.id)} disabled={decisionLoadingId === approval.id} style={{ ...secondaryButtonStyle, background: "#E6F7EC", borderColor: "#B7E3C8", color: "#1F7A43" }}>Approve</button>
                      <button onClick={() => { setRejectingId(approval.id); setDecisionNote(""); }} disabled={decisionLoadingId === approval.id} style={{ ...secondaryButtonStyle, background: "#FFF3F2", borderColor: "#F3C3C0", color: "#B83232" }}>Reject</button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {dialogMode && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 50 }} onClick={() => !submitting && setDialogMode(null)}>
          <div style={{ width: "100%", maxWidth: "34rem", background: "#fff", borderRadius: "1rem", padding: "1.25rem" }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1F2937" }}>{dialogMode === "LEAVE" ? "연차/반차 신청" : "업무 결재 신청"}</h3>
              <button onClick={() => setDialogMode(null)} style={{ ...secondaryButtonStyle, padding: "0.4rem 0.6rem" }}><X size={16} /></button>
            </div>
            {dialogMode === "LEAVE" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                <select value={leaveType} onChange={(event) => setLeaveType(event.target.value as LeaveRequestType)} style={inputStyle}>
                  {Object.entries(leaveTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                  <input type="date" value={leaveStart} onChange={(event) => setLeaveStart(event.target.value)} style={inputStyle} />
                  <input type="date" value={leaveEnd} onChange={(event) => setLeaveEnd(event.target.value)} style={inputStyle} />
                </div>
                <textarea rows={4} value={leaveDescription} onChange={(event) => setLeaveDescription(event.target.value)} placeholder="Leave reason" style={{ ...inputStyle, resize: "vertical", minHeight: "96px" }} />
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                <select value={workType} onChange={(event) => setWorkType(event.target.value as WorkType)} style={inputStyle}>
                  {workApprovalTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <input value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} placeholder="Approval title" style={inputStyle} />
                <textarea rows={5} value={workDescription} onChange={(event) => setWorkDescription(event.target.value)} placeholder="Approval description" style={{ ...inputStyle, resize: "vertical", minHeight: "120px" }} />
              </div>
            )}
            <div style={{ display: "flex", gap: "0.625rem", marginTop: "1.25rem" }}>
              <button onClick={() => setDialogMode(null)} style={secondaryButtonStyle} disabled={submitting}>Cancel</button>
              <button onClick={handleCreate} style={primaryButtonStyle} disabled={submitting}>{submitting ? "Saving..." : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {rejectingId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", zIndex: 50 }} onClick={() => !decisionLoadingId && setRejectingId(null)}>
          <div style={{ width: "100%", maxWidth: "34rem", background: "#fff", borderRadius: "1rem", padding: "1.25rem" }} onClick={(event) => event.stopPropagation()}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1F2937", marginBottom: "1rem" }}>Reject approval</h3>
            <textarea rows={5} value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Reason" style={{ ...inputStyle, resize: "vertical", minHeight: "120px" }} />
            <div style={{ display: "flex", gap: "0.625rem", marginTop: "1.25rem" }}>
              <button onClick={() => setRejectingId(null)} style={secondaryButtonStyle} disabled={!!decisionLoadingId}>Cancel</button>
              <button onClick={() => handleDecision("REJECTED", rejectingId)} style={{ ...primaryButtonStyle, background: "#B83232", borderColor: "#B83232" }} disabled={!!decisionLoadingId}>{decisionLoadingId ? "Saving..." : "Reject"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
