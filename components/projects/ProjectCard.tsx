"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Check, Loader2 } from "lucide-react";
import {
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  type ProjectSummary,
} from "@/components/projects/project-board-types";

interface ProjectCardProps {
  project: ProjectSummary;
  isProcessing?: boolean;
  onComplete?: (project: ProjectSummary) => void;
  onSelect?: (project: ProjectSummary) => void;
}

function formatPeople(names: string[]) {
  if (names.length === 0) {
    return "미지정";
  }

  if (names.length <= 2) {
    return names.join(", ");
  }

  return `${names.slice(0, 2).join(", ")} 외 ${names.length - 2}명`;
}

function formatRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) {
    return "일정 정보 없음";
  }

  const startLabel = startDate ? format(new Date(startDate), "M/d", { locale: ko }) : "-";
  const endLabel = endDate ? format(new Date(endDate), "M/d", { locale: ko }) : "-";

  return `${startLabel} - ${endLabel}`;
}

export function ProjectCard({
  project,
  isProcessing = false,
  onComplete,
  onSelect,
}: ProjectCardProps) {
  const statusTone = PROJECT_STATUS_COLORS[project.boardStatus];
  const primaryTag = project.tags[0] ?? "기본";
  const secondaryText =
    project.subtitle?.trim() ||
    project.description?.trim() ||
    "설명이 아직 등록되지 않았습니다.";
  const isCompleted = project.boardStatus === "COMPLETED" || project.status === "ARCHIVED";

  return (
    <div
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onClick={() => onSelect?.(project)}
      onKeyDown={(event) => {
        if (!onSelect) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(project);
        }
      }}
      className={`w-full rounded-[18px] border border-[var(--border)] bg-white p-4 text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow)] ${
        onSelect ? "cursor-pointer" : ""
      }`}
    >
      <div className="flex items-start gap-3">
       
        <div className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: project.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            
            <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-[var(--text-primary)]">
              {project.name}
            </h3>
            <span
              className="status-badge shrink-0"
              style={{
                background: statusTone.background,
                color: statusTone.text,
                border: `1px solid ${statusTone.border}`,
              }}
            >
              {PROJECT_STATUS_LABELS[project.boardStatus]}
            </span>
          </div>

          <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
            {secondaryText}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="status-badge status-badge--neutral">#{primaryTag}</span>
            <span className="status-badge status-badge--neutral">담당 {formatPeople(project.assigneeNames)}</span>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--text-muted)]">진행률</span>
              <span className="font-semibold text-[var(--text-primary)]">{project.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-3)]">
              <div className="h-full rounded-full transition-all" style={{ width: `${project.progress}%`, background: project.color }} />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-2 whitespace-nowrap hover:bg-[var(--surface-2)]">
            <button
          type="button"
          role="checkbox"
          aria-checked={isCompleted}
          aria-label={isCompleted ? `${project.name} 완료됨` : `${project.name} 완료 처리`}
          disabled={isCompleted || isProcessing || !onComplete}
          onClick={(event) => {
            event.stopPropagation();
            if (!isCompleted && !isProcessing && onComplete) {
              onComplete(project);
            }
          }}
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed"
          style={{
            borderColor: isCompleted ? "#bbf7d0" : "var(--border)",
            background: isCompleted ? "#dcfce7" : "var(--surface)",
            color: isCompleted ? "#15803d" : "var(--text-muted)",
            opacity: isProcessing ? 0.7 : 1,
          }}
          title={isCompleted ? "완료된 프로젝트" : "완료 처리"}
        >
          {isProcessing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : isCompleted ? (
            <Check size={14} />
          ) : null}
        </button>
        <span>완료</span> 
        </div>
           {/*삭제 <span>업무 {project.doneTasks}/{project.totalTasks}</span>*/}
            <span>{formatRange(project.startDate, project.endDate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
