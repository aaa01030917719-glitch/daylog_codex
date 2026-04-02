import { auth } from "@/auth";
import { getProjectBaseSelect, hasProjectSubtitleColumn } from "@/lib/project-column-support";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const workspaceId = session.user.workspaceId ?? "";
  const projectSubtitleEnabled = await hasProjectSubtitleColumn();

  const [project, members] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.id },
      select: {
        ...getProjectBaseSelect(projectSubtitleEnabled),
        tasks: {
          include: {
            assignee: { select: { id: true, name: true, image: true } },
            creator: { select: { id: true, name: true } },
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

  return (
    <KanbanBoard
      project={{
        id: project.id,
        name: project.name,
        color: project.color,
        status: project.status,
      }}
      initialTasks={project.tasks}
      members={members.map((m) => m.user)}
      isAdmin={isAdmin}
      currentUserId={session.user.id}
    />
  );
}
