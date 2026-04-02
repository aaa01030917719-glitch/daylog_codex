import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getProjectBaseSelect,
  getProjectColumnSupport,
} from "@/lib/project-column-support";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";
import { ProjectsClientPage } from "@/components/projects/ProjectsClientPage";
import { mapProjectRecordToSummary } from "@/components/projects/project-data-mappers";
import type {
  ProjectBoardStatus,
  ProjectSummary,
  ProjectViewMode,
} from "@/components/projects/project-board-types";

function parseProjectStatus(value?: string): ProjectBoardStatus {
  if (value === "ONGOING" || value === "COMPLETED" || value === "UPCOMING") {
    return value;
  }

  return "ALL";
}

function parseProjectView(value?: string): ProjectViewMode {
  const normalized = value?.toUpperCase();

  if (normalized === "CALENDAR" || normalized === "GANTT") {
    return normalized;
  }

  return "LIST";
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams?: { status?: string; view?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  const projectColumnSupport = await getProjectColumnSupport();
  const initialStatus = parseProjectStatus(searchParams?.status);
  const initialView = parseProjectView(searchParams?.view);
  const isAdmin = true; // MEMBER 포함 전체 프로젝트 생성 허용

  const [rawProjects, members] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId },
      select: {
        ...getProjectBaseSelect(projectColumnSupport),
        _count: { select: { tasks: true } },
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            createdAt: true,
            dueDate: true,
            assignee: { select: { name: true } },
            tags: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { id: true, name: true, image: true } } },
    }),
  ]);

  const projects: ProjectSummary[] = rawProjects.map((project) =>
    mapProjectRecordToSummary(project, projectColumnSupport)
  );

  return (
    <ProjectsClientPage
      initialProjects={projects}
      isAdmin={isAdmin}
      members={members.map((m) => m.user)}
      initialStatus={initialStatus}
      initialView={initialView}
    />
  );
}
