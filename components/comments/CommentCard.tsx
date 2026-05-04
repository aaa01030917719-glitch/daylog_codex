"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Heart, Loader2, MessageSquare, MoreHorizontal, Send } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import type { DetailCommentItem } from "@/components/comments/types";
import {
  getUserAccentPalette,
  resolveUserDisplayName,
  type UserProfilePreferences,
} from "@/lib/user-profile-preferences";

interface CommentCardProps {
  comment: DetailCommentItem;
  profile?: UserProfilePreferences | null;
  isEditing: boolean;
  editingContent: string;
  isUpdating: boolean;
  isDeleting: boolean;
  depth?: number;
  replyCount: number;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditingContentChange: (value: string) => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  onReplySubmit: (content: string) => Promise<void>;
  renderReplies?: ReactNode;
}

const AVATAR_TONES = [
  { bg: "#F6E3A6", text: "#5a4200" },
  { bg: "#F6C6A0", text: "#7a3800" },
  { bg: "#F4B8C8", text: "#7a2040" },
  { bg: "#C8E6C8", text: "#1a4a1a" },
  { bg: "#B8D4F4", text: "#0a3060" },
  { bg: "#D4C8F4", text: "#3a2070" },
];

function formatCommentDate(value: string) {
  return format(new Date(value), "yyyy.MM.dd HH:mm", { locale: ko });
}

function createInitials(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function isOwnerRole(role?: string | null) {
  return role === "OWNER" || role?.toLowerCase() === "admin";
}

function getAvatarTone(seed: string) {
  const index = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_TONES[index % AVATAR_TONES.length];
}

export function CommentCard({
  comment,
  profile = null,
  isEditing,
  editingContent,
  isUpdating,
  isDeleting,
  depth = 0,
  replyCount,
  onStartEdit,
  onCancelEdit,
  onEditingContentChange,
  onSaveEdit,
  onDelete,
  onReplySubmit,
  renderReplies = null,
}: CommentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const isBusy = isUpdating || isDeleting;
  const isEdited = comment.updatedAt !== comment.createdAt;
  const isOwner = isOwnerRole(comment.author.role);
  const displayName = resolveUserDisplayName(comment.author.name, profile);
  const palette = getUserAccentPalette(profile?.personalColor);
  const avatarTone = useMemo(
    () => getAvatarTone(comment.author.id || comment.author.name),
    [comment.author.id, comment.author.name]
  );

  function handleEditClick() {
    setMenuOpen(false);
    onStartEdit();
  }

  function handleDeleteClick() {
    setMenuOpen(false);
    onDelete();
  }

  async function handleReplySubmit() {
    const trimmed = replyDraft.trim();
    if (!trimmed) {
      return;
    }

    setReplySubmitting(true);

    try {
      await onReplySubmit(trimmed);
      setReplyDraft("");
      setReplyOpen(false);
    } finally {
      setReplySubmitting(false);
    }
  }

  return (
    <article className="comment-item-wrap relative" data-depth={depth}>
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
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            createInitials(displayName)
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-[13px] font-semibold text-[var(--text-primary)]">
                  {displayName}
                </span>
                {comment.canManage ? (
                  <span className="comment-role-chip mine">내 댓글</span>
                ) : null}
                {isOwner ? <span className="comment-role-chip owner">관리자</span> : null}
                <span className="text-[11.5px] text-[var(--text-muted)]">
                  {formatCommentDate(comment.createdAt)}
                </span>
                {isEdited ? (
                  <span className="text-[10.5px] text-[var(--text-muted)]">수정됨</span>
                ) : null}
              </div>
            </div>

            {!isEditing ? (
              <div className="relative">
                <button
                  type="button"
                  className="comment-more-btn"
                  onClick={() => setMenuOpen((current) => !current)}
                  aria-label="댓글 메뉴 열기"
                  disabled={isBusy}
                >
                  {isDeleting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <MoreHorizontal size={16} />
                  )}
                </button>

                {menuOpen ? (
                  <div className="comment-dropdown">
                    {comment.canManage ? (
                      <>
                        <button
                          type="button"
                          className="comment-dropdown-item"
                          onClick={handleEditClick}
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          className="comment-dropdown-item danger"
                          onClick={handleDeleteClick}
                        >
                          삭제
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="comment-dropdown-item"
                        onClick={() => setMenuOpen(false)}
                      >
                        닫기
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          {isEditing ? (
            <div className="mt-3 space-y-3">
              <textarea
                value={editingContent}
                onChange={(event) => onEditingContentChange(event.target.value)}
                rows={4}
                className="comment-edit-area"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-modal btn-modal-ghost"
                  onClick={onCancelEdit}
                  disabled={isUpdating}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn-modal btn-modal-primary"
                  onClick={onSaveEdit}
                  disabled={isUpdating || !editingContent.trim()}
                >
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                  저장
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="pt-2">
                <p className="whitespace-pre-wrap text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                  {comment.content}
                </p>
              </div>

              <div className="mt-3 flex items-center gap-4">
                <button
                  type="button"
                  className={`comment-action-btn ${liked ? "liked" : ""}`}
                  onClick={() => setLiked((current) => !current)}
                  aria-pressed={liked}
                >
                  <Heart size={13} fill={liked ? "currentColor" : "none"} />
                  좋아요 {liked ? 1 : 0}
                </button>
                <button
                  type="button"
                  className="comment-action-btn"
                  onClick={() => setReplyOpen((current) => !current)}
                  aria-expanded={replyOpen}
                >
                  <MessageSquare size={13} />
                  답글 {replyCount}
                </button>
              </div>

              {replyOpen || renderReplies ? (
                <div className="reply-list-wrap mt-3">
                  <div className="space-y-3">
                    {renderReplies}

                    {replyOpen ? (
                      <div className="reply-input-pill">
                        <input
                          value={replyDraft}
                          onChange={(event) => setReplyDraft(event.target.value)}
                          placeholder="답글을 입력해 주세요"
                          className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
                        />
                        <button
                          type="button"
                          className="reply-send-circle"
                          disabled={replySubmitting || !replyDraft.trim()}
                          onClick={() => void handleReplySubmit()}
                          aria-label="답글 보내기"
                        >
                          {replySubmitting ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Send size={13} />
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
