import { NoticeBadge } from "@prisma/client";
import { mapCategoryToBadge } from "@/lib/notices";

export function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseStartDate(value?: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return new Date();
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function parseEndDate(value?: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    const today = new Date();
    return new Date(`${today.toISOString().slice(0, 10)}T23:59:59.999`);
  }

  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime())
    ? new Date(`${new Date().toISOString().slice(0, 10)}T23:59:59.999`)
    : date;
}

export function isAdminRole(role?: string | null) {
  return role === "ADMIN" || role === "OWNER";
}

export function resolveNoticeBadge(category?: string, badge?: unknown) {
  if (
    typeof badge === "string" &&
    Object.values(NoticeBadge).includes(badge as NoticeBadge)
  ) {
    return badge as NoticeBadge;
  }

  if (
    category === "일정" ||
    category === "시설" ||
    category === "인사" ||
    category === "기타" ||
    category === "공지"
  ) {
    return mapCategoryToBadge(category);
  }

  return mapCategoryToBadge("공지");
}

export function serializeNotice(
  notice: {
    id: string;
    title: string;
    content: string;
    badge: NoticeBadge;
    category: string;
    priority: string;
    target: string[];
    requireReadConfirm: boolean;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
    authorId: string;
    author: { name: string | null };
    reads: Array<{
      userId: string;
      readAt: Date;
      user: { id: string; name: string | null };
    }>;
    commentCount?: number;
  },
  params: {
    currentUserId: string;
    canManage: boolean;
    targetMemberCount: number;
  }
) {
  const { currentUserId, canManage, targetMemberCount } = params;
  return {
    id: notice.id,
    title: notice.title,
    content: notice.content,
    badge: notice.badge,
    category: notice.category,
    priority: notice.priority,
    target: notice.target,
    requireReadConfirm: notice.requireReadConfirm,
    startDate: notice.startDate.toISOString(),
    endDate: notice.endDate.toISOString(),
    createdAt: notice.createdAt.toISOString(),
    authorId: notice.authorId,
    authorName: notice.author.name ?? "이름 없음",
    canManage,
    commentCount: notice.commentCount ?? 0,
    readBy: notice.reads.map((read) => ({
      userId: read.user.id,
      name: read.user.name ?? "이름 없음",
      readAt: read.readAt.toISOString(),
    })),
    isRead:
      notice.authorId === currentUserId ||
      notice.reads.some((read) => read.userId === currentUserId),
    targetMemberCount,
  };
}
