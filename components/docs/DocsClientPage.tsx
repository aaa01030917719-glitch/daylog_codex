"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, Plus } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface Page {
  id: string;
  title: string;
  emoji: string | null;
  isPublic: boolean;
  parentId: string | null;
  updatedAt: string | Date;
  author: { id: string; name: string | null; image: string | null };
  _count: { children: number };
}

interface Props {
  initialPages: Page[];
  currentUserId: string;
}

export function DocsClientPage({ initialPages }: Props) {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [creating, setCreating] = useState(false);

  const topLevelPages = pages.filter((page) => !page.parentId);
  const childPages = (parentId: string) => pages.filter((page) => page.parentId === parentId);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          emoji: newEmoji.trim() || null,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setPages((previous) => [data.page, ...previous]);
        setShowCreate(false);
        setNewTitle("");
        setNewEmoji("");
        router.push(`/docs/${data.page.id}`);
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
      <section className="card-panel h-fit">
        <div className="card-header card-header--compact">
          <div>
            <h3 className="card-title">문서 트리</h3>
            
          </div>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="secondary-button h-10 shrink-0 whitespace-nowrap px-3 py-2 text-xs"
          >
            <Plus size={14} />
            새 문서
          </button>
        </div>
        <div className="card-body space-y-2 p-4">
          {topLevelPages.length === 0 ? (
            <div className="empty-panel min-h-[180px]">
              <p className="empty-panel__title">문서가 없습니다.</p>
              <p className="empty-panel__description">새 문서를 만들면 이 영역에 구조가 표시됩니다.</p>
            </div>
          ) : (
            topLevelPages.map((page) => (
              <div key={page.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => router.push(`/docs/${page.id}`)}
                  className="flex w-full items-center gap-3 rounded-[10px] px-3 py-3 text-left text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-2)]"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--surface-2)] text-base">
                    {page.emoji ?? <FileText size={16} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{page.title}</span>
                  {page._count.children > 0 ? (
                    <span className="status-badge status-badge--neutral">{page._count.children}</span>
                  ) : null}
                </button>

                {childPages(page.id).map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => router.push(`/docs/${child.id}`)}
                    className="ml-6 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <ChevronRight size={14} className="text-[var(--text-muted)]" />
                    <span>{child.emoji ?? "📄"}</span>
                    <span className="min-w-0 flex-1 truncate">{child.title}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card-panel overflow-hidden">
        <div className="card-header">
          <div>
            <div className="subtle-label">Document List</div>
            <h3 className="card-title mt-2">문서 목록</h3>
           
          </div>
          <button type="button" onClick={() => setShowCreate(true)} className="primary-button">
            <Plus size={16} />
            문서 작성
          </button>
        </div>

        {topLevelPages.length === 0 ? (
          <div className="card-body">
            <div className="empty-panel min-h-[260px]">
              <FileText size={44} className="text-[var(--text-muted)]" />
              <p className="empty-panel__title">문서를 아직 만들지 않았습니다.</p>
              <p className="empty-panel__description">새 문서를 추가하면 최신 순서대로 이 영역에 표시됩니다.</p>
              <button type="button" onClick={() => setShowCreate(true)} className="text-button">
                첫 문서 만들기
              </button>
            </div>
          </div>
        ) : (
          <div className="table-shell border-0 shadow-none rounded-none">
            <table className="data-table">
              <thead>
                <tr>
                  {["제목", "작성자", "최근 수정"].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topLevelPages.map((page) => (
                  <tr key={page.id} className="cursor-pointer" onClick={() => router.push(`/docs/${page.id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--surface-2)] text-base">
                          {page.emoji ?? "📄"}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-[var(--text-primary)]">{page.title}</div>
                          {page._count.children > 0 ? (
                            <div className="mt-1 text-xs text-[var(--text-muted)]">하위 문서 {page._count.children}개</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td>{page.author.name}</td>
                    <td>{format(new Date(page.updatedAt), "MM/dd HH:mm", { locale: ko })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showCreate ? (
        <div className="modal-shell" onClick={() => setShowCreate(false)}>
          <div className="modal-overlay" />
          <div className="modal-card modal-card--form" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">문서 작성</h2>
                <p className="modal-subtitle">문서 제목과 이모지를 입력하고 새 문서를 시작하세요.</p>
              </div>
            </div>
            <div className="modal-body space-y-4">
              <div className="field">
                <label className="field-label" htmlFor="doc-emoji">이모지</label>
                <input
                  id="doc-emoji"
                  value={newEmoji}
                  onChange={(event) => setNewEmoji(event.target.value)}
                  placeholder="📄"
                  maxLength={2}
                  className="form-input w-20 text-center text-xl"
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="doc-title">제목</label>
                <input
                  id="doc-title"
                  autoFocus
                  value={newTitle}
                  onChange={(event) => setNewTitle(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && newTitle.trim() && void handleCreate()}
                  placeholder="예: 4월 운영 가이드"
                  className="form-input"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowCreate(false)} className="secondary-button">취소</button>
              <button type="button" onClick={() => void handleCreate()} disabled={creating || !newTitle.trim()} className="primary-button">
                {creating ? "생성 중..." : "문서 만들기"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
