import { auth } from "@/auth";
import { CommentPanel } from "@/components/comments/CommentPanel";
import { ProjectDetailPageActions } from "@/components/projects/ProjectDetailPageActions";
import { mapProjectRecordToSummary } from "@/components/projects/project-data-mappers";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import {
  getProjectBaseSelect,
  getProjectColumnSupport,
} from "@/lib/project-column-support";
import { prisma } from "@/lib/prisma";
import { getTaskColumnSupport } from "@/lib/task-column-support";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";
import { notFound } from "next/navigation";

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { taskId?: string };
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  const projectColumnSupport = await getProjectColumnSupport();
  const taskColumnSupport = await getTaskColumnSupport();

  const [project, members] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.id },
      select: {
        ...getProjectBaseSelect(projectColumnSupport),
        _count: { select: { tasks: true } },
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            requiresApproval: true,
            budget: true,
            ...(taskColumnSupport.startDate ? { startDate: true } : {}),
            dueDate: true,
            createdAt: true,
            updatedAt: true,
            projectId: true,
            assigneeId: true,
            creatorId: true,
            progress: true,
            assignee: { select: { id: true, name: true, image: true } },
            creator: { select: { id: true, name: true } },
            tags: { select: { name: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, image: true } } },
    }),
  ]);

  if (!project || project.workspaceId !== workspaceId) notFound();

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";
  const projectSummary = mapProjectRecordToSummary(project, projectColumnSupport);
  const memberOptions = members.map((member) => member.user);

  return (
    <div className="page-shell">
      <section className="page-header">
        <div className="page-header__meta">
          <div className="page-header__eyebrow">PROJECT DETAIL</div>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">
            프로젝트 업무를 한곳에서 확인하고 관리할 수 있습니다
          </p>
        </div>
        <ProjectDetailPageActions
          project={projectSummary}
          members={memberOptions}
          canManage={isAdmin}
          currentUserId={session.user.id}
        />
      </section>

      <section className="rounded-[var(--radius-lg)] bg-[var(--surface)] p-4">
        <KanbanBoard
          project={{
            id: project.id,
            name: project.name,
            color: project.color,
            status: project.status,
          }}
          initialTasks={project.tasks}
          members={memberOptions}
          isAdmin={isAdmin}
          currentUserId={session.user.id}
          showHeader={false}
          initialSelectedTaskId={searchParams?.taskId ?? null}
        />
      </section>

      <CommentPanel targetType="project" targetId={project.id} title={"\ub313\uae00"} />
    </div>
  );
}
