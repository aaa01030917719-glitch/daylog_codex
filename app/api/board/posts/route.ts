import {
  BoardPostStatus,
  BoardPostType,
  BoardPostVisibility,
  type Prisma,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const BOARD_POST_TYPES = Object.values(BoardPostType);
const BOARD_POST_STATUSES = Object.values(BoardPostStatus);
const IDEA_VISIBILITIES = Object.values(BoardPostVisibility);

function isBoardPostType(value: unknown): value is BoardPostType {
  return typeof value === "string" && BOARD_POST_TYPES.includes(value as BoardPostType);
}

function isBoardPostStatus(value: unknown): value is BoardPostStatus {
  return typeof value === "string" && BOARD_POST_STATUSES.includes(value as BoardPostStatus);
}

function isIdeaVisibility(value: unknown): value is BoardPostVisibility {
  return typeof value === "string" && IDEA_VISIBILITIES.includes(value as BoardPostVisibility);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function buildBoardPostWhere(
  workspaceId: string,
  currentUserId: string,
  type?: BoardPostType
): Prisma.BoardPostWhereInput {
  if (type === BoardPostType.IDEA) {
    return {
      workspaceId,
      type: BoardPostType.IDEA,
      OR: [
        { visibility: BoardPostVisibility.SHARED },
        { visibility: BoardPostVisibility.PRIVATE, authorId: currentUserId },
      ],
    };
  }

  if (type) {
    return {
      workspaceId,
      type,
    };
  }

  return {
    workspaceId,
    OR: [
      { type: { in: [BoardPostType.NOTICE, BoardPostType.CEO_MESSAGE] } },
      { type: BoardPostType.IDEA, visibility: BoardPostVisibility.SHARED },
      {
        type: BoardPostType.IDEA,
        visibility: BoardPostVisibility.PRIVATE,
        authorId: currentUserId,
      },
    ],
  };
}

function serializeBoardPost(
  post: {
    id: string;
    type: BoardPostType;
    title: string | null;
    content: string;
    tags: string[];
    status: BoardPostStatus | null;
    visibility: BoardPostVisibility;
    authorId: string;
    createdAt: Date;
    updatedAt: Date;
    author: { name: string | null };
    likes: Array<{ userId: string }>;
    reads: Array<{ userId: string }>;
  },
  currentUserId: string
) {
  return {
    id: post.id,
    type: post.type,
    title: post.title,
    content: post.content,
    tags: post.tags,
    status: post.status,
    visibility: post.visibility,
    authorId: post.authorId,
    canManage: post.type === BoardPostType.IDEA && post.authorId === currentUserId,
    authorName: post.author.name ?? "이름 없음",
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    likeCount: post.likes.length,
    readCount: post.reads.length,
    isLiked: post.likes.some((like) => like.userId === currentUserId),
    isRead: post.reads.some((read) => read.userId === currentUserId),
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(req.url);
  const rawType = searchParams.get("type");

  if (rawType && !isBoardPostType(rawType)) {
    return NextResponse.json({ error: "지원하지 않는 게시글 타입입니다." }, { status: 400 });
  }

  const type = rawType && isBoardPostType(rawType) ? rawType : undefined;

  const posts = await prisma.boardPost.findMany({
    where: buildBoardPostWhere(workspaceId, session.user.id, type),
    include: {
      author: { select: { name: true } },
      likes: { select: { userId: true } },
      reads: { select: { userId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(posts.map((post) => serializeBoardPost(post, session.user.id)));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const sessionWorkspaceId = session.user.workspaceId;

if (!sessionWorkspaceId) {
  return NextResponse.json(
    { error: "워크스페이스를 찾을 수 없습니다." },
    { status: 400 }
  );
}

const workspace = await prisma.workspace.findUnique({
  where: { id: sessionWorkspaceId },
  select: { id: true },
});

if (!workspace) {
  return NextResponse.json(
    { error: "유효한 워크스페이스가 없습니다." },
    { status: 400 }
  );
}

const workspaceId = workspace.id;

  const body = await req.json();
  const rawType = body.type;
  const title = normalizeText(body.title);
  const content = normalizeText(body.content);
  const tags = Array.isArray(body.tags)
    ? body.tags.filter(
        (tag: unknown): tag is string => typeof tag === "string" && tag.trim().length > 0
      )
    : [];
  const status = isBoardPostStatus(body.status) ? body.status : null;

  if (!isBoardPostType(rawType)) {
    return NextResponse.json({ error: "지원하지 않는 게시글 타입입니다." }, { status: 400 });
  }

  if (!content) {
    return NextResponse.json({ error: "내용을 입력해 주세요." }, { status: 400 });
  }

  if (rawType === BoardPostType.IDEA && !title) {
    return NextResponse.json({ error: "아이디어 제목을 입력해 주세요." }, { status: 400 });
  }

  const visibility =
    rawType === BoardPostType.IDEA
      ? body.visibility == null
        ? BoardPostVisibility.SHARED
        : isIdeaVisibility(body.visibility)
          ? body.visibility
          : null
      : BoardPostVisibility.SHARED;

  if (rawType === BoardPostType.IDEA && !visibility) {
    return NextResponse.json({ error: "아이디어 공개 범위를 확인해 주세요." }, { status: 400 });
  }

console.log("board post payload", {
  workspaceId,
  authorId: session.user.id,
  type: rawType,
  title,
  visibility,
});

  const post = await prisma.boardPost.create({
    data: {
      type: rawType,
      title: title || null,
      content,
      tags,
      status,
      visibility,
      workspaceId,
      authorId: session.user.id,
    },
    include: {
      author: { select: { name: true } },
      likes: { select: { userId: true } },
      reads: { select: { userId: true } },
    },
  });

  return NextResponse.json(serializeBoardPost(post, session.user.id), { status: 201 });
}

