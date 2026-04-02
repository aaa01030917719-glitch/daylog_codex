import { BoardPostType, BoardPostVisibility } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { IdeasPageClient } from "@/components/ideas/IdeasPageClient";
import type { IdeaPostSummary } from "@/components/ideas/types";
import { prisma } from "@/lib/prisma";

export default async function IdeasPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspaceId = session.user.workspaceId;
  const currentUserId = session.user.id;

  let initialPosts: IdeaPostSummary[] = [];

  if (workspaceId) {
    const posts = await prisma.boardPost.findMany({
      where: {
        workspaceId,
        type: BoardPostType.IDEA,
        OR: [
          { visibility: BoardPostVisibility.SHARED },
          { visibility: BoardPostVisibility.PRIVATE, authorId: currentUserId },
        ],
      },
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    initialPosts = posts.map((post) => ({
      id: post.id,
      title: post.title ?? "",
      content: post.content,
      visibility: post.visibility,
      authorId: post.authorId,
      authorName: post.author.name ?? "이름 없음",
      canManage: post.authorId === currentUserId,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    }));
  }

  return <IdeasPageClient initialPosts={initialPosts} currentUserId={currentUserId} />;
}