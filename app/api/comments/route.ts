import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  canAccessDetailCommentTarget,
  isDetailCommentTarget,
  serializeDetailComment,
  serializeDetailCommentContent,
  serializeDetailCommentTree,
} from "@/lib/detail-comments";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

function normalizeContent(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeParentId(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function resolveCommentTarget(input: {
  targetType?: unknown;
  targetId?: unknown;
  postType?: unknown;
  postId?: unknown;
}) {
  const rawTargetType = input.targetType ?? input.postType;
  const rawTargetId = input.targetId ?? input.postId;
  const targetId = typeof rawTargetId === "string" ? rawTargetId : "";

  return {
    targetType: rawTargetType,
    targetId,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  if (!workspaceId) {
    return NextResponse.json({ error: "워크스페이스를 찾을 수 없습니다." }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const { targetType, targetId } = resolveCommentTarget({
    targetType: searchParams.get("targetType"),
    targetId: searchParams.get("targetId"),
    postType: searchParams.get("postType"),
    postId: searchParams.get("postId"),
  });

  if (!isDetailCommentTarget(targetType) || !targetId) {
    return NextResponse.json({ error: "댓글 조회 대상이 올바르지 않습니다." }, { status: 400 });
  }

  const canAccess = await canAccessDetailCommentTarget({
    targetType,
    targetId,
    workspaceId,
    currentUserId: session.user.id,
  });

  if (!canAccess) {
    return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
  }

  const comments = await prisma.detailComment.findMany({
    where: { targetType, targetId },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          image: true,
          members: { select: { role: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    comments: serializeDetailCommentTree(comments, session.user.id),
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
    return NextResponse.json({ error: "워크스페이스를 찾을 수 없습니다." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { targetType, targetId } = resolveCommentTarget(body);
    const content = normalizeContent(body.content);
    const parentId = normalizeParentId(body.parentId);

    if (!isDetailCommentTarget(targetType) || !targetId) {
      return NextResponse.json({ error: "댓글 작성 대상이 올바르지 않습니다." }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: "댓글 내용을 입력해 주세요." }, { status: 400 });
    }

    const canAccess = await canAccessDetailCommentTarget({
      targetType,
      targetId,
      workspaceId,
      currentUserId: session.user.id,
    });

    if (!canAccess) {
      return NextResponse.json({ error: "대상을 찾을 수 없습니다." }, { status: 404 });
    }

    if (parentId) {
      const parentComment = await prisma.detailComment.findUnique({
        where: { id: parentId },
        select: { id: true, targetType: true, targetId: true },
      });

      if (
        !parentComment ||
        parentComment.targetType !== targetType ||
        parentComment.targetId !== targetId
      ) {
        return NextResponse.json(
          { error: "대댓글을 작성할 부모 댓글을 찾을 수 없습니다." },
          { status: 404 }
        );
      }
    }

    const comment = await prisma.detailComment.create({
      data: {
        content: serializeDetailCommentContent(content, parentId),
        authorId: session.user.id,
        targetType,
        targetId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            members: { select: { role: true } },
          },
        },
      },
    });

    return NextResponse.json(
      { comment: serializeDetailComment(comment, session.user.id) },
      { status: 201 }
    );
  } catch (error) {
    console.error("[DETAIL_COMMENT_CREATE]", error);
    return NextResponse.json({ error: "댓글 작성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
