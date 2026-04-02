import { ProjectStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getProjectBaseSelect,
  getProjectColumnSupport,
} from "@/lib/project-column-support";
import { prisma } from "@/lib/prisma";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeNullableString(value: unknown) {
  if (value === null) {
    return null;
  }

  return typeof value === "string" ? value.trim() : undefined;
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
      return exactMembership.workspaceId;
    }
  }

  const fallbackMembership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    select: {
      workspaceId: true,
    },
  });

  return fallbackMembership?.workspaceId ?? "";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  const projectColumnSupport = await getProjectColumnSupport();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: {
      ...getProjectBaseSelect(projectColumnSupport),
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          creator: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  if (!workspaceId || project.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  return NextResponse.json({
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
    },
  });
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
    const workspaceId = await resolveWorkspaceIdForUser(
      session.user.id,
      session.user.workspaceId
    );
    const projectColumnSupport = await getProjectColumnSupport();
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        workspaceId: true,
      },
    });
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    if (!workspaceId || project.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await req.json();
    const hasProgressInput = Object.prototype.hasOwnProperty.call(body, "progress");
    const hasStartDateInput = Object.prototype.hasOwnProperty.call(body, "startDate");
    const hasEndDateInput = Object.prototype.hasOwnProperty.call(body, "endDate");
    const name = normalizeString(body.name);
    const subtitle = normalizeNullableString(body.subtitle);
    const description = normalizeNullableString(body.description);
    const color = normalizeString(body.color);
    const status =
      body.status === "ACTIVE" || body.status === "ARCHIVED"
        ? (body.status as ProjectStatus)
        : undefined;
    const budget =
      typeof body.budget === "number" || body.budget === null ? body.budget : undefined;
    const progressInput = normalizeOptionalProgress(body.progress);
    const startDateInput = normalizeOptionalDate(body.startDate);
    const endDateInput = normalizeOptionalDate(body.endDate);

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

    const derivedStatus =
      endDateInput.value && isPastDate(endDateInput.value)
        ? ProjectStatus.ARCHIVED
        : undefined;

    const updated = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(projectColumnSupport.subtitle && subtitle !== undefined ? { subtitle } : {}),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(status !== undefined ? { status } : derivedStatus ? { status: derivedStatus } : {}),
        ...(budget !== undefined && { budget }),
        ...(projectColumnSupport.progress && hasProgressInput && progressInput.value !== null
          ? { progress: progressInput.value }
          : {}),
        ...(projectColumnSupport.startDate && hasStartDateInput
          ? { startDate: startDateInput.value }
          : {}),
        ...(projectColumnSupport.endDate && hasEndDateInput
          ? { endDate: endDateInput.value }
          : {}),
      },
      select: {
        ...getProjectBaseSelect(projectColumnSupport),
        _count: { select: { tasks: true } },
      },
    });

    return NextResponse.json({
      project: {
        ...updated,
        subtitle: projectColumnSupport.subtitle
          ? ((updated as { subtitle?: string | null }).subtitle ?? null)
          : null,
        progress: projectColumnSupport.progress
          ? ((updated as { progress?: number | null }).progress ?? null)
          : null,
        startDate: projectColumnSupport.startDate
          ? ((updated as { startDate?: Date | null }).startDate ?? null)
          : null,
        endDate: projectColumnSupport.endDate
          ? ((updated as { endDate?: Date | null }).endDate ?? null)
          : null,
      },
    });
  } catch (error) {
    console.error("[PROJECT PATCH]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
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

  if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "관리자만 삭제할 수 있습니다." }, { status: 403 });
  }

  try {
    const workspaceId = await resolveWorkspaceIdForUser(
      session.user.id,
      session.user.workspaceId
    );
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        workspaceId: true,
      },
    });
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }

    if (!workspaceId || project.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    await prisma.project.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PROJECT DELETE]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
