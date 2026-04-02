import { NoticeBadge } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const NOTICE_BADGES = Object.values(NoticeBadge);

function isNoticeBadge(value: unknown): value is NoticeBadge {
  return typeof value === "string" && NOTICE_BADGES.includes(value as NoticeBadge);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseStartDate(value: unknown) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseEndDate(value: unknown) {
  if (typeof value !== "string" || !value) {
    return null;
  }

  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeNotice(notice: {
  id: string;
  title: string;
  content: string;
  badge: NoticeBadge;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  authorId: string;
  author: { name: string | null };
}) {
  return {
    id: notice.id,
    title: notice.title,
    content: notice.content,
    badge: notice.badge,
    startDate: notice.startDate.toISOString(),
    endDate: notice.endDate.toISOString(),
    createdAt: notice.createdAt.toISOString(),
    authorId: notice.authorId,
    authorName: notice.author.name ?? "이름 없음",
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = session.user.workspaceId;
  if (!workspaceId) {
    return NextResponse.json([]);
  }

  const notices = await prisma.notice.findMany({
    where: { workspaceId },
    include: {
      author: {
        select: { name: true },
      },
    },
    orderBy: [{ createdAt: "desc" }, { startDate: "desc" }],
  });

  return NextResponse.json(notices.map(serializeNotice));
}

export async function POST(req: NextRequest) {
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

  const body = await req.json();
  const title = normalizeText(body.title);
  const content = normalizeText(body.content);
  const badge = body.badge;
  const startDate = parseStartDate(body.startDate);
  const endDate = parseEndDate(body.endDate);

  if (!title || !content) {
    return NextResponse.json({ error: "제목과 내용을 입력해 주세요." }, { status: 400 });
  }

  if (!isNoticeBadge(badge)) {
    return NextResponse.json({ error: "공지 뱃지를 확인해 주세요." }, { status: 400 });
  }

  if (!startDate || !endDate) {
    return NextResponse.json({ error: "공지 기간을 올바르게 입력해 주세요." }, { status: 400 });
  }

  if (startDate.getTime() > endDate.getTime()) {
    return NextResponse.json(
      { error: "공지 시작일은 종료일보다 늦을 수 없습니다." },
      { status: 400 }
    );
  }

  const notice = await prisma.notice.create({
    data: {
      title,
      content,
      badge,
      startDate,
      endDate,
      authorId: session.user.id,
      workspaceId,
    },
    include: {
      author: {
        select: { name: true },
      },
    },
  });

  return NextResponse.json(serializeNotice(notice), { status: 201 });
}
