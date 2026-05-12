import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DocPage } from "@/components/docs/DocPage";
import {
  calculateLeaveDays,
  formatLeaveSummaryDays,
  resolveDocumentStatus,
  type DocumentMemberOption,
  type DocumentStats,
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

function mapApprovalToDocumentSummary(params: {
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

function toDate(value: string | null) {
  return value ? new Date(value) : null;
}

export default async function DocsPage({
  searchParams,
}: {
  searchParams?: { approvalId?: string | string[] };
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  const currentUserId = session.user.id;
  const isOwner = session.user.role === "OWNER";
  const approvalIdParam = Array.isArray(searchParams?.approvalId)
    ? searchParams.approvalId[0]
    : searchParams?.approvalId;

  let initialDocuments: DocumentSummary[] = [];
  let members: DocumentMemberOption[] = [];
  let stats: DocumentStats = {
    annualLeave: 12,
    usedDays: 0,
    remainingDays: 12,
    pendingCount: 0,
    submittedThisMonth: 0,
    approvedThisMonth: 0,
    rejectedThisMonth: 0,
    upcomingDays: 0,
  };
  let approverName = "대표";

  if (workspaceId) {
    const [approvalRows, memberRows] = await Promise.all([
      prisma.approval.findMany({
        where: {
          ...(isOwner ? {} : { requesterId: currentUserId }),
          requester: { members: { some: { workspaceId } } },
        },
        include: {
          requester: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.workspaceMember.findMany({
        where: { workspaceId },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        select: {
          role: true,
          user: {
            select: { id: true, name: true },
          },
        },
      }),
    ]);

    members = memberRows
      .filter((member) => member.user.id !== currentUserId)
      .map((member) => ({
        id: member.user.id,
        name: member.user.name ?? "이름 없음",
        role: member.role,
      }));

    approverName =
      memberRows.find((member) => member.role === "OWNER" || member.role === "ADMIN")?.user
        .name ?? "대표";

    initialDocuments = approvalRows.map((approval) =>
      mapApprovalToDocumentSummary({
        approval,
        approverName,
        currentUserId,
      })
    );

    const currentYear = new Date().getFullYear();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);
    const myDocuments = initialDocuments.filter((document) => document.authorId === currentUserId);
    const scopedDocuments = isOwner ? initialDocuments : myDocuments;

    const approvedLeaveDays = myDocuments.reduce((total, document) => {
      const startDate = toDate(document.startDate);
      const endDate = toDate(document.endDate);
      const isApproved = document.status === "APPROVED";
      const sameYear = startDate?.getFullYear() === currentYear;

      if (!isApproved || !sameYear) {
        return total;
      }

      return total + calculateLeaveDays(document.type, startDate, endDate);
    }, 0);

    const upcomingDays = myDocuments.reduce((total, document) => {
      const startDate = toDate(document.startDate);
      const endDate = toDate(document.endDate);
      const isUpcoming =
        (document.status === "PENDING" || document.status === "APPROVED") &&
        !!startDate &&
        startDate >= new Date();

      if (!isUpcoming) {
        return total;
      }

      return total + calculateLeaveDays(document.type, startDate, endDate);
    }, 0);

    const monthDocuments = scopedDocuments.filter((document) => {
      const createdAt = new Date(document.createdAt);
      return createdAt >= monthStart && createdAt < monthEnd;
    });

    const annualLeave = 12;
    stats = {
      annualLeave,
      usedDays: Number(formatLeaveSummaryDays(approvedLeaveDays)),
      remainingDays: Math.max(annualLeave - approvedLeaveDays, 0),
      pendingCount: scopedDocuments.filter((document) => document.status === "PENDING").length,
      submittedThisMonth: monthDocuments.length,
      approvedThisMonth: monthDocuments.filter((document) => document.status === "APPROVED")
        .length,
      rejectedThisMonth: monthDocuments.filter((document) => document.status === "REJECTED")
        .length,
      upcomingDays: Number(formatLeaveSummaryDays(upcomingDays)),
    };
  }

  return (
    <DocPage
      initialDocuments={initialDocuments}
      initialSelectedDocumentId={
        approvalIdParam
          ? initialDocuments.find((document) => document.approvalId === approvalIdParam)?.id ?? null
          : null
      }
      stats={stats}
      members={members}
      approverName={approverName}
    />
  );
}
