"use client";

import { useMemo, useState } from "react";
import type { ProjectSummary } from "@/components/projects/project-board-types";

interface ProjectResponse {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  color: string;
  status: string;
  budget: number | null;
  progress?: number | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  doneTasks: number;
  _count?: { tasks: number };
}

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  members: Member[];
  onCreated?: (project: ProjectResponse) => void;
  onSaved?: (project: ProjectResponse) => void;
  onClose: () => void;
  project?: ProjectSummary | null;
}

const COLOR_OPTIONS = [
  "#4f7cff",
  "#34d399",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#8b5cf6",
];

const BOARD_STATUS_LABELS: Record<ProjectSummary["boardStatus"], string> = {
  ONGOING: "진행 중",
  UPCOMING: "예정",
  COMPLETED: "완료",
};

function getTodayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateInputValue(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function readError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      return data.error;
    }
  } catch {
    return "프로젝트를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "프로젝트를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export function ProjectCreateModal({
  members,
  onCreated,
  onSaved,
  onClose,
  project = null,
}: Props) {
  const isEditMode = Boolean(project);
  const todayValue = useMemo(() => getTodayInputValue(), []);
  const [name, setName] = useState(project?.name ?? "");
  const [subtitle, setSubtitle] = useState(project?.subtitle ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [color, setColor] = useState(project?.color ?? COLOR_OPTIONS[0]);
  const [startDate, setStartDate] = useState(
    formatDateInputValue(project?.startDate) || todayValue
  );
  const [endDate, setEndDate] = useState(
    formatDateInputValue(project?.endDate) || todayValue
  );
  const [progress, setProgress] = useState(String(project?.progress ?? 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endDateMin = startDate || todayValue;
  const summaryTaskCount = project?.totalTasks ?? 0;
  const summaryAssignees =
    project?.assigneeNames.length ? project.assigneeNames.join(", ") : "담당자 미지정";
  const summaryTags = project?.tags.length ? project.tags.join(", ") : "태그 없음";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("프로젝트 이름을 입력해 주세요.");
      return;
    }

    const parsedProgress = Number(progress);
    if (!Number.isFinite(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
      setError("진행률은 0부터 100 사이 숫자로 입력해 주세요.");
      return;
    }

    const parsedStartDate = new Date(`${startDate}T00:00:00`);
    const parsedEndDate = new Date(`${endDate}T00:00:00`);

    if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
      setError("프로젝트 날짜를 다시 확인해 주세요.");
      return;
    }

    if (parsedEndDate.getTime() < parsedStartDate.getTime()) {
      setError("마감날짜는 시작날짜보다 빠를 수 없습니다.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(project ? `/api/projects/${project.id}` : "/api/projects", {
        method: project ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          subtitle: subtitle.trim() || null,
          description: description.trim() || null,
          color,
          budget: null,
          progress: Math.round(parsedProgress),
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        setError(await readError(response));
        return;
      }

      const data = (await response.json()) as { project?: ProjectResponse };
      if (!data.project) {
        setError("프로젝트 저장 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
        return;
      }

      if (isEditMode) {
        if (onSaved) {
          onSaved(data.project);
        } else {
          onClose();
        }
      } else {
        if (onCreated) {
          onCreated(data.project);
        } else {
          onClose();
        }
      }
    } catch (createError) {
      console.error("[PROJECT_CREATE_MODAL]", createError);
      setError("프로젝트를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-shell" onClick={onClose}>
      <div className="modal-overlay" />
      <div className="modal-card modal-card--form" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{isEditMode ? "프로젝트 상세" : "프로젝트 등록"}</h2>
            <p className="modal-subtitle">
              {isEditMode
                ? "프로젝트 세부 내용과 진행률을 확인하고 필요한 값을 바로 수정합니다."
                : "프로젝트 이름, 일정, 진행률을 먼저 저장하고 보드에서 이어서 관리합니다."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="icon-button"
            aria-label={isEditMode ? "프로젝트 상세 모달 닫기" : "프로젝트 등록 모달 닫기"}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-5">
            {project ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4">
                <div className="grid gap-3 text-sm text-[var(--text-secondary)] sm:grid-cols-2">
                  <div>
                    <p className="field-label">현재 상태</p>
                    <p className="mt-1 font-semibold text-[var(--text-primary)]">
                      {BOARD_STATUS_LABELS[project.boardStatus]}
                    </p>
                  </div>
                  <div>
                    <p className="field-label">업무 수</p>
                    <p className="mt-1 font-semibold text-[var(--text-primary)]">
                      {project.doneTasks}/{summaryTaskCount}
                    </p>
                  </div>
                  <div>
                    <p className="field-label">담당자</p>
                    <p className="mt-1 line-clamp-1 font-medium text-[var(--text-primary)]">
                      {summaryAssignees}
                    </p>
                  </div>
                  <div>
                    <p className="field-label">태그</p>
                    <p className="mt-1 line-clamp-1 font-medium text-[var(--text-primary)]">
                      {summaryTags}
                    </p>
                  </div>
                </div>
              </div>
            ) : members.length > 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 text-sm text-[var(--text-secondary)]">
                현재 워크스페이스 멤버 {members.length}명이 참여 중입니다. 프로젝트 등록 후
                세부 업무와 담당자를 연결해 주세요.
              </div>
            ) : null}

            <div className="field">
              <label className="field-label" htmlFor="project-name">
                프로젝트 이름
              </label>
              <input
                id="project-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="form-input"
                placeholder="예: 2분기 브랜드 캠페인"
                maxLength={80}
                autoFocus
                required
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="project-subtitle">
                상세제목
              </label>
              <input
                id="project-subtitle"
                type="text"
                value={subtitle}
                onChange={(event) => setSubtitle(event.target.value)}
                className="form-input"
                placeholder="예: 4월 프로모션 운영안"
                maxLength={120}
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="project-description">
                프로젝트 설명
              </label>
              <textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="form-textarea min-h-[160px]"
                placeholder="프로젝트 목표와 운영 메모를 간단히 남겨 주세요"
              />
              <p className="field-hint">
                담당자와 세부 업무는 프로젝트 보드에서 계속 관리할 수 있습니다.
              </p>
            </div>

            <div className="field">
              <span className="field-label">대표 색상</span>
              <div className="flex flex-wrap gap-3">
                {COLOR_OPTIONS.map((option) => {
                  const selected = color === option;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setColor(option)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-transform hover:-translate-y-0.5"
                      style={{
                        background: option,
                        borderColor: selected ? "#0f172a" : "rgba(255,255,255,0.92)",
                        boxShadow: selected ? "0 0 0 4px rgba(79,124,255,0.14)" : "var(--shadow-sm)",
                      }}
                      aria-label={`색상 ${option}`}
                    >
                      {selected ? <span className="text-sm font-bold text-white">✓</span> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="field">
                <label className="field-label" htmlFor="project-start-date">
                  시작날짜
                </label>
                <input
                  id="project-start-date"
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    if (endDate && event.target.value && endDate < event.target.value) {
                      setEndDate(event.target.value);
                    }
                  }}
                  className="form-input"
                  required
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="project-end-date">
                  마감날짜
                </label>
                <input
                  id="project-end-date"
                  type="date"
                  value={endDate}
                  min={endDateMin}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="form-input"
                  required
                />
                <p className="field-hint">
                  기본값은 오늘 이후 일정입니다. 시작날짜를 과거로 바꾸면 지난 업무 백업도
                  등록할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="project-progress">
                진행률 (%)
              </label>
              <input
                id="project-progress"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={progress}
                onChange={(event) => setProgress(event.target.value)}
                className="form-input"
                placeholder="0"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
                {error}
              </div>
            ) : null}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="secondary-button" disabled={loading}>
              취소
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? "저장 중..." : isEditMode ? "변경 저장" : "프로젝트 저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
