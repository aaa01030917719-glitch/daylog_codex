import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProjectsClientPage } from "@/components/projects/ProjectsClientPage";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const workspaceId = session.user.workspaceId ?? "";
  const isAdmin = true; // MEMBER 포함 전체 프로젝트 생성 허용

  const [rawProjects, members] = await Promise.all([
    prisma.project.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { id: true, name: true, image: true } } },
    }),
  ]);

  const projects = rawProjects.map((p) => ({
    ...p,
    doneTasks: p.tasks.filter((t) => t.status === "DONE").length,
    tasks: undefined,
  }));

  return (
    <ProjectsClientPage
      initialProjects={projects}
      isAdmin={isAdmin}
      members={members.map((m) => m.user)}
    />
  );
}
