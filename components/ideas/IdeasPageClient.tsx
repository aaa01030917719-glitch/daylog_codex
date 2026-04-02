"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { MoreHorizontal } from "lucide-react";
import { IdeaPostModal } from "@/components/ideas/IdeaPostModal";
import type { IdeaPostPayload, IdeaPostSummary, IdeasTab } from "@/components/ideas/types";

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
  SHARED: "전체 공유",
  PRIVATE: "개인 보관",
};

const EMPTY_MESSAGES: Record<IdeasTab, { title: string; description: string }> = {
  ALL: {
    title: "등록된 아이디어가 없습니다.",
    description: "공유 아이디어와 개인 보관 메모를 등록하면 최신 순서대로 표시됩니다.",
  },
  SHARED: {
    title: "공유된 아이디어가 없습니다.",
    description: "전체 공유로 등록한 아이디어만 이 탭에서 확인할 수 있습니다.",
  },
  PRIVATE: {
    title: "개인 보관 아이디어가 없습니다.",
    description: "나만 보는 메모나 검토 중인 아이디어를 개인 보관으로 저장해 보세요.",
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
  return visibility === "PRIVATE" ? "개인 보관" : "전체 공유";
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
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuPostId) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

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
    ALL: posts.filter((post) => post.visibility === "SHARED" || post.authorId === currentUserId).length,
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
      setPosts((current) => sortIdeas([createdPost, ...current]));
      setOpenMenuPostId(null);
      setModalState(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit(payload: IdeaPostPayload) {
    if (!modalState || modalState.mode !== "edit") {
      return;
    }

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
          current.map((post) => (post.id === updatedPost.id ? updatedPost : post))
        )
      );
      setOpenMenuPostId(null);
      setModalState(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(post: IdeaPostSummary) {
    setOpenMenuPostId(null);

    const confirmed = window.confirm("이 아이디어를 삭제할까요?");
    if (!confirmed) {
      return;
    }

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
      <div className="page-shell">
        <section className="page-header">
          <div className="page-header__meta">
            <div className="page-header__eyebrow">Idea Library</div>
            <h1 className="page-title">아이디어</h1>
            <p className="page-subtitle">
              공유 아이디어와 개인 보관 메모를 분리해서 관리하세요. 전체 탭에서는 전체 공유와 내가 작성한 개인 보관만 함께 확인할 수 있습니다.
            </p>
          </div>
          <div className="page-actions">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setModalState({ mode: "create", post: null });
              }}
              className="primary-button"
            >
              아이디어 추가
            </button>
          </div>
        </section>

        <section className="page-control-strip">
          <div className="pill-group">
            {(Object.keys(TAB_LABELS) as IdeasTab[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`pill-tab ${isActive ? "is-active" : ""}`}
                >
                  {TAB_LABELS[tab]} {tabCounts[tab]}
                </button>
              );
            })}
          </div>
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
              <article key={post.id} className="list-card">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={visibilityClassName(post.visibility)}>
                        {visibilityLabel(post.visibility)}
                      </span>
                      <h2 className="truncate text-lg font-semibold text-[var(--text-primary)]">{post.title}</h2>
                      
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--text-secondary)]">
                      
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
                      {post.content}
                    </p>
                    <span>작성자 {post.authorName}</span>
                      <span>{format(new Date(post.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
                  </div>

                  {post.canManage ? (
                    <div className="relative shrink-0 self-start" data-idea-menu-root="true">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="아이디어 작업 메뉴 열기"
                        aria-haspopup="menu"
                        aria-expanded={openMenuPostId === post.id}
                        onClick={() =>
                          setOpenMenuPostId((current) => (current === post.id ? null : post.id))
                        }
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {openMenuPostId === post.id ? (
                        <div
                          role="menu"
                          className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[132px] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-lg)]"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-2)]"
                            onClick={() => {
                              setOpenMenuPostId(null);
                              setError(null);
                              setModalState({ mode: "edit", post });
                            }}
                          >
                            수정
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleDelete(post)}
                            disabled={deletingId === post.id}
                            className="flex w-full items-center rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-medium text-[var(--danger)] transition hover:bg-[var(--danger-light)] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === post.id ? "삭제 중..." : "삭제"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </section>
      </div>

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
