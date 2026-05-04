import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MemoPageClient } from "@/components/memo/MemoPageClient";
import type { MemoNoteSummary } from "@/components/memo/types";
import { listMemoNotes } from "@/lib/memo-notes";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

export const dynamic = "force-dynamic";

export default async function MemoPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  const currentUserId = session.user.id;

  let initialNotes: MemoNoteSummary[] = [];

  if (workspaceId) {
    initialNotes = await listMemoNotes(workspaceId, currentUserId);
  }

  return <MemoPageClient initialNotes={initialNotes} />;
}
