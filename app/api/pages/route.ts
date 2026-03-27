import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) return NextResponse.json({ pages: [] });

  const pages = await prisma.page.findMany({
    where: { workspaceId },
    include: {
      author: { select: { id: true, name: true, image: true } },
      _count: { select: { children: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ pages });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) return NextResponse.json({ error: "워크스페이스 없음" }, { status: 400 });

  try {
    const body = await req.json();
    const { title, emoji, parentId, content } = body;

    const page = await prisma.page.create({
      data: {
        title: title ?? "제목 없음",
        emoji: emoji ?? null,
        parentId: parentId ?? null,
        content: content ?? null,
        workspaceId,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { children: true } },
      },
    });

    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    console.error("[PAGE CREATE]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
