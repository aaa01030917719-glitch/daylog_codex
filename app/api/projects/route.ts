import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) return NextResponse.json({ projects: [] });

  const projects = await prisma.project.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { tasks: true } },
      tasks: { select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // 진행률 계산: doneTasks / totalTasks
  const projectsWithProgress = projects.map((p) => ({
    ...p,
    doneTasks: p.tasks.filter((t) => t.status === "DONE").length,
    tasks: undefined,
  }));

  return NextResponse.json({ projects: projectsWithProgress });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "워크스페이스 없음" }, { status: 400 });

  try {
    const body = await req.json();
    const { name, description, color, budget } = body;

    if (!name) return NextResponse.json({ error: "프로젝트 이름을 입력해주세요." }, { status: 400 });

    const project = await prisma.project.create({
      data: {
        name,
        description: description ?? null,
        color: color ?? "#F56B23",
        budget: budget ?? null,
        workspaceId,
      },
      include: { _count: { select: { tasks: true } } },
    });

    return NextResponse.json({ project: { ...project, doneTasks: 0 } }, { status: 201 });
  } catch (error) {
    console.error("[PROJECT CREATE]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
