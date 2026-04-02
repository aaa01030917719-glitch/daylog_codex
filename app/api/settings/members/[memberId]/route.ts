import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireOwnerWorkspace() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  return prisma.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
      role: "OWNER",
    },
    select: {
      workspaceId: true,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  const owner = await requireOwnerWorkspace();
  if (!owner) {
    return NextResponse.json({ error: "OWNER만 멤버 권한을 변경할 수 있습니다." }, { status: 403 });
  }

  const { memberId } = params;
  const body = await req.json();
  const role = body.role;

  if (role !== "ADMIN" && role !== "MEMBER") {
    return NextResponse.json({ error: "권한은 ADMIN 또는 MEMBER만 선택할 수 있습니다." }, { status: 400 });
  }

  const target = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!target || target.workspaceId !== owner.workspaceId) {
    return NextResponse.json({ error: "해당 멤버를 찾을 수 없습니다." }, { status: 404 });
  }

  if (target.role === "OWNER") {
    return NextResponse.json({ error: "OWNER 권한은 변경할 수 없습니다." }, { status: 400 });
  }

  const updated = await prisma.workspaceMember.update({
    where: { id: memberId },
    data: { role },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return NextResponse.json({
    member: {
      id: updated.id,
      userId: updated.user.id,
      name: updated.user.name ?? "이름 없음",
      email: updated.user.email,
      image: updated.user.image ?? null,
      role: updated.role,
      department: null,
      joinedAt: updated.joinedAt.toISOString(),
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  const owner = await requireOwnerWorkspace();
  if (!owner) {
    return NextResponse.json({ error: "OWNER만 멤버를 제외할 수 있습니다." }, { status: 403 });
  }

  const { memberId } = params;
  const target = await prisma.workspaceMember.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      role: true,
      workspaceId: true,
    },
  });

  if (!target || target.workspaceId !== owner.workspaceId) {
    return NextResponse.json({ error: "해당 멤버를 찾을 수 없습니다." }, { status: 404 });
  }

  if (target.role === "OWNER") {
    return NextResponse.json({ error: "OWNER는 제외할 수 없습니다." }, { status: 400 });
  }

  await prisma.workspaceMember.delete({
    where: { id: memberId },
  });

  return NextResponse.json({ memberId });
}
