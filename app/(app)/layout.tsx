import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import { DevResetButton } from "@/components/dev/DevResetButton";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

async function getInitialShellUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );

  if (!workspaceId) {
    return {
      name: session.user.name ?? null,
      image: session.user.image ?? null,
      role: session.user.role ?? null,
      workspaceId: session.user.workspaceId ?? null,
    };
  }

  const member = await prisma.workspaceMember.findFirst({
    where: {
      userId: session.user.id,
      workspaceId,
    },
    select: {
      role: true,
      workspaceId: true,
      user: {
        select: {
          name: true,
          image: true,
        },
      },
    },
  });

  return {
    name: member?.user.name ?? session.user.name ?? null,
    image: member?.user.image ?? session.user.image ?? null,
    role: member?.role ?? session.user.role ?? null,
    workspaceId: member?.workspaceId ?? workspaceId,
  };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const initialUser = await getInitialShellUser();

  return (
    <AppShell initialUser={initialUser}>
      {children}
      {process.env.NODE_ENV === "development" && <DevResetButton />}
    </AppShell>
  );
}
