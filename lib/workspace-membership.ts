import { prisma } from "@/lib/prisma";

export async function resolveWorkspaceIdForUser(
  userId: string,
  sessionWorkspaceId?: string
) {
  if (sessionWorkspaceId) {
    const exactMembership = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: sessionWorkspaceId,
      },
      select: {
        workspaceId: true,
      },
    });

    if (exactMembership) {
      return exactMembership.workspaceId;
    }
  }

  const fallbackMembership = await prisma.workspaceMember.findFirst({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    select: {
      workspaceId: true,
    },
  });

  return fallbackMembership?.workspaceId ?? "";
}
