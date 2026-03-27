import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const page = await prisma.page.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, name: true, image: true } },
      children: {
        include: {
          author: { select: { id: true, name: true } },
          _count: { select: { children: true } },
        },
        orderBy: { updatedAt: "desc" },
      },
      parent: { select: { id: true, title: true, emoji: true } },
    },
  });

  if (!page) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });

  if (page.workspaceId !== session.user.workspaceId && !page.isPublic) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  return NextResponse.json({ page });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const page = await prisma.page.findUnique({ where: { id: params.id } });
    if (!page) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });

    if (page.workspaceId !== session.user.workspaceId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, emoji, isPublic } = body;

    const updated = await prisma.page.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(emoji !== undefined && { emoji }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    return NextResponse.json({ page: updated });
  } catch (error) {
    console.error("[PAGE PATCH]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const page = await prisma.page.findUnique({ where: { id: params.id } });
    if (!page) return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });

    if (page.workspaceId !== session.user.workspaceId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const isAuthor = page.authorId === session.user.id;
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "OWNER";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "삭제 권한이 없습니다." }, { status: 403 });
    }

    await prisma.page.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PAGE DELETE]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
