import { BoardPostType, BoardPostVisibility } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const IDEA_VISIBILITIES = Object.values(BoardPostVisibility);

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isIdeaVisibility(value: unknown): value is BoardPostVisibility {
  return typeof value === "string" && IDEA_VISIBILITIES.includes(value as BoardPostVisibility);
}

function serializeIdeaPost(
  post: {
    id: string;
    type: BoardPostType;
    title: string | null;
    content: string;
    visibility: BoardPostVisibility;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
    author: { name: string | null };
  },
  currentUserId: string
) {
  return {
    id: post.id,
    type: post.type,
    title: post.title,
    content: post.content,
    visibility: post.visibility,
    authorId: post.authorId,
    canManage: post.authorId === currentUserId,
    authorName: post.author.name ?? "이름 없음",
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

async function getIdeaPostForManage(postId: string, userId: string, workspaceId: string) {
  const post = await prisma.boardPost.findFirst({
    where: {
      id: postId,
      workspaceId,
      type: BoardPostType.IDEA,
    },
    include: {
      author: {
        select: { name: true },
      },
    },
  });

  if (!post) {
    return NextResponse.json({ error: "아이디어를 찾을 수 없습니다." }, { status: 404 });
  }

  if (post.authorId !== userId) {
    return NextResponse.json(
      { error: "본인이 작성한 아이디어만 수정하거나 삭제할 수 있습니다." },
      { status: 403 }
    );
  }

  return post;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json(
      { error: "워크스페이스를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const { id } = params;
  const existingPost = await getIdeaPostForManage(id, session.user.id, workspaceId);
  if (existingPost instanceof NextResponse) {
    return existingPost;
  }

  const body = await req.json();
  const title = normalizeText(body.title);
  const content = normalizeText(body.content);
  const visibility = body.visibility;

  if (!title) {
    return NextResponse.json({ error: "아이디어 제목을 입력해 주세요." }, { status: 400 });
  }

  if (!content) {
    return NextResponse.json({ error: "내용을 입력해 주세요." }, { status: 400 });
  }

  if (!isIdeaVisibility(visibility)) {
    return NextResponse.json({ error: "아이디어 공개 범위를 확인해 주세요." }, { status: 400 });
  }

  const updatedPost = await prisma.boardPost.update({
    where: { id: existingPost.id },
    data: {
      title,
      content,
      visibility,
    },
    include: {
      author: {
        select: { name: true },
      },
    },
  });

  return NextResponse.json(serializeIdeaPost(updatedPost, session.user.id));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json(
      { error: "워크스페이스를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const { id } = params;
  const existingPost = await getIdeaPostForManage(id, session.user.id, workspaceId);
  if (existingPost instanceof NextResponse) {
    return existingPost;
  }

  await prisma.boardPost.delete({
    where: { id: existingPost.id },
  });

  return NextResponse.json({ ok: true, id: existingPost.id });
}
