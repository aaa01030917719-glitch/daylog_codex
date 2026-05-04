import dynamic from "next/dynamic";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CommentSection } from "@/components/docs/CommentSection";

const DocEditor = dynamic(
  () => import("@/components/docs/DocEditor").then((module) => module.DocEditor),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          border: "1px solid #E8E0C8",
          borderRadius: "0.75rem",
          background: "#fff",
          padding: "1.5rem",
          color: "#666",
        }}
      >
        문서 편집기를 불러오는 중입니다.
      </div>
    ),
  }
);

export default async function DocDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const workspaceId = session.user.workspaceId ?? "";

  const [page, memberRows] = await Promise.all([
    prisma.page.findUnique({
      where: { id: params.id },
      include: {
        author: { select: { id: true, name: true } },
        children: {
          include: { author: { select: { id: true, name: true } } },
          orderBy: { updatedAt: "desc" },
        },
        parent: { select: { id: true, title: true, emoji: true } },
      },
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { id: true, name: true, image: true } } },
    }),
  ]);

  if (!page) notFound();
  if (page.workspaceId !== workspaceId) notFound();

  const members = memberRows.map((m) => m.user);

  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
      <DocEditor
        page={{
          id: page.id,
          title: page.title,
          emoji: page.emoji,
          content: page.content,
          isPublic: page.isPublic,
          parentId: page.parentId,
          authorId: page.authorId,
          updatedAt: page.updatedAt.toISOString(),
          parent: page.parent,
          children: page.children.map((c) => ({
            id: c.id,
            title: c.title,
            emoji: c.emoji,
            updatedAt: c.updatedAt.toISOString(),
            author: c.author,
          })),
        }}
        currentUserId={session.user.id}
        isAdmin={session.user.role === "ADMIN" || session.user.role === "OWNER"}
      />
      <CommentSection
        pageId={page.id}
        members={members}
        currentUserId={session.user.id}
      />
    </div>
  );
}
