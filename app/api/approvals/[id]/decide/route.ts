import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const { status, decisionNote } = await req.json();

    const approval = await prisma.approval.findUnique({
      where: { id: params.id },
      include: { requester: { select: { id: true, name: true } } },
    });

    if (!approval) {
      return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }

    const updated = await prisma.approval.update({
      where: { id: params.id },
      data: {
        status,
        decisionNote: decisionNote ?? null,
        deciderId: session.user.id,
        decidedAt: new Date(),
      },
    });

    // 휴가/반차 승인 시 Attendance 레코드 생성
    if (status === "APPROVED" && approval.leaveType && approval.leaveStart) {
      const workspaceId = session.user.workspaceId ?? "";
      const startDate = new Date(approval.leaveStart);
      const endDate = approval.leaveEnd ? new Date(approval.leaveEnd) : startDate;

      // 날짜 범위 내 모든 날에 대해 처리
      const current = new Date(startDate);
      while (current <= endDate) {
        const dateOnly = new Date(current.getFullYear(), current.getMonth(), current.getDate());
        try {
          await prisma.attendance.upsert({
            where: { userId_date: { userId: approval.requesterId, date: dateOnly } },
            create: {
              userId: approval.requesterId,
              workspaceId,
              date: dateOnly,
              status: "HOLIDAY",
              memo: `${approval.leaveType === "FULL_DAY" ? "연차" : approval.leaveType === "HALF_AM" ? "오전 반차" : "오후 반차"} (승인)`,
            },
            update: {
              status: "HOLIDAY",
              memo: `${approval.leaveType === "FULL_DAY" ? "연차" : approval.leaveType === "HALF_AM" ? "오전 반차" : "오후 반차"} (승인)`,
            },
          });
        } catch {
          // 이미 존재하는 날짜는 넘어감
        }
        current.setDate(current.getDate() + 1);
      }
    }

    // 요청자에게 알림 생성
    const resultText = status === "APPROVED" ? "승인" : "거절";
    await prisma.notification.create({
      data: {
        type: "APPROVAL_RESULT",
        title: `요청이 ${resultText}되었습니다`,
        body: `"${approval.title}" 요청이 ${resultText}되었습니다.${decisionNote ? ` 메모: ${decisionNote}` : ""}`,
        link: `/approvals/${approval.id}`,
        userId: approval.requesterId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[APPROVAL DECIDE]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
