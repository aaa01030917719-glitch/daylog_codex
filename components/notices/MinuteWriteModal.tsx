"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useDirtyLeaveGuard } from "@/hooks/useDirtyLeaveGuard";

interface MinuteWriteModalProps {
  open: boolean;
  mode?: "create" | "edit";
  submitting: boolean;
  error: string | null;
  initialValues?: { title: string; content: string } | null;
  onClose: () => void;
  onSubmit: (payload: { title: string; content: string }) => Promise<void> | void;
}

export function MinuteWriteModal({
  open,
  mode = "create",
  submitting,
  error,
  initialValues = null,
  onClose,
  onSubmit,
}: MinuteWriteModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const initialTitle = initialValues?.title ?? "";
  const initialContent = initialValues?.content ?? "";
  const isDirty =
    open &&
    (title.trim() !== initialTitle.trim() || content.trim() !== initialContent.trim());
  const { requestClose } = useDirtyLeaveGuard({
    isDirty,
    onDiscard: onClose,
    disabled: submitting || !open,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setTitle(initialTitle);
    setContent(initialContent);
  }, [initialContent, initialTitle, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, requestClose]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      return;
    }

    await onSubmit({
      title: title.trim(),
      content: content.trim(),
    });
  }

  return (
    <div className="modal-shell">
      <div className="modal-overlay" onClick={requestClose} />
      <div
        className="modal-card pointer-events-auto flex w-full max-w-[600px] flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.6)]"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--border-light)] px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-bold text-[var(--text-primary)]">
                {mode === "edit" ? "회의록 수정" : "회의록 작성"}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                회의 제목과 내용을 정리해 회의록 목록에 반영합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="btn-icon-sm"
              aria-label="회의록 작성 닫기"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            <div className="field">
              <label className="field-label" htmlFor="minute-write-title">
                제목
              </label>
              <input
                id="minute-write-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="form-input"
                placeholder="회의 제목을 입력해 주세요"
                maxLength={120}
                required
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="minute-write-content">
                내용
              </label>
              <textarea
                id="minute-write-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="form-textarea min-h-[300px]"
                placeholder="회의 내용을 적어 주세요"
                required
              />
            </div>

            {error ? (
              <div className="rounded-[14px] border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-light)] px-6 py-4">
            <button type="button" onClick={requestClose} className="btn-modal btn-modal-ghost">
              취소
            </button>
            <button
              type="submit"
              className="btn-modal btn-modal-primary"
              disabled={submitting || !title.trim() || !content.trim()}
            >
              {submitting ? "저장 중..." : mode === "edit" ? "수정 저장" : "회의록 저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
