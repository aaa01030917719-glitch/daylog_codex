import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 이미 워크스페이스에 속해 있으면 → 기존 워크스페이스 반환
    const existing = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      orderBy: { joinedAt: "asc" },
    });
    if (existing) {
      return NextResponse.json(
        { workspaceId: existing.workspaceId, alreadyExists: true },
        { status: 200 }
      );
    }

    const { inviteCode } = await req.json();
    if (!inviteCode?.trim()) {
      return NextResponse.json({ error: "초대 코드를 입력해주세요." }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode: inviteCode.trim() },
    });

    if (!workspace) {
      return NextResponse.json({ error: "유효하지 않은 초대 코드입니다." }, { status: 404 });
    }

    await prisma.workspaceMember.create({
      data: {
        userId: session.user.id,
        workspaceId: workspace.id,
        role: "MEMBER",
      },
    });

    return NextResponse.json({ workspaceId: workspace.id, workspaceName: workspace.name });
  } catch (error) {
    console.error("[WORKSPACE JOIN]", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
