"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ProjectTaskGroup, WorkTaskItem } from "@/components/projects/FilterBar";
import { taskDescriptionToPlainText } from "@/components/tasks/task-modal-utils";

interface TaskListViewProps {
  groups: ProjectTaskGroup[];
  onOpenTask: (task: WorkTaskItem) => void;
  onAddTask: (projectId: string) => void;
  showProjectHeader?: boolean;
}

function formatDate(value: string | null) {
  if (!value) return "일정 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "일정 없음";

  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function isOverdue(task: WorkTaskItem) {
  const dueDate = task.endDate ? new Date(task.endDate) : null;
  if (!dueDate || Number.isNaN(dueDate.getTime()) || task.status === "DONE") {
    return false;
  }

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return dueDate.getTime() < todayStart.getTime();
}

function getDday(value: string | null) {
  const dueDate = value ? new Date(value) : null;
  if (!dueDate || Number.isNaN(dueDate.getTime())) {
    return { label: "일정 없음", className: "text-[var(--text-muted)]" };
  }

  const diff = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: `D+${Math.abs(diff)}`, className: "text-[var(--danger)]" };
  if (diff <= 3) return { label: `D-${diff}`, className: "text-[var(--warning)]" };
  return { label: `D-${diff}`, className: "text-[var(--success)]" };
}

function getTaskBadgeLabel(task: WorkTaskItem) {
  if (isOverdue(task)) return "지연";
  if (task.status === "DONE") return "완료";
  if (task.status === "IN_REVIEW") return "검토중";
  if (task.status === "IN_PROGRESS") return "진행중";
  return "예정";
}

function getTaskBadgeClassName(task: WorkTaskItem) {
  if (isOverdue(task)) return "bg-[var(--danger-light)] text-[var(--danger)]";
  if (task.status === "DONE") return "bg-[var(--success-light)] text-[var(--success)]";
  if (task.status === "IN_REVIEW") return "bg-[var(--yellow-light)] text-[#a16207]";
  if (task.status === "IN_PROGRESS") return "bg-[var(--accent-light)] text-[var(--accent)]";
  return "bg-[var(--surface-3)] text-[var(--text-secondary)]";
}

function getProgressClassName(progress: number) {
  if (progress >= 80) return "bg-[var(--success)]";
  if (progress >= 50) return "bg-[var(--accent)]";
  return "bg-[var(--warning)]";
}

function AvatarGroup({ task }: { task: WorkTaskItem }) {
  if (task.assignees.length === 0) {
    return <span className="text-[12px] text-[var(--text-muted)]">미지정</span>;
  }

  return (
    <div className="flex">
      {task.assignees.slice(0, 3).map((assignee, index) => (
        <div
          key={assignee.id}
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--surface)] text-[10px] font-semibold"
          style={{
            marginLeft: index > 0 ? "-6px" : "0",
            backgroundColor: assignee.color,
            color: assignee.textColor,
          }}
          title={assignee.name}
        >
          {assignee.name[0]}
        </div>
      ))}
      {task.assignees.length > 3 ? (
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--surface-3)] text-[10px] text-[var(--text-muted)]"
          style={{ marginLeft: "-6px" }}
        >
          +{task.assignees.length - 3}
        </div>
      ) : null}
    </div>
  );
}

function ProjectChip({ task }: { task: WorkTaskItem }) {
  return (
    <span
      onClick={(event) => {
        event.stopPropagation();
        window.location.href = `/projects/${task.projectId}`;
      }}
      className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded px-2 py-0.5 text-[11px] text-[var(--text-secondary)] transition hover:border-[#c7d7ff] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border-light)",
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: task.projectColor }} />
      {task.projectName}
    </span>
  );
}

export function TaskListView({
  groups,
  onOpenTask,
  onAddTask,
  showProjectHeader = true,
}: TaskListViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="grid grid-cols-[2fr_3fr_110px_100px_90px_80px] border-b border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.03em] text-[var(--text-muted)] max-lg:grid-cols-[2fr_3fr_90px_80px_80px]">
        <div>프로젝트</div>
        <div>업무명</div>
        <div>담당자</div>
        <div>기간</div>
        <div>상태</div>
        <div className="max-lg:hidden">진행률</div>
      </div>

      {groups.map((group) => {
        const isCollapsed = showProjectHeader ? collapsed[group.projectId] : false;

        return (
          <div key={group.projectId}>
            {showProjectHeader ? (
              <div
                onClick={() =>
                  setCollapsed((prev) => ({
                    ...prev,
                    [group.projectId]: !prev[group.projectId],
                  }))
                }
                className="flex cursor-pointer select-none items-center gap-2.5 border-b border-[var(--border-light)] bg-[var(--surface)] px-4 py-2.5"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: group.projectColor }} />
                <span className="text-xs font-semibold text-[var(--text-secondary)]">{group.projectName}</span>
                <span className="text-[11px] text-[var(--text-muted)]">업무 {group.tasks.length}개</span>
                <ChevronDown
                  size={14}
                  className={`text-[var(--text-muted)] transition ${isCollapsed ? "-rotate-90" : ""}`}
                />
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onAddTask(group.projectId);
                  }}
                  className="ml-auto rounded px-2 py-0.5 text-[11px] text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--accent)]"
                >
                  + 업무 추가
                </button>
              </div>
            ) : null}

            {isCollapsed
              ? null
              : group.tasks.map((task) => {
                  const dday = getDday(task.endDate);

                  return (
                    <div
                      key={task.id}
                      onClick={() => onOpenTask(task)}
                      className={`grid cursor-pointer grid-cols-[2fr_3fr_110px_100px_90px_80px] items-center border-b border-[var(--border-light)] px-4 py-3 transition hover:bg-[#fafbff] max-lg:grid-cols-[2fr_3fr_90px_80px_80px] ${
                        isOverdue(task) ? "border-l-[3px] border-l-[var(--danger)]" : ""
                      }`}
                    >
                      <ProjectChip task={task} />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[var(--text-primary)]">{task.title}</p>
                        {taskDescriptionToPlainText(task.description) ? (
                          <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                            {taskDescriptionToPlainText(task.description)}
                          </p>
                        ) : null}
                      </div>
                      <AvatarGroup task={task} />
                      <div className="text-xs text-[var(--text-secondary)]">
                        <span>{formatDate(task.endDate)}</span>
                        <span className={`ml-1 text-[10px] font-semibold ${dday.className}`}>{dday.label}</span>
                      </div>
                      <span className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getTaskBadgeClassName(task)}`}>
                        {getTaskBadgeLabel(task)}
                      </span>
                      <div className="flex items-center gap-1.5 max-lg:hidden">
                        <div className="h-1 flex-1 overflow-hidden rounded-sm bg-[var(--border-light)]">
                          <div className={`h-full rounded-sm ${getProgressClassName(task.progress)}`} style={{ width: `${task.progress}%` }} />
                        </div>
                        <span className="min-w-7 text-right text-[11px] text-[var(--text-muted)]">{task.progress}%</span>
                      </div>
                    </div>
                  );
                })}
          </div>
        );
      })}
    </div>
  );
}
