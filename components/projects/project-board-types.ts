export type ProjectBoardStatus = "ALL" | "ONGOING" | "COMPLETED" | "UPCOMING";

export type ProjectViewMode = "LIST" | "CALENDAR" | "GANTT";

export type ProjectGanttStatus = "done" | "prog" | "review" | "hold" | "todo";

export interface ProjectTaskSummary {
  id: string;
  title: string;
  description: string | null;
  status: string;
  ganttStatus: ProjectGanttStatus;
  assigneeName: string | null;
  startDate: string | null;
  endDate: string | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  color: string;
  status: string;
  budget: number | null;
  createdAt: string;
  totalTasks: number;
  doneTasks: number;
  progress: number;
  boardStatus: Exclude<ProjectBoardStatus, "ALL">;
  assigneeNames: string[];
  tags: string[];
  startDate: string | null;
  endDate: string | null;
  tasks: ProjectTaskSummary[];
}

export interface ProjectMember {
  id: string;
  name: string | null;
  image: string | null;
}

export interface ProjectGanttItem {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  status: string;
  boardStatus: Exclude<ProjectBoardStatus, "ALL">;
  color: string;
  assigneeNames: string[];
  tags: string[];
  totalTasks: number;
  doneTasks: number;
  durationDays: number | null;
}

export interface ProjectGanttRow {
  id: string;
  projectId: string;
  type: "group" | "task";
  title: string;
  subtitle: string | null;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  status: ProjectGanttStatus;
  boardStatus: Exclude<ProjectBoardStatus, "ALL">;
  color: string;
  assigneeName: string | null;
}

export interface ProjectGanttPayload {
  items: ProjectGanttItem[];
  rows: ProjectGanttRow[];
  range: {
    startDate: string | null;
    endDate: string | null;
  };
  fieldMap: {
    title: "name";
    subtitle: "subtitle";
    startDate: "startDate";
    endDate: "endDate";
    progress: "progress";
    status: "boardStatus";
  };
}

export const PROJECT_STATUS_LABELS: Record<Exclude<ProjectBoardStatus, "ALL">, string> = {
  ONGOING: "진행 중",
  UPCOMING: "예정",
  COMPLETED: "완료",
};

export const PROJECT_STATUS_COLORS: Record<
  Exclude<ProjectBoardStatus, "ALL">,
  { background: string; text: string; border: string }
> = {
  ONGOING: {
    background: "#eef2ff",
    text: "#3158c6",
    border: "#d6e3ff",
  },
  UPCOMING: {
    background: "#fff0e6",
    text: "#c2410c",
    border: "#fed7aa",
  },
  COMPLETED: {
    background: "#dcfce7",
    text: "#15803d",
    border: "#bbf7d0",
  },
};
