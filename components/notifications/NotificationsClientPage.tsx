"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isToday, isYesterday } from "date-fns";
import { ko } from "date-fns/locale";
import type {
  ApprovalStatus,
  ApprovalType,
  LeaveType,
  NotificationType,
} from "@prisma/client";
import {
  findUserProfilePreferences,
  getUserAccentPalette,
  resolveUserDisplayName,
  useUserProfilePreferences,
} from "@/lib/user-profile-preferences";
import { FilterChipGroup } from "@/components/ui/FilterChipGroup";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge";

const NOTIFICATION_SYNC_EVENT = "daylog:notifications-sync";
const APPROVAL_NOTIFICATION_TYPES: NotificationType[] = [
  "APPROVAL_REQUEST",
  "APPROVAL_RESULT",
  "TASK_APPROVAL_REQUEST",
];

type InboxTab = "all" | "approval" | "notification";
type InboxFilter = "all" | "request" | "review" | "approved" | "rejected";
type InboxStatus = Exclude<InboxFilter, "all">;
type InboxTone = "document" | "annual" | "half" | "outing" | "notification";

interface NotificationRecord {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

interface ApprovalRecord {
  id: string;
  type: ApprovalType;
  title: string;
  description: string | null;
  status: ApprovalStatus;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  leaveType: LeaveType | null;
  leaveStart: string | null;
  leaveEnd: string | null;
  requester: {
    id: string;
    name: string | null;
    image: string | null;
  };
  decider: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  task: { id: string; title: string } | null;
  event: { id: string; title: string } | null;
}

interface MonthlyApprovalRecord {
  id: string;
  status: ApprovalStatus;
  createdAt: string;
}

interface InboxItem {
  id: string;
  notificationId: string;
  approvalId: string | null;
  requesterUserId: string | null;
  kind: "approval" | "notification";
  status: InboxStatus;
  tone: InboxTone;
  title: string;
  subtext: string;
  requesterName: string;
  requesterInitial: string;
  requesterImage: string | null;
  periodLabel: string;
  memo: string;
  createdAt: string;
  link: string | null;
  isRead: boolean;
  canDecide: boolean;
}

interface Props {
  initialNotifications: NotificationRecord[];
  initialApprovals: ApprovalRecord[];
  monthlyApprovals: MonthlyApprovalRecord[];
  currentUserId: string;
  userRole?: string | null;
}

function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "OWNER";
}

function extractApprovalId(link: string | null) {
  if (!link) {
    return null;
  }

  const match = link.match(/^\/approvals\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function formatGroupLabel(value: string) {
  const date = new Date(value);

  if (isToday(date)) {
    return "TODAY";
  }

  if (isYesterday(date)) {
    return "YESTERDAY";
  }

  return format(date, "M월 d일", { locale: ko }).toUpperCase();
}

function formatCardTime(value: string) {
  return format(new Date(value), "HH:mm", { locale: ko });
}

function formatReceiptTime(value: string) {
  return format(new Date(value), "yyyy.MM.dd HH:mm", { locale: ko });
}

function formatDateValue(value: string) {
  return format(new Date(value), "yyyy.MM.dd", { locale: ko });
}

function formatLeavePeriod(approval: ApprovalRecord) {
  if (!approval.leaveStart) {
    return "";
  }

  const startLabel = formatDateValue(approval.leaveStart);
  const endLabel = approval.leaveEnd ? formatDateValue(approval.leaveEnd) : startLabel;
  const rangeLabel = startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;

  if (approval.leaveType === "HALF_AM") {
    return `${rangeLabel} 오전`;
  }

  if (approval.leaveType === "HALF_PM") {
    return `${rangeLabel} 오후`;
  }

  return rangeLabel;
}

function resolveTone(notification: NotificationRecord, approval: ApprovalRecord | null): InboxTone {
  const text = [
    approval?.title,
    approval?.description,
    notification.title,
    notification.body,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("외근") || text.includes("조퇴")) {
    return "outing";
  }

  if (approval?.leaveType === "FULL_DAY" || text.includes("연차")) {
    return "annual";
  }

  if (
    approval?.leaveType === "HALF_AM" ||
    approval?.leaveType === "HALF_PM" ||
    text.includes("반차")
  ) {
    return "half";
  }

  if (approval || notification.type === "APPROVAL_REQUEST" || notification.type === "APPROVAL_RESULT") {
    return "document";
  }

  return "notification";
}

function resolveStatus(notification: NotificationRecord, approval: ApprovalRecord | null): InboxStatus {
  if (approval?.status === "APPROVED") {
    return "approved";
  }

  if (approval?.status === "REJECTED") {
    return "rejected";
  }

  if (notification.type === "TASK_APPROVAL_REQUEST") {
    return "review";
  }

  return "request";
}

function resolveCardTitle(
  tone: InboxTone,
  status: InboxStatus,
  fallbackTitle: string
) {
  if (tone === "annual") {
    return "연차 신청이 도착했어요";
  }

  if (tone === "half") {
    return "반차 신청이 도착했어요";
  }

  if (tone === "document") {
    return "문서 결재가 필요해요";
  }

  if (tone === "outing") {
    if (status === "approved") {
      return "외근 요청이 승인됐어요";
    }

    if (status === "rejected") {
      return "외근 요청이 반려됐어요";
    }

    return "외근 요청이 도착했어요";
  }

  return fallbackTitle || "알림이 도착했어요";
}

function resolveTypeLabel(tone: InboxTone) {
  switch (tone) {
    case "annual":
      return "연차 신청";
    case "half":
      return "반차 신청";
    case "outing":
      return "외근/조퇴";
    case "document":
      return "문서 결재";
    default:
      return "알림";
  }
}

function resolveRequesterName(notification: NotificationRecord, approval: ApprovalRecord | null) {
  if (approval?.requester.name?.trim()) {
    return approval.requester.name.trim();
  }

  if (notification.type === "MENTION") {
    return "멘션 알림";
  }

  return "시스템 알림";
}

function resolveRequesterImage(approval: ApprovalRecord | null) {
  return approval?.requester.image ?? null;
}

function resolveInitial(name: string) {
  const trimmed = name.trim();
  return trimmed ? trimmed.slice(0, 1) : "D";
}

function resolvePeriodLabel(notification: NotificationRecord, approval: ApprovalRecord | null) {
  if (approval?.leaveStart) {
    return formatLeavePeriod(approval);
  }

  if (approval?.event?.title) {
    return approval.event.title;
  }

  if (approval?.task?.title) {
    return approval.task.title;
  }

  if (approval?.title?.trim()) {
    return approval.title.trim();
  }

  if (notification.body.trim()) {
    return notification.body.trim();
  }

  return "세부 내용이 없습니다.";
}

function resolveSubtext(notification: NotificationRecord, approval: ApprovalRecord | null) {
  const periodLabel = resolvePeriodLabel(notification, approval);

  if (periodLabel && periodLabel !== approval?.title?.trim()) {
    return periodLabel;
  }

  if (notification.body.trim()) {
    return notification.body.trim();
  }

  return periodLabel;
}

function resolveMemo(notification: NotificationRecord, approval: ApprovalRecord | null) {
  const memoCandidates = [
    approval?.description?.trim(),
    approval?.decisionNote?.trim(),
    notification.body.trim(),
  ].filter((value): value is string => Boolean(value));

  return memoCandidates[0] ?? "메모가 없습니다.";
}

function getInboxStatusVariant(status: InboxStatus): StatusBadgeVariant {
  switch (status) {
    case "approved":
      return "approved";
    case "rejected":
      return "rejected";
    case "review":
      return "review";
    default:
      return "request";
  }
}

function toneIcon(tone: InboxTone) {
  switch (tone) {
    case "document":
      return { emoji: "📄", background: "bg-[var(--warning-light)]" };
    case "annual":
      return { emoji: "🌿", background: "bg-[var(--success-light)]" };
    case "half":
      return { emoji: "☀️", background: "bg-[#fef3c7]" };
    case "outing":
      return { emoji: "🚗", background: "bg-[var(--purple-light)]" };
    default:
      return { emoji: "🔔", background: "bg-[var(--accent-light)]" };
  }
}

function buildInboxItems(
  notifications: NotificationRecord[],
  approvals: ApprovalRecord[],
  userRole?: string | null
) {
  const approvalMap = new Map(approvals.map((approval) => [approval.id, approval]));
  const canDecideGlobally = isAdminRole(userRole);

  return notifications.map<InboxItem>((notification) => {
    const approvalId = extractApprovalId(notification.link);
    const approval = approvalId ? approvalMap.get(approvalId) ?? null : null;
    const isApprovalItem =
      Boolean(approvalId) || APPROVAL_NOTIFICATION_TYPES.includes(notification.type);
    const tone = resolveTone(notification, approval);
    const status = resolveStatus(notification, approval);
    const requesterName = resolveRequesterName(notification, approval);

    return {
      id: notification.id,
      notificationId: notification.id,
      approvalId,
      requesterUserId: approval?.requester.id ?? null,
      kind: isApprovalItem ? "approval" : "notification",
      status,
      tone,
      title: resolveCardTitle(tone, status, notification.title),
      subtext: resolveSubtext(notification, approval),
      requesterName,
      requesterInitial: resolveInitial(requesterName),
      requesterImage: resolveRequesterImage(approval),
      periodLabel: resolvePeriodLabel(notification, approval),
      memo: resolveMemo(notification, approval),
      createdAt: notification.createdAt,
      link: notification.link,
      isRead: notification.isRead,
      canDecide: Boolean(canDecideGlobally && approval && approval.status === "PENDING"),
    };
  });
}

function groupItemsByDate(items: InboxItem[]) {
  const groups: Array<{ key: string; label: string; items: InboxItem[] }> = [];

  for (const item of items) {
    const key = format(new Date(item.createdAt), "yyyy-MM-dd");
    const label = formatGroupLabel(item.createdAt);
    const previousGroup = groups[groups.length - 1];

    if (!previousGroup || previousGroup.key !== key) {
      groups.push({ key, label, items: [item] });
      continue;
    }

    previousGroup.items.push(item);
  }

  return groups;
}

const TAB_LABELS: Record<InboxTab, string> = {
  all: "전체",
  approval: "결재 요청",
  notification: "알림",
};

const FILTER_LABELS: Record<InboxFilter, string> = {
  all: "전체",
  request: "결재 요청",
  review: "검토중",
  approved: "승인",
  rejected: "반려",
};

const TAB_ITEMS = (Object.keys(TAB_LABELS) as InboxTab[]).map((tab) => ({
  value: tab,
  label: TAB_LABELS[tab],
}));

const FILTER_ITEMS = (Object.keys(FILTER_LABELS) as InboxFilter[]).map((filter) => ({
  value: filter,
  label: FILTER_LABELS[filter],
}));

export function NotificationsClientPage({
  initialNotifications,
  initialApprovals,
  monthlyApprovals: initialMonthlyApprovals,
  currentUserId,
  userRole,
}: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [approvals, setApprovals] = useState(initialApprovals);
  const [monthlyApprovals, setMonthlyApprovals] = useState(initialMonthlyApprovals);
  const [activeTab, setActiveTab] = useState<InboxTab>("all");
  const [activeFilter, setActiveFilter] = useState<InboxFilter>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const profileMap = useUserProfilePreferences(
    approvals.map((approval) => ({
      userId: approval.requester.id,
      name: approval.requester.name,
    }))
  );
  const items = buildInboxItems(notifications, approvals, userRole);
  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const selectedApproval =
    selectedItem?.approvalId != null
      ? approvals.find((approval) => approval.id === selectedItem.approvalId) ?? null
      : null;

  const tabItems =
    activeTab === "all"
      ? items
      : items.filter((item) => item.kind === (activeTab === "approval" ? "approval" : "notification"));

  const filteredItems =
    activeFilter === "all"
      ? tabItems
      : tabItems.filter((item) => item.status === activeFilter);

  const unreadCount = items.filter((item) => !item.isRead).length;
  const groupedItems = groupItemsByDate(filteredItems);

  const summary = {
    total: monthlyApprovals.length,
    approved: monthlyApprovals.filter((approval) => approval.status === "APPROVED").length,
    rejected: monthlyApprovals.filter((approval) => approval.status === "REJECTED").length,
    pending: monthlyApprovals.filter((approval) => approval.status === "PENDING").length,
  };

  function getRequesterProfile(item: InboxItem) {
    return (
      findUserProfilePreferences(profileMap, {
        userId: item.requesterUserId,
        name: item.requesterName,
      }) ?? null
    );
  }

  function getRequesterDisplayName(item: InboxItem) {
    return resolveUserDisplayName(item.requesterName, getRequesterProfile(item));
  }

  function getRequesterAvatarStyle(item: InboxItem) {
    const profile = getRequesterProfile(item);

    if (profile?.personalColor) {
      const palette = getUserAccentPalette(profile.personalColor);
      return {
        background: palette.solid,
        color: palette.avatarText,
      };
    }

    return {
      background: "linear-gradient(135deg, var(--accent), var(--purple))",
      color: "#FFFFFF",
    };
  }

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedItemId(null);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selectedItem]);

  function emitNotificationSync() {
    window.dispatchEvent(new Event(NOTIFICATION_SYNC_EVENT));
  }

  async function markAllRead() {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });

    if (!response.ok) {
      setActionError("알림 상태를 저장하지 못했습니다.");
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true }))
    );
    emitNotificationSync();
  }

  async function markRead(notificationId: string) {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [notificationId] }),
    });

    if (!response.ok) {
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification
      )
    );
    emitNotificationSync();
  }

  async function openDetail(item: InboxItem) {
    setActionError(null);

    if (!item.isRead) {
      await markRead(item.notificationId);
    }

    setSelectedItemId(item.id);
  }

  async function handleView(item: InboxItem) {
    setActionError(null);

    if (!item.isRead) {
      void markRead(item.notificationId);
    }

    if (item.link) {
      router.push(item.link);
      return;
    }

    setSelectedItemId(item.id);
  }

  async function handleDecision(item: InboxItem, nextStatus: "APPROVED" | "REJECTED") {
    if (!item.approvalId || !item.canDecide) {
      return;
    }

    setLoadingAction(`${item.id}:${nextStatus}`);
    setActionError(null);

    try {
      const response = await fetch(`/api/approvals/${item.approvalId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setActionError(data.error ?? "결재 상태를 저장하지 못했습니다.");
        return;
      }

      const decidedAt = new Date().toISOString();

      setApprovals((current) =>
        current.map((approval) =>
          approval.id === item.approvalId
            ? {
                ...approval,
                status: nextStatus,
                decidedAt,
                decider: approval.decider ?? {
                  id: currentUserId,
                  name: "현재 사용자",
                  image: null,
                },
              }
            : approval
        )
      );

      setMonthlyApprovals((current) =>
        current.map((approval) =>
          approval.id === item.approvalId ? { ...approval, status: nextStatus } : approval
        )
      );

      if (!item.isRead) {
        await markRead(item.notificationId);
      }
    } catch (error) {
      console.error("[NOTIFICATION_INBOX_DECISION]", error);
      setActionError("결재 상태를 저장하지 못했습니다.");
    } finally {
      setLoadingAction(null);
    }
  }

  function activateTab(tab: InboxTab) {
    setActiveTab(tab);
    setActiveFilter("all");
  }

  function activateStatusFilter(filter: Exclude<InboxFilter, "all">) {
    setActiveTab("all");
    setActiveFilter(filter);
  }

  function unreadCountForNav(kind: "all" | "approval" | "notification" | InboxStatus) {
    if (kind === "all") {
      return items.filter((item) => !item.isRead).length;
    }

    if (kind === "approval") {
      return items.filter((item) => item.kind === "approval" && !item.isRead).length;
    }

    if (kind === "notification") {
      return items.filter((item) => item.kind === "notification" && !item.isRead).length;
    }

    return items.filter((item) => item.status === kind && !item.isRead).length;
  }

  function isActiveNav(kind: "all" | "approval" | "notification" | InboxStatus) {
    if (kind === "all" || kind === "approval" || kind === "notification") {
      return activeFilter === "all" && activeTab === kind;
    }

    return activeTab === "all" && activeFilter === kind;
  }

  return (
    <>
      <div className="-mx-4 -mt-6 -mb-24 flex min-h-[calc(100dvh-65px)] flex-col bg-[var(--surface)] md:-mx-6 md:-mt-7 md:-mb-8">
        <div className="flex min-h-0 flex-1 bg-[var(--surface)]">
          <aside className="hidden w-[220px] shrink-0 border-r border-[var(--border)] bg-[var(--surface)] md:flex md:flex-col">
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <div className="px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                받은 항목
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => activateTab("all")}
                  className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] transition ${
                    isActiveNav("all")
                      ? "bg-[var(--accent-light)] font-semibold text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="text-sm">📬</span>
                  <span className="flex-1">전체</span>
                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-white">
                    {unreadCountForNav("all")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => activateTab("approval")}
                  className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] transition ${
                    isActiveNav("approval")
                      ? "bg-[var(--accent-light)] font-semibold text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="text-sm">📝</span>
                  <span className="flex-1">결재 요청</span>
                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-white">
                    {unreadCountForNav("approval")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => activateTab("notification")}
                  className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] transition ${
                    isActiveNav("notification")
                      ? "bg-[var(--accent-light)] font-semibold text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="text-sm">🔔</span>
                  <span className="flex-1">알림</span>
                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--surface-3)] px-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                    {unreadCountForNav("notification")}
                  </span>
                </button>
              </div>

              <div className="my-3 h-px bg-[var(--border-light)]" />

              <div className="px-1 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                상태별
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => activateStatusFilter("review")}
                  className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] transition ${
                    isActiveNav("review")
                      ? "bg-[var(--warning-light)] font-semibold text-[var(--warning)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="text-sm">🕓</span>
                  <span className="flex-1">검토중</span>
                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--warning)] px-1.5 text-[10px] font-bold text-white">
                    {unreadCountForNav("review")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => activateStatusFilter("approved")}
                  className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] transition ${
                    isActiveNav("approved")
                      ? "bg-[var(--success-light)] font-semibold text-[var(--success)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="text-sm">✅</span>
                  <span className="flex-1">승인</span>
                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--surface-3)] px-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                    {unreadCountForNav("approved")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => activateStatusFilter("rejected")}
                  className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 text-left text-[13px] transition ${
                    isActiveNav("rejected")
                      ? "bg-[var(--danger-light)] font-semibold text-[var(--danger)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="text-sm">⛔</span>
                  <span className="flex-1">반려</span>
                  <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-[var(--surface-3)] px-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                    {unreadCountForNav("rejected")}
                  </span>
                </button>
              </div>

              <div className="mt-4 rounded-[var(--radius)] border border-[var(--border-light)] bg-[var(--surface-2)] p-3">
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  이번 달 현황
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
                    <span>전체 결재</span>
                    <span className="font-bold text-[var(--accent)]">{summary.total}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
                    <span>승인 완료</span>
                    <span className="font-bold text-[var(--success)]">{summary.approved}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
                    <span>반려</span>
                    <span className="font-bold text-[var(--danger)]">{summary.rejected}</span>
                  </div>
                  <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
                    <span>대기 중</span>
                    <span className="font-bold text-[var(--text-muted)]">{summary.pending}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-3 md:px-5">
              <FilterChipGroup
                aria-label="알림 유형 필터"
                items={TAB_ITEMS}
                activeValue={activeTab}
                onChange={activateTab}
                size="sm"
              />
              <div className="ml-auto">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => void markAllRead()}
                    className="inline-flex h-[28px] items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[11.5px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)]"
                  >
                    모두 읽음
                  </button>
                ) : null}
              </div>
            </div>

            <div className="shrink-0 border-b border-[var(--border-light)] px-4 py-3 md:px-5">
              <FilterChipGroup
                aria-label="알림 상태 필터"
                items={FILTER_ITEMS}
                activeValue={activeFilter}
                onChange={setActiveFilter}
                size="sm"
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 md:px-5 md:pb-5">
              {actionError ? (
                <div className="mb-4 rounded-[var(--radius)] border border-[var(--danger)] bg-[var(--danger-light)] px-4 py-3 text-sm text-[var(--danger)]">
                  {actionError}
                </div>
              ) : null}

              {groupedItems.length === 0 ? (
                <div className="flex min-h-[18rem] flex-col items-center justify-center gap-2 rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-6 text-center">
                  <div className="text-3xl opacity-50">📭</div>
                  <div className="text-sm font-semibold text-[var(--text-secondary)]">
                    해당 조건의 전달 항목이 없습니다.
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">
                    탭이나 필터를 바꾸면 다른 항목을 확인할 수 있습니다.
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {groupedItems.map((group) => (
                    <section key={group.key} className="space-y-2">
                      <div className="flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        <span>{group.label}</span>
                        <span className="h-px flex-1 bg-[var(--border-light)]" />
                      </div>

                      <div className="space-y-2">
                        {group.items.map((item) => {
                          const icon = toneIcon(item.tone);
                          const actionKeyApproved = `${item.id}:APPROVED`;
                          const actionKeyRejected = `${item.id}:REJECTED`;
                          const requesterDisplayName = getRequesterDisplayName(item);
                          const requesterInitial = resolveInitial(requesterDisplayName);
                          const requesterAvatarStyle = getRequesterAvatarStyle(item);

                          return (
                            <article
                              key={item.id}
                              className="group rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-[14px] px-4 transition hover:border-[#d1d5db] hover:shadow-[var(--shadow-sm)]"
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => void openDetail(item)}
                                  className="flex min-w-0 flex-1 items-start gap-3 text-left"
                                >
                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-base ${icon.background}`}
                                  >
                                    {icon.emoji}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex flex-wrap items-center gap-2">
                                      <div className="text-[13.5px] font-semibold leading-5 text-[var(--text-primary)]">
                                        {item.title}
                                      </div>
                                      <StatusBadge variant={getInboxStatusVariant(item.status)}>
                                        {FILTER_LABELS[item.status]}
                                      </StatusBadge>
                                    </div>

                                    <div className="truncate text-[12px] text-[var(--text-muted)]">
                                      {item.subtext}
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--text-muted)]">
                                      <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                                        <span
                                          className="inline-flex h-[18px] w-[18px] items-center justify-center overflow-hidden rounded-full text-[9px] font-bold"
                                          style={requesterAvatarStyle}
                                        >
                                          {item.requesterImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                              src={item.requesterImage}
                                              alt={requesterDisplayName}
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            requesterInitial
                                          )}
                                        </span>
                                        {requesterDisplayName}
                                      </span>
                                      <span>{formatCardTime(item.createdAt)}</span>
                                    </div>
                                  </div>
                                </button>

                                <div className="flex shrink-0 items-center gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                                  {item.canDecide ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => void handleDecision(item, "APPROVED")}
                                        disabled={loadingAction !== null}
                                        className="inline-flex h-7 items-center rounded-[var(--radius-sm)] border border-[var(--success)] bg-[var(--surface)] px-3 text-[11.5px] font-semibold text-[var(--success)] transition hover:bg-[var(--success-light)] disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {loadingAction === actionKeyApproved ? "승인 중..." : "승인"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => void handleDecision(item, "REJECTED")}
                                        disabled={loadingAction !== null}
                                        className="inline-flex h-7 items-center rounded-[var(--radius-sm)] border border-[var(--danger)] bg-[var(--surface)] px-3 text-[11.5px] font-semibold text-[var(--danger)] transition hover:bg-[var(--danger-light)] disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {loadingAction === actionKeyRejected ? "반려 중..." : "반려"}
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => void handleView(item)}
                                      className="inline-flex h-7 items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 text-[11.5px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-2)]"
                                    >
                                      보기
                                    </button>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {selectedItem ? (
        (() => {
          const requesterDisplayName = getRequesterDisplayName(selectedItem);
          const requesterInitial = resolveInitial(requesterDisplayName);
          const requesterAvatarStyle = getRequesterAvatarStyle(selectedItem);

          return (
            <div
              className="fixed inset-0 z-[90] flex items-center justify-center p-4 backdrop-blur-[3px]"
              style={{ backgroundColor: "rgba(15, 23, 42, 0.35)" }}
              onClick={() => setSelectedItemId(null)}
            >
              <div
                className="notification-inbox-modal-enter flex w-full max-w-[480px] flex-col overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
                onClick={(event) => event.stopPropagation()}
              >
            <div className="flex items-center justify-between border-b border-[var(--border-light)] px-6 py-5">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-lg ${toneIcon(selectedItem.tone).background}`}
                >
                  {toneIcon(selectedItem.tone).emoji}
                </div>
                <div>
                  <div className="text-[15px] font-bold text-[var(--text-primary)]">
                    {selectedItem.title}
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--text-muted)]">
                    전달함 상세
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--surface-2)] text-[var(--text-muted)] transition hover:bg-[var(--surface-3)]"
                aria-label="닫기"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-1 px-6 py-5">
              <div className="flex items-start gap-4 border-b border-[var(--border-light)] py-3">
                <div className="w-20 shrink-0 pt-0.5 text-[12px] font-semibold text-[var(--text-muted)]">
                  항목 유형
                </div>
                <div className="text-[13px] text-[var(--text-primary)]">
                  {resolveTypeLabel(selectedItem.tone)}
                </div>
              </div>

              <div className="flex items-start gap-4 border-b border-[var(--border-light)] py-3">
                <div className="w-20 shrink-0 pt-0.5 text-[12px] font-semibold text-[var(--text-muted)]">
                  신청자
                </div>
                <div className="flex items-center gap-2 text-[13px] text-[var(--text-primary)]">
                  <span
                    className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold"
                    style={requesterAvatarStyle}
                  >
                    {selectedItem.requesterImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedItem.requesterImage}
                        alt={requesterDisplayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      requesterInitial
                    )}
                  </span>
                  {requesterDisplayName}
                </div>
              </div>

              <div className="flex items-start gap-4 border-b border-[var(--border-light)] py-3">
                <div className="w-20 shrink-0 pt-0.5 text-[12px] font-semibold text-[var(--text-muted)]">
                  기간·일시
                </div>
                <div className="text-[13px] text-[var(--text-primary)]">
                  {selectedItem.periodLabel}
                </div>
              </div>

              <div className="flex items-start gap-4 border-b border-[var(--border-light)] py-3">
                <div className="w-20 shrink-0 pt-0.5 text-[12px] font-semibold text-[var(--text-muted)]">
                  상태
                </div>
                <div>
                  <StatusBadge variant={getInboxStatusVariant(selectedItem.status)}>
                    {FILTER_LABELS[selectedItem.status]}
                  </StatusBadge>
                </div>
              </div>

              <div className="flex items-start gap-4 border-b border-[var(--border-light)] py-3">
                <div className="w-20 shrink-0 pt-0.5 text-[12px] font-semibold text-[var(--text-muted)]">
                  접수 시각
                </div>
                <div className="text-[13px] text-[var(--text-primary)]">
                  {formatReceiptTime(selectedItem.createdAt)}
                </div>
              </div>

              <div className="flex items-start gap-4 py-3">
                <div className="w-20 shrink-0 pt-0.5 text-[12px] font-semibold text-[var(--text-muted)]">
                  메모
                </div>
                <div
                  className={`whitespace-pre-wrap text-[13px] leading-6 ${
                    selectedItem.memo === "메모가 없습니다."
                      ? "text-[var(--text-muted)]"
                      : "text-[var(--text-primary)]"
                  }`}
                >
                  {selectedItem.memo}
                </div>
              </div>
            </div>

            {actionError ? (
              <div className="border-t border-[var(--border-light)] px-6 py-3 text-sm text-[var(--danger)]">
                {actionError}
              </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-[var(--border-light)] px-6 py-4">
              {selectedItem.canDecide && selectedApproval?.status === "PENDING" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSelectedItemId(null)}
                    className="inline-flex h-[34px] items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-4 text-[13px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-3)]"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecision(selectedItem, "REJECTED")}
                    disabled={loadingAction !== null}
                    className="inline-flex h-[34px] items-center rounded-[var(--radius-sm)] bg-[var(--danger)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingAction === `${selectedItem.id}:REJECTED` ? "반려 중..." : "반려"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecision(selectedItem, "APPROVED")}
                    disabled={loadingAction !== null}
                    className="inline-flex h-[34px] items-center rounded-[var(--radius-sm)] bg-[var(--success)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingAction === `${selectedItem.id}:APPROVED` ? "승인 중..." : "승인"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedItemId(null)}
                  className="inline-flex h-[34px] items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-4 text-[13px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-3)]"
                >
                  닫기
                </button>
              )}
            </div>
              </div>
            </div>
          );
        })()
      ) : null}

      <style jsx global>{`
        @keyframes notification-inbox-modal-in {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .notification-inbox-modal-enter {
          animation: notification-inbox-modal-in 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </>
  );
}
