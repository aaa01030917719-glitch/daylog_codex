import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json([]);
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  const posts = await prisma.boardPost.findMany({
    where: {
      workspaceId,
      ...(type ? { type: type as "NOTICE" | "IDEA" | "CEO_MESSAGE" } : {}),
    },
    include: {
      author: { select: { name: true } },
      likes: { select: { userId: true } },
      reads: { select: { userId: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const result = posts.map((p) => ({
    id: p.id,
    type: p.type,
    title: p.title,
    content: p.content,
    tags: p.tags,
    status: p.status,
    authorName: p.author.name ?? "알 수 없음",
    createdAt: p.createdAt,
    likeCount: p.likes.length,
    readCount: p.reads.length,
    isLiked: p.likes.some((l) => l.userId === session.user!.id),
    isRead: p.reads.some((r) => r.userId === session.user!.id),
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json({ error: "워크스페이스가 없습니다." }, { status: 400 });
  }

  const body = await req.json();
  const { type, title, content, tags = [], status } = body;

  if (!type || !content) {
    return NextResponse.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
  }

  const post = await prisma.boardPost.create({
    data: {
      type,
      title: title || null,
      content,
      tags,
      status: status || null,
      workspaceId,
      authorId: session.user.id,
    },
  });

  return NextResponse.json(post, { status: 201 });
}
