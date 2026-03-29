import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ count: 0 });
  if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    return NextResponse.json({ count: 0 });
  }
  const workspaceId = session.user.workspaceId;
  if (!workspaceId) return NextResponse.json({ count: 0 });

  const count = await prisma.approval.count({
    where: {
      status: "PENDING",
      requester: { members: { some: { workspaceId } } },
    },
  });

  return NextResponse.json({ count });
}
