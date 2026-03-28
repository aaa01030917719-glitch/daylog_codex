"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { format } from "date-fns";

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  requiresApproval: boolean;
  budget: number | null;
  dueDate: string | Date | null;
  projectId: string;
  assigneeId: string | null;
  creatorId: string;
  assignee: { id: string; name: string | null; image: string | null } | null;
  creator: { id: string; name: string | null };
}

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  task: Task;
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
  onClose: () => void;
  onUpdated: (task: Task) => void;
  onDeleted: (taskId: string) => void;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "TODO", label: "할 일" },
  { value: "IN_PROGRESS", label: "진행중" },
  { value: "IN_REVIEW", label: "검토중" },
  { value: "DONE", label: "완료" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "LOW", label: "낮음" },
  { value: "MEDIUM", label: "중간" },
  { value: "HIGH", label: "높음" },
  { value: "URGENT", label: "긴급" },
];

export function TaskDetail({ task, members, isAdmin, currentUserId, onClose, onUpdated, onDeleted }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [assigneeId, setAssigneeId] = useState<string>(task.assigneeId ?? "");
  const [dueDate, setDueDate] = useState<string>(
    task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""
  );
  const [budget, setBudget] = useState<string>(task.budget?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approvalSent, setApprovalSent] = useState(false);

  const canDelete = isAdmin || task.creatorId === currentUserId;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          assigneeId: assigneeId || null,
          dueDate: dueDate || null,
          budget: budget ? parseFloat(budget) : null,
          requiresApproval: budget ? parseFloat(budget) > 0 : false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onUpdated(data.task);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("태스크를 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (res.ok) onDeleted(task.id);
    } finally {
      setDeleting(false);
    }
  }

  async function handleApprovalRequest() {
    try {
      const res = await fetch("/api/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "BUDGET_TASK",
          title: `태스크 예산 승인 요청: ${title}`,
          description: `예산: ${Number(budget).toLocaleString()}원\n${description}`,
          taskId: task.id,
        }),
      });
      if (res.ok) setApprovalSent(true);
    } catch {
      //
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 39 }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(28rem, 100vw)",
          background: "#fff",
          boxShadow: "-4px 0 32px rgba(0,0,0,0.12)",
          zIndex: 40,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Panel header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: "1px solid #E8E0C8" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#555" }}>태스크 상세</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#D93025", padding: "0.25rem", display: "flex", alignItems: "center" }}
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#999", padding: "0.25rem", display: "flex", alignItems: "center" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Panel body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem" }}>
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              fontSize: "1.125rem",
              fontWeight: 600,
              color: "#0D0D0D",
              border: "none",
              borderBottom: "2px solid #E8E0C8",
              paddingBottom: "0.5rem",
              marginBottom: "1rem",
              outline: "none",
              background: "transparent",
              boxSizing: "border-box",
            }}
          />

          {/* Description */}
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#999", marginBottom: "0.375rem" }}>설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="태스크 설명을 입력하세요"
            style={{
              width: "100%",
              border: "1px solid #E8E0C8",
              borderRadius: "0.5rem",
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              outline: "none",
              resize: "none",
              marginBottom: "1rem",
              boxSizing: "border-box",
            }}
          />

          {/* Status */}
          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#999", marginBottom: "0.375rem" }}>상태</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              style={{ width: "100%", border: "1px solid #E8E0C8", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none", background: "#fff" }}
            >
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Priority */}
          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#999", marginBottom: "0.375rem" }}>우선순위</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              style={{ width: "100%", border: "1px solid #E8E0C8", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none", background: "#fff" }}
            >
              {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Assignee */}
          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#999", marginBottom: "0.375rem" }}>담당자</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              style={{ width: "100%", border: "1px solid #E8E0C8", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none", background: "#fff" }}
            >
              <option value="">담당자 없음</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          {/* Due date */}
          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#999", marginBottom: "0.375rem" }}>마감일</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ width: "100%", border: "1px solid #E8E0C8", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none", background: "#fff", boxSizing: "border-box" }}
            />
          </div>

          {/* Budget */}
          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "#999", marginBottom: "0.375rem" }}>예산</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="예: 500000"
              style={{ width: "100%", border: "1px solid #E8E0C8", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* Approval request */}
          {budget && parseFloat(budget) > 0 && (
            <div style={{ background: "#FEF0E8", borderRadius: "0.5rem", padding: "0.875rem", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.8125rem", color: "#F56B23", marginBottom: "0.5rem" }}>
                예산이 있는 태스크는 대표 컨펌이 필요합니다.
              </p>
              <button
                onClick={handleApprovalRequest}
                disabled={approvalSent}
                style={{
                  padding: "0.375rem 0.875rem",
                  border: "none",
                  borderRadius: "0.5rem",
                  background: approvalSent ? "#E8E0C8" : "#F56B23",
                  color: approvalSent ? "#999" : "#fff",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: approvalSent ? "default" : "pointer",
                }}
              >
                {approvalSent ? "컨펌 요청 완료" : "대표 컨펌 요청"}
              </button>
            </div>
          )}
        </div>

        {/* Save button */}
        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid #E8E0C8" }}>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            style={{
              width: "100%",
              padding: "0.625rem",
              border: "none",
              borderRadius: "0.5rem",
              background: "#F56B23",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: saving || !title.trim() ? "default" : "pointer",
              opacity: saving || !title.trim() ? 0.7 : 1,
            }}
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </>
  );
}
