import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "관리자만 푸시를 보낼 수 있습니다." }, { status: 403 });
  }

  try {
    const { title, body, link, userIds } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: "제목과 내용은 필수입니다." }, { status: 400 });
    }

    // 대상 구독 조회
    const subscriptions = await prisma.pushSubscription.findMany({
      where: userIds?.length ? { userId: { in: userIds } } : {},
    });

    let sent = 0;
    const failed: string[] = [];

    for (const sub of subscriptions) {
      try {
        await sendPushNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } },
          { title, body, link }
        );
        sent++;
      } catch {
        failed.push(sub.userId);
      }
    }

    return NextResponse.json({ success: true, sent, failed: failed.length });
  } catch (error) {
    console.error("[PUSH SEND]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
