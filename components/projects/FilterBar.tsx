"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { ProjectCreateModal } from "@/components/modals/ProjectCreateModal";
import { TaskDetailModal } from "@/components/modals/TaskDetailModal";
import { ProjectFilterTabs } from "@/components/projects/ProjectFilterTabs";
import { ProjectTaskHeader } from "@/components/projects/ProjectTaskHeader";
import { TaskCardView } from "@/components/projects/TaskCardView";
import { TaskListView } from "@/components/projects/TaskListView";
import { TaskCreateDetailModal } from "@/components/tasks/TaskCreateDetailModal";
import { loadTaskProgress, normalizeTaskProgress } from "@/components/tasks/task-modal-utils";

export type BoardStatus = "ALL" | "ONGOING" | "REVIEW" | "COMPLETED" | "UPCOMING";
export type ProjectTaskViewMode = "CARD" | "LIST" | "CALENDAR" | "GANTT";
export type TaskStatusCode = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface ProjectMemberOption {
  id: string;
  name: string | null;
  image: string | null;
}

export interface WorkAssignee {
  id: string;
  name: string;
  color: string;
  textColor: string;
}

export interface WorkTaskItem {
  id: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  title: string;
  description: string | null;
  status: TaskStatusCode;
  boardStatus: Exclude<BoardStatus, "ALL">;
  priority: TaskPriority;
  assignees: WorkAssignee[];
  startDate: string | null;
  endDate: string | null;
  updatedAt: string;
  progress: number;
}

export interface ProjectTaskGroup {
  projectId: string;
  projectName: string;
  projectColor: string;
  projectSubtitle: string | null;
  projectStatus: string;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  tasks: WorkTaskItem[];
}

interface ProjectsTaskBoardProps {
  initialGroups: ProjectTaskGroup[];
  members: ProjectMemberOption[];
  currentUserId: string;
  initialStatus: BoardStatus;
  initialView: ProjectTaskViewMode;
  initialProjectId?: string | null;
  shouldOpenProjectModal?: boolean;
}

type PeriodFilter = "ALL" | "TODAY" | "WEEK" | "MONTH" | "OVERDUE";
type SortOption = "DUE_ASC" | "UPDATED_DESC" | "PROGRESS_DESC";

function toDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function startOfDayValue(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function differenceInDays(left: Date, right: Date) {
  const leftStart = startOfDayValue(left).getTime();
  const rightStart = startOfDayValue(right).getTime();
  return Math.round((leftStart - rightStart) / 86400000);
}

function buildDateRange(start: Date, end: Date) {
  const dates: Date[] = [];
  let current = startOfDayValue(start);
  const last = startOfDayValue(end);

  while (current.getTime() <= last.getTime()) {
    dates.push(current);
    current = addDays(current, 1);
  }

  return dates;
}

function normalizeHexColor(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();

  if (!/^#([\da-f]{3}|[\da-f]{6})$/i.test(trimmed)) {
    return null;
  }

  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
  }

  return trimmed.toLowerCase();
}

function hexToRgb(value: string) {
  const normalized = normalizeHexColor(value);
  if (!normalized) return null;

  const numeric = Number.parseInt(normalized.slice(1), 16);
  return {
    red: (numeric >> 16) & 255,
    green: (numeric >> 8) & 255,
    blue: numeric & 255,
    hex: normalized,
  };
}

function getReadableTextColor(backgroundColor: string | null | undefined) {
  const rgb = backgroundColor ? hexToRgb(backgroundColor) : null;
  if (!rgb) return "#ffffff";

  const luminance = (rgb.red * 299 + rgb.green * 587 + rgb.blue * 114) / 1000;
  return luminance > 160 ? "#111827" : "#ffffff";
}

function getGanttTaskTone(projectColor: string | null | undefined) {
  const normalized = normalizeHexColor(projectColor) ?? "#4f7cff";

  return {
    backgroundColor: normalized,
    color: getReadableTextColor(normalized),
  };
}

function formatDate(value: string | null) {
  const date = toDate(value);
  if (!date) return "일정 없음";
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatAxisDate(value: Date) {
  return `${value.getMonth() + 1}/${value.getDate()}`;
}

function isOverdue(task: WorkTaskItem) {
  const dueDate = toDate(task.endDate);
  return Boolean(dueDate && task.status !== "DONE" && dueDate.getTime() < startOfToday().getTime());
}

function normalizeProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getBoardStatus(status: TaskStatusCode): Exclude<BoardStatus, "ALL"> {
  if (status === "DONE") return "COMPLETED";
  if (status === "IN_REVIEW") return "REVIEW";
  if (status === "IN_PROGRESS") return "ONGOING";
  return "UPCOMING";
}

function flattenGroups(groups: ProjectTaskGroup[]) {
  return groups.flatMap((group) => group.tasks);
}

function sortTasks(tasks: WorkTaskItem[], sortBy: SortOption) {
  return [...tasks].sort((left, right) => {
    if (sortBy === "PROGRESS_DESC") {
      return right.progress - left.progress;
    }

    if (sortBy === "UPDATED_DESC") {
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    }

    const leftDue = toDate(left.endDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightDue = toDate(right.endDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftDue - rightDue;
  });
}

function taskMatchesPeriod(task: WorkTaskItem, period: PeriodFilter) {
  if (period === "ALL") return true;

  const dueDate = toDate(task.endDate);
  const today = startOfToday();

  if (period === "OVERDUE") {
    return isOverdue(task);
  }

  if (!dueDate) return false;

  const dueStart = startOfDayValue(dueDate);
  const diff = Math.ceil((dueStart.getTime() - today.getTime()) / 86400000);

  if (period === "TODAY") return diff === 0;
  if (period === "WEEK") return diff >= 0 && diff <= 7;
  return dueStart.getFullYear() === today.getFullYear() && dueStart.getMonth() === today.getMonth();
}

function getTaskTimelineStart(task: WorkTaskItem) {
  return toDate(task.startDate) ?? toDate(task.endDate);
}

function getTaskTimelineEnd(task: WorkTaskItem) {
  return toDate(task.endDate) ?? toDate(task.startDate);
}

function normalizeTaskFromApi(task: Record<string, unknown>): WorkTaskItem | null {
  const project = task.project as
    | { id?: string; name?: string; color?: string; startDate?: string | null }
    | null
    | undefined;

  if (!project?.id || !project.name || typeof task.id !== "string" || typeof task.title !== "string") {
    return null;
  }

  const assignee = task.assignee as { id?: string; name?: string | null } | null | undefined;
  const status = (typeof task.status === "string" ? task.status : "TODO") as TaskStatusCode;
  const dueDate = typeof task.dueDate === "string" ? task.dueDate : null;
  const createdAt =
    typeof task.createdAt === "string" ? task.createdAt : new Date().toISOString();
  const updatedAt = typeof task.updatedAt === "string" ? task.updatedAt : createdAt;
  const projectStartDate =
    typeof project.startDate === "string" && project.startDate ? project.startDate : null;
  const startDate =
    typeof task.startDate === "string" && task.startDate
      ? task.startDate
      : projectStartDate ?? createdAt ?? dueDate;
  const fallbackProgress =
    status === "DONE" ? 100 : status === "IN_REVIEW" ? 80 : status === "IN_PROGRESS" ? 55 : 0;
  const rawProgress = typeof task.progress === "number" ? task.progress : fallbackProgress;
  const progress = loadTaskProgress(task.id, normalizeTaskProgress(rawProgress, fallbackProgress));

  return {
    id: task.id,
    projectId: project.id,
    projectName: project.name,
    projectColor: project.color ?? "#4f7cff",
    title: task.title,
    description: typeof task.description === "string" ? task.description : null,
    status,
    boardStatus: getBoardStatus(status),
    priority: (typeof task.priority === "string" ? task.priority : "MEDIUM") as TaskPriority,
    assignees: assignee?.id
      ? [
          {
            id: assignee.id,
            name: assignee.name?.trim() || "담당자",
            color: "#4f7cff",
            textColor: "#ffffff",
          },
        ]
      : [],
    startDate,
    endDate: dueDate,
    updatedAt,
    progress,
  };
}

function SummaryCards({ groups }: { groups: ProjectTaskGroup[] }) {
  const tasks = flattenGroups(groups);
  const total = tasks.length;
  const projectCount = groups.length;
  const ongoing = tasks.filter((task) => task.boardStatus === "ONGOING").length;
  const lastWeekCreated = tasks.filter((task) => {
    const created = toDate(task.startDate);
    return Boolean(created && Date.now() - created.getTime() <= 7 * 86400000);
  }).length;
  const thisMonthDone = tasks.filter((task) => {
    if (task.status !== "DONE") return false;
    const updatedAt = toDate(task.updatedAt);
    const today = new Date();
    return Boolean(
      updatedAt &&
        updatedAt.getFullYear() === today.getFullYear() &&
        updatedAt.getMonth() === today.getMonth()
    );
  }).length;
  const doneCount = tasks.filter((task) => task.status === "DONE").length;
  const doneRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const overdue = tasks.filter(isOverdue).length;

  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="mb-1.5 text-[11px] text-[var(--text-muted)]">전체 업무</p>
        <p className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[var(--text-primary)]">
          {total}
        </p>
        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">{projectCount}개 프로젝트</p>
      </div>
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="mb-1.5 text-[11px] text-[var(--text-muted)]">진행중</p>
        <p className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[var(--warning)]">
          {ongoing}
        </p>
        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
          지난주 대비 +{lastWeekCreated}
        </p>
      </div>
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="mb-1.5 text-[11px] text-[var(--text-muted)]">이번 달 완료</p>
        <p className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[var(--success)]">
          {thisMonthDone}
        </p>
        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">완료율 {doneRate}%</p>
      </div>
      <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="mb-1.5 text-[11px] text-[var(--text-muted)]">지연</p>
        <p className="text-[22px] font-bold leading-none tracking-[-0.02em] text-[var(--danger)]">
          {overdue}
        </p>
        <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">즉시 확인 필요</p>
      </div>
    </div>
  );
}

function TimelineGanttView({
  groups,
  onOpenTask,
}: {
  groups: ProjectTaskGroup[];
  onOpenTask: (task: WorkTaskItem) => void;
}) {
  const tasks = flattenGroups(groups);
  const datedTasks = tasks
    .map((task) => {
      const start = getTaskTimelineStart(task);
      const end = getTaskTimelineEnd(task) ?? start;

      if (!start || !end) {
        return null;
      }

      return {
        task,
        start,
        end: end.getTime() < start.getTime() ? start : end,
      };
    })
    .filter((item): item is { task: WorkTaskItem; start: Date; end: Date } => Boolean(item));

  if (datedTasks.length === 0) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[var(--surface)] px-5 py-14 text-center">
        <div>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            표시할 업무 일정이 없습니다.
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            시작일이나 마감일이 있는 업무가 생기면 여기에 표시됩니다.
          </p>
        </div>
      </div>
    );
  }

  const dayWidth = 68;
  const rowHeight = 56;
  const leftPaneWidth = 280;
  const earliestStart = datedTasks.reduce(
    (min, item) => (item.start.getTime() < min.getTime() ? item.start : min),
    datedTasks[0].start
  );
  const latestEnd = datedTasks.reduce(
    (max, item) => (item.end.getTime() > max.getTime() ? item.end : max),
    datedTasks[0].end
  );
  const rangeStart = addDays(earliestStart, -2);
  const rangeEnd = addDays(latestEnd, 2);
  const axisDates = buildDateRange(rangeStart, rangeEnd);
  const timelineWidth = Math.max(axisDates.length * dayWidth, 520);

  return (
    <div className="h-full bg-[var(--surface)]">
      <div className="h-full overflow-x-auto">
        <div
          className="grid min-w-full"
          style={{ gridTemplateColumns: `${leftPaneWidth}px ${timelineWidth}px` }}
        >
          <div className="sticky left-0 z-[1] border-r border-[var(--border)] bg-[var(--surface)]">
            <div className="flex h-14 items-center border-b border-[var(--border)] bg-[var(--surface-2)] px-4 text-xs font-semibold text-[var(--text-muted)]">
              업무
            </div>
            {datedTasks.map(({ task }) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onOpenTask(task)}
                className="flex w-full items-center gap-3 border-b border-[var(--border-light)] px-4 py-3 text-left transition hover:bg-[var(--surface-2)]"
                style={{ minHeight: `${rowHeight}px` }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: task.projectColor || "#4f7cff" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                    {task.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                    <span className="truncate">{task.assignees[0]?.name ?? "미지정"}</span>
                    <span>·</span>
                    <span>{task.status === "DONE" ? "완료" : task.status === "IN_REVIEW" ? "검토중" : task.status === "IN_PROGRESS" ? "진행중" : "예정"}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div style={{ width: `${timelineWidth}px` }}>
            <div
              className="grid h-14 border-b border-[var(--border)] bg-[var(--surface-2)]"
              style={{
                gridTemplateColumns: `repeat(${axisDates.length}, minmax(${dayWidth}px, ${dayWidth}px))`,
              }}
            >
              {axisDates.map((date, index) => (
                <div
                  key={`${date.toISOString()}-${index}`}
                  className="flex flex-col items-center justify-center border-r border-[var(--border-light)] text-[10px] font-medium text-[var(--text-muted)]"
                >
                  <span>{formatAxisDate(date)}</span>
                  <span className="mt-0.5 text-[9px]">
                    {["일", "월", "화", "수", "목", "금", "토"][date.getDay()]}
                  </span>
                </div>
              ))}
            </div>

            {datedTasks.map(({ task, start, end }) => {
              const startOffset = Math.max(0, differenceInDays(start, rangeStart));
              const durationDays = Math.max(1, differenceInDays(end, start) + 1);
              const left = startOffset * dayWidth + 4;
              const width = Math.max(56, durationDays * dayWidth - 8);
              const tone = getGanttTaskTone(task.projectColor);
              const tooltip = [
                task.title,
                task.projectName,
                `시작: ${formatDate(start.toISOString())}`,
                `마감: ${formatDate(end.toISOString())}`,
              ].join(" · ");

              return (
                <div
                  key={task.id}
                  className="relative border-b border-[var(--border-light)]"
                  style={{
                    minHeight: `${rowHeight}px`,
                    backgroundImage:
                      "linear-gradient(to right, var(--border-light) 1px, transparent 1px)",
                    backgroundSize: `${dayWidth}px 100%`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onOpenTask(task)}
                    className="absolute top-1/2 flex h-8 items-center rounded-[8px] px-2.5 text-left text-[11px] font-semibold transition hover:opacity-90"
                    style={{
                      left: `${left}px`,
                      width: `${width}px`,
                      transform: "translateY(-50%)",
                      ...tone,
                    }}
                    title={tooltip}
                  >
                    <span className="truncate">{task.title}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProjectsTaskBoard({
  initialGroups,
  members,
  currentUserId,
  initialStatus,
  initialView,
  initialProjectId = null,
  shouldOpenProjectModal = false,
}: ProjectsTaskBoardProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [query, setQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("DUE_ASC");
  const [onlyMine, setOnlyMine] = useState(false);
  const [activeStatus, setActiveStatus] = useState<BoardStatus>(initialStatus);
  const [viewMode, setViewMode] = useState<ProjectTaskViewMode>(initialView);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(initialProjectId);
  const [selectedTask, setSelectedTask] = useState<WorkTaskItem | null>(null);
  const [createTaskProjectId, setCreateTaskProjectId] = useState<string | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(shouldOpenProjectModal);

  useEffect(() => {
    setProjectModalOpen(shouldOpenProjectModal);
  }, [shouldOpenProjectModal]);

  useEffect(() => {
    if (viewMode === "CALENDAR") {
      setViewMode("CARD");
    }
  }, [viewMode]);

  useEffect(() => {
    if (groups.length === 0) {
      setSelectedProjectId(null);
      return;
    }

    if (selectedProjectId && !groups.some((group) => group.projectId === selectedProjectId)) {
      setSelectedProjectId(null);
    }
  }, [groups, selectedProjectId]);

  const handleSelectProject = (projectId: string | null) => {
    setSelectedProjectId(projectId);

    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (projectId) {
      url.searchParams.set("projectId", projectId);
    } else {
      url.searchParams.delete("projectId");
    }

    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  };

  const selectedGroup = useMemo(
    () => groups.find((group) => group.projectId === selectedProjectId) ?? null,
    [groups, selectedProjectId]
  );

  const scopedGroups = useMemo(
    () => (selectedProjectId ? groups.filter((group) => group.projectId === selectedProjectId) : groups),
    [groups, selectedProjectId]
  );

  const scopedTasks = useMemo(() => flattenGroups(scopedGroups), [scopedGroups]);
  const normalizedViewMode = viewMode === "CALENDAR" ? "CARD" : viewMode;

  const selectedCounts = useMemo<Record<BoardStatus, number>>(
    () => ({
      ALL: scopedTasks.length,
      ONGOING: scopedTasks.filter((task) => task.boardStatus === "ONGOING").length,
      REVIEW: scopedTasks.filter((task) => task.boardStatus === "REVIEW").length,
      COMPLETED: scopedTasks.filter((task) => task.boardStatus === "COMPLETED").length,
      UPCOMING: scopedTasks.filter((task) => task.boardStatus === "UPCOMING").length,
    }),
    [scopedTasks]
  );

  const isDefaultOverview =
    !selectedProjectId &&
    activeStatus === "ALL" &&
    assigneeFilter === "ALL" &&
    periodFilter === "ALL" &&
    sortBy === "DUE_ASC" &&
    !onlyMine &&
    query.trim().length === 0;

  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return scopedGroups
      .map((group) => ({
        ...group,
        tasks: sortTasks(
          group.tasks.filter((task) => {
            if (activeStatus !== "ALL" && task.boardStatus !== activeStatus) return false;
            if (
              assigneeFilter !== "ALL" &&
              !task.assignees.some((assignee) => assignee.id === assigneeFilter)
            ) {
              return false;
            }
            if (onlyMine && !task.assignees.some((assignee) => assignee.id === currentUserId)) {
              return false;
            }
            if (!taskMatchesPeriod(task, periodFilter)) return false;
            if (!normalizedQuery) return true;

            return [
              task.title,
              task.description ?? "",
              task.projectName,
              task.assignees.map((assignee) => assignee.name).join(" "),
            ]
              .join(" ")
              .toLowerCase()
              .includes(normalizedQuery);
          }),
          sortBy
        ),
      }))
      .filter((group) => {
        if (selectedProjectId) return true;
        if (isDefaultOverview) return true;
        return group.tasks.length > 0;
      });
  }, [
    activeStatus,
    assigneeFilter,
    currentUserId,
    isDefaultOverview,
    onlyMine,
    periodFilter,
    query,
    scopedGroups,
    selectedProjectId,
    sortBy,
  ]);

  const filteredTaskCount = useMemo(() => flattenGroups(visibleGroups).length, [visibleGroups]);

  const handleTaskCreated = (task: WorkTaskItem) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.projectId === task.projectId
          ? { ...group, tasks: [task, ...group.tasks] }
          : group
      )
    );
    setActiveStatus((current) =>
      current !== "ALL" && current !== task.boardStatus ? task.boardStatus : current
    );
  };

  const handleTaskUpdated = (task: Record<string, unknown>) => {
    const nextTask = normalizeTaskFromApi(task);
    if (!nextTask) return;

    setGroups((prev) =>
      prev.map((group) => {
        const withoutTask = group.tasks.filter((item) => item.id !== nextTask.id);

        if (group.projectId !== nextTask.projectId) {
          return { ...group, tasks: withoutTask };
        }

        return { ...group, tasks: [nextTask, ...withoutTask] };
      })
    );

    setSelectedTask(nextTask);
  };

  const handleTaskDeleted = (taskId: string) => {
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        tasks: group.tasks.filter((task) => task.id !== taskId),
      }))
    );
    setSelectedTask(null);
  };

  const handleProjectCreated = (project: {
    id: string;
    name: string;
    subtitle: string | null;
    color: string;
    status: string;
    createdAt?: string | Date;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    progress?: number | null;
  }) => {
    const createdAt = project.createdAt
      ? new Date(project.createdAt).toISOString()
      : new Date().toISOString();

    setGroups((prev) => [
      {
        projectId: project.id,
        projectName: project.name,
        projectColor: project.color,
        projectSubtitle: project.subtitle,
        projectStatus: project.status,
        createdAt,
        startDate: project.startDate ? new Date(project.startDate).toISOString() : null,
        endDate: project.endDate ? new Date(project.endDate).toISOString() : null,
        progress: normalizeProgress(project.progress ?? 0),
        tasks: [],
      },
      ...prev,
    ]);

    handleSelectProject(project.id);
    setProjectModalOpen(false);
  };

  const canCreateTask = groups.length > 0;
  const hasAnyTasks = groups.some((group) => group.tasks.length > 0);

  const content = (() => {
    if (groups.length === 0) {
      return (
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-5 py-16 text-center">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">등록된 프로젝트가 없습니다.</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">프로젝트를 먼저 추가해 주세요.</p>
        </div>
      );
    }

    if (selectedProjectId && selectedGroup && selectedGroup.tasks.length === 0) {
      return (
        <div className="rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-16 text-center">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">등록된 업무가 없습니다.</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">이 프로젝트의 첫 업무를 추가해보세요.</p>
        </div>
      );
    }

    if (!selectedProjectId && !hasAnyTasks) {
      return (
        <div className="rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-5 py-16 text-center">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">등록된 업무가 없습니다.</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">프로젝트별 첫 업무를 추가해보세요.</p>
        </div>
      );
    }

    if (filteredTaskCount === 0) {
      return (
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-5 py-16 text-center">
          <p className="text-sm font-semibold text-[var(--text-secondary)]">표시할 업무가 없습니다.</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">필터를 바꾸거나 다른 프로젝트를 선택해 주세요.</p>
        </div>
      );
    }

    if (normalizedViewMode === "LIST") {
      return (
        <TaskListView
          groups={visibleGroups}
          onOpenTask={setSelectedTask}
          onAddTask={(projectId) => setCreateTaskProjectId(projectId)}
          showProjectHeader={!selectedProjectId}
        />
      );
    }

    if (normalizedViewMode === "GANTT") {
      return <TimelineGanttView groups={visibleGroups} onOpenTask={setSelectedTask} />;
    }

    return (
      <TaskCardView
        groups={visibleGroups}
        onOpenTask={setSelectedTask}
        onAddTask={(projectId) => setCreateTaskProjectId(projectId)}
        showProjectHeader={!selectedProjectId}
        cardMinWidth={188}
      />
    );
  })();

  const projectOptions = groups.map((group) => ({
    id: group.projectId,
    name: group.projectName,
    color: group.projectColor,
  }));
  const createTaskProject = groups.find((group) => group.projectId === createTaskProjectId);

  return (
    <div
      className="min-h-full bg-[var(--bg)] text-[var(--text-primary)]"
      style={{ fontFamily: "Geist Sans, 'Noto Sans KR', sans-serif" }}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Project Board
          </div>
          <h1 className="mt-1 text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
            프로젝트
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">
            전체 프로젝트 업무를 한 번에 확인하고 관리할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCreateTaskProjectId(selectedProjectId ?? "")}
            disabled={!canCreateTask}
            className="secondary-button disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} />
            업무 추가
          </button>
          <button
            type="button"
            onClick={() => setProjectModalOpen(true)}
            className="primary-button"
          >
            <Plus size={14} />
            프로젝트 추가
          </button>
        </div>
      </div>

      <SummaryCards groups={groups} />

      <div className="mb-4 flex flex-wrap items-center gap-2 p-0">
        <div className="relative min-w-[160px] flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] py-1.5 pl-8 pr-3 text-[13px] text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:bg-white"
            placeholder="업무명, 프로젝트, 담당자 검색..."
          />
        </div>
        <select
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value)}
          className="rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[13px] text-[var(--text-secondary)] outline-none"
        >
          <option value="ALL">담당자 전체</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name ?? "이름 없음"}
            </option>
          ))}
        </select>
        <select
          value={periodFilter}
          onChange={(event) => setPeriodFilter(event.target.value as PeriodFilter)}
          className="hidden rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[13px] text-[var(--text-secondary)] outline-none md:block"
        >
          <option value="ALL">기간 전체</option>
          <option value="TODAY">오늘 마감</option>
          <option value="WEEK">7일 이내</option>
          <option value="MONTH">이번 달</option>
          <option value="OVERDUE">지연</option>
        </select>
        <select
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortOption)}
          className="hidden rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[13px] text-[var(--text-secondary)] outline-none md:block"
        >
          <option value="DUE_ASC">마감 임박순</option>
          <option value="UPDATED_DESC">최근 수정순</option>
          <option value="PROGRESS_DESC">진행률 높은순</option>
        </select>
        <div className="hidden h-5 w-px bg-[var(--border)] sm:block" />
        <button
          type="button"
          onClick={() => setOnlyMine((prev) => !prev)}
          className="ml-auto inline-flex items-center gap-2 text-[13px] text-[var(--text-secondary)]"
        >
          <span
            className={`relative h-[18px] w-[34px] rounded-full transition ${onlyMine ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
            aria-hidden="true"
          >
            <span
              className={`absolute left-0.5 top-0.5 h-3.5 w-3.5 rounded-full bg-white transition ${
                onlyMine ? "translate-x-4" : ""
              }`}
            />
          </span>
          내 업무만
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <ProjectFilterTabs
          activeStatus={activeStatus}
          counts={selectedCounts}
          onChange={setActiveStatus}
        />
        <div className="ml-auto">
          <ProjectTaskHeader
            viewMode={normalizedViewMode}
            onViewChange={(nextView) => setViewMode(nextView === "CALENDAR" ? "CARD" : nextView)}
          />
        </div>
      </div>

      <div
        className={normalizedViewMode === "GANTT" ? "min-h-[560px]" : undefined}
        style={normalizedViewMode === "GANTT" ? { height: "min(760px, calc(100vh - 248px))" } : undefined}
      >
        <div className={normalizedViewMode === "GANTT" ? "h-full" : undefined}>
          {content}
        </div>
      </div>

      {selectedTask ? (
        <TaskDetailModal
          isOpen
          taskId={selectedTask.id}
          projectName={selectedTask.projectName}
          members={members}
          currentUserId={currentUserId}
          onClose={() => setSelectedTask(null)}
          onUpdated={(task) => handleTaskUpdated(task as unknown as Record<string, unknown>)}
          onDeleted={handleTaskDeleted}
        />
      ) : null}

      {createTaskProjectId !== null ? (
        <TaskCreateDetailModal
          projectId={createTaskProjectId || undefined}
          projectName={createTaskProject?.projectName}
          defaultStatus="IN_PROGRESS"
          validationMode="alert"
          members={members}
          projects={projectOptions}
          onClose={() => setCreateTaskProjectId(null)}
          onCreated={(task) => {
            const nextTask = normalizeTaskFromApi(task as unknown as Record<string, unknown>);
            if (nextTask) {
              handleTaskCreated(nextTask);
            }
            setCreateTaskProjectId(null);
          }}
        />
      ) : null}

      {projectModalOpen ? (
        <ProjectCreateModal
          members={members}
          onClose={() => setProjectModalOpen(false)}
          onCreated={handleProjectCreated}
        />
      ) : null}
    </div>
  );
}
