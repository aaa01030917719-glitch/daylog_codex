"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Check } from "lucide-react";

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

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Props {
  /** 칸반 컨텍스트에서 프리셋 (제공 시 프로젝트 선택 단계 생략) */
  projectId?: string;
  defaultStatus?: TaskStatus;
  members: Member[];
  /** 글로벌 컨텍스트에서 프로젝트 목록 (4단계 활성화) */
  projects?: Project[];
  onCreated: (task: Task) => void;
  onClose: () => void;
}

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "LOW", label: "낮음" },
  { value: "MEDIUM", label: "중간" },
  { value: "HIGH", label: "높음" },
  { value: "URGENT", label: "긴급" },
];

export function TaskCreateModal({ projectId: initialProjectId, defaultStatus = "TODO", members, projects, onCreated, onClose }: Props) {
  const hasProjectStep = !!projects && !initialProjectId;
  const totalSteps = hasProjectStep ? 4 : 3;
  const stepLabels = hasProjectStep
    ? ["태스크 이름", "프로젝트 선택", "마감일 및 우선순위", "담당자 및 확인"]
    : ["태스크 이름", "마감일 및 우선순위", "담당자 및 확인"];

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId ?? "");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [loading, setLoading] = useState(false);

  const resolvedProjectId = hasProjectStep ? selectedProjectId : (initialProjectId ?? "");
  const selectedProject = projects?.find((p) => p.id === selectedProjectId);
  const dueDateStep = hasProjectStep ? 3 : 2;
  const assigneeStep = hasProjectStep ? 4 : 3;

  function canProceed() {
    if (step === 1) return title.trim().length > 0;
    if (step === 2 && hasProjectStep) return selectedProjectId.length > 0;
    return true;
  }

  async function handleCreate() {
    if (!title.trim() || !resolvedProjectId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          projectId: resolvedProjectId,
          status: defaultStatus,
          dueDate: dueDate || null,
          priority,
          assigneeId: assigneeId || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onCreated(data.task);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: "0.75rem", padding: "1.5rem", maxWidth: "26rem", width: "calc(100% - 2rem)", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.8125rem", color: "#999", marginBottom: "0.25rem" }}>단계 {step}/{totalSteps}</p>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D" }}>{stepLabels[step - 1]}</h2>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem" }}>
          {stepLabels.map((_, i) => (
            <div key={i} style={{ height: "3px", flex: 1, borderRadius: "9999px", background: i + 1 <= step ? "#F56B23" : "#E8E0C8", transition: "background 0.2s" }} />
          ))}
        </div>

        {/* STEP 1: 태스크 이름 */}
        {step === 1 && (
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>
              태스크 이름 <span style={{ color: "#F56B23" }}>*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canProceed() && setStep(2)}
              placeholder="예: 디자인 시안 작성"
              style={{ width: "100%", border: "1px solid #E8E0C8", borderRadius: "0.5rem", padding: "0.625rem 0.75rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
              onFocus={(e) => (e.target.style.borderColor = "#F56B23")}
              onBlur={(e) => (e.target.style.borderColor = "#E8E0C8")}
            />
          </div>
        )}

        {/* STEP 2: 프로젝트 선택 (4단계 모드) */}
        {step === 2 && hasProjectStep && (
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>
              프로젝트 선택 <span style={{ color: "#F56B23" }}>*</span>
            </label>
            {projects && projects.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "12rem", overflowY: "auto" }}>
                {projects.map((p) => (
                  <button key={p.id} onClick={() => setSelectedProjectId(p.id)}
                    style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.625rem 0.75rem", border: selectedProjectId === p.id ? "2px solid #F56B23" : "1px solid #E8E0C8", borderRadius: "0.5rem", background: selectedProjectId === p.id ? "#FEF0E8" : "#fff", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ width: "0.625rem", height: "0.625rem", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "0.875rem", color: "#0D0D0D", flex: 1 }}>{p.name}</span>
                    {selectedProjectId === p.id && <Check size={14} style={{ color: "#F56B23", flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "0.875rem", color: "#999", padding: "1rem", textAlign: "center" }}>프로젝트가 없습니다.</p>
            )}
          </div>
        )}

        {/* STEP: 마감일 및 우선순위 */}
        {step === dueDateStep && (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>마감일</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                style={{ width: "100%", border: "1px solid #E8E0C8", borderRadius: "0.5rem", padding: "0.625rem 0.75rem", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>우선순위</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {PRIORITY_OPTIONS.map((o) => (
                  <button key={o.value} onClick={() => setPriority(o.value)}
                    style={{ flex: 1, padding: "0.5rem", border: priority === o.value ? "2px solid #F56B23" : "1px solid #E8E0C8", borderRadius: "0.5rem", background: priority === o.value ? "#FEF0E8" : "#fff", color: priority === o.value ? "#F56B23" : "#555", fontSize: "0.75rem", fontWeight: priority === o.value ? 600 : 400, cursor: "pointer" }}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP: 담당자 및 최종 확인 */}
        {step === assigneeStep && (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>담당자 (선택)</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
                style={{ width: "100%", border: "1px solid #E8E0C8", borderRadius: "0.5rem", padding: "0.625rem 0.75rem", fontSize: "0.875rem", outline: "none", background: "#fff" }}>
                <option value="">담당자 없음</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
            <div style={{ background: "#FAF7EE", borderRadius: "0.5rem", padding: "0.875rem", fontSize: "0.875rem" }}>
              <p style={{ fontWeight: 600, color: "#0D0D0D", marginBottom: "0.375rem" }}>{title}</p>
              {selectedProject && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.25rem" }}>
                  <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: selectedProject.color }} />
                  <p style={{ color: "#555" }}>{selectedProject.name}</p>
                </div>
              )}
              <p style={{ color: "#555", marginBottom: "0.125rem" }}>마감: {dueDate || "미설정"}</p>
              <p style={{ color: "#555", marginBottom: "0.125rem" }}>우선순위: {PRIORITY_OPTIONS.find((o) => o.value === priority)?.label}</p>
              {assigneeId && <p style={{ color: "#555" }}>담당자: {members.find((m) => m.id === assigneeId)?.name}</p>}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
          {step > 1 && (
            <button onClick={() => setStep((s) => s - 1)} style={{ flex: 1, padding: "0.625rem", border: "1px solid #E8E0C8", borderRadius: "0.5rem", background: "#fff", cursor: "pointer", fontSize: "0.875rem", color: "#555" }}>
              이전
            </button>
          )}
          {step < totalSteps ? (
            <button onClick={() => canProceed() && setStep((s) => s + 1)} disabled={!canProceed()}
              style={{ flex: 1, padding: "0.625rem", border: "none", borderRadius: "0.5rem", background: "#F56B23", color: "#fff", cursor: canProceed() ? "pointer" : "not-allowed", fontSize: "0.875rem", fontWeight: 600, opacity: canProceed() ? 1 : 0.5 }}>
              다음
            </button>
          ) : (
            <button onClick={handleCreate} disabled={loading || !resolvedProjectId}
              style={{ flex: 1, padding: "0.625rem", border: "none", borderRadius: "0.5rem", background: "#F56B23", color: "#fff", cursor: loading ? "not-allowed" : "pointer", fontSize: "0.875rem", fontWeight: 600, opacity: loading ? 0.7 : 1 }}>
              {loading ? "생성 중..." : "태스크 만들기"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
