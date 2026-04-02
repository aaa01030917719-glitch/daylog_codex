import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) return NextResponse.json({ tasks: [] });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  const tasks = await prisma.task.findMany({
    where: {
      project: { workspaceId },
      ...(projectId ? { projectId } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      creator: { select: { id: true, name: true } },
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, description, projectId, assigneeId, dueDate, priority, budget, requiresApproval } = body;

    if (!title || !projectId) {
      return NextResponse.json({ error: "태스크 이름과 프로젝트를 입력해주세요." }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true },
    });
    if (!project || project.workspaceId !== session.user.workspaceId) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description: description ?? null,
        projectId,
        assigneeId: assigneeId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority ?? "MEDIUM",
        budget: budget ?? null,
        requiresApproval: requiresApproval ?? false,
        creatorId: session.user.id,
      },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        creator: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("[TASK CREATE]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
