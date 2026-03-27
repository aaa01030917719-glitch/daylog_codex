import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ error: "관리자만 수정할 수 있습니다." }, { status: 403 });
  }

  try {
    const attendance = await prisma.attendance.findUnique({ where: { id: params.id } });
    if (!attendance) return NextResponse.json({ error: "출퇴근 기록을 찾을 수 없습니다." }, { status: 404 });

    if (attendance.workspaceId !== session.user.workspaceId) {
      return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
    }

    const body = await req.json();
    const { memo, status } = body;

    const updated = await prisma.attendance.update({
      where: { id: params.id },
      data: {
        ...(memo !== undefined && { memo }),
        ...(status !== undefined && { status }),
      },
      include: { user: { select: { id: true, name: true, image: true } } },
    });

    return NextResponse.json({ record: updated });
  } catch (error) {
    console.error("[ATTENDANCE PATCH]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
