import { NoticeBadge } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";
import {
  isAdminRole,
  normalizeText,
  parseEndDate,
  parseStartDate,
  resolveNoticeBadge,
  serializeNotice,
} from "../_helpers";

void NoticeBadge;

async function getNoticeForManage(id: string, workspaceId: string) {
  return prisma.notice.findFirst({
    where: {
      id,
      workspaceId,
    },
    include: {
      author: {
        select: { name: true },
      },
      reads: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { readAt: "asc" },
      },
    },
  });
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

  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const existingNotice = await getNoticeForManage(params.id, workspaceId);
  if (!existingNotice) {
    return NextResponse.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
  }

  const memberCount = await prisma.workspaceMember.count({
    where: { workspaceId },
  });

  const body = await req.json();
  const title = normalizeText(body.title);
  const content = normalizeText(body.content);
  const category = normalizeText(body.category) || existingNotice.category;
  const priority = normalizeText(body.priority) || existingNotice.priority;
  const target =
    Array.isArray(body.target) && body.target.length > 0
      ? body.target.filter((item: unknown) => typeof item === "string")
      : existingNotice.target;
  const requireReadConfirm =
    typeof body.requireReadConfirm === "boolean"
      ? body.requireReadConfirm
      : existingNotice.requireReadConfirm;
  const badge = resolveNoticeBadge(category, body.badge ?? existingNotice.badge);
  const startDate = parseStartDate(body.startDate);
  const endDate = parseEndDate(body.endDate);

  if (!title || !content) {
    return NextResponse.json({ error: "제목과 내용을 입력해 주세요." }, { status: 400 });
  }

  if (startDate.getTime() > endDate.getTime()) {
    return NextResponse.json(
      { error: "공지 시작일은 종료일보다 늦을 수 없습니다." },
      { status: 400 }
    );
  }

  const updatedNotice = await prisma.notice.update({
    where: { id: existingNotice.id },
    data: {
      title,
      content,
      badge,
      category,
      priority,
      target,
      requireReadConfirm,
      startDate,
      endDate,
    },
    include: {
      author: {
        select: { name: true },
      },
      reads: {
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { readAt: "asc" },
      },
    },
  });

  return NextResponse.json({
    notice: serializeNotice(updatedNotice, {
      currentUserId: session.user.id,
      canManage: true,
      targetMemberCount: Math.max(memberCount - 1, 0),
    }),
  });
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

  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const existingNotice = await getNoticeForManage(params.id, workspaceId);
  if (!existingNotice) {
    return NextResponse.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.notice.delete({
    where: { id: existingNotice.id },
  });

  return NextResponse.json({ ok: true, id: existingNotice.id });
}
