import { NextRequest, NextResponse } from "next/server";
import { TaskStatus } from "@prisma/client";
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

function normalizeAttachmentInputs(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((attachment) => {
      if (!attachment || typeof attachment !== "object") {
        return null;
      }

      const input = attachment as Record<string, unknown>;
      const name = typeof input.name === "string" ? input.name.trim() : "";
      if (!name) {
        return null;
      }

      const size = Number(input.size);
      const createdAt =
        typeof input.createdAt === "string" ? new Date(input.createdAt) : new Date();

      return {
        id: crypto.randomUUID(),
        name,
        size: Number.isFinite(size) && size > 0 ? Math.round(size) : 0,
        mimeType:
          typeof input.mimeType === "string" && input.mimeType.trim()
            ? input.mimeType.trim()
            : null,
        createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt,
      };
    })
    .filter((attachment): attachment is NonNullable<typeof attachment> => Boolean(attachment));
}

const TASK_STATUSES = new Set<TaskStatus>([
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE,
]);

function getTaskDetailSelect(taskColumnSupport: TaskColumnSupport) {
  return {
    id: true,
    title: true,
    description: true,
    status: true,
    priority: true,
    requiresApproval: true,
    isApprovalRequested: true,
    approvedBy: true,
    approvedAt: true,
    rejectedReason: true,
    budget: true,
    ...(taskColumnSupport.startDate ? { startDate: true } : {}),
    dueDate: true,
    createdAt: true,
    updatedAt: true,
    projectId: true,
    assigneeId: true,
    creatorId: true,
    progress: true,
    project: { select: { id: true, name: true, color: true, startDate: true, workspaceId: true } },
    assignee: { select: { id: true, name: true, image: true } },
    creator: { select: { id: true, name: true, image: true } },
    tags: { select: { id: true, name: true, color: true } },
    attachments: {
      select: {
        id: true,
        name: true,
        size: true,
        mimeType: true,
        storagePath: true,
        url: true,
        createdAt: true,
        uploaderId: true,
      },
      orderBy: { createdAt: "asc" },
    },
  } as const;
}

function normalizeTaskApprovalMeta(task: {
  status: TaskStatus;
  requiresApproval: boolean;
  isApprovalRequested?: boolean | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectedReason?: string | null;
}) {
  const isApprovalRequested =
    task.status === TaskStatus.IN_REVIEW &&
    Boolean(task.requiresApproval || task.isApprovalRequested);

  return {
    isApprovalRequested,
    approvedBy: task.approvedBy ?? null,
    approvedAt: task.approvedAt ?? null,
    rejectedReason: task.rejectedReason ?? null,
  };
}

function normalizeTaskStatus(value: unknown, fallback: TaskStatus) {
  return typeof value === "string" && TASK_STATUSES.has(value as TaskStatus)
    ? (value as TaskStatus)
    : fallback;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const taskColumnSupport = await getTaskColumnSupport();
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      select: getTaskDetailSelect(taskColumnSupport),
    });

    if (!task) {
      return NextResponse.json({ error: "업무를 찾을 수 없습니다." }, { status: 404 });
    }

    if (task.project.workspaceId !== session.user.workspaceId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    return NextResponse.json({
      task: {
        ...task,
        ...normalizeTaskApprovalMeta(task),
        project: {
          id: task.project.id,
          name: task.project.name,
          color: task.project.color,
        },
      },
    });
  } catch (error) {
    console.error("[TASK GET]", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const taskColumnSupport = await getTaskColumnSupport();
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        progress: true,
        title: true,
        ...(taskColumnSupport.startDate ? { startDate: true } : {}),
        dueDate: true,
        creatorId: true,
        projectId: true,
        project: { select: { id: true, workspaceId: true, startDate: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "업무를 찾을 수 없습니다." }, { status: 404 });
    }

    if (task.project.workspaceId !== session.user.workspaceId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (task.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: "이 업무는 작성자만 수정할 수 있습니다." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      status,
      priority,
      title,
      description,
      startDate,
      dueDate,
      assigneeId,
      budget,
      requiresApproval,
      progress,
      attachments,
    } = body;
    const hasAttachmentsInput = attachments !== undefined;
    const attachmentInputs = normalizeAttachmentInputs(attachments);

    const hasStatusInput = status !== undefined;
    const hasProgressInput = progress !== undefined;
    const trimmedTitle = typeof title === "string" ? title.trim() : undefined;
    const trimmedAssigneeId =
      typeof assigneeId === "string" ? assigneeId.trim() : assigneeId;

    if (title !== undefined && !trimmedTitle) {
      return NextResponse.json({ error: "업무 제목을 입력하세요." }, { status: 400 });
    }

    if (assigneeId !== undefined && !trimmedAssigneeId) {
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

    const nextStartDate =
      startDate !== undefined ? parsedStartDate.value : task.startDate ?? null;
    const nextDueDate =
      dueDate !== undefined ? parsedDueDate.value : task.dueDate ?? null;

    if (
      nextStartDate &&
      nextDueDate &&
      nextDueDate.getTime() < nextStartDate.getTime()
    ) {
      return NextResponse.json(
        { error: "마감일은 시작일보다 빠를 수 없습니다." },
        { status: 400 }
      );
    }

    const requestedProgress = hasProgressInput
      ? normalizeProgress(progress)
      : normalizeProgress(task.progress ?? 0);
    let nextStatus = normalizeTaskStatus(status, task.status);
    let nextProgress = requestedProgress;

    if (
      nextStatus === TaskStatus.DONE ||
      (hasProgressInput && requestedProgress >= 100)
    ) {
      nextStatus = TaskStatus.DONE;
      nextProgress = 100;
    } else if (
      hasProgressInput &&
      requestedProgress > 0 &&
      nextStatus === TaskStatus.TODO
    ) {
      nextStatus = TaskStatus.IN_PROGRESS;
    } else if (
      hasProgressInput &&
      requestedProgress < 100 &&
      task.status === TaskStatus.DONE &&
      !hasStatusInput
    ) {
      nextStatus = TaskStatus.IN_PROGRESS;
    }

    const shouldSyncStatusAndProgress = hasStatusInput || hasProgressInput;
    const previousProjectStartDate = task.project.startDate ?? null;
    const shouldAdjustProjectStartDate = Boolean(
      nextStartDate &&
        (!task.project.startDate ||
          nextStartDate.getTime() < task.project.startDate.getTime())
    );
    const nextProjectStartDate = shouldAdjustProjectStartDate
      ? nextStartDate
      : previousProjectStartDate;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: params.id },
        data: {
          ...(shouldSyncStatusAndProgress && {
            status: nextStatus,
            progress: nextProgress,
          }),
          ...(priority !== undefined && { priority }),
          ...(title !== undefined && { title: trimmedTitle }),
          ...(description !== undefined && { description }),
          ...(startDate !== undefined && { startDate: parsedStartDate.value }),
          ...(dueDate !== undefined && { dueDate: parsedDueDate.value }),
          ...(assigneeId !== undefined && { assigneeId: trimmedAssigneeId }),
          ...(budget !== undefined && { budget }),
          ...(requiresApproval !== undefined && { requiresApproval }),
        },
      });

      if (hasAttachmentsInput) {
        await tx.taskAttachment.deleteMany({
          where: { taskId: params.id },
        });

        if (attachmentInputs.length > 0) {
          await tx.taskAttachment.createMany({
            data: attachmentInputs.map((attachment) => ({
              ...attachment,
              taskId: params.id,
              uploaderId: session.user.id,
            })),
          });
        }
      }

      if (shouldAdjustProjectStartDate && nextStartDate) {
        await tx.project.update({
          where: { id: task.projectId },
          data: { startDate: nextStartDate },
        });
      }

      return tx.task.findUniqueOrThrow({
        where: { id: params.id },
        select: getTaskDetailSelect(taskColumnSupport),
      });
    });

    return NextResponse.json({
      task: { ...updated, ...normalizeTaskApprovalMeta(updated) },
      projectStartDateAdjusted: shouldAdjustProjectStartDate,
      previousProjectStartDate: serializeDateMeta(previousProjectStartDate),
      nextProjectStartDate: serializeDateMeta(nextProjectStartDate),
    });
  } catch (error) {
    console.error("[TASK PATCH]", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        creatorId: true,
        project: { select: { workspaceId: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "업무를 찾을 수 없습니다." }, { status: 404 });
    }

    if (task.project.workspaceId !== session.user.workspaceId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    if (task.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: "이 업무는 작성자만 삭제할 수 있습니다." },
        { status: 403 }
      );
    }

    await prisma.$executeRaw`
      DELETE FROM "Task"
      WHERE "id" = ${params.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TASK DELETE]", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
