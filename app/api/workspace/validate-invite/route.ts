import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { inviteCode } = await req.json();
    if (!inviteCode?.trim()) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { inviteCode: inviteCode.trim() },
      select: {
        name: true,
        members: {
          where: { role: "OWNER" },
          select: { user: { select: { name: true } } },
          take: 1,
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ valid: false });
    }

    const ownerName = workspace.members[0]?.user?.name ?? null;

    return NextResponse.json({ valid: true, workspaceName: workspace.name, ownerName });
  } catch (error) {
    console.error("[VALIDATE INVITE]", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
