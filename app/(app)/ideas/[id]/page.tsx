import { BoardPostType } from "@prisma/client";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { CommentPanel } from "@/components/comments/CommentPanel";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceIdForUser } from "@/lib/workspace-membership";

function visibilityBadge(visibility: "SHARED" | "PRIVATE") {
  return visibility === "PRIVATE"
    ? { label: "개인 보관", className: "status-badge status-badge--neutral" }
    : { label: "전체 공유", className: "status-badge status-badge--accent" };
}

export default async function IdeaDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const workspaceId = await resolveWorkspaceIdForUser(
    session.user.id,
    session.user.workspaceId
  );
  if (!workspaceId) {
    notFound();
  }

  const post = await prisma.boardPost.findFirst({
    where: {
      id: params.id,
      workspaceId,
      type: BoardPostType.IDEA,
      OR: [
        { visibility: "SHARED" },
        { visibility: "PRIVATE", authorId: session.user.id },
      ],
    },
    include: {
      author: {
        select: { name: true },
      },
    },
  });

  if (!post) {
    notFound();
  }

  const visibility = visibilityBadge(post.visibility);

  return (
    <div className="page-shell">
      <section className="page-header">
        <div className="page-header__meta">
          <div className="page-header__eyebrow">Idea Detail</div>
          <h1 className="page-title">아이디어 상세</h1>
          <p className="page-subtitle">
            아이디어 내용과 관련된 대화를 같은 화면에서 함께 확인할 수 있습니다.
          </p>
        </div>
        <div className="page-actions">
          <Link href="/ideas" className="secondary-button">
            목록으로
          </Link>
        </div>
      </section>

      <section className="card-panel">
        <div className="card-header">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={visibility.className}>{visibility.label}</span>
              <span className="text-xs text-[var(--text-muted)]">
                {format(new Date(post.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
              </span>
            </div>
            <h2 className="card-title text-xl">{post.title ?? "제목 없음"}</h2>
            <p className="card-description">작성자 {post.author.name ?? "이름 없음"}</p>
          </div>
        </div>
        <div className="card-body">
          <div className="p-5">
            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
              {post.content}
            </p>
          </div>
        </div>
      </section>

      <CommentPanel targetType="idea" targetId={post.id} title="댓글" />
    </div>
  );
}
