"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

export interface BoardPostData {
  id: string;
  type: "NOTICE" | "IDEA" | "CEO_MESSAGE";
  title: string | null;
  content: string;
  tags: string[];
  status: "REVIEW" | "ADOPTED" | "HOLD" | null;
  authorName: string;
  createdAt: Date;
  likeCount: number;
  readCount: number;
  isLiked: boolean;
  isRead: boolean;
}

interface TeamBoardProps {
  posts: BoardPostData[];
  /** 지정 시 해당 타입만 단일 전체너비 섹션으로 렌더링 */
  filterType?: "NOTICE" | "IDEA" | "CEO_MESSAGE";
}

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  REVIEW:  { label: "검토중", bg: "#FFF8E6", color: "#D4A200" },
  ADOPTED: { label: "채택",   bg: "#E8F7EE", color: "var(--success)" },
  HOLD:    { label: "보류",   bg: "#F0F0F0", color: "#888" },
};

function NoticeCard({ post, onRead }: { post: BoardPostData; onRead: (id: string) => void }) {
  const isNew = Date.now() - new Date(post.createdAt).getTime() < 48 * 60 * 60 * 1000;
  return (
    <div className="py-3 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {isNew && (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                NEW
              </span>
            )}
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-title)" }}>
              {post.title ?? post.content}
            </p>
          </div>
          <p className="text-xs" style={{ color: "var(--text-sub)" }}>
            {format(new Date(post.createdAt), "M/d", { locale: ko })} · 읽음 {post.readCount}명
          </p>
        </div>
        {!post.isRead && (
          <button
            onClick={() => onRead(post.id)}
            className="flex-shrink-0 rounded-lg px-2.5 py-1 text-xs border transition-colors hover:bg-[var(--bg-light)]"
            style={{ borderColor: "var(--border)", color: "var(--text-body)" }}
          >
            읽었어요
          </button>
        )}
        {post.isRead && (
          <span className="text-xs flex-shrink-0" style={{ color: "var(--success)" }}>✓ 읽음</span>
        )}
      </div>
    </div>
  );
}

function IdeaCard({ post, onLike }: { post: BoardPostData; onLike: (id: string) => void }) {
  return (
    <div className="py-3 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {post.status && (
            <span
              className="inline-block text-xs px-1.5 py-0.5 rounded mb-1 font-medium"
              style={{ background: STATUS_LABEL[post.status].bg, color: STATUS_LABEL[post.status].color }}
            >
              {STATUS_LABEL[post.status].label}
            </span>
          )}
          <p className="text-sm font-medium truncate" style={{ color: "var(--text-title)" }}>
            {post.title ?? post.content}
          </p>
          {post.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {post.tags.map((t) => (
                <span key={t} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--table-header)", color: "var(--text-body)" }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => onLike(post.id)}
          className="flex-shrink-0 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs border transition-colors"
          style={{
            borderColor: post.isLiked ? "var(--accent)" : "var(--border)",
            color: post.isLiked ? "var(--accent)" : "var(--text-body)",
            background: post.isLiked ? "var(--accent-light)" : "#fff",
          }}
        >
          👍 {post.likeCount}
        </button>
      </div>
    </div>
  );
}

function CeoCard({ post }: { post: BoardPostData }) {
  return (
    <div className="py-3 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
      <p className="text-sm mb-1 line-clamp-2" style={{ color: "var(--text-sub-title)" }}>{post.content}</p>
      <div className="flex items-center justify-between">
        <p className="text-xs" style={{ color: "var(--text-sub)" }}>
          {post.authorName} · {format(new Date(post.createdAt), "M/d", { locale: ko })}
        </p>
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={
            post.readCount > 0
              ? { background: "#E8F7EE", color: "var(--success)" }
              : { background: "#F0F0F0", color: "#888" }
          }
        >
          {post.readCount > 0 ? "확인됨" : "미확인"}
        </span>
      </div>
    </div>
  );
}

function BoardWidget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-4 py-3" style={{ background: "var(--table-header)" }}>
        <h3 className="font-serif text-sm font-semibold" style={{ color: "var(--text-title)" }}>{title}</h3>
      </div>
      <div className="px-4 divide-y-0">{children}</div>
    </div>
  );
}

export function TeamBoard({ posts, filterType }: TeamBoardProps) {
  const [localPosts, setLocalPosts] = useState<BoardPostData[]>(posts);

  const notices = localPosts.filter((p) => p.type === "NOTICE");
  const ideas = localPosts.filter((p) => p.type === "IDEA");
  const ceoMsgs = localPosts.filter((p) => p.type === "CEO_MESSAGE");

  async function handleLike(id: string) {
    setLocalPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, isLiked: !p.isLiked, likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1 }
          : p
      )
    );
    await fetch("/api/board/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: id }),
    });
  }

  async function handleRead(id: string) {
    setLocalPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isRead: true, readCount: p.readCount + 1 } : p
      )
    );
    await fetch("/api/board/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: id }),
    });
  }

  // filterType 지정 시: 단일 타입 전체너비 렌더링 (OWNER 레이아웃용)
  if (filterType === "NOTICE") {
    return (
      <BoardWidget title="📢 팀 공지">
        {notices.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--text-sub)" }}>공지가 없습니다.</p>
        ) : (
          notices.map((p) => <NoticeCard key={p.id} post={p} onRead={handleRead} />)
        )}
      </BoardWidget>
    );
  }

  if (filterType === "IDEA") {
    return (
      <BoardWidget title="💡 아이디어 보드">
        {ideas.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--text-sub)" }}>등록된 아이디어가 없습니다.</p>
        ) : (
          ideas.map((p) => <IdeaCard key={p.id} post={p} onLike={handleLike} />)
        )}
      </BoardWidget>
    );
  }

  if (filterType === "CEO_MESSAGE") {
    return (
      <BoardWidget title="📬 직원 전달사항">
        {ceoMsgs.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--text-sub)" }}>전달된 내용이 없습니다.</p>
        ) : (
          ceoMsgs.map((p) => <CeoCard key={p.id} post={p} />)
        )}
      </BoardWidget>
    );
  }

  // 기본: 3열 그리드 (직원/관리자 레이아웃)
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <BoardWidget title="📢 팀 공지">
        {notices.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--text-sub)" }}>공지가 없습니다.</p>
        ) : (
          notices.map((p) => <NoticeCard key={p.id} post={p} onRead={handleRead} />)
        )}
      </BoardWidget>

      <BoardWidget title="💡 아이디어 보드">
        {ideas.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--text-sub)" }}>등록된 아이디어가 없습니다.</p>
        ) : (
          ideas.map((p) => <IdeaCard key={p.id} post={p} onLike={handleLike} />)
        )}
      </BoardWidget>

      <BoardWidget title="📬 직원 전달사항">
        {ceoMsgs.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: "var(--text-sub)" }}>전달된 내용이 없습니다.</p>
        ) : (
          ceoMsgs.map((p) => <CeoCard key={p.id} post={p} />)
        )}
      </BoardWidget>
    </div>
  );
}
