import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTaskColumnSupport } from "@/lib/task-column-support";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";
import {
  ProjectsTaskBoard,
  type BoardStatus,
  type ProjectTaskGroup,
  type ProjectTaskViewMode,
  type TaskStatusCode,
  type WorkAssignee,
} from "@/components/projects/FilterBar";

function parseProjectStatus(value?: string): BoardStatus {
  if (value === "ONGOING" || value === "REVIEW" || value === "COMPLETED" || value === "UPCOMING") {
    return value;
  }

  return "ALL";
}

function parseProjectView(value?: string): ProjectTaskViewMode {
  const normalized = value?.toUpperCase();

  if (normalized === "LIST" || normalized === "GANTT") {
    return normalized;
  }

  return "CARD";
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getTaskBoardStatus(status: TaskStatusCode): Exclude<BoardStatus, "ALL"> {
  if (status === "DONE") return "COMPLETED";
  if (status === "IN_REVIEW") return "REVIEW";
  if (status === "IN_PROGRESS") return "ONGOING";
  return "UPCOMING";
}

function getTaskProgress(status: TaskStatusCode) {
  if (status === "DONE") return 100;
  if (status === "IN_REVIEW") return 80;
  if (status === "IN_PROGRESS") return 55;
  return 0;
}

function getAvatarColor(seed: string) {
  const colors = ["#4f7cff", "#2A8C50", "#8b5cf6", "#f97316", "#ef4444"];
  const index = seed.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
}

function buildAssignee(
  user: { id: string; name: string | null; image?: string | null } | null
): WorkAssignee[] {
  if (!user) return [];

  return [
    {
      id: user.id,
      name: user.name?.trim() || "담당자",
      color: getAvatarColor(user.id),
      textColor: "#ffffff",
    },
  ];
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: {
    status?: string;
    view?: string;
    newProject?: string;
    create?: string;
    projectId?: string;
  };
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  const taskColumnSupport = await getTaskColumnSupport();
  const initialStatus = parseProjectStatus(searchParams?.status);
  const initialView = parseProjectView(searchParams?.view);
  const initialProjectId =
    typeof searchParams?.projectId === "string" && searchParams.projectId.trim().length > 0
      ? searchParams.projectId
      : null;
  const shouldOpenProjectModal = searchParams?.newProject === "1" || searchParams?.create === "project";

  const [projects, members] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        subtitle: true,
        description: true,
        color: true,
        status: true,
        progress: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            ...(taskColumnSupport.startDate ? { startDate: true } : {}),
            createdAt: true,
            updatedAt: true,
            dueDate: true,
            assignee: { select: { id: true, name: true, image: true } },
          },
          orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);

  const groups: ProjectTaskGroup[] = projects.map((project) => ({
    projectId: project.id,
    projectName: project.name,
    projectColor: project.color,
    projectSubtitle: project.subtitle,
    projectStatus: project.status,
    createdAt: project.createdAt.toISOString(),
    startDate: toIso(project.startDate),
    endDate: toIso(project.endDate),
    progress: project.progress ?? 0,
    tasks: project.tasks.map((task) => {
      const status = task.status as TaskStatusCode;

      return {
        id: task.id,
        projectId: project.id,
        projectName: project.name,
        projectColor: project.color,
        title: task.title,
        description: task.description,
        status,
        boardStatus: getTaskBoardStatus(status),
        priority: task.priority,
        assignees: buildAssignee(task.assignee),
        startDate: toIso(task.startDate ?? project.startDate ?? task.createdAt ?? task.dueDate),
        endDate: toIso(task.dueDate),
        updatedAt: task.updatedAt.toISOString(),
        progress: getTaskProgress(status),
      };
    }),
  }));

  return (
    <ProjectsTaskBoard
      initialGroups={groups}
      members={members.map((member) => member.user)}
      currentUserId={session.user.id}
      initialStatus={initialStatus}
      initialView={initialView}
      initialProjectId={initialProjectId}
      shouldOpenProjectModal={shouldOpenProjectModal}
    />
  );
}
