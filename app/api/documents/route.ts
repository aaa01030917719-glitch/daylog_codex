import { ApprovalType, LeaveType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  buildDocumentTitle,
  isDocumentType,
  isHalfDayPeriod,
  resolveDocumentStatus,
  type DocumentSummary,
} from "@/lib/documents";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

type ApprovalDocumentRow = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  decisionNote: string | null;
  createdAt: Date;
  requesterId: string;
  leaveType: string | null;
  leaveStart: Date | null;
  leaveEnd: Date | null;
  requester: {
    id: string;
    name: string | null;
  };
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function mapApprovalTypeToDocumentType(
  approvalType: string,
  leaveType: string | null
): DocumentSummary["type"] {
  if (approvalType === "LEAVE_REQUEST") {
    if (leaveType === "HALF_AM") {
      return "AM_HALF_DAY";
    }

    if (leaveType === "HALF_PM") {
      return "PM_HALF_DAY";
    }

    return "LEAVE";
  }

  if (approvalType === "BUDGET_TASK") {
    return "APPROVAL";
  }

  return "OTHER";
}

function serializeApprovalDocument(params: {
  approval: ApprovalDocumentRow;
  approverName: string;
  currentUserId: string;
}): DocumentSummary {
  const { approval, approverName, currentUserId } = params;
  const status = resolveDocumentStatus(approval.status, approval.status);

  return {
    id: approval.id,
    title: approval.title,
    type: mapApprovalTypeToDocumentType(approval.type, approval.leaveType),
    status,
    halfDayPeriod:
      approval.leaveType === "HALF_AM"
        ? "AM"
        : approval.leaveType === "HALF_PM"
          ? "PM"
          : null,
    reason: approval.description ?? "",
    amount: null,
    costType: null,
    attachmentName: null,
    startDate: approval.leaveStart?.toISOString() ?? null,
    endDate: approval.leaveEnd?.toISOString() ?? null,
    createdAt: approval.createdAt.toISOString(),
    authorId: approval.requesterId,
    authorName: approval.requester.name ?? "이름 없음",
    approverName,
    ccUserId: null,
    ccUserName: null,
    approvalId: approval.id,
    rejectionReason: approval.decisionNote,
    canCancel: approval.requesterId === currentUserId && status === "PENDING",
    isMine: approval.requesterId === currentUserId,
  };
}

async function getApproverName(workspaceId: string) {
  const approver = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      role: { in: ["OWNER", "ADMIN"] },
    },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    select: {
      user: {
        select: { name: true },
      },
    },
  });

  return approver?.user.name ?? "대표";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );

  if (!workspaceId) {
    return NextResponse.json({ documents: [] });
  }

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";
  const approverName = await getApproverName(workspaceId);
  const approvals = await prisma.approval.findMany({
    where: isAdmin
      ? { requester: { members: { some: { workspaceId } } } }
      : {
          requesterId: session.user.id,
          requester: { members: { some: { workspaceId } } },
        },
    include: {
      requester: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    documents: approvals.map((approval) =>
      serializeApprovalDocument({
        approval,
        approverName,
        currentUserId: session.user.id,
      })
    ),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  if (!workspaceId) {
    return NextResponse.json(
      { error: "워크스페이스를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const type = body.type;
    const halfDayPeriod = body.halfDayPeriod;
    const customTitle = normalizeText(body.title);
    const startDate = parseDate(body.startDate);
    const endDate = parseDate(body.endDate);
    const reason = normalizeText(body.reason);
    const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
    const costType = normalizeText(body.costType);

    if (!isDocumentType(type)) {
      return NextResponse.json({ error: "신청 종류를 확인해주세요." }, { status: 400 });
    }

    if (!startDate) {
      return NextResponse.json({ error: "신청일을 입력해주세요." }, { status: 400 });
    }

    if (type === "LEAVE" && (!endDate || endDate < startDate)) {
      return NextResponse.json(
        { error: "연차 종료일을 올바르게 입력해주세요." },
        { status: 400 }
      );
    }

    if (type === "HALF_DAY" && !isHalfDayPeriod(halfDayPeriod)) {
      return NextResponse.json({ error: "반차 구분을 선택해주세요." }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: "사유를 입력해주세요." }, { status: 400 });
    }

    if (type === "APPROVAL" && (!Number.isFinite(amount) || amount <= 0)) {
      return NextResponse.json({ error: "결재 금액을 입력해주세요." }, { status: 400 });
    }

    const title = customTitle || buildDocumentTitle({
      type,
      startDate,
      endDate:
        type === "HALF_DAY" ||
        type === "AM_HALF_DAY" ||
        type === "PM_HALF_DAY" ||
        type === "OUT_OF_OFFICE" ||
        type === "EARLY_LEAVE"
          ? startDate
          : endDate,
      halfDayPeriod: isHalfDayPeriod(halfDayPeriod) ? halfDayPeriod : null,
      amount: Number.isFinite(amount) ? amount : null,
    });

    const approvalType: ApprovalType =
      type === "APPROVAL"
        ? "BUDGET_TASK"
        : type === "OTHER"
          ? "PROJECT_REVIEW"
          : "LEAVE_REQUEST";

    const leaveType =
      type === "LEAVE"
        ? "FULL_DAY"
        : type === "HALF_DAY"
          ? halfDayPeriod === "PM"
            ? "HALF_PM"
            : "HALF_AM"
          : type === "AM_HALF_DAY"
            ? "HALF_AM"
            : type === "PM_HALF_DAY"
              ? "HALF_PM"
              : null;

    const autoApprove = session.user.role === "OWNER" && approvalType === "LEAVE_REQUEST";
    const approval = await prisma.approval.create({
      data: {
        type: approvalType,
        title,
        description:
          type === "APPROVAL" && Number.isFinite(amount)
            ? `${reason}\n\n금액: ${amount.toLocaleString("ko-KR")}\n구분: ${costType || "-"}`
            : reason,
        requesterId: session.user.id,
        leaveType: leaveType as LeaveType | null,
        leaveStart: approvalType === "LEAVE_REQUEST" ? startDate : null,
        leaveEnd:
          approvalType === "LEAVE_REQUEST"
            ? type === "HALF_DAY" ||
              type === "AM_HALF_DAY" ||
              type === "PM_HALF_DAY" ||
              type === "OUT_OF_OFFICE" ||
              type === "EARLY_LEAVE"
              ? startDate
              : endDate
            : null,
        status: autoApprove ? "APPROVED" : "PENDING",
        decidedAt: autoApprove ? new Date() : null,
      },
      include: {
        requester: {
          select: { id: true, name: true },
        },
      },
    });

    if (!autoApprove) {
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
            type: "APPROVAL_REQUEST",
            title: "새 결재 요청이 도착했어요.",
            body: title,
            link: `/approvals/${approval.id}`,
          })),
        });
      }
    }

    return NextResponse.json(
      {
        document: serializeApprovalDocument({
          approval,
          approverName: await getApproverName(workspaceId),
          currentUserId: session.user.id,
        }),
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[DOCUMENT_CREATE_PRISMA]", error);
    } else {
      console.error("[DOCUMENT_CREATE]", error);
    }

    return NextResponse.json(
      { error: "신청서를 저장하지 못했습니다." },
      { status: 500 }
    );
  }
}
