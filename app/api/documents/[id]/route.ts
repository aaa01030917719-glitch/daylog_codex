import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { resolveDocumentStatus, type DocumentSummary } from "@/lib/documents";
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
  forcedStatus?: DocumentSummary["status"];
}): DocumentSummary {
  const { approval, approverName, currentUserId, forcedStatus } = params;
  const status = forcedStatus ?? resolveDocumentStatus(approval.status, approval.status);

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

export async function PATCH(
  req: NextRequest,
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
  if (!workspaceId) {
    return NextResponse.json(
      { error: "워크스페이스를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const body = await req.json();
  if (body.status !== "CANCELLED") {
    return NextResponse.json(
      { error: "지원하지 않는 상태 변경입니다." },
      { status: 400 }
    );
  }

  const existingApproval = await prisma.approval.findFirst({
    where: {
      id: params.id,
      requester: { members: { some: { workspaceId } } },
    },
    include: {
      requester: {
        select: { id: true, name: true },
      },
    },
  });

  if (!existingApproval) {
    return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  }

  const status = resolveDocumentStatus(existingApproval.status, existingApproval.status);
  if (existingApproval.requesterId !== session.user.id || status !== "PENDING") {
    return NextResponse.json(
      { error: "대기 중인 본인 신청만 취소할 수 있습니다." },
      { status: 403 }
    );
  }

  const updated = await prisma.approval.update({
    where: { id: existingApproval.id },
    data: {
      status: "REJECTED",
      decisionNote: "요청자가 신청을 취소했습니다.",
      decidedAt: new Date(),
    },
    include: {
      requester: {
        select: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({
    document: serializeApprovalDocument({
      approval: updated,
      approverName: await getApproverName(workspaceId),
      currentUserId: session.user.id,
      forcedStatus: "CANCELLED",
    }),
  });
}
