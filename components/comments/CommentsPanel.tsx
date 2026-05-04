"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageSquareText } from "lucide-react";
import { CommentCard } from "@/components/comments/CommentCard";
import { CommentInput } from "@/components/comments/CommentInput";
import { useDirtyLeaveGuard } from "@/hooks/useDirtyLeaveGuard";
import { useUserProfilePreferences } from "@/lib/user-profile-preferences";
import type { CommentTargetType, DetailCommentItem } from "@/components/comments/types";

interface CommentsPanelProps {
  targetType: CommentTargetType;
  targetId: string;
  title?: string;
  embedded?: boolean;
}

function flattenComments(items: DetailCommentItem[]) {
  const result: DetailCommentItem[] = [];

  const visit = (nodes: DetailCommentItem[]) => {
    nodes.forEach((node) => {
      result.push(node);
      if (node.replies.length > 0) {
        visit(node.replies);
      }
    });
  };

  visit(items);
  return result;
}

export function CommentsPanel({
  targetType,
  targetId,
  title = "댓글",
  embedded = false,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<DetailCommentItem[]>([]);
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const flatComments = useMemo(() => flattenComments(comments), [comments]);
  const totalCommentCount = flatComments.length;
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
    useMemo(
      () => Array.from(new Set(flatComments.map((comment) => comment.author.id))),
      [flatComments]
    )
  );
  const editingOriginalContent = useMemo(
    () => flatComments.find((comment) => comment.id === editingId)?.content ?? "",
    [flatComments, editingId]
  );
  const hasUnsavedComment =
    content.trim().length > 0 ||
    (editingId !== null && editingContent !== editingOriginalContent);

  useDirtyLeaveGuard({ isDirty: hasUnsavedComment });

  const loadComments = useCallback(
    async ({ showLoader = true }: { showLoader?: boolean } = {}) => {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({ targetType, targetId });
        const response = await fetch(`/api/comments?${params.toString()}`);

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error ?? "댓글을 불러오지 못했습니다.");
        }

        const data = (await response.json()) as { comments: DetailCommentItem[] };
        setComments(data.comments);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "댓글을 불러오지 못했습니다."
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [targetId, targetType]
  );

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function createComment(nextContent: string, parentId?: string) {
    const trimmed = nextContent.trim();
    if (!trimmed) return;

    setError(null);

    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType,
        targetId,
        content: trimmed,
        parentId: parentId ?? null,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error ?? "댓글 등록에 실패했습니다.");
    }

    await loadComments({ showLoader: false });
  }

  async function handleCreateComment() {
    setSubmitting(true);
    setError(null);

    try {
      await createComment(content);
      setContent("");
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "댓글 등록에 실패했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReplyComment(parentId: string, nextContent: string) {
    setError(null);

    try {
      await createComment(nextContent, parentId);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : "대댓글 등록에 실패했습니다."
      );
      throw createError;
    }
  }

  function startEditing(comment: DetailCommentItem) {
    setEditingId(comment.id);
    setEditingContent(comment.content);
    setError(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingContent("");
  }

  async function handleUpdateComment(commentId: string) {
    const trimmed = editingContent.trim();
    if (!trimmed) return;

    setUpdatingId(commentId);
    setError(null);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "댓글 수정에 실패했습니다.");
      }

      await loadComments({ showLoader: false });
      cancelEditing();
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "댓글 수정에 실패했습니다."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!window.confirm("이 댓글을 삭제할까요?")) {
      return;
    }

    setDeletingId(commentId);
    setError(null);

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "DELETE",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "댓글 삭제에 실패했습니다.");
      }

      await loadComments({ showLoader: false });
      if (editingId === commentId) {
        cancelEditing();
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "댓글 삭제에 실패했습니다."
      );
    } finally {
      setDeletingId(null);
    }
  }

  function renderComment(comment: DetailCommentItem, depth = 0): JSX.Element {
    return (
      <CommentCard
        key={comment.id}
        comment={comment}
        depth={depth}
        replyCount={comment.replies.length}
        profile={profileMap.get(comment.author.id) ?? null}
        isEditing={editingId === comment.id}
        editingContent={editingId === comment.id ? editingContent : comment.content}
        isUpdating={updatingId === comment.id}
        isDeleting={deletingId === comment.id}
        onStartEdit={() => startEditing(comment)}
        onCancelEdit={cancelEditing}
        onEditingContentChange={setEditingContent}
        onSaveEdit={() => handleUpdateComment(comment.id)}
        onDelete={() => handleDeleteComment(comment.id)}
        onReplySubmit={(replyContent) => handleReplyComment(comment.id, replyContent)}
        renderReplies={
          comment.replies.length > 0
            ? comment.replies.map((reply) => renderComment(reply, depth + 1))
            : null
        }
      />
    );
  }

  return (
    <section className={embedded ? "" : "page-shell"}>
      <div className="comment-section-wrap">
        <div className="comment-header-bar">
          <div className="comment-header-icon" aria-hidden="true">
            <MessageSquareText size={15} strokeWidth={2} />
          </div>
          <div className="text-[13px] font-semibold text-[var(--text-primary)]">
            {title} <span className="text-[var(--accent)]">{totalCommentCount}</span>
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

        <div>
          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-[var(--radius)] border border-[var(--border-light)] bg-[var(--surface)] p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-[30px] w-[30px] rounded-full bg-[var(--surface-2)]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-24 rounded-full bg-[var(--surface-2)]" />
                      <div className="h-3 w-full rounded-full bg-[var(--surface-2)]" />
                      <div className="h-3 w-3/4 rounded-full bg-[var(--surface-2)]" />
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-center gap-2 pt-1 text-sm text-[var(--text-muted)]">
                <Loader2 size={15} className="animate-spin" />
                댓글을 불러오는 중입니다.
              </div>
            </div>
          ) : totalCommentCount === 0 ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 px-5 py-8 text-center text-[var(--text-muted)]">
              <MessageSquareText className="h-9 w-9 text-[var(--border)]" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                아직 댓글이 없어요. 첫 댓글을 남겨보세요.
              </p>
            </div>
          ) : (
            <div>{sortedComments.map((comment) => renderComment(comment))}</div>
          )}

          {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
        </div>

        <CommentInput
          value={content}
          isSubmitting={submitting}
          onChange={setContent}
          onSubmit={handleCreateComment}
        />
      </div>
    </section>
  );
}
