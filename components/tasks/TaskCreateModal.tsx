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
  projectId?: string;
  defaultStatus?: TaskStatus;
  members: Member[];
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

export function TaskCreateModal({
  projectId: initialProjectId,
  defaultStatus = "TODO",
  members,
  projects,
  onCreated,
  onClose,
}: Props) {
  const hasProjectStep = !!projects && !initialProjectId;
  const totalSteps = hasProjectStep ? 4 : 3;
  const stepLabels = hasProjectStep
    ? ["태스크 이름", "프로젝트 선택", "마감일과 우선순위", "담당자 확인"]
    : ["태스크 이름", "마감일과 우선순위", "담당자 확인"];

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId ?? "");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resolvedProjectId = hasProjectStep ? selectedProjectId : (initialProjectId ?? "");
  const selectedProject = projects?.find((project) => project.id === selectedProjectId);
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
    setError("");

    try {
      const response = await fetch("/api/tasks", {
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

      if (!response.ok) {
        try {
          const data = await response.json();
          setError(
            typeof data?.error === "string"
              ? data.error
              : "태스크를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요."
          );
        } catch {
          setError("태스크를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
        return;
      }

      const data = await response.json();
      onCreated(data.task);
    } catch {
      setError("태스크를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:mx-auto sm:rounded-xl"
        style={{
          background: "#fff",
          borderRadius: "1.25rem 1.25rem 0 0",
          padding: "1.5rem",
          maxWidth: "26rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.8125rem", color: "#999", marginBottom: "0.25rem" }}>
            단계 {step}/{totalSteps}
          </p>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D" }}>
            {stepLabels[step - 1]}
          </h2>
        </div>

        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "1.25rem" }}>
          {stepLabels.map((_, index) => (
            <div
              key={index}
              style={{
                height: "3px",
                flex: 1,
                borderRadius: "9999px",
                background: index + 1 <= step ? "#F56B23" : "#E8E0C8",
                transition: "background 0.2s",
              }}
            />
          ))}
        </div>

        {step === 1 ? (
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#555",
                marginBottom: "0.5rem",
              }}
            >
              태스크 이름 <span style={{ color: "#F56B23" }}>*</span>
            </label>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canProceed()) {
                  setStep(2);
                }
              }}
              placeholder="예: 운영 제안서 작성"
              style={{
                width: "100%",
                border: "1px solid #E8E0C8",
                borderRadius: "0.5rem",
                padding: "0.625rem 0.75rem",
                fontSize: "0.875rem",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(event) => {
                event.target.style.borderColor = "#F56B23";
              }}
              onBlur={(event) => {
                event.target.style.borderColor = "#E8E0C8";
              }}
            />
          </div>
        ) : null}

        {step === 2 && hasProjectStep ? (
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#555",
                marginBottom: "0.5rem",
              }}
            >
              프로젝트 선택 <span style={{ color: "#F56B23" }}>*</span>
            </label>
            {projects && projects.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  maxHeight: "12rem",
                  overflowY: "auto",
                }}
              >
                {projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      padding: "0.625rem 0.75rem",
                      border:
                        selectedProjectId === project.id
                          ? "2px solid #F56B23"
                          : "1px solid #E8E0C8",
                      borderRadius: "0.5rem",
                      background: selectedProjectId === project.id ? "#FEF0E8" : "#fff",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: "0.625rem",
                        height: "0.625rem",
                        borderRadius: "50%",
                        background: project.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: "0.875rem", color: "#0D0D0D", flex: 1 }}>
                      {project.name}
                    </span>
                    {selectedProjectId === project.id ? (
                      <Check size={14} style={{ color: "#F56B23", flexShrink: 0 }} />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "0.875rem", color: "#999", padding: "1rem", textAlign: "center" }}>
                프로젝트가 없습니다.
              </p>
            )}
          </div>
        ) : null}

        {step === dueDateStep ? (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>
                마감일
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid #E8E0C8",
                  borderRadius: "0.5rem",
                  padding: "0.625rem 0.75rem",
                  fontSize: "0.875rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>
                우선순위
              </label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {PRIORITY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPriority(option.value)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      border:
                        priority === option.value ? "2px solid #F56B23" : "1px solid #E8E0C8",
                      borderRadius: "0.5rem",
                      background: priority === option.value ? "#FEF0E8" : "#fff",
                      color: priority === option.value ? "#F56B23" : "#555",
                      fontSize: "0.75rem",
                      fontWeight: priority === option.value ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === assigneeStep ? (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "#555", marginBottom: "0.5rem" }}>
                담당자(선택)
              </label>
              <select
                value={assigneeId}
                onChange={(event) => setAssigneeId(event.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid #E8E0C8",
                  borderRadius: "0.5rem",
                  padding: "0.625rem 0.75rem",
                  fontSize: "0.875rem",
                  outline: "none",
                  background: "#fff",
                }}
              >
                <option value="">담당자 없음</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ background: "#FAF7EE", borderRadius: "0.5rem", padding: "0.875rem", fontSize: "0.875rem" }}>
              <p style={{ fontWeight: 600, color: "#0D0D0D", marginBottom: "0.375rem" }}>{title}</p>
              {selectedProject ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", marginBottom: "0.25rem" }}>
                  <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: selectedProject.color }} />
                  <p style={{ color: "#555" }}>{selectedProject.name}</p>
                </div>
              ) : null}
              <p style={{ color: "#555", marginBottom: "0.125rem" }}>마감: {dueDate || "미설정"}</p>
              <p style={{ color: "#555", marginBottom: "0.125rem" }}>
                우선순위: {PRIORITY_OPTIONS.find((option) => option.value === priority)?.label}
              </p>
              {assigneeId ? (
                <p style={{ color: "#555" }}>
                  담당자 {members.find((member) => member.id === assigneeId)?.name}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? (
          <p style={{ marginTop: "1rem", fontSize: "0.8125rem", fontWeight: 500, color: "#dc2626" }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem" }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((current) => current - 1)}
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
              이전
            </button>
          ) : null}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={() => canProceed() && setStep((current) => current + 1)}
              disabled={!canProceed()}
              style={{
                flex: 1,
                padding: "0.625rem",
                border: "none",
                borderRadius: "0.5rem",
                background: "#F56B23",
                color: "#fff",
                cursor: canProceed() ? "pointer" : "not-allowed",
                fontSize: "0.875rem",
                fontWeight: 600,
                opacity: canProceed() ? 1 : 0.5,
              }}
            >
              다음
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading || !resolvedProjectId}
              style={{
                flex: 1,
                padding: "0.625rem",
                border: "none",
                borderRadius: "0.5rem",
                background: "#F56B23",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "생성 중..." : "태스크 만들기"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
