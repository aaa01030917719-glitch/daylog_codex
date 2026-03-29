import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const workspaceId = session?.user?.workspaceId;
  if (!workspaceId) return NextResponse.json([], { status: 200 });

  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { user: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json(members.map((m) => m.user));
}
