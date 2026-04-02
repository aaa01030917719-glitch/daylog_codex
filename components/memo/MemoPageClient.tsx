"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { MemoCreateModal } from "@/components/memo/MemoCreateModal";
import type { MemoNotePayload, MemoNoteSummary } from "@/components/memo/types";

interface MemoPageClientProps {
  initialNotes: MemoNoteSummary[];
}

function sortNotes(notes: MemoNoteSummary[]) {
  return [...notes].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

async function parseErrorMessage(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      return data.error;
    }
  } catch {
    return "메모를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "메모를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function toMemoSummary(data: {
  id: string;
  title?: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
}) {
  return {
    id: data.id,
    title: data.title?.trim() || "제목 없음",
    content: data.content,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  } satisfies MemoNoteSummary;
}

export function MemoPageClient({ initialNotes }: MemoPageClientProps) {
  const [notes, setNotes] = useState<MemoNoteSummary[]>(() => sortNotes(initialNotes));
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(payload: MemoNotePayload) {
    if (!payload.title.trim()) {
      setError("메모 제목을 입력해 주세요.");
      return;
    }

    if (!payload.content.trim()) {
      setError("메모 내용을 입력해 주세요.");
      return;
    }

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
          visibility: "PRIVATE",
          title: payload.title.trim(),
          content: payload.content.trim(),
        }),
      });

      if (!response.ok) {
        setError(await parseErrorMessage(response));
        return;
      }

      const created = (await response.json()) as {
        id: string;
        title?: string | null;
        content: string;
        createdAt: string;
        updatedAt: string;
      };

      setNotes((current) => sortNotes([toMemoSummary(created), ...current]));
      setModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(noteId: string) {
    const confirmed = window.confirm("이 메모를 삭제할까요?");
    if (!confirmed) {
      return;
    }

    setDeletingId(noteId);
    setError(null);

    try {
      const response = await fetch(`/api/board/posts/${noteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError(await parseErrorMessage(response));
        return;
      }

      setNotes((current) => current.filter((note) => note.id !== noteId));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <div className="page-shell">
        <section className="page-header">
          <div className="page-header__meta">
            <div className="page-header__eyebrow">Quick Memo</div>
            <h1 className="page-title">메모</h1>
            <p className="page-subtitle">개인 메모 공간입니다.</p>
          </div>
          <div className="page-actions">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setModalOpen(true);
              }}
              className="primary-button"
            >
              + 메모 추가
            </button>
          </div>
        </section>

        {error ? <div className="error-bar">{error}</div> : null}

        <section className="memo-grid">
          {notes.map((note) => (
            <article key={note.id} className="memo-note-card">
              <button
                type="button"
                onClick={() => void handleDelete(note.id)}
                disabled={deletingId === note.id}
                className="memo-note-delete"
                aria-label={`${note.title} 메모 삭제`}
              >
                {deletingId === note.id ? "…" : "×"}
              </button>

              <h2 className="memo-note-title">{note.title}</h2>
              <p className="memo-note-body">{note.content}</p>
              <div className="memo-note-date">
                {format(new Date(note.createdAt), "yyyy.MM.dd", { locale: ko })}
              </div>
            </article>
          ))}

          <button
            type="button"
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            className="memo-add-card"
          >
            <span className="memo-add-card__icon">+</span>
            <span className="memo-add-card__label">메모 추가</span>
          </button>
        </section>
      </div>

      <MemoCreateModal
        open={modalOpen}
        submitting={submitting}
        error={error}
        onClose={() => {
          setModalOpen(false);
          setError(null);
        }}
        onSubmit={handleCreate}
      />
    </>
  );
}
