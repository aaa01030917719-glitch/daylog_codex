"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { MoreHorizontal, X } from "lucide-react";
import { CommentPanel } from "@/components/comments/CommentPanel";

import { IdeaPostModal } from "@/components/ideas/IdeaPostModal";
import type { IdeaPostPayload, IdeaPostSummary, IdeasTab } from "@/components/ideas/types";
import { FilterChipGroup } from "@/components/ui/FilterChipGroup";

interface IdeasPageClientProps {
  initialPosts: IdeaPostSummary[];
  currentUserId: string;
}

type ModalState =
  | { mode: "create"; post: null }
  | { mode: "edit"; post: IdeaPostSummary }
  | null;

const TAB_LABELS: Record<IdeasTab, string> = {
  ALL: "전체",
  SHARED: "팀 공유",
  PRIVATE: "나만 보기",
};

const TAB_ITEMS = (Object.keys(TAB_LABELS) as IdeasTab[]).map((tab) => ({
  value: tab,
  label: TAB_LABELS[tab],
}));

const EMPTY_MESSAGES: Record<IdeasTab, { title: string; description: string }> = {
  ALL: {
    title: "등록된 아이디어가 없어요.",
    description: "생각이 떠오르면 바로 공유해보세요 ✨",
  },
  SHARED: {
    title: "팀과 공유한 아이디어가 없어요.",
    description: "팀과 함께 볼 아이디어를 올리면 여기서 볼 수 있어요.",
  },
  PRIVATE: {
    title: "나만 보는 아이디어가 없어요.",
    description: "혼자 정리할 아이디어를 나만 보기로 남겨보세요.",
  },
};

function sortIdeas(posts: IdeaPostSummary[]) {
  return [...posts].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

async function parseErrorMessage(response: Response) {
  try {
    const data = await response.json();
    if (data?.error && typeof data.error === "string") {
      return data.error;
    }
  } catch {
    return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function visibilityLabel(visibility: IdeaPostSummary["visibility"]) {
  return visibility === "PRIVATE" ? "나만 보기" : "공유됨";
}

function visibilityClassName(visibility: IdeaPostSummary["visibility"]) {
  return visibility === "PRIVATE"
    ? "status-badge status-badge--neutral"
    : "status-badge status-badge--accent";
}

export function IdeasPageClient({
  initialPosts,
  currentUserId,
}: IdeasPageClientProps) {
  const [posts, setPosts] = useState<IdeaPostSummary[]>(() => sortIdeas(initialPosts));
  const [activeTab, setActiveTab] = useState<IdeasTab>("ALL");
  const [modalState, setModalState] = useState<ModalState>(null);
  const [detailPost, setDetailPost] = useState<IdeaPostSummary | null>(null);
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuPostId) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (!target.closest("[data-idea-menu-root='true']")) {
        setOpenMenuPostId(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenuPostId(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuPostId]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDetailPost(null);
      }
    }

    if (detailPost) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [detailPost]);

  const visiblePosts = posts.filter((post) => {
    if (activeTab === "SHARED") {
      return post.visibility === "SHARED";
    }

    if (activeTab === "PRIVATE") {
      return post.visibility === "PRIVATE" && post.authorId === currentUserId;
    }

    return post.visibility === "SHARED" || post.authorId === currentUserId;
  });

  const tabCounts = {
    ALL: posts.filter((post) => post.visibility === "SHARED" || post.authorId === currentUserId)
      .length,
    SHARED: posts.filter((post) => post.visibility === "SHARED").length,
    PRIVATE: posts.filter(
      (post) => post.visibility === "PRIVATE" && post.authorId === currentUserId
    ).length,
  } satisfies Record<IdeasTab, number>;

  async function handleCreate(payload: IdeaPostPayload) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/board/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "IDEA",
          ...payload,
        }),
      });

      if (!response.ok) {
        setError(await parseErrorMessage(response));
        return;
      }

      const createdPost = (await response.json()) as IdeaPostSummary;

      setPosts((current) =>
        sortIdeas([{ ...createdPost, commentCount: createdPost.commentCount ?? 0 }, ...current])
      );

      setModalState(null);
      setOpenMenuPostId(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(payload: IdeaPostPayload) {
    if (!modalState || modalState.mode !== "edit") return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/board/posts/${modalState.post.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError(await parseErrorMessage(response));
        return;
      }

      const updatedPost = (await response.json()) as IdeaPostSummary;

      setPosts((current) =>
        sortIdeas(
          current.map((post) =>
            post.id === updatedPost.id
              ? {
                  ...updatedPost,
                  commentCount: updatedPost.commentCount ?? post.commentCount ?? 0,
                }
              : post
          )
        )
      );

      setDetailPost((current) =>
        current?.id === updatedPost.id
          ? {
              ...updatedPost,
              commentCount: updatedPost.commentCount ?? current.commentCount ?? 0,
            }
          : current
      );

      setModalState(null);
      setOpenMenuPostId(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(post: IdeaPostSummary) {
    setOpenMenuPostId(null);

    const confirmed = window.confirm("이 아이디어를 삭제할까요?");
    if (!confirmed) return;

    setDeletingId(post.id);

    try {
      const response = await fetch(`/api/board/posts/${post.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        window.alert(await parseErrorMessage(response));
        return;
      }

      setPosts((current) => current.filter((item) => item.id !== post.id));
      setDetailPost((current) => (current?.id === post.id ? null : current));
    } finally {
      setDeletingId(null);
    }
  }

  const editingInitialValues =
    modalState?.mode === "edit"
      ? {
          title: modalState.post.title,
          content: modalState.post.content,
          visibility: modalState.post.visibility,
        }
      : null;

  return (
    <>
      <div className="page-shell ideas-page-shell">
        <section className="page-header">
          <div className="page-header__meta">
            <div className="page-header__eyebrow">Idea Library</div>
            <h1 className="page-title">아이디어</h1>
            <p className="page-subtitle">생각이 떠오르면 바로 공유해보세요 ✨</p>
          </div>

          <div className="page-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setError(null);
                setModalState({ mode: "create", post: null });
              }}
            >
              아이디어 적기
            </button>
          </div>
        </section>

        <section className="page-control-strip !items-start !justify-start">
          <FilterChipGroup
            aria-label="아이디어 필터"
            items={TAB_ITEMS.map((item) => ({ ...item, count: tabCounts[item.value] }))}
            activeValue={activeTab}
            onChange={setActiveTab}
          />
        </section>

        {error ? (
          <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        <section className="space-y-4">
          {visiblePosts.length === 0 ? (
            <div className="empty-panel min-h-[220px]">
              <p className="empty-panel__title">{EMPTY_MESSAGES[activeTab].title}</p>
              <p className="empty-panel__description">{EMPTY_MESSAGES[activeTab].description}</p>
            </div>
          ) : (
            visiblePosts.map((post) => (
              <article
              key={post.id}
              className="list-card cursor-pointer transition"
              onClick={() => {
                setDetailPost(post);
                setOpenMenuPostId(null);
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={visibilityClassName(post.visibility)}>
                      {visibilityLabel(post.visibility)}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="inline-flex !text-[15px] font-semibold text-[var(--text-primary)]">
                      {post.title}
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                    {post.content}
                  </p>
                </div>

                {post.canManage ? (
                  <div
                    className="relative shrink-0"
                    data-idea-menu-root="true"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      className="icon-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuPostId((current) => (current === post.id ? null : post.id));
                      }}
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {openMenuPostId === post.id ? (
                      <div className="absolute right-0 top-10 z-50 min-w-[120px] rounded-xl border border-[var(--border)] bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-sm hover:bg-[var(--surface-muted)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuPostId(null);
                            setError(null);
                            setModalState({ mode: "edit", post });
                          }}
                        >
                          수정
                        </button>

                        <button
                          type="button"
                          className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-[var(--surface-muted)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(post);
                          }}
                          disabled={deletingId === post.id}
                        >
                          {deletingId === post.id ? "삭제 중..." : "삭제"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex w-full items-center text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-2">
                  <span>작성자 {post.authorName}</span>
                  <span>·</span>
                  <span>
                    {format(new Date(post.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                  </span>
                </div>

                <div className="ml-auto text-[12px] font-medium">
                  댓글 {post.commentCount}
                </div>
              </div>
            </article>
            ))
          )}
        </section>
      </div>

      {detailPost ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4"
          onClick={() => setDetailPost(null)}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={visibilityClassName(detailPost.visibility)}>
                    {visibilityLabel(detailPost.visibility)}
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">
                  {detailPost.title}
                </h2>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span>작성자 {detailPost.authorName}</span>
                  <span>·</span>
                  <span>
                    {format(new Date(detailPost.createdAt), "yyyy.MM.dd HH:mm", {
                      locale: ko,
                    })}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)]"
                onClick={() => setDetailPost(null)}
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                  {detailPost.content}
                </div>

                <CommentPanel embedded targetType="idea" targetId={detailPost.id} title="댓글" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <IdeaPostModal
        mode={modalState?.mode ?? "create"}
        open={modalState !== null}
        initialValues={editingInitialValues}
        submitting={submitting}
        error={error}
        onClose={() => {
          setModalState(null);
          setError(null);
        }}
        onSubmit={modalState?.mode === "edit" ? handleEdit : handleCreate}
      />
    </>
  );
}
