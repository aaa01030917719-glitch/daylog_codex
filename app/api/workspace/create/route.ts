import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 40);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    console.log("[WORKSPACE CREATE] session:", JSON.stringify(session?.user));

    if (!session?.user?.id) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // 이미 워크스페이스에 속해 있으면 거부
    const existing = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
    });
    if (existing) {
      return NextResponse.json({ error: "이미 워크스페이스에 속해 있습니다." }, { status: 409 });
    }

    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "워크스페이스 이름을 입력해주세요." }, { status: 400 });
    }

    const baseSlug = toSlug(name.trim()) || "workspace";
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        slug,
        members: {
          create: {
            userId: session.user.id,
            role: "OWNER",
          },
        },
      },
    });

    console.log("[WORKSPACE CREATE] success:", workspace.id);
    return NextResponse.json({ workspaceId: workspace.id }, { status: 201 });
  } catch (error) {
    console.error("[WORKSPACE CREATE] error:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
