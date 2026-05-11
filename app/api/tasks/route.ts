import { NextRequest, NextResponse } from "next/server";
import { Priority, TaskStatus } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTaskColumnSupport, type TaskColumnSupport } from "@/lib/task-column-support";

function normalizeProgress(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function parseOptionalDateInput(value: unknown) {
  if (value === undefined) {
    return { provided: false, value: null as Date | null, invalid: false };
  }

  if (value === null || value === "") {
    return { provided: true, value: null as Date | null, invalid: false };
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    return { provided: true, value: null as Date | null, invalid: true };
  }

  return { provided: true, value: parsed, invalid: false };
}

function serializeDateMeta(value: Date | null) {
  return value ? value.toISOString() : null;
}

const TASK_STATUSES = new Set<TaskStatus>([
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
]);

function getTaskListSelect(taskColumnSupport: TaskColumnSupport) {
  return {
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
    project: { select: { id: true, name: true, color: true, startDate: true } },
  } as const;
}

const taskApprovalFallback = {
  isApprovalRequested: false,
  approvedBy: null,
  approvedAt: null,
  rejectedReason: null,
};

function getTaskApprovalFallback(task: {
  status: TaskStatus;
  requiresApproval: boolean;
}) {
  return {
    ...taskApprovalFallback,
    isApprovalRequested:
      task.status === TaskStatus.IN_REVIEW && Boolean(task.requiresApproval),
  };
}

function normalizeTaskStatus(value: unknown, progress: number) {
  const status =
    typeof value === "string" && TASK_STATUSES.has(value as TaskStatus)
      ? (value as TaskStatus)
      : TaskStatus.TODO;

  if (status === TaskStatus.DONE || progress >= 100) {
    return TaskStatus.DONE;
  }

  if (status === TaskStatus.TODO && progress > 0) {
    return TaskStatus.IN_PROGRESS;
  }

  return status;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ tasks: [] });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const taskColumnSupport = await getTaskColumnSupport();

  const tasks = await prisma.task.findMany({
    where: {
      project: { workspaceId },
      ...(projectId ? { projectId } : {}),
    },
    select: getTaskListSelect(taskColumnSupport),
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    tasks: tasks.map((task) => ({
      ...task,
      ...getTaskApprovalFallback(task),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const taskColumnSupport = await getTaskColumnSupport();
    const body = await req.json();
    const {
      title,
      description,
      projectId,
      assigneeId,
      startDate,
      dueDate,
      priority,
      status,
      budget,
      progress,
    } = body;

    const trimmedTitle = typeof title === "string" ? title.trim() : "";
    const trimmedAssigneeId =
      typeof assigneeId === "string" ? assigneeId.trim() : assigneeId ?? "";

    if (!trimmedTitle) {
      return NextResponse.json({ error: "업무 제목을 입력하세요." }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: "프로젝트를 선택해 주세요." }, { status: 400 });
    }

    if (!trimmedAssigneeId) {
      return NextResponse.json(
        { error: "담당자를 등록하셔야합니다" },
        { status: 400 }
      );
    }

    const parsedStartDate = parseOptionalDateInput(startDate);
    const parsedDueDate = parseOptionalDateInput(dueDate);

    if (parsedStartDate.invalid) {
      return NextResponse.json({ error: "시작일 형식을 확인해 주세요." }, { status: 400 });
    }

    if (parsedDueDate.invalid) {
      return NextResponse.json({ error: "마감일 형식을 확인해 주세요." }, { status: 400 });
    }

    if (
      parsedStartDate.value &&
      parsedDueDate.value &&
      parsedDueDate.value.getTime() < parsedStartDate.value.getTime()
    ) {
      return NextResponse.json(
        { error: "마감일은 시작일보다 빠를 수 없습니다." },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true, startDate: true },
    });

    if (!project || project.workspaceId !== session.user.workspaceId) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const normalizedProgress = normalizeProgress(progress);
    const normalizedStatus = normalizeTaskStatus(status, normalizedProgress);
    const finalProgress =
      normalizedStatus === TaskStatus.DONE ? 100 : normalizedProgress;
    const normalizedPriority =
      typeof priority === "string" && priority in Priority
        ? priority
        : Priority.MEDIUM;
    const taskId = crypto.randomUUID();

    const previousProjectStartDate = project.startDate ?? null;
    const shouldAdjustProjectStartDate = Boolean(
      parsedStartDate.value &&
        (!project.startDate ||
          parsedStartDate.value.getTime() < project.startDate.getTime())
    );
    const nextProjectStartDate = shouldAdjustProjectStartDate
      ? parsedStartDate.value
      : previousProjectStartDate;

    await prisma.$transaction(async (tx) => {
      if (taskColumnSupport.startDate) {
        await tx.$executeRaw`
          INSERT INTO "Task" (
            "id",
            "title",
            "description",
            "status",
            "priority",
            "requiresApproval",
            "budget",
            "startDate",
            "dueDate",
            "createdAt",
            "updatedAt",
            "projectId",
            "assigneeId",
            "creatorId",
            "progress"
          )
          VALUES (
            ${taskId},
            ${trimmedTitle},
            ${description ?? null},
            ${normalizedStatus}::"TaskStatus",
            ${normalizedPriority}::"Priority",
            ${false},
            ${budget ?? null},
            ${parsedStartDate.value},
            ${parsedDueDate.value},
            NOW(),
            NOW(),
            ${projectId},
            ${trimmedAssigneeId},
            ${session.user.id},
            ${finalProgress}
          )
        `;
      } else {
        await tx.$executeRaw`
          INSERT INTO "Task" (
            "id",
            "title",
            "description",
            "status",
            "priority",
            "requiresApproval",
            "budget",
            "dueDate",
            "createdAt",
            "updatedAt",
            "projectId",
            "assigneeId",
            "creatorId",
            "progress"
          )
          VALUES (
            ${taskId},
            ${trimmedTitle},
            ${description ?? null},
            ${normalizedStatus}::"TaskStatus",
            ${normalizedPriority}::"Priority",
            ${false},
            ${budget ?? null},
            ${parsedDueDate.value},
            NOW(),
            NOW(),
            ${projectId},
            ${trimmedAssigneeId},
            ${session.user.id},
            ${finalProgress}
          )
        `;
      }

      if (shouldAdjustProjectStartDate && parsedStartDate.value) {
        await tx.project.update({
          where: { id: projectId },
          data: { startDate: parsedStartDate.value },
        });
      }
    });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: getTaskListSelect(taskColumnSupport),
    });

    if (!task) {
      return NextResponse.json(
        { error: "업무 저장 결과를 불러오지 못했습니다." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        task: {
          ...task,
          ...getTaskApprovalFallback(task),
        },
        projectStartDateAdjusted: shouldAdjustProjectStartDate,
        previousProjectStartDate: serializeDateMeta(previousProjectStartDate),
        nextProjectStartDate: serializeDateMeta(nextProjectStartDate),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[TASK CREATE]", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
