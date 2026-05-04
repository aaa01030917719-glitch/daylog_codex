import type {
  ProjectGanttRow,
  ProjectGanttStatus,
  ProjectGanttItem,
  ProjectGanttPayload,
  ProjectTaskSummary,
  ProjectSummary,
} from "@/components/projects/project-board-types";
import type { ProjectColumnSupport } from "@/lib/project-column-support";

interface ProjectTaskSnapshot {
  id?: string;
  title?: string;
  description?: string | null;
  status: string;
  startDate?: Date | null;
  createdAt?: Date;
  dueDate?: Date | null;
  assignee?: { name: string | null } | null;
  tags?: Array<{ name: string }>;
}

export interface ProjectRecordForSummary {
  id: string;
  name: string;
  subtitle?: string | null;
  description: string | null;
  color: string;
  status: string;
  budget: number | null;
  progress?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  createdAt: Date;
  _count: { tasks: number };
  tasks: ProjectTaskSnapshot[];
}

function mapTaskStatusToGanttStatus(status: string): ProjectGanttStatus {
  switch (status) {
    case "DONE":
      return "done";
    case "IN_PROGRESS":
      return "prog";
    case "IN_REVIEW":
      return "review";
    default:
      return "todo";
  }
}

function mapBoardStatusToGanttStatus(
  status: Exclude<ReturnType<typeof deriveProjectBoardStatus>, "ALL">
): ProjectGanttStatus {
  switch (status) {
    case "COMPLETED":
      return "done";
    case "ONGOING":
      return "prog";
    case "REVIEW":
      return "review";
    case "UPCOMING":
      return "todo";
  }
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .filter((value): value is string => Boolean(value?.trim()))
        .map((value) => value.trim())
    )
  );
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function deriveProjectBoardStatus(project: {
  status: string;
  taskCount: number;
  doneTasks: number;
  hasInProgressTask: boolean;
  hasInReviewTask: boolean;
  storedStartDate: Date | null;
  storedEndDate: Date | null;
  earliestDueDate: Date | null;
}) {
  const todayStart = startOfToday();

  if (
    project.status === "ARCHIVED" ||
    (project.storedEndDate &&
      project.storedEndDate.getTime() < todayStart.getTime()) ||
    (project.taskCount > 0 && project.doneTasks === project.taskCount)
  ) {
    return "COMPLETED" as const;
  }

  if (
    project.storedStartDate &&
    project.storedStartDate.getTime() > todayStart.getTime()
  ) {
    return "UPCOMING" as const;
  }

  if (project.hasInReviewTask) {
    return "REVIEW" as const;
  }

  if (project.hasInProgressTask) {
    return "ONGOING" as const;
  }

  if (project.taskCount === 0) {
    return "ONGOING" as const;
  }

  if (
    !project.storedStartDate &&
    project.earliestDueDate &&
    project.earliestDueDate.getTime() > todayStart.getTime()
  ) {
    return "UPCOMING" as const;
  }

  return "ONGOING" as const;
}

export function mapProjectRecordToSummary(
  project: ProjectRecordForSummary,
  columnSupport: ProjectColumnSupport
): ProjectSummary {
  const doneTasks = project.tasks.filter((task) => task.status === "DONE").length;
  const dueDates = project.tasks
    .map((task) => task.dueDate)
    .filter((value): value is Date => Boolean(value))
    .sort((left, right) => left.getTime() - right.getTime());
  const earliestDueDate = dueDates[0] ?? null;
  const latestDueDate = dueDates[dueDates.length - 1] ?? null;
  const storedStartDate = columnSupport.startDate ? project.startDate ?? null : null;
  const storedEndDate = columnSupport.endDate ? project.endDate ?? null : null;
  const boardStatus = deriveProjectBoardStatus({
    status: project.status,
    taskCount: project._count.tasks,
    doneTasks,
    hasInProgressTask: project.tasks.some(
      (task) => task.status === "IN_PROGRESS"
    ),
    hasInReviewTask: project.tasks.some((task) => task.status === "IN_REVIEW"),
    storedStartDate,
    storedEndDate,
    earliestDueDate,
  });
  const derivedProgress =
    project._count.tasks > 0
      ? Math.round((doneTasks / project._count.tasks) * 100)
      : boardStatus === "COMPLETED"
        ? 100
        : 0;
  const progress = columnSupport.progress
    ? project.progress ?? derivedProgress
    : derivedProgress;
  const fallbackStartDate = storedStartDate ?? earliestDueDate ?? project.createdAt;
  const taskSummaries: ProjectTaskSummary[] = project.tasks.map((task, index) => {
    const startDate = task.startDate ?? task.createdAt ?? fallbackStartDate;
    const endDate = task.dueDate ?? startDate;
    const safeEndDate =
      endDate.getTime() >= startDate.getTime() ? endDate : startDate;

    return {
      id: task.id ?? `${project.id}-task-${index + 1}`,
      title: task.title?.trim() || "업무",
      description: task.description ?? null,
      status: task.status,
      ganttStatus: mapTaskStatusToGanttStatus(task.status),
      assigneeName: task.assignee?.name ?? null,
      startDate: startDate.toISOString(),
      endDate: safeEndDate.toISOString(),
    };
  });
  const summaryStartDate = storedStartDate
    ? storedStartDate.toISOString()
    : earliestDueDate
      ? earliestDueDate.toISOString()
      : project.createdAt.toISOString();
  const summaryEndDate = storedEndDate
    ? storedEndDate.toISOString()
    : latestDueDate
      ? latestDueDate.toISOString()
      : project.createdAt.toISOString();

  return {
    id: project.id,
    name: project.name,
    subtitle: columnSupport.subtitle ? project.subtitle ?? null : null,
    description: project.description,
    color: project.color,
    status: project.status,
    budget: project.budget,
    createdAt: project.createdAt.toISOString(),
    totalTasks: project._count.tasks,
    doneTasks,
    progress,
    boardStatus,
    assigneeNames: uniqueStrings(project.tasks.map((task) => task.assignee?.name)),
    tags: uniqueStrings(project.tasks.flatMap((task) => task.tags?.map((tag) => tag.name) ?? [])),
    startDate: summaryStartDate,
    endDate: summaryEndDate,
    tasks: taskSummaries,
    commentCount: 0,
  };
}

export function mapProjectSummaryToGanttItem(project: ProjectSummary): ProjectGanttItem {
  const durationDays =
    project.startDate && project.endDate
      ? Math.max(
          1,
          Math.ceil(
            (new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) /
              (1000 * 60 * 60 * 24)
          ) + 1
        )
      : null;

  return {
    id: project.id,
    title: project.name,
    subtitle: project.subtitle,
    description: project.description,
    startDate: project.startDate,
    endDate: project.endDate,
    progress: project.progress,
    status: project.status,
    boardStatus: project.boardStatus,
    color: project.color,
    assigneeNames: project.assigneeNames,
    tags: project.tags,
    totalTasks: project.totalTasks,
    doneTasks: project.doneTasks,
    durationDays,
  };
}

export function buildProjectGanttRows(projects: ProjectSummary[]): ProjectGanttRow[] {
  return projects.flatMap((project) => {
    const rows: ProjectGanttRow[] = [
      {
        id: `group-${project.id}`,
        projectId: project.id,
        type: "group",
        title: project.name,
        subtitle: project.subtitle,
        description: project.description,
        startDate: project.startDate,
        endDate: project.endDate,
        progress: project.progress,
        status: mapBoardStatusToGanttStatus(project.boardStatus),
        boardStatus: project.boardStatus,
        color: project.color,
        assigneeName: null,
      },
    ];

    rows.push(
      ...project.tasks.map((task) => ({
        id: task.id,
        projectId: project.id,
        type: "task" as const,
        title: task.title,
        subtitle: null,
        description: task.description,
        startDate: task.startDate ?? project.startDate,
        endDate: task.endDate ?? task.startDate ?? project.endDate,
        progress: task.ganttStatus === "done" ? 100 : project.progress,
        status: task.ganttStatus,
        boardStatus: project.boardStatus,
        color: project.color,
        assigneeName: task.assigneeName,
      }))
    );

    return rows;
  });
}

export function buildProjectGanttPayload(projects: ProjectSummary[]): ProjectGanttPayload {
  const rows = buildProjectGanttRows(projects);
  const dates = rows.flatMap((row) => [row.startDate, row.endDate]).filter(
    (value): value is string => Boolean(value)
  );
  const sortedDates = dates
    .map((value) => new Date(value))
    .sort((left, right) => left.getTime() - right.getTime());

  return {
    items: projects.map(mapProjectSummaryToGanttItem),
    rows,
    range: {
      startDate: sortedDates[0]?.toISOString() ?? null,
      endDate: sortedDates[sortedDates.length - 1]?.toISOString() ?? null,
    },
    fieldMap: {
      title: "name",
      subtitle: "subtitle",
      startDate: "startDate",
      endDate: "endDate",
      progress: "progress",
      status: "boardStatus",
    },
  };
}
