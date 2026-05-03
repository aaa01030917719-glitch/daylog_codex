import { NextRequest, NextResponse } from "next/server";
import {
  ApprovalStatus,
  ApprovalType,
  LeaveType,
  Prisma,
} from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const approvalStatuses = new Set(Object.values(ApprovalStatus));
const approvalTypes = new Set(Object.values(ApprovalType));
const leaveTypes = new Set(Object.values(LeaveType));

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "OWNER";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDateInput(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatLeaveType(leaveType: LeaveType) {
  switch (leaveType) {
    case "FULL_DAY":
      return "연차";
    case "HALF_AM":
      return "오전 반차";
    case "HALF_PM":
      return "오후 반차";
    default:
      return "휴가";
  }
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function buildLeaveTitle(leaveType: LeaveType, leaveStart: Date, leaveEnd: Date) {
  const rangeLabel =
    leaveStart.getTime() === leaveEnd.getTime()
      ? formatDateLabel(leaveStart)
      : `${formatDateLabel(leaveStart)} - ${formatDateLabel(leaveEnd)}`;

  return `${formatLeaveType(leaveType)} 신청 · ${rangeLabel}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId ?? "";
  const searchParams = req.nextUrl.searchParams;
  const status = normalizeText(searchParams.get("status"));
  const category = normalizeText(searchParams.get("category"));
  const where: Prisma.ApprovalWhereInput = isAdminRole(session.user.role)
    ? { requester: { members: { some: { workspaceId } } } }
    : { requesterId: session.user.id };

  if (status && status !== "ALL") {
    if (!approvalStatuses.has(status as ApprovalStatus)) {
      return NextResponse.json(
        { error: "유효하지 않은 상태 필터입니다." },
        { status: 400 }
      );
    }

    where.status = status as ApprovalStatus;
  }

  if (category === "LEAVE") {
    where.type = "LEAVE_REQUEST";
  } else if (category === "WORK") {
    where.NOT = { type: "LEAVE_REQUEST" };
  } else if (category && category !== "ALL") {
    return NextResponse.json(
      { error: "유효하지 않은 분류 필터입니다." },
      { status: 400 }
    );
  }

  const approvals = workspaceId
    ? await prisma.approval.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          requester: { select: { id: true, name: true, image: true } },
          decider: { select: { id: true, name: true } },
          task: { select: { id: true, title: true } },
          event: { select: { id: true, title: true } },
        },
      })
    : [];

  return NextResponse.json(approvals);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json(
      { error: "워크스페이스 정보가 없습니다." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const type = normalizeText(body.type);
    const title = normalizeText(body.title);
    const description = normalizeText(body.description);
    const leaveType = normalizeText(body.leaveType);
    const leaveStart = parseDateInput(body.leaveStart);
    const leaveEnd = parseDateInput(body.leaveEnd);

    const isLeaveRequest =
      type === "LEAVE_REQUEST" ||
      !!leaveType ||
      !!body.leaveStart ||
      !!body.leaveEnd;

    const shouldAutoApproveLeave =
      session.user.role === "OWNER" &&
      (leaveType === "FULL_DAY" || leaveType === "HALF_AM" || leaveType === "HALF_PM");

    const approval = isLeaveRequest
      ? await createLeaveApproval({
          sessionUserId: session.user.id,
          leaveType,
          leaveStart,
          leaveEnd,
          title,
          description,
          autoApprove: shouldAutoApproveLeave,
        })
      : await createWorkApproval({
          sessionUserId: session.user.id,
          type,
          title,
          description,
          taskId: normalizeText(body.taskId),
          eventId: normalizeText(body.eventId),
        });

    const admins = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        role: { in: ["ADMIN", "OWNER"] },
        userId: { not: session.user.id },
      },
      select: { userId: true },
    });

    if (admins.length > 0 && approval.status === "PENDING") {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.userId,
          type: "APPROVAL_REQUEST",
          title: "결재 요청이 도착했습니다.",
          body: approval.title,
          link: `/approvals/${approval.id}`,
        })),
      });
    }

    return NextResponse.json({ approval }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("BAD_REQUEST:")) {
      return NextResponse.json(
        { error: error.message.replace("BAD_REQUEST:", "").trim() },
        { status: 400 }
      );
    }

    console.error("[APPROVAL CREATE]", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

async function createLeaveApproval(params: {
  sessionUserId: string;
  leaveType: string;
  leaveStart: Date | null;
  leaveEnd: Date | null;
  title: string;
  description: string;
  autoApprove: boolean;
}) {
  const {
    sessionUserId,
    leaveType,
    leaveStart,
    leaveEnd,
    title,
    description,
    autoApprove,
  } =
    params;

  if (!leaveTypes.has(leaveType as LeaveType)) {
    throw new Error("BAD_REQUEST: 휴가 종류를 선택해주세요.");
  }

  if (!leaveStart || !leaveEnd) {
    throw new Error("BAD_REQUEST: 휴가 기간을 입력해주세요.");
  }

  if (leaveEnd < leaveStart) {
    throw new Error("BAD_REQUEST: 종료일은 시작일보다 빠를 수 없습니다.");
  }

  return prisma.approval.create({
    data: {
      type: "LEAVE_REQUEST",
      title: title || buildLeaveTitle(leaveType as LeaveType, leaveStart, leaveEnd),
      description: description || null,
      requesterId: sessionUserId,
      leaveType: leaveType as LeaveType,
      leaveStart,
      leaveEnd,
      status: autoApprove ? "APPROVED" : "PENDING",
      decidedAt: autoApprove ? new Date() : null,
    },
    include: {
      requester: { select: { id: true, name: true, image: true } },
      decider: { select: { id: true, name: true } },
    },
  });
}

async function createWorkApproval(params: {
  sessionUserId: string;
  type: string;
  title: string;
  description: string;
  taskId: string;
  eventId: string;
}) {
  const { sessionUserId, type, title, description, taskId, eventId } = params;

  if (!approvalTypes.has(type as ApprovalType)) {
    throw new Error("BAD_REQUEST: 유효하지 않은 결재 유형입니다.");
  }

  if (!title) {
    throw new Error("BAD_REQUEST: 제목을 입력해주세요.");
  }

  return prisma.approval.create({
    data: {
      type: type as ApprovalType,
      title,
      description: description || null,
      requesterId: sessionUserId,
      taskId: taskId || null,
      eventId: eventId || null,
    },
    include: {
      requester: { select: { id: true, name: true, image: true } },
      decider: { select: { id: true, name: true } },
      task: { select: { id: true, title: true } },
      event: { select: { id: true, title: true } },
    },
  });
}
