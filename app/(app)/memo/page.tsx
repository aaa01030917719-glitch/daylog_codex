import { BoardPostType, BoardPostVisibility } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MemoPageClient } from "@/components/memo/MemoPageClient";
import type { MemoNoteSummary } from "@/components/memo/types";
import { prisma } from "@/lib/prisma";

export default async function MemoPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;
  const currentUserId = session.user.id;

  let initialNotes: MemoNoteSummary[] = [];

  if (workspaceId) {
    const notes = await prisma.boardPost.findMany({
      where: {
        workspaceId,
        type: BoardPostType.IDEA,
        visibility: BoardPostVisibility.PRIVATE,
        authorId: currentUserId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    initialNotes = notes.map((note) => ({
      id: note.id,
      title: note.title ?? "제목 없음",
      content: note.content,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    }));
  }

  return <MemoPageClient initialNotes={initialNotes} />;
}
