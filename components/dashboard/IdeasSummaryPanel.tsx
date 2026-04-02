import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { IdeaPostSummary } from "@/components/ideas/types";

interface IdeasSummaryPanelProps {
  posts: IdeaPostSummary[];
}

function visibilityBadge(visibility: IdeaPostSummary["visibility"]) {
  return visibility === "PRIVATE"
    ? "status-badge status-badge--neutral"
    : "status-badge status-badge--accent";
}

export function IdeasSummaryPanel({ posts }: IdeasSummaryPanelProps) {
  const recentPosts = posts.slice(0, 3);

  return (
    <section className="card-panel overflow-hidden">
      <div className="card-header">
        <div>
          <div className="subtle-label">Idea Summary</div>
          <h3 className="card-title mt-2">최근 아이디어</h3>
          <p className="card-description">최근 등록된 아이디어 3개만 요약해서 보여드립니다.</p>
        </div>
        <Link href="/ideas" className="secondary-button px-3 py-2 text-xs">
          전체 보기
        </Link>
      </div>

      <div className="card-body py-3">
        {recentPosts.length === 0 ? (
          <div className="empty-panel min-h-[180px]">
            <p className="empty-panel__title">아직 등록된 아이디어가 없습니다.</p>
            <p className="empty-panel__description">새 아이디어가 생기면 최신 순서대로 이 영역에 표시됩니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentPosts.map((post) => (
              <Link key={post.id} href="/ideas" className="list-card block">
                <div className="flex items-center gap-2">
                  <span className={visibilityBadge(post.visibility)}>
                    {post.visibility === "PRIVATE" ? "개인 보관" : "전체 공유"}
                  </span>
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {post.title}
                    {post.visibility === "PRIVATE" ? " (개인 보관)" : ""}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
                  <span>{post.authorName}</span>
                  <span>{format(new Date(post.createdAt), "M/d", { locale: ko })}</span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{post.content}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
