import { NoticeBadge } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendPushNotification } from "@/lib/push";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";
import {
  isAdminRole,
  normalizeText,
  parseEndDate,
  parseStartDate,
  resolveNoticeBadge,
  serializeNotice,
} from "./_helpers";

void NoticeBadge;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  if (!workspaceId) {
    return NextResponse.json({ notices: [] });
  }

  const [notices, memberCount, commentCounts] = await Promise.all([
    prisma.notice.findMany({
      where: { workspaceId },
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
      orderBy: { createdAt: "desc" },
    }),
    prisma.workspaceMember.count({
      where: { workspaceId },
    }),
    prisma.detailComment.groupBy({
      by: ["targetId"],
      where: {
        targetType: "notice",
      },
      _count: { _all: true },
    }),
  ]);

  const commentCountMap = new Map(
    commentCounts.map((item) => [item.targetId, item._count._all])
  );

  return NextResponse.json({
    notices: notices.map((notice) =>
      serializeNotice(
        { ...notice, commentCount: commentCountMap.get(notice.id) ?? 0 },
        {
          currentUserId: session.user.id,
          canManage: isAdminRole(session.user.role),
          targetMemberCount: Math.max(memberCount - 1, 0),
        }
      )
    ),
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
    return NextResponse.json(
      { error: "워크스페이스를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await req.json();
  const title = normalizeText(body.title);
  const content = normalizeText(body.content);
  const category = normalizeText(body.category) || "공지";
  const priority = normalizeText(body.priority) || "important";
  const target =
    Array.isArray(body.target) && body.target.length > 0
      ? body.target.filter((item: unknown) => typeof item === "string")
      : ["전체 대상"];
  const requireReadConfirm = Boolean(body.requireReadConfirm);
  const sendPush = Boolean(body.sendPush);
  const badge = resolveNoticeBadge(category, body.badge);
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

  const memberRows = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      userId: { not: session.user.id },
    },
    select: {
      userId: true,
    },
  });

  const notice = await prisma.notice.create({
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
      authorId: session.user.id,
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
      },
    },
  });

  if (memberRows.length > 0) {
    await prisma.notification.createMany({
      data: memberRows.map((member) => ({
        userId: member.userId,
        type: "NOTICE_POSTED",
        title: "새 공지가 등록됐어요.",
        body: title,
        link: "/notices",
      })),
    });

    if (sendPush) {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: { in: memberRows.map((member) => member.userId) } },
      });

      await Promise.allSettled(
        subscriptions.map((subscription) =>
          sendPushNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                auth: subscription.auth,
                p256dh: subscription.p256dh,
              },
            },
            {
              title: "새 공지가 등록됐어요.",
              body: title,
              link: "/notices",
            }
          )
        )
      );
    }
  }

  return NextResponse.json(
    {
      notice: serializeNotice(notice, {
        currentUserId: session.user.id,
        canManage: true,
        targetMemberCount: memberRows.length,
      }),
    },
    { status: 201 }
  );
}
