import { ProjectStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getProjectBaseSelect,
  getProjectColumnSupport,
} from "@/lib/project-column-support";
import { prisma } from "@/lib/prisma";
import {
  buildProjectGanttPayload,
  mapProjectRecordToSummary,
} from "@/components/projects/project-data-mappers";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return { value: null, invalid: false };
  }

  if (typeof value !== "string") {
    return { value: null, invalid: true };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null, invalid: false };
  }

  const parsed = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00` : trimmed
  );

  if (Number.isNaN(parsed.getTime())) {
    return { value: null, invalid: true };
  }

  return { value: parsed, invalid: false };
}

function normalizeOptionalProgress(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return { value: null, invalid: false };
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return { value: null, invalid: true };
  }

  return {
    value: Math.min(100, Math.max(0, Math.round(numeric))),
    invalid: false,
  };
}

function isPastDate(date: Date) {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return date.getTime() < todayStart.getTime();
}

async function resolveWorkspaceIdForUser(userId: string, sessionWorkspaceId?: string) {
  if (sessionWorkspaceId) {
    const exactMembership = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: sessionWorkspaceId,
      },
      select: {
        workspaceId: true,
      },
    });

    if (exactMembership) {
      return {
        workspaceId: exactMembership.workspaceId,
        source: "session" as const,
      };
    }
  }

  const fallbackMembership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    select: {
      workspaceId: true,
    },
  });

  if (!fallbackMembership) {
    return null;
  }

  return {
    workspaceId: fallbackMembership.workspaceId,
    source: "membership" as const,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspace = await resolveWorkspaceIdForUser(session.user.id, session.user.workspaceId);
  const projectColumnSupport = await getProjectColumnSupport();

  if (!workspace) {
    return NextResponse.json({ projects: [] });
  }

  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace.workspaceId },
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
  });

  const projectSummaries = projects.map((project) =>
    mapProjectRecordToSummary(project, projectColumnSupport)
  );

  return NextResponse.json({
    projects: projectSummaries,
    gantt: buildProjectGanttPayload(projectSummaries),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const projectColumnSupport = await getProjectColumnSupport();
    const workspace = await resolveWorkspaceIdForUser(session.user.id, session.user.workspaceId);

    if (!workspace) {
      console.warn("[PROJECT CREATE] missing valid workspace", {
        userId: session.user.id,
        sessionWorkspaceId: session.user.workspaceId ?? null,
      });

      return NextResponse.json(
        {
          error:
            "유효한 워크스페이스를 찾지 못했습니다. 워크스페이스에 다시 참여하거나 다시 로그인해 주세요.",
        },
        { status: 409 }
      );
    }

    if (session.user.workspaceId && session.user.workspaceId !== workspace.workspaceId) {
      console.warn("[PROJECT CREATE] corrected stale session workspaceId", {
        userId: session.user.id,
        sessionWorkspaceId: session.user.workspaceId,
        resolvedWorkspaceId: workspace.workspaceId,
      });
    }

    const body = await req.json();
    const name = normalizeText(body.name);
    const subtitle = normalizeText(body.subtitle);
    const description = normalizeText(body.description);
    const color = normalizeText(body.color) || "#4f7cff";
    const budget = typeof body.budget === "number" ? body.budget : null;
    const progressInput = normalizeOptionalProgress(body.progress);
    const startDateInput = normalizeOptionalDate(body.startDate);
    const endDateInput = normalizeOptionalDate(body.endDate);

    if (!name) {
      return NextResponse.json({ error: "프로젝트 이름을 입력해 주세요." }, { status: 400 });
    }

    if (progressInput.invalid) {
      return NextResponse.json(
        { error: "진행률은 0부터 100 사이 숫자로 입력해 주세요." },
        { status: 400 }
      );
    }

    if (startDateInput.invalid || endDateInput.invalid) {
      return NextResponse.json(
        { error: "프로젝트 날짜 형식을 다시 확인해 주세요." },
        { status: 400 }
      );
    }

    if (
      startDateInput.value &&
      endDateInput.value &&
      endDateInput.value.getTime() < startDateInput.value.getTime()
    ) {
      return NextResponse.json(
        { error: "마감날짜는 시작날짜보다 빠를 수 없습니다." },
        { status: 400 }
      );
    }

    const nextStatus =
      endDateInput.value && isPastDate(endDateInput.value)
        ? ProjectStatus.ARCHIVED
        : ProjectStatus.ACTIVE;

    const project = await prisma.project.create({
      data: {
        name,
        ...(projectColumnSupport.subtitle ? { subtitle: subtitle || null } : {}),
        description: description || null,
        color,
        budget,
        ...(projectColumnSupport.progress ? { progress: progressInput.value ?? 0 } : {}),
        ...(projectColumnSupport.startDate ? { startDate: startDateInput.value } : {}),
        ...(projectColumnSupport.endDate ? { endDate: endDateInput.value } : {}),
        status: nextStatus,
        workspaceId: workspace.workspaceId,
      },
      select: {
        ...getProjectBaseSelect(projectColumnSupport),
        _count: { select: { tasks: true } },
      },
    });

    return NextResponse.json(
      {
        project: {
          ...project,
          subtitle: projectColumnSupport.subtitle
            ? ((project as { subtitle?: string | null }).subtitle ?? null)
            : null,
          progress: projectColumnSupport.progress
            ? ((project as { progress?: number | null }).progress ?? null)
            : null,
          startDate: projectColumnSupport.startDate
            ? ((project as { startDate?: Date | null }).startDate ?? null)
            : null,
          endDate: projectColumnSupport.endDate
            ? ((project as { endDate?: Date | null }).endDate ?? null)
            : null,
          doneTasks: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[PROJECT CREATE]", error);
    return NextResponse.json(
      { error: "프로젝트를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
