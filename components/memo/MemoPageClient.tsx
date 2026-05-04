"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MemoAddCard } from "@/components/memo/MemoAddCard";
import { MemoCard } from "@/components/memo/MemoCard";
import { MemoDeleteConfirm } from "@/components/memo/MemoDeleteConfirm";
import { MemoEditModal } from "@/components/memo/MemoEditModal";
import type { MemoColor, MemoNoteSummary } from "@/components/memo/types";

interface MemoPageClientProps {
  initialNotes: MemoNoteSummary[];
}

const FALLBACK_SQL =
  'ALTER TABLE "Memo" ADD COLUMN IF NOT EXISTS "color" TEXT NOT NULL DEFAULT \'yellow\';';

function sortNotes(notes: MemoNoteSummary[]) {
  return [...notes].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function deriveMemoTitle(content: string) {
  const firstLine = content
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  return (firstLine ?? "메모").slice(0, 80);
}

async function parseErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    if (typeof data.error === "string") {
      return data.error;
    }
  } catch {
    // noop
  }

  return "메모를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

function getStorageKey(id: string) {
  return `memo-color-${id}`;
}

function getStoredColor(id: string): MemoColor {
  if (typeof window === "undefined") {
    return "yellow";
  }

  const saved = window.localStorage.getItem(getStorageKey(id));
  if (
    saved === "yellow" ||
    saved === "blue" ||
    saved === "green" ||
    saved === "pink" ||
    saved === "purple" ||
    saved === "white"
  ) {
    return saved;
  }

  return "yellow";
}

function saveStoredColor(id: string, color: MemoColor) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getStorageKey(id), color);
}

function withColor(note: MemoNoteSummary): MemoNoteSummary {
  return {
    ...note,
    color: note.color ?? "yellow",
  };
}

export function MemoPageClient({ initialNotes }: MemoPageClientProps) {
  const [notes, setNotes] = useState<MemoNoteSummary[]>(() =>
    sortNotes(initialNotes.map(withColor))
  );
  const [editorNoteId, setEditorNoteId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const normalizeNotes = useCallback((incoming: MemoNoteSummary[]) => {
    return sortNotes(
      incoming.map((note) => ({
        ...withColor(note),
        color: getStoredColor(note.id),
      }))
    );
  }, []);

  const refreshNotes = useCallback(async () => {
    try {
      const response = await fetch("/api/memos", { cache: "no-store" });
      const data = (await response.json()) as { memos?: MemoNoteSummary[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "메모 목록을 불러오지 못했어요.");
      }

      setNotes(normalizeNotes(data.memos ?? []));
    } catch (refreshError) {
      console.error("[MEMO_REFRESH]", refreshError);
    }
  }, [normalizeNotes]);

  useEffect(() => {
    setNotes(normalizeNotes(initialNotes));
    console.info("[MEMO_COLOR_SQL]", FALLBACK_SQL);
  }, [initialNotes, normalizeNotes]);

  useEffect(() => {
    void refreshNotes();

    function handleFocus() {
      void refreshNotes();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshNotes();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refreshNotes]);

  const selectedNote = useMemo(
    () => (editorNoteId ? notes.find((note) => note.id === editorNoteId) ?? null : null),
    [editorNoteId, notes]
  );

  async function handleSave(payload: { content: string; color: MemoColor }) {
    if (!payload.content.trim()) {
      setError("메모를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (selectedNote) {
        const response = await fetch(`/api/memos/${selectedNote.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: deriveMemoTitle(payload.content),
            content: payload.content,
          }),
        });

        if (!response.ok) {
          setError(await parseErrorMessage(response));
          return;
        }

        const updated = (await response.json()) as MemoNoteSummary;
        const nextNote: MemoNoteSummary = {
          ...updated,
          color: payload.color,
        };

        saveStoredColor(nextNote.id, payload.color);
        setNotes((current) =>
          sortNotes(current.map((note) => (note.id === nextNote.id ? nextNote : note)))
        );
      } else {
        const response = await fetch("/api/memos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: deriveMemoTitle(payload.content),
            content: payload.content,
          }),
        });

        if (!response.ok) {
          setError(await parseErrorMessage(response));
          return;
        }

        const created = (await response.json()) as MemoNoteSummary;
        const nextNote: MemoNoteSummary = {
          ...created,
          color: payload.color,
        };

        saveStoredColor(nextNote.id, payload.color);
        setNotes((current) => sortNotes([nextNote, ...current]));
      }

      setEditorOpen(false);
      setEditorNoteId(null);
      void refreshNotes();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTargetId) {
      return;
    }

    setDeletingId(deleteTargetId);
    setError(null);

    try {
      const response = await fetch(`/api/memos/${deleteTargetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        setError(await parseErrorMessage(response));
        return;
      }

      setNotes((current) => current.filter((note) => note.id !== deleteTargetId));
      if (editorNoteId === deleteTargetId) {
        setEditorOpen(false);
        setEditorNoteId(null);
      }
      setDeleteTargetId(null);
      void refreshNotes();
    } finally {
      setDeletingId(null);
    }
  }

  function handleColorChange(id: string, color: MemoColor) {
    saveStoredColor(id, color);
    setNotes((current) =>
      current.map((note) => (note.id === id ? { ...note, color } : note))
    );
  }

  function openCreateModal() {
    setEditorNoteId(null);
    setError(null);
    setEditorOpen(true);
  }

  function openEditModal(note: MemoNoteSummary) {
    setEditorNoteId(note.id);
    setError(null);
    setEditorOpen(true);
  }

  return (
    <>
      <div className="page-shell">
        <section className="page-header">
          <div className="page-header__meta">
            <h1 className="page-title">내 메모</h1>
            <p className="page-subtitle">나만 볼 수 있는 공간이에요</p>
          </div>
          <div className="page-actions">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-[6px] rounded-[6px] bg-[var(--accent)] px-[18px] py-[9px] text-[13.5px] font-semibold text-white shadow-[0_2px_8px_rgba(79,124,255,0.28)] transition hover:bg-[var(--accent-hover)] hover:shadow-[0_4px_14px_rgba(79,124,255,0.36)] active:scale-[0.97]"
            >
              <span className="text-[13px]">+</span>
              메모 쓰기
            </button>
          </div>
        </section>

        {error ? (
          <div className="mb-4 rounded-[10px] border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-4 items-start gap-4 max-[1100px]:grid-cols-3 max-[780px]:grid-cols-2 max-[500px]:grid-cols-1">
          {notes.map((note) => (
            <MemoCard
              key={note.id}
              note={note}
              deleting={deletingId === note.id}
              onOpen={openEditModal}
              onDelete={(target) => setDeleteTargetId(target.id)}
              onColorChange={handleColorChange}
            />
          ))}
          <MemoAddCard onClick={openCreateModal} />
        </section>
      </div>

      <MemoEditModal
        open={editorOpen}
        note={selectedNote}
        submitting={submitting}
        error={error}
        onClose={() => {
          setEditorOpen(false);
          setEditorNoteId(null);
          setError(null);
        }}
        onSave={handleSave}
      />

      <MemoDeleteConfirm
        open={deleteTargetId !== null}
        deleting={Boolean(deleteTargetId && deletingId === deleteTargetId)}
        onClose={() => {
          if (!deletingId) {
            setDeleteTargetId(null);
          }
        }}
        onConfirm={() => {
          void handleDelete();
        }}
      />
    </>
  );
}
