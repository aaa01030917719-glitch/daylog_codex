import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProjectsClientPage } from "@/components/projects/ProjectsClientPage";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const workspaceId = session.user.workspaceId ?? "";
  const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";

  const rawProjects = await prisma.project.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { tasks: true } },
      tasks: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const projects = rawProjects.map((p) => ({
    ...p,
    doneTasks: p.tasks.filter((t) => t.status === "DONE").length,
    tasks: undefined,
  }));

  return (
    <ProjectsClientPage
      initialProjects={projects}
      isAdmin={isAdmin}
    />
  );
}
