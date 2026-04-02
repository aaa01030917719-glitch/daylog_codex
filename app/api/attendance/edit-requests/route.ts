import { ApprovalStatus, ApprovalType, type Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ATTENDANCE_EDIT_REQUEST_TITLE_PREFIX } from "@/components/attendance/attendance-utils";

function isAdmin(role?: string | null) {
  return role === "ADMIN" || role === "OWNER";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDateOnly(value: unknown) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTime(dateText: string, timeText: string) {
  if (!timeText) return null;

  const date = new Date(`${dateText}T${timeText}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function buildRequestTitle(date: Date) {
  return `${ATTENDANCE_EDIT_REQUEST_TITLE_PREFIX} · ${formatDateLabel(date)}`;
}

function parseDescription(description: string | null) {
  if (!description) {
    return null;
  }

  try {
    const parsed = JSON.parse(description) as {
      kind?: string;
      date?: string;
      requestedCheckIn?: string | null;
      requestedCheckOut?: string | null;
      reason?: string;
    };

    if (parsed.kind !== "ATTENDANCE_EDIT" || !parsed.date) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function serializeRequest(approval: {
  id: string;
  title: string;
  status: ApprovalStatus;
  createdAt: Date;
  decidedAt: Date | null;
  decisionNote: string | null;
  description: string | null;
  requesterId: string;
  requester: { name: string | null };
}) {
  const parsed = parseDescription(approval.description);

  return {
    id: approval.id,
    title: approval.title,
    status: approval.status,
    createdAt: approval.createdAt.toISOString(),
    decidedAt: approval.decidedAt?.toISOString() ?? null,
    decisionNote: approval.decisionNote,
    requesterId: approval.requesterId,
    requesterName: approval.requester.name ?? "이름 없음",
    requestDate: parsed?.date ?? "",
    requestedCheckIn: parsed?.requestedCheckIn ?? null,
    requestedCheckOut: parsed?.requestedCheckOut ?? null,
    reason: parsed?.reason ?? "",
  };
}

function buildWhere(workspaceId: string, userId: string, role?: string | null): Prisma.ApprovalWhereInput {
  const base: Prisma.ApprovalWhereInput = {
    type: ApprovalType.PROJECT_REVIEW,
    title: { startsWith: ATTENDANCE_EDIT_REQUEST_TITLE_PREFIX },
  };

  if (isAdmin(role)) {
    return {
      ...base,
      requester: { members: { some: { workspaceId } } },
    };
  }

  return {
    ...base,
    requesterId: userId,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json([]);
  }

  const requests = await prisma.approval.findMany({
    where: buildWhere(workspaceId, session.user.id, session.user.role),
    include: {
      requester: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests.map(serializeRequest));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "워크스페이스 정보를 찾을 수 없습니다." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const requestDate = normalizeText(body.date);
    const requestedCheckInText = normalizeText(body.requestedCheckIn);
    const requestedCheckOutText = normalizeText(body.requestedCheckOut);
    const reason = normalizeText(body.reason);
    const date = parseDateOnly(requestDate);

    if (!date) {
      return NextResponse.json({ error: "수정할 날짜를 선택해 주세요." }, { status: 400 });
    }

    if (!requestedCheckInText && !requestedCheckOutText) {
      return NextResponse.json({ error: "출근 시간 또는 퇴근 시간을 입력해 주세요." }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: "수정 요청 사유를 입력해 주세요." }, { status: 400 });
    }

    const requestedCheckIn = parseTime(requestDate, requestedCheckInText);
    const requestedCheckOut = parseTime(requestDate, requestedCheckOutText);

    if ((requestedCheckInText && !requestedCheckIn) || (requestedCheckOutText && !requestedCheckOut)) {
      return NextResponse.json({ error: "시간 형식을 다시 확인해 주세요." }, { status: 400 });
    }

    if (requestedCheckIn && requestedCheckOut && requestedCheckOut <= requestedCheckIn) {
      return NextResponse.json({ error: "퇴근 시간은 출근 시간보다 늦어야 합니다." }, { status: 400 });
    }

    const pendingForSameDate = await prisma.approval.findFirst({
      where: {
        requesterId: session.user.id,
        status: ApprovalStatus.PENDING,
        type: ApprovalType.PROJECT_REVIEW,
        title: buildRequestTitle(date),
      },
    });

    if (pendingForSameDate) {
      return NextResponse.json({ error: "같은 날짜의 수정 요청이 이미 대기 중입니다." }, { status: 409 });
    }

    const approval = await prisma.approval.create({
      data: {
        type: ApprovalType.PROJECT_REVIEW,
        title: buildRequestTitle(date),
        description: JSON.stringify({
          kind: "ATTENDANCE_EDIT",
          date: requestDate,
          requestedCheckIn: requestedCheckIn?.toISOString() ?? null,
          requestedCheckOut: requestedCheckOut?.toISOString() ?? null,
          reason,
        }),
        requesterId: session.user.id,
      },
      include: {
        requester: { select: { name: true } },
      },
    });

    const admins = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        role: { in: ["ADMIN", "OWNER"] },
        userId: { not: session.user.id },
      },
      select: { userId: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.userId,
          type: "APPROVAL_REQUEST" as const,
          title: "근무시간 수정 요청이 도착했습니다.",
          body: approval.title,
          link: "/attendance",
        })),
      });
    }

    return NextResponse.json(serializeRequest(approval), { status: 201 });
  } catch (error) {
    console.error("[ATTENDANCE_EDIT_REQUEST_CREATE]", error);
    return NextResponse.json(
      { error: "근무시간 수정 요청을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
