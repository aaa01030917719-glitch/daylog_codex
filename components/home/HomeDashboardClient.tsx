"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FolderKanban,
  Megaphone,
  UserCheck,
} from "lucide-react";
import { DocDetailModal } from "@/components/docs/DocDetailModal";
import { TaskDetailModal } from "@/components/modals/TaskDetailModal";
import type { DocumentStatusValue, DocumentSummary, DocumentTypeValue, HalfDayPeriodValue } from "@/lib/documents";

export type HomeRole = "OWNER" | "ADMIN" | "MEMBER" | string;

export interface HomeApprovalItem {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: DocumentStatusValue;
  requesterId: string;
  requesterName: string;
  leaveType: string | null;
  leaveStart: string | null;
  leaveEnd: string | null;
  decisionNote: string | null;
  createdAtIso: string;
  createdAtLabel: string;
  href: string;
}

export interface HomeTaskItem {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  projectColor: string;
  assigneeName: string;
  dueDateLabel: string;
  progress: number;
  status: string;
  statusLabel: string;
  isReviewRequested?: boolean;
}

export interface HomeScheduleItem {
  id: string;
  title: string;
  scheduleLabel: string;
  dateDay: string;
  dateWeekday: string;
  groupLabel: string;
  color: string;
  isToday: boolean;
  href: string;
}

export interface HomeAttendanceItem {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  checkInLabel: string;
  tone: { background: string; color: string };
}

export interface HomeNoticeItem {
  id: string;
  title: string;
  badgeLabel: string;
  createdAtLabel: string;
  authorName: string;
  href: string;
}

export interface HomeRequestItem {
  id: string;
  typeLabel: string;
  title: string;
  status: string;
  statusLabel: string;
  createdAtLabel: string;
  href: string;
}

export interface HomeDashboardData {
  userName: string;
  currentUserId: string;
  userRole?: HomeRole | null;
  isAdmin: boolean;
  dateLabel: string;
  approvals: HomeApprovalItem[];
  reviewTasks: HomeTaskItem[];
  tasks: HomeTaskItem[];
  schedules: HomeScheduleItem[];
  attendanceSummary: {
    checkedIn: number;
    late: number;
    absent: number;
    leave: number;
    total: number;
  };
  attendanceRows: HomeAttendanceItem[];
  notices: HomeNoticeItem[];
  requests: HomeRequestItem[];
}

type ReviewTab = "LEAVE_REQUEST" | "APPROVAL" | "PROJECT_REVIEW" | "IMPORTANT_EVENT";

const REVIEW_TABS: Array<{ key: ReviewTab; label: string; description: string }> = [
  { key: "LEAVE_REQUEST", label: "연차·반차", description: "휴가 승인 대기" },
  { key: "APPROVAL", label: "결재 요청", description: "일반 결재 대기" },
  { key: "PROJECT_REVIEW", label: "업무 검토", description: "확인/수정 요청" },
  { key: "IMPORTANT_EVENT", label: "일정 승인", description: "중요 일정 승인" },
];

const APPROVAL_TYPES = new Set(["DEADLINE_CHANGE", "BUDGET_TASK"]);

const statusTone: Record<string, string> = {
  PENDING: "status-badge--warning",
  APPROVED: "status-badge--success",
  REJECTED: "status-badge--danger",
  IN_PROGRESS: "status-badge--accent",
  IN_REVIEW: "status-badge--warning",
  TODO: "status-badge--neutral",
  DONE: "status-badge--success",
};

function Panel({
  title,
  icon,
  href,
  actionLabel = "보기",
  children,
}: {
  title: string;
  icon: React.ReactNode;
  href?: string;
  actionLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-light)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--accent)]">
            {icon}
          </span>
          <h2 className="truncate text-sm font-bold text-[var(--text-primary)]">{title}</h2>
        </div>
        {href ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--text-muted)] transition hover:text-[var(--accent)]"
          >
            {actionLabel}
            <ArrowRight size={14} />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[104px] flex-col items-center justify-center gap-1.5 px-4 py-5 text-center">
      <AlertCircle size={20} className="text-[var(--text-muted)]" />
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="text-xs leading-5 text-[var(--text-muted)]">{description}</p>
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color || "var(--accent)" }}
      />
    </div>
  );
}

function mapApprovalToDocumentType(approval: HomeApprovalItem): {
  type: DocumentTypeValue;
  halfDayPeriod: HalfDayPeriodValue | null;
} {
  if (approval.type === "LEAVE_REQUEST") {
    if (approval.leaveType === "HALF_AM") {
      return { type: "AM_HALF_DAY", halfDayPeriod: "AM" };
    }

    if (approval.leaveType === "HALF_PM") {
      return { type: "PM_HALF_DAY", halfDayPeriod: "PM" };
    }

    return { type: "LEAVE", halfDayPeriod: null };
  }

  if (approval.type === "DEADLINE_CHANGE" || approval.type === "BUDGET_TASK") {
    return { type: "APPROVAL", halfDayPeriod: null };
  }

  return { type: "OTHER", halfDayPeriod: null };
}

function mapApprovalToDocumentSummary(approval: HomeApprovalItem, currentUserId: string): DocumentSummary {
  const mappedType = mapApprovalToDocumentType(approval);
  const requestedAt = approval.createdAtIso;
  const startDate = approval.leaveStart ?? requestedAt;
  const endDate = approval.leaveEnd ?? approval.leaveStart ?? requestedAt;

  return {
    id: approval.id,
    title: approval.title,
    type: mappedType.type,
    status: approval.status,
    halfDayPeriod: mappedType.halfDayPeriod,
    reason: approval.description ?? "",
    amount: null,
    costType: null,
    attachmentName: null,
    startDate,
    endDate,
    createdAt: requestedAt,
    authorId: approval.requesterId,
    authorName: approval.requesterName,
    approverName: "관리자",
    ccUserId: null,
    ccUserName: null,
    approvalId: approval.id,
    rejectionReason: approval.decisionNote,
    canCancel: false,
    isMine: approval.requesterId === currentUserId,
  };
}

function TaskRows({
  tasks,
  emptyTitle,
  limitRows = false,
}: {
  tasks: HomeTaskItem[];
  emptyTitle: string;
  limitRows?: boolean;
}) {
  const [selectedTask, setSelectedTask] = useState<HomeTaskItem | null>(null);
  const listClassName = limitRows
    ? "min-h-0 max-h-[183px] flex-1 divide-y divide-[var(--border-light)] overflow-y-auto"
    : "min-h-0 flex-1 divide-y divide-[var(--border-light)] overflow-y-auto";

  return (
    <div className={listClassName}>
      {tasks.length === 0 ? (
        <EmptyState title={emptyTitle} description="표시할 업무가 생기면 이곳에 compact하게 정리됩니다." />
      ) : (
        tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => setSelectedTask(task)}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[var(--surface-2)] max-sm:flex-col max-sm:items-stretch"
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
              style={{ background: `${task.projectColor}22`, color: task.projectColor }}
            >
              {(task.assigneeName || task.projectName || "U").slice(0, 1)}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{task.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)]">
                <span className="truncate">{task.projectName}</span>
                <span>{task.dueDateLabel}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <ProgressBar value={task.progress} color={task.projectColor} />
                <span className="w-8 text-right text-[10px] font-semibold text-[var(--text-muted)]">
                  {task.progress}%
                </span>
              </div>
            </div>
            <span className={`status-badge ml-auto shrink-0 ${statusTone[task.status] ?? "status-badge--neutral"}`}>
              {task.statusLabel}
            </span>
          </button>
        ))
      )}
      {selectedTask ? (
        <TaskDetailModal
          isOpen={true}
          onClose={() => setSelectedTask(null)}
          taskId={selectedTask.id}
          projectName={selectedTask.projectName}
        />
      ) : null}
    </div>
  );
}

function ScheduleRows({ schedules }: { schedules: HomeScheduleItem[] }) {
  return (
    <div className="min-h-0 max-h-[183px] flex-1 divide-y divide-[var(--border-light)] overflow-y-auto">
      {schedules.length === 0 ? (
        <EmptyState title="이번 주 일정이 없습니다" description="개인, 전사, 팀공용 일정이 등록되면 이곳에 표시됩니다." />
      ) : (
        schedules.map((schedule) => (
          <Link
            key={schedule.id}
            href={schedule.href}
            className={`flex items-start gap-3 px-4 py-2.5 transition hover:bg-[var(--surface-2)] ${
              schedule.isToday ? "bg-[var(--accent-light)]" : ""
            }`}
          >
            <div className="w-8 shrink-0 text-center">
              <div className={`text-base font-bold leading-none ${schedule.isToday ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                {schedule.dateDay}
              </div>
              <div className={`mt-0.5 text-[10px] ${schedule.isToday ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
                {schedule.isToday ? "오늘" : schedule.dateWeekday}
              </div>
            </div>
            <span className="w-px self-stretch bg-[var(--border)]" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{schedule.title}</div>
              <div className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                {schedule.scheduleLabel} · {schedule.groupLabel}
              </div>
            </div>
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: schedule.color }} />
          </Link>
        ))
      )}
    </div>
  );
}

function AttendancePanel({ data }: { data: HomeDashboardData }) {
  const stats = [
    { label: "출근", value: data.attendanceSummary.checkedIn, className: "status-badge--success" },
    { label: "지각", value: data.attendanceSummary.late, className: "status-badge--warning" },
    { label: "미출근", value: data.attendanceSummary.absent, className: "status-badge--neutral" },
    { label: "연차", value: data.attendanceSummary.leave, className: "status-badge--accent" },
  ];

  return (
    <Panel title="오늘 출근 현황" icon={<UserCheck size={17} />} href="/attendance">
      <div className="grid shrink-0 grid-cols-4 divide-x divide-[var(--border)] border-b border-[var(--border)]">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 py-2.5 text-center">
            <div className="text-lg font-bold leading-none text-[var(--text-primary)]">{stat.value}</div>
            <div className="mt-1 text-[10px] text-[var(--text-muted)]">{stat.label}</div>
          </div>
        ))}
      </div>
      <div className="min-h-0 flex-1 divide-y divide-[var(--border-light)] overflow-y-auto">
        {data.attendanceRows.length === 0 ? (
          <EmptyState title="출근 기록이 없습니다" description="오늘 기록이 생기면 멤버별 상태를 바로 볼 수 있습니다." />
        ) : (
          data.attendanceRows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: row.tone.background, color: row.tone.color }}
              >
                {row.name.slice(0, 1)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{row.name}</p>
                <p className="text-[11px] text-[var(--text-muted)]">{row.checkInLabel}</p>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: row.tone.background, color: row.tone.color }}
              >
                {row.statusLabel}
              </span>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}

function ReviewPanel({ data }: { data: HomeDashboardData }) {
  const [activeTab, setActiveTab] = useState<ReviewTab>("LEAVE_REQUEST");
  const [approvals, setApprovals] = useState(data.approvals);
  const [reviewTasks, setReviewTasks] = useState(data.reviewTasks);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedReviewTask, setSelectedReviewTask] = useState<HomeTaskItem | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<HomeApprovalItem | null>(null);
  const [detailSubmitting, setDetailSubmitting] = useState(false);

  const counts = useMemo(
    () => ({
      LEAVE_REQUEST: approvals.filter((item) => item.type === "LEAVE_REQUEST").length,
      APPROVAL: approvals.filter((item) => APPROVAL_TYPES.has(item.type)).length,
      PROJECT_REVIEW: reviewTasks.length + approvals.filter((item) => item.type === "PROJECT_REVIEW").length,
      IMPORTANT_EVENT: approvals.filter((item) => item.type === "IMPORTANT_EVENT").length,
    }),
    [approvals, reviewTasks]
  );

  const visibleApprovals = approvals.filter((item) => {
    if (activeTab === "APPROVAL") return APPROVAL_TYPES.has(item.type);
    if (activeTab === "PROJECT_REVIEW") return item.type === "PROJECT_REVIEW";
    return item.type === activeTab;
  });

  function openApprovalDetail(approval: HomeApprovalItem) {
    setSelectedApproval(approval);
  }

  async function submitApprovalDecision(id: string, status: "APPROVED" | "REJECTED") {
    const response = await fetch(`/api/approvals/${id}/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error("approval decision failed");
    }
  }

  async function decideApproval(
    event: React.MouseEvent<HTMLButtonElement> | null,
    id: string,
    status: "APPROVED" | "REJECTED"
  ) {
    event?.stopPropagation();
    const action = status === "APPROVED" ? "approve" : "reject";
    const actionKey = `approval:${id}:${action}`;
    setPendingActionKey(actionKey);
    setErrorMessage("");

    try {
      await submitApprovalDecision(id, status);
      setApprovals((current) => current.filter((item) => item.id !== id));
      setSelectedApproval((current) => (current?.id === id ? null : current));
    } catch {
      setErrorMessage("처리에 실패했습니다. 상세 화면에서 다시 시도해 주세요.");
    } finally {
      setPendingActionKey(null);
    }
  }

  async function decideSelectedApproval(document: DocumentSummary, status: "APPROVED" | "REJECTED") {
    if (!document.approvalId) {
      return;
    }

    setDetailSubmitting(true);
    setErrorMessage("");

    try {
      await submitApprovalDecision(document.approvalId, status);
      setApprovals((current) => current.filter((item) => item.id !== document.approvalId));
      setSelectedApproval(null);
    } catch {
      setErrorMessage("처리에 실패했습니다. 상세 화면에서 다시 시도해 주세요.");
    } finally {
      setDetailSubmitting(false);
    }
  }

  async function decideTask(event: React.MouseEvent<HTMLButtonElement>, id: string, decision: "APPROVE" | "REJECT") {
    event.stopPropagation();
    const action = decision === "APPROVE" ? "confirm" : "requestChanges";
    const actionKey = `task:${id}:${action}`;
    setPendingActionKey(actionKey);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/tasks/${id}/approval-decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });

      if (!response.ok) {
        setErrorMessage("업무 검토 처리에 실패했습니다. 프로젝트 상세에서 다시 시도해 주세요.");
        return;
      }

      setReviewTasks((current) => current.filter((item) => item.id !== id));
    } finally {
      setPendingActionKey(null);
    }
  }

  function isActionPending(type: "approval" | "task", id: string, action: string) {
    return pendingActionKey === `${type}:${id}:${action}`;
  }

  function isRowPending(type: "approval" | "task", id: string) {
    return pendingActionKey?.startsWith(`${type}:${id}:`) ?? false;
  }

  return (
    <Panel title="검토 대기" icon={<ClipboardCheck size={17} />}>
      <div className="grid min-h-[244px] flex-1 grid-cols-[138px_minmax(0,1fr)] max-md:grid-cols-1">
        <nav className="border-r border-[var(--border-light)] bg-[#fafafa] py-2 max-md:border-b max-md:border-r-0 max-md:px-2">
          <div className="flex flex-col max-md:flex-row max-md:overflow-x-auto">
            {REVIEW_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`border-l-2 px-3 py-2 text-left transition max-md:min-w-[132px] max-md:border-l-0 max-md:border-b-2 ${
                  activeTab === tab.key
                    ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                    : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold">{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-px text-[10px] font-bold ${
                      counts[tab.key] > 0 ? "bg-[var(--danger)] text-white" : "bg-[var(--border)] text-[var(--text-muted)]"
                    }`}
                  >
                    {counts[tab.key]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </nav>
        <div className="min-w-0">
          {errorMessage ? (
            <div className="mx-4 mt-3 rounded-lg border border-[rgba(239,68,68,0.2)] bg-[var(--danger-light)] px-3 py-2 text-xs font-semibold text-[var(--danger)]">
              {errorMessage}
            </div>
          ) : null}
          <div className="max-h-[183px] divide-y divide-[var(--border-light)] overflow-y-auto">
            {activeTab === "PROJECT_REVIEW"
              ? reviewTasks.map((task) => (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[var(--surface-2)] max-sm:flex-col max-sm:items-stretch"
                    onClick={() => setSelectedReviewTask(task)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedReviewTask(task);
                      }
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{task.title}</div>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {task.projectName} · {task.assigneeName} · {task.dueDateLabel}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-[#15803d] transition hover:bg-[var(--success-light)] disabled:cursor-not-allowed"
                        disabled={isRowPending("task", task.id)}
                        onClick={(event) => decideTask(event, task.id, "APPROVE")}
                      >
                        {isActionPending("task", task.id, "confirm") ? "처리 중" : "확인완료"}
                      </button>
                      <button
                        type="button"
                        className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-light)] disabled:cursor-not-allowed"
                        disabled={isRowPending("task", task.id)}
                        onClick={(event) => decideTask(event, task.id, "REJECT")}
                      >
                        {isActionPending("task", task.id, "requestChanges") ? "처리 중" : "수정요청"}
                      </button>
                    </div>
                  </div>
                ))
              : null}

            {visibleApprovals.map((approval) => (
              <div
                key={approval.id}
                role="button"
                tabIndex={0}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[var(--surface-2)] max-sm:flex-col max-sm:items-stretch"
                onClick={() => openApprovalDetail(approval)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openApprovalDetail(approval);
                  }
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-[var(--text-primary)]">{approval.title}</div>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {approval.requesterName} · {approval.createdAtLabel}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
                  <button
                    type="button"
                    className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-[#15803d] transition hover:bg-[var(--success-light)] disabled:cursor-not-allowed"
                    disabled={isRowPending("approval", approval.id)}
                    onClick={(event) => void decideApproval(event, approval.id, "APPROVED")}
                  >
                    {isActionPending("approval", approval.id, "approve") ? "처리 중" : "승인"}
                  </button>
                  <button
                    type="button"
                    className="rounded-md px-1.5 py-1 text-[11px] font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-light)] disabled:cursor-not-allowed"
                    disabled={isRowPending("approval", approval.id)}
                    onClick={(event) => void decideApproval(event, approval.id, "REJECTED")}
                  >
                    {isActionPending("approval", approval.id, "reject") ? "처리 중" : "반려"}
                  </button>
                </div>
              </div>
            ))}

            {counts[activeTab] === 0 ? (
              <EmptyState title="검토 대기 항목이 없습니다" description="새 요청이 도착하면 이 패널에서 바로 처리할 수 있습니다." />
            ) : null}
          </div>
        </div>
      </div>
      {selectedReviewTask ? (
        <TaskDetailModal
          isOpen={true}
          onClose={() => setSelectedReviewTask(null)}
          taskId={selectedReviewTask.id}
          projectName={selectedReviewTask.projectName}
        />
      ) : null}
      {selectedApproval ? (
        <DocDetailModal
          open={true}
          document={mapApprovalToDocumentSummary(selectedApproval, data.currentUserId)}
          submitting={detailSubmitting}
          canDecide={true}
          onClose={() => setSelectedApproval(null)}
          onCancel={() => undefined}
          onApprove={(document) => decideSelectedApproval(document, "APPROVED")}
          onReject={(document) => decideSelectedApproval(document, "REJECTED")}
        />
      ) : null}
    </Panel>
  );
}

function RequestPanel({ requests }: { requests: HomeRequestItem[] }) {
  return (
    <Panel title="내 연차·결재 현황" icon={<FileText size={17} />} href="/docs">
      <div className="min-h-0 max-h-[183px] flex-1 divide-y divide-[var(--border-light)] overflow-y-auto">
        {requests.length === 0 ? (
          <EmptyState title="최근 요청이 없습니다" description="연차나 결재 요청을 올리면 진행 상태가 표시됩니다." />
        ) : (
          requests.map((request) => (
            <Link key={request.id} href={request.href} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)]">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{request.title}</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {request.typeLabel} · {request.createdAtLabel}
                </p>
              </div>
              <span className={`status-badge ${statusTone[request.status] ?? "status-badge--neutral"}`}>
                {request.statusLabel}
              </span>
            </Link>
          ))
        )}
      </div>
    </Panel>
  );
}

function NoticePanel({ notices }: { notices: HomeNoticeItem[] }) {
  return (
    <Panel title="팀 공지" icon={<Megaphone size={17} />} href="/notices">
      <div className="min-h-0 max-h-[183px] flex-1 divide-y divide-[var(--border-light)] overflow-y-auto">
        {notices.length === 0 ? (
          <EmptyState title="등록된 공지가 없습니다" description="팀 공지가 올라오면 최신순으로 보여드립니다." />
        ) : (
          notices.map((notice) => (
            <Link key={notice.id} href={notice.href} className="block px-4 py-3 hover:bg-[var(--surface-2)]">
              <div className="flex items-center gap-2">
                <span className="status-badge status-badge--accent">{notice.badgeLabel}</span>
                <p className="min-w-0 truncate text-sm font-semibold text-[var(--text-primary)]">{notice.title}</p>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                {notice.authorName} · {notice.createdAtLabel}
              </p>
            </Link>
          ))
        )}
      </div>
    </Panel>
  );
}

export function HomeDashboardClient({ data }: { data: HomeDashboardData }) {
  const isOwnerView = data.isAdmin;

  return (
    <div className="page-shell">
      <section className="page-header !rounded-xl !px-5 !py-4">
        <div className="page-header__meta">
          <p className="page-header__eyebrow">{isOwnerView ? "OWNER DASHBOARD" : "MY DASHBOARD"}</p>
          <h1 className="page-title">{data.userName}님, 오늘 확인할 일을 정리했어요</h1>
          <p className="page-subtitle">{data.dateLabel}</p>
        </div>
      </section>

      {isOwnerView ? (
        <section className="flex min-h-0 flex-col gap-4">
          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_330px] gap-4 max-xl:grid-cols-1">
            <ReviewPanel data={data} />
            <Panel title="이번 주 일정" icon={<CalendarDays size={17} />} href="/calendar">
              <ScheduleRows schedules={data.schedules} />
            </Panel>
          </div>
          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_330px] gap-4 max-xl:grid-cols-1">
            <Panel title="팀 업무 현황" icon={<FolderKanban size={17} />} href="/projects">
              <TaskRows tasks={data.tasks} emptyTitle="진행 중인 팀 업무가 없습니다" />
            </Panel>
            <AttendancePanel data={data} />
          </div>
        </section>
      ) : (
        <section className="flex min-h-0 flex-col gap-4">
          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_330px] gap-4 max-xl:grid-cols-1">
            <Panel title="내 진행 업무" icon={<FolderKanban size={17} />} href="/projects">
              <TaskRows tasks={data.tasks} emptyTitle="진행 중인 내 업무가 없습니다" limitRows={true} />
            </Panel>
            <Panel title="이번 주 일정" icon={<CalendarDays size={17} />} href="/calendar">
              <ScheduleRows schedules={data.schedules} />
            </Panel>
          </div>
          <div className="grid min-h-0 grid-cols-[minmax(0,1fr)_330px] gap-4 max-xl:grid-cols-1">
            <RequestPanel requests={data.requests} />
            <NoticePanel notices={data.notices} />
          </div>
        </section>
      )}
    </div>
  );
}
