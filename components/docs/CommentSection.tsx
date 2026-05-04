"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { MessageSquareText, Send } from "lucide-react";
import {
  getUserAccentPalette,
  resolveUserDisplayName,
  useUserProfilePreferences,
} from "@/lib/user-profile-preferences";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string | Date;
  author: Author;
}

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  pageId: string;
  members: Member[];
  currentUserId: string;
}

const AVATAR_TONES = [
  { bg: "#F6E3A6", text: "#5a4200" },
  { bg: "#F6C6A0", text: "#7a3800" },
  { bg: "#F4B8C8", text: "#7a2040" },
  { bg: "#C8E6C8", text: "#1a4a1a" },
  { bg: "#B8D4F4", text: "#0a3060" },
  { bg: "#D4C8F4", text: "#3a2070" },
];

function getAvatarTone(seed: string) {
  const index = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_TONES[index % AVATAR_TONES.length];
}

export function CommentSection({ pageId, members, currentUserId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [mentionDropdown, setMentionDropdown] = useState<{ query: string; pos: number } | null>(
    null
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/pages/${pageId}/comments`);
    if (res.ok) {
      const data = await res.json();
      setComments(data.comments);
    }
  }, [pageId]);

  useEffect(() => {
    void fetchComments();
  }, [fetchComments]);

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setContent(value);

    const cursor = e.target.selectionStart;
    const textBefore = value.slice(0, cursor);
    const match = textBefore.match(/@(\w*)$/);
    if (match) {
      setMentionDropdown({ query: match[1], pos: cursor - match[0].length });
    } else {
      setMentionDropdown(null);
    }
  }

  function insertMention(member: Member) {
    if (!mentionDropdown) return;
    const memberName = member.name ?? "이름 없음";
    const before = content.slice(0, mentionDropdown.pos);
    const after = content.slice(textareaRef.current?.selectionStart ?? mentionDropdown.pos);
    const nextContent = `${before}@${memberName} ${after}`;
    setContent(nextContent);
    setMentionDropdown(null);
    textareaRef.current?.focus();
  }

  function parseMentionedUserIds(text: string): string[] {
    const regex = /@([^\s@]+)/g;
    const ids: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const name = match[1];
      const member = members.find((entry) => entry.name === name);
      if (member && !ids.includes(member.id)) {
        ids.push(member.id);
      }
    }

    return ids;
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    setSubmitting(true);

    try {
      const mentionedUserIds = parseMentionedUserIds(content);
      const res = await fetch(`/api/pages/${pageId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), mentionedUserIds }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setContent("");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const filteredMembers = useMemo(() => {
    if (!mentionDropdown) {
      return [];
    }

    return members.filter(
      (member) =>
        member.id !== currentUserId &&
        member.name?.toLowerCase().includes(mentionDropdown.query.toLowerCase())
    );
  }, [currentUserId, members, mentionDropdown]);

  const sortedComments = useMemo(
    () =>
      [...comments].sort((a, b) => {
        const aTime = new Date(a.createdAt).getTime();
        const bTime = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? aTime - bTime : bTime - aTime;
      }),
    [comments, sortOrder]
  );

  const profileMap = useUserProfilePreferences(
    useMemo(() => {
      const ids = comments.map((comment) => comment.author.id);
      filteredMembers.forEach((member) => ids.push(member.id));
      return ids;
    }, [comments, filteredMembers])
  );

  function renderContent(text: string) {
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("@")) {
        const name = part.slice(1);
        const isMember = members.some((member) => member.name === name);
        if (isMember) {
          return (
            <span key={index} className="font-semibold text-[var(--accent)]">
              {part}
            </span>
          );
        }
      }

      return <span key={index}>{part}</span>;
    });
  }

  return (
    <section className="mt-10 comment-section-wrap">
      <div className="comment-header-bar">
        <div className="comment-header-icon" aria-hidden="true">
          <MessageSquareText size={15} />
        </div>
        <div className="text-[13px] font-semibold text-[var(--text-primary)]">
          댓글 <span className="text-[var(--accent)]">{comments.length}</span>
        </div>
        <div className="comment-sort-tabs" aria-label="댓글 정렬">
          <button
            type="button"
            className={`comment-sort-tab ${sortOrder === "asc" ? "active" : ""}`}
            onClick={() => setSortOrder("asc")}
          >
            등록순
          </button>
          <button
            type="button"
            className={`comment-sort-tab ${sortOrder === "desc" ? "active" : ""}`}
            onClick={() => setSortOrder("desc")}
          >
            최신순
          </button>
        </div>
      </div>

      {comments.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-[var(--text-muted)]">
          <MessageSquareText className="mx-auto mb-2 h-8 w-8 text-[var(--border)]" />
          아직 댓글이 없어요. 첫 댓글을 남겨보세요.
        </div>
      ) : (
        <div>
          {sortedComments.map((comment) => {
            const profile = profileMap.get(comment.author.id) ?? null;
            const authorName = resolveUserDisplayName(comment.author.name ?? "이름 없음", profile);
            const avatarTone = getAvatarTone(comment.author.id || authorName);
            const palette = getUserAccentPalette(profile?.personalColor);

            return (
              <article key={comment.id} className="comment-item-wrap">
                <div className="flex items-start gap-[9px]">
                  <div
                    className="comment-avatar overflow-hidden"
                    style={{
                      background: profile?.personalColor ? palette.solid : avatarTone.bg,
                      color: profile?.personalColor ? palette.avatarText : avatarTone.text,
                    }}
                  >
                    {comment.author.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comment.author.image}
                        alt={authorName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      authorName.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                        {authorName}
                      </span>
                      {comment.author.id === currentUserId ? (
                        <span className="comment-role-chip mine">내 댓글</span>
                      ) : null}
                      <span className="text-[11.5px] text-[var(--text-muted)]">
                        {format(new Date(comment.createdAt), "yyyy.MM.dd HH:mm", {
                          locale: ko,
                        })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                      {renderContent(comment.content)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="comment-input-area relative border-t border-[var(--border-light)] p-[14px_20px]">
        {mentionDropdown && filteredMembers.length > 0 ? (
          <div className="absolute bottom-full left-5 right-5 z-10 mb-2 max-h-40 overflow-y-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow)]">
            {filteredMembers.map((member) => {
              const profile = profileMap.get(member.id) ?? null;
              const name = resolveUserDisplayName(member.name ?? "이름 없음", profile);
              const avatarTone = getAvatarTone(member.id || name);
              const palette = getUserAccentPalette(profile?.personalColor);

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => insertMention(member)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{
                      background: profile?.personalColor ? palette.solid : avatarTone.bg,
                      color: profile?.personalColor ? palette.avatarText : avatarTone.text,
                    }}
                  >
                    {name.charAt(0)}
                  </span>
                  {name}
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="comment-input-box">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !mentionDropdown) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder="댓글을 입력하세요. @이름으로 멘션할 수 있어요."
            rows={1}
            className="max-h-[120px] min-h-5 w-full resize-none bg-transparent text-[13.5px] leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            onInput={(event) => {
              event.currentTarget.style.height = "auto";
              event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 120)}px`;
            }}
          />
        </div>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11.5px] text-[var(--text-muted)]">
            공백만 입력한 댓글은 등록되지 않습니다.
          </p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !content.trim()}
            className="comment-submit-btn inline-flex items-center justify-center gap-1.5"
          >
            <Send size={14} />
            등록
          </button>
        </div>
      </div>
    </section>
  );
}
