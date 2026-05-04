import { BoardPostType, BoardPostVisibility } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { IdeasPageClient } from "@/components/ideas/IdeasPageClient";
import type { IdeaPostSummary } from "@/components/ideas/types";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

export default async function IdeasPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
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

    const commentCounts =
      posts.length > 0
        ? await prisma.detailComment.groupBy({
            by: ["targetId"],
            where: {
              targetType: "idea",
              targetId: { in: posts.map((post) => post.id) },
            },
            _count: { _all: true },
          })
        : [];

    const commentCountMap = new Map(
      commentCounts.map((item) => [item.targetId, item._count._all])
    );

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
      commentCount: commentCountMap.get(post.id) ?? 0,
    }));
  }

  return <IdeasPageClient initialPosts={initialPosts} currentUserId={currentUserId} />;
}
