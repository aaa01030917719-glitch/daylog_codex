import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  canAccessDetailCommentTarget,
  parseDetailCommentContent,
  serializeDetailComment,
  serializeDetailCommentContent,
} from "@/lib/detail-comments";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

function normalizeContent(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getAccessibleComment(
  commentId: string,
  workspaceId: string,
  currentUserId: string
) {
  const comment = await prisma.detailComment.findUnique({
    where: { id: commentId },
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

  if (!comment) {
    return null;
  }

  const canAccess = await canAccessDetailCommentTarget({
    targetType: comment.targetType,
    targetId: comment.targetId,
    workspaceId,
    currentUserId,
  });

  if (!canAccess) {
    return null;
  }

  return comment;
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
    return NextResponse.json({ error: "워크스페이스를 찾을 수 없습니다." }, { status: 400 });
  }

  const comment = await getAccessibleComment(params.id, workspaceId, session.user.id);
  if (!comment) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  if (comment.authorId !== session.user.id) {
    return NextResponse.json({ error: "본인 댓글만 수정할 수 있습니다." }, { status: 403 });
  }

  try {
    const body = await req.json();
    const content = normalizeContent(body.content);

    if (!content) {
      return NextResponse.json({ error: "댓글 내용을 입력해 주세요." }, { status: 400 });
    }

    const preservedParentId = parseDetailCommentContent(comment.content).parentId;

    const updatedComment = await prisma.detailComment.update({
      where: { id: params.id },
      data: {
        content: serializeDetailCommentContent(content, preservedParentId),
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

    return NextResponse.json({
      comment: serializeDetailComment(updatedComment, session.user.id),
    });
  } catch (error) {
    console.error("[DETAIL_COMMENT_UPDATE]", error);
    return NextResponse.json({ error: "댓글 수정 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
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
    return NextResponse.json({ error: "워크스페이스를 찾을 수 없습니다." }, { status: 400 });
  }

  const comment = await getAccessibleComment(params.id, workspaceId, session.user.id);
  if (!comment) {
    return NextResponse.json({ error: "댓글을 찾을 수 없습니다." }, { status: 404 });
  }

  if (comment.authorId !== session.user.id) {
    return NextResponse.json({ error: "본인 댓글만 삭제할 수 있습니다." }, { status: 403 });
  }

  const relatedComments = await prisma.detailComment.findMany({
    where: {
      targetType: comment.targetType,
      targetId: comment.targetId,
    },
    select: {
      id: true,
      content: true,
    },
  });

  const childMap = new Map<string, string[]>();

  relatedComments.forEach((relatedComment) => {
    const parentId = parseDetailCommentContent(relatedComment.content).parentId;
    if (!parentId) {
      return;
    }

    const children = childMap.get(parentId) ?? [];
    children.push(relatedComment.id);
    childMap.set(parentId, children);
  });

  const idsToDelete = new Set<string>([params.id]);
  const queue = [params.id];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    const childIds = childMap.get(currentId) ?? [];
    childIds.forEach((childId) => {
      if (idsToDelete.has(childId)) {
        return;
      }

      idsToDelete.add(childId);
      queue.push(childId);
    });
  }

  await prisma.detailComment.deleteMany({
    where: {
      id: {
        in: Array.from(idsToDelete),
      },
    },
  });

  return NextResponse.json({ success: true });
}
