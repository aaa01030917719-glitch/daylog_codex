import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return NextResponse.json({ error: "OWNER만 역할을 변경할 수 있습니다." }, { status: 403 });
  }

  const { role } = await req.json();
  if (!role || !["ADMIN", "MEMBER"].includes(role)) {
    return NextResponse.json({ error: "유효한 역할을 입력해주세요. (ADMIN 또는 MEMBER)" }, { status: 400 });
  }

  const { memberId } = params;

  // 대상 멤버 조회
  const target = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: { role: true, workspaceId: true },
  });

  if (!target) {
    return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
  }

  // OWNER 역할은 변경 불가
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "OWNER 역할은 변경할 수 없습니다." }, { status: 400 });
  }

  // 같은 워크스페이스인지 확인
  if (target.workspaceId !== session.user.workspaceId) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role },
  });

  return NextResponse.json({ ok: true });
}
