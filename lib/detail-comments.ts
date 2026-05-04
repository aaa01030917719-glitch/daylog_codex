import type { CommentTargetType, DetailComment } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DETAIL_COMMENT_TARGETS = [
  "document",
  "project",
  "idea",
  "notice",
  "delivery",
] as const;

export type DetailCommentTarget = (typeof DETAIL_COMMENT_TARGETS)[number];

const DETAIL_COMMENT_PAYLOAD_KIND = "detail-comment";

type StoredDetailCommentPayload = {
  kind: typeof DETAIL_COMMENT_PAYLOAD_KIND;
  content: string;
  parentId?: string | null;
};

type DetailCommentWithAuthor = DetailComment & {
  author: {
    id: string;
    name: string | null;
    image: string | null;
    members?: Array<{ role: string }>;
  };
};

export interface SerializedDetailComment {
  id: string;
  content: string;
  authorId: string;
  targetType: CommentTargetType;
  targetId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    role: string | null;
  };
  canManage: boolean;
  replies: SerializedDetailComment[];
}

export function isDetailCommentTarget(value: unknown): value is DetailCommentTarget {
  return typeof value === "string" && DETAIL_COMMENT_TARGETS.includes(value as DetailCommentTarget);
}

export function parseDetailCommentContent(rawContent: string) {
  const trimmed = rawContent.trim();

  if (!trimmed.startsWith("{")) {
    return {
      content: rawContent,
      parentId: null,
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as StoredDetailCommentPayload;

    if (parsed.kind !== DETAIL_COMMENT_PAYLOAD_KIND || typeof parsed.content !== "string") {
      return {
        content: rawContent,
        parentId: null,
      };
    }

    return {
      content: parsed.content,
      parentId: typeof parsed.parentId === "string" && parsed.parentId.trim() ? parsed.parentId : null,
    };
  } catch {
    return {
      content: rawContent,
      parentId: null,
    };
  }
}

export function serializeDetailCommentContent(content: string, parentId?: string | null) {
  return JSON.stringify({
    kind: DETAIL_COMMENT_PAYLOAD_KIND,
    content,
    parentId: parentId ?? null,
  } satisfies StoredDetailCommentPayload);
}

export async function canAccessDetailCommentTarget(params: {
  targetType: CommentTargetType;
  targetId: string;
  workspaceId: string;
  currentUserId: string;
}) {
  const { targetType, targetId, workspaceId, currentUserId } = params;

  if (targetType === "document") {
    const page = await prisma.page.findUnique({
      where: { id: targetId },
      select: { workspaceId: true },
    });
    return Boolean(page && page.workspaceId === workspaceId);
  }

  if (targetType === "project") {
    const project = await prisma.project.findUnique({
      where: { id: targetId },
      select: { workspaceId: true },
    });
    return Boolean(project && project.workspaceId === workspaceId);
  }

  if (targetType === "idea") {
    const idea = await prisma.boardPost.findUnique({
      where: { id: targetId },
      select: { workspaceId: true, type: true, visibility: true, authorId: true },
    });

    return Boolean(
      idea &&
        idea.workspaceId === workspaceId &&
        idea.type === "IDEA" &&
        (idea.visibility === "SHARED" || idea.authorId === currentUserId)
    );
  }

  if (targetType === "notice") {
    const notice = await prisma.notice.findUnique({
      where: { id: targetId },
      select: { workspaceId: true },
    });
    return Boolean(notice && notice.workspaceId === workspaceId);
  }

  const delivery = await prisma.boardPost.findUnique({
    where: { id: targetId },
    select: { workspaceId: true, type: true },
  });

  return Boolean(
    delivery &&
      delivery.workspaceId === workspaceId &&
      delivery.type === "CEO_MESSAGE"
  );
}

export function serializeDetailComment(
  comment: DetailCommentWithAuthor,
  currentUserId: string
): SerializedDetailComment {
  const { content, parentId } = parseDetailCommentContent(comment.content);

  return {
    id: comment.id,
    content,
    authorId: comment.authorId,
    targetType: comment.targetType,
    targetId: comment.targetId,
    parentId,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author: {
      id: comment.author.id,
      name: comment.author.name ?? "이름 없음",
      image: comment.author.image,
      role: comment.author.members?.[0]?.role ?? null,
    },
    canManage: comment.authorId === currentUserId,
    replies: [],
  };
}

export function buildDetailCommentTree(
  comments: SerializedDetailComment[]
) {
  const commentMap = new Map(
    comments.map((comment) => [
      comment.id,
      {
        ...comment,
        replies: [] as SerializedDetailComment[],
      },
    ])
  );

  const roots: SerializedDetailComment[] = [];

  comments.forEach((comment) => {
    const node = commentMap.get(comment.id);
    if (!node) {
      return;
    }

    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies.push(node);
        return;
      }
    }

    roots.push(node);
  });

  return roots;
}

export function serializeDetailCommentTree(
  comments: DetailCommentWithAuthor[],
  currentUserId: string
) {
  return buildDetailCommentTree(
    comments.map((comment) => serializeDetailComment(comment, currentUserId))
  );
}
