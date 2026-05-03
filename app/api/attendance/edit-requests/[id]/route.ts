import { ApprovalStatus, ApprovalType } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  ATTENDANCE_EDIT_REQUEST_TITLE_PREFIX,
  ATTENDANCE_EDIT_WITHDRAW_MARKER,
} from "@/components/attendance/attendance-utils";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (session.user.role === "OWNER") {
    return NextResponse.json(
      { error: "OWNER 계정은 근무시간 수정 요청 기능을 사용할 수 없습니다." },
      { status: 403 }
    );
  }

  try {
    const approval = await prisma.approval.findUnique({
      where: { id: params.id },
    });

    if (
      !approval ||
      approval.type !== ApprovalType.PROJECT_REVIEW ||
      !approval.title.startsWith(ATTENDANCE_EDIT_REQUEST_TITLE_PREFIX)
    ) {
      return NextResponse.json({ error: "근무시간 수정 요청을 찾을 수 없습니다." }, { status: 404 });
    }

    if (approval.requesterId !== session.user.id) {
      return NextResponse.json({ error: "본인이 작성한 요청만 철회할 수 있습니다." }, { status: 403 });
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      return NextResponse.json({ error: "대기 중인 요청만 철회할 수 있습니다." }, { status: 409 });
    }

    const updated = await prisma.approval.update({
      where: { id: approval.id },
      data: {
        status: ApprovalStatus.REJECTED,
        decisionNote: ATTENDANCE_EDIT_WITHDRAW_MARKER,
        deciderId: session.user.id,
        decidedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      id: updated.id,
    });
  } catch (error) {
    console.error("[ATTENDANCE_EDIT_REQUEST_DELETE]", error);
    return NextResponse.json(
      { error: "수정 요청을 철회하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 }
    );
  }
}
