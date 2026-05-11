import { CalendarDays } from "lucide-react";
import type { ProjectTaskGroup, WorkTaskItem } from "@/components/projects/FilterBar";
import { taskDescriptionToPlainText } from "@/components/tasks/task-modal-utils";

interface TaskCardViewProps {
  groups: ProjectTaskGroup[];
  onOpenTask: (task: WorkTaskItem) => void;
  onAddTask: (projectId: string) => void;
  showProjectHeader?: boolean;
  cardMinWidth?: number;
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
  if (task.status === "DONE") return "완료";
  if (isTaskReviewCompleted(task)) return "검토완료";
  if (isOverdue(task)) return "지연";
  if (task.status === "IN_REVIEW") return "검토중";
  if (task.status === "IN_PROGRESS") return "진행중";
  return "예정";
}

function getTaskBadgeClassName(task: WorkTaskItem) {
  if (task.status === "DONE") return "bg-[var(--success-light)] text-[var(--success)]";
  if (isTaskReviewCompleted(task)) return "bg-[var(--success-light)] text-[var(--success)]";
  if (isOverdue(task)) return "bg-[var(--danger-light)] text-[var(--danger)]";
  if (task.status === "IN_REVIEW") return "bg-[var(--yellow-light)] text-[#a16207]";
  if (task.status === "IN_PROGRESS") return "bg-[var(--accent-light)] text-[var(--accent)]";
  return "bg-[var(--surface-3)] text-[var(--text-secondary)]";
}

function isTaskReviewCompleted(task: WorkTaskItem) {
  return (
    task.status === "IN_REVIEW" &&
    Boolean(task.approvedAt) &&
    !task.requiresApproval &&
    !task.isApprovalRequested &&
    !task.rejectedReason
  );
}

function getProgressClassName(progress: number) {
  if (progress >= 80) return "bg-[var(--success)]";
  if (progress >= 50) return "bg-[var(--accent)]";
  return "bg-[var(--warning)]";
}

function AvatarGroup({ task }: { task: WorkTaskItem }) {
  if (task.assignees.length === 0) {
    return <span className="text-[11px] font-medium text-[var(--text-muted)]">미지정</span>;
  }

  return (
    <div className="flex">
      {task.assignees.slice(0, 3).map((assignee, index) => (
        <div
          key={assignee.id}
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold"
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
          className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-[var(--surface-3)] text-[10px] text-[var(--text-muted)]"
          style={{ marginLeft: "-6px" }}
        >
          +{task.assignees.length - 3}
        </div>
      ) : null}
    </div>
  );
}

export function TaskCardView({
  groups,
  onOpenTask,
  onAddTask,
  showProjectHeader = true,
  cardMinWidth = 260,
}: TaskCardViewProps) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.projectId}>
          {showProjectHeader ? (
            <div className="mb-3 flex items-center gap-2.5 px-0.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: group.projectColor }} />
              <h2 className="text-[13px] font-semibold text-[var(--text-secondary)]">{group.projectName}</h2>
              <span className="text-[11px] text-[var(--text-muted)]">업무 {group.tasks.length}개</span>
              <button
                type="button"
                onClick={() => onAddTask(group.projectId)}
                className="ml-auto rounded-[5px] border border-dashed border-[var(--border)] bg-transparent px-2.5 py-1 text-[11px] text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]"
              >
                + 업무 추가
              </button>
            </div>
          ) : null}

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardMinWidth}px, 1fr))` }}
          >
            {group.tasks.length === 0 ? (
              <div className="col-span-full rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-10 text-center">
                <p className="text-sm font-medium text-[var(--text-secondary)]">등록된 업무가 없습니다.</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">이 프로젝트의 첫 업무를 추가해보세요.</p>
              </div>
            ) : (
              group.tasks.map((task) => {
                const dday = getDday(task.endDate);

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onOpenTask(task)}
                    className={`relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--surface)] p-4 text-left transition duration-150 hover:-translate-y-px hover:border-[#d0d9ff] hover:shadow-[var(--shadow)] ${
                      isOverdue(task) ? "border-[#fca5a5]" : "border-[var(--border)]"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="line-clamp-3 min-h-[37px] min-w-0 flex-1 text-[13px] font-semibold leading-[1.4] text-[var(--text-primary)]">
                        {task.title}
                      </h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getTaskBadgeClassName(task)}`}>
                        {getTaskBadgeLabel(task)}
                      </span>
                    </div>

                    <p className="mb-3 min-h-[50px] line-clamp-3 text-[11px] leading-[1.5] text-[var(--text-muted)]">
                      {taskDescriptionToPlainText(task.description) || group.projectName}
                    </p>

                    <div className="mb-3 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                        <CalendarDays size={11} />
                        {formatDate(task.endDate)}
                      </span>
                      <span className={`text-[10px] font-semibold ${dday.className}`}>{dday.label}</span>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-[var(--border-light)] pt-2.5">
                      <div className="mr-3 flex-1">
                        <div className="mb-1 flex justify-between">
                          <span className="text-[10px] text-[var(--text-muted)]">진행률</span>
                          <span className="text-[10px] text-[var(--text-muted)]">{task.progress}%</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-sm bg-[var(--border-light)]">
                          <div
                            className={`h-full rounded-sm ${getProgressClassName(task.progress)}`}
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                      <AvatarGroup task={task} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
