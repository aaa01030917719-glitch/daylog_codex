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

  const comments = await prisma.comment.findMany({
    where: { pageId: params.id },
    include: { author: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  try {
    const { content, mentionedUserIds } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "내용을 입력해주세요." }, { status: 400 });
    }

    const page = await prisma.page.findUnique({ where: { id: params.id } });
    if (!page) {
      return NextResponse.json({ error: "문서를 찾을 수 없습니다." }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        content: content.trim(),
        authorId: session.user.id,
        pageId: params.id,
      },
      include: { author: { select: { id: true, name: true, image: true } } },
    });

    // 멘션 처리
    const mentionIds: string[] = Array.isArray(mentionedUserIds)
      ? mentionedUserIds.filter((id: string) => id !== session.user.id)
      : [];

    if (mentionIds.length > 0) {
      await prisma.mention.createMany({
        data: mentionIds.map((userId: string) => ({
          userId,
          commentId: comment.id,
        })),
        skipDuplicates: true,
      });

      // 멘션된 유저에게 알림 생성
      await prisma.notification.createMany({
        data: mentionIds.map((userId: string) => ({
          userId,
          type: "MENTION",
          title: `${session.user.name ?? "누군가"}님이 문서에서 회원님을 멘션했습니다.`,
          body: content.trim().slice(0, 100),
          link: `/docs/${params.id}`,
        })),
      });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("[COMMENT CREATE]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
