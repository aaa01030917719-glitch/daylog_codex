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
    return "\ub2f4\ub2f9\uc790 \uc5c6\uc74c";
  }

  if (names.length <= 2) {
    return names.join(", ");
  }

  return `${names.slice(0, 2).join(", ")} \uc678 ${names.length - 2}\uba85`;
}

function formatRange(startDate: string | null, endDate: string | null) {
  if (!startDate && !endDate) {
    return "\uc77c\uc815 \uc815\ubcf4 \uc5c6\uc74c";
  }

  const startLabel = startDate ? format(new Date(startDate), "M/d", { locale: ko }) : "-";
  const endLabel = endDate ? format(new Date(endDate), "M/d", { locale: ko }) : "-";

  return `${startLabel} ~ ${endLabel}`;
}

export function ProjectCard({
  project,
  isProcessing = false,
  onComplete,
  onSelect,
}: ProjectCardProps) {
  const statusTone = PROJECT_STATUS_COLORS[project.boardStatus];
  const primaryTag = project.tags[0] ?? "\uae30\ubcf8";
  const detailText = project.subtitle?.trim() || project.description?.trim() || null;
  const isCompleted = project.boardStatus === "COMPLETED" || project.status === "ARCHIVED";
  const showProgress = project.progress > 0;

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
            <div className="min-w-0 flex-1">
              <div className="block w-full truncate text-left text-sm font-semibold text-[var(--text-secondary)]">
                {project.name}
              </div>
            </div>
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

          {detailText ? (
            <p className="mt-2 line-clamp-2 text-[15px] font-semibold leading-6 text-[var(--text-primary)]">
              {detailText}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-2">
            <span className="status-badge status-badge--neutral">#{primaryTag}</span>
            <span className="status-badge status-badge--neutral">{`\ub2f4\ub2f9 ${formatPeople(project.assigneeNames)}`}</span>
          </div>

          {showProgress ? (
            <div className="mt-3 rounded-[12px] bg-[var(--surface-2)] px-3 py-2">
              <div className="flex items-center justify-between text-[11px] font-medium text-[var(--text-muted)]">
                <span>{"\uc9c4\ud589\ub960"}</span>
                <span className="font-semibold text-[var(--text-primary)]">{project.progress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${project.progress}%`, background: project.color }}
                />
              </div>
            </div>
          ) : null}

          <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <button
                type="button"
                role="checkbox"
                aria-checked={isCompleted}
                aria-label={
                  isCompleted
                    ? `${project.name} \uc644\ub8cc\ub428`
                    : `${project.name} \uc644\ub8cc \ucc98\ub9ac`
                }
                disabled={isCompleted || isProcessing || !onComplete}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!isCompleted && !isProcessing && onComplete) {
                    onComplete(project);
                  }
                }}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed"
                style={{
                  borderColor: isCompleted ? "#bbf7d0" : "var(--border)",
                  background: isCompleted ? "#dcfce7" : "var(--surface)",
                  color: isCompleted ? "#15803d" : "var(--text-muted)",
                  opacity: isProcessing ? 0.7 : 1,
                }}
                title={isCompleted ? "\uc644\ub8cc\ub41c \ud504\ub85c\uc81d\ud2b8" : "\uc644\ub8cc \ucc98\ub9ac"}
              >
                {isProcessing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isCompleted ? (
                  <Check size={14} />
                ) : null}
              </button>
              <span>{"\uc644\ub8cc"}</span>
            </div>
            <div className="flex items-center gap-3 whitespace-nowrap">
              <span>{`\ub313\uae00 ${project.commentCount}`}</span>
              <span>{formatRange(project.startDate, project.endDate)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
