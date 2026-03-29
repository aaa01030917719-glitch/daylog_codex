import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  // 프로덕션 완전 차단
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "개발 환경에서만 사용할 수 있습니다." }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    // OWNER인 워크스페이스 찾기
    const ownerMember = await prisma.workspaceMember.findFirst({
      where: { userId, role: "OWNER" },
      select: { workspaceId: true },
    });

    if (ownerMember) {
      const workspaceId = ownerMember.workspaceId;

      // FK 제약 순서대로 워크스페이스 관련 데이터 전부 삭제
      await prisma.$transaction([
        prisma.boardLike.deleteMany({ where: { post: { workspaceId } } }),
        prisma.boardRead.deleteMany({ where: { post: { workspaceId } } }),
        prisma.boardPost.deleteMany({ where: { workspaceId } }),
        prisma.comment.deleteMany({ where: { page: { workspaceId } } }),
        prisma.page.deleteMany({ where: { workspaceId } }),
        prisma.attendance.deleteMany({ where: { workspaceId } }),
        prisma.notification.deleteMany({ where: { userId } }),
        prisma.approval.deleteMany({
          where: { requester: { members: { some: { workspaceId } } } },
        }),
        prisma.task.deleteMany({ where: { project: { workspaceId } } }),
        prisma.project.deleteMany({ where: { workspaceId } }),
        prisma.event.deleteMany({ where: { workspaceId } }),
        prisma.workspaceMember.deleteMany({ where: { workspaceId } }),
        prisma.workspace.delete({ where: { id: workspaceId } }),
      ]);
    } else {
      // MEMBER인 경우 — 본인 멤버십만 제거
      await prisma.workspaceMember.deleteMany({ where: { userId } });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DEV RESET]", error);
    return NextResponse.json({ error: "초기화 중 오류가 발생했습니다." }, { status: 500 });
  }
}
