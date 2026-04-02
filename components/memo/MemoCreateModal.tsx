"use client";

import { useEffect, useState } from "react";
import type { MemoNotePayload } from "@/components/memo/types";

interface MemoCreateModalProps {
  open: boolean;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: MemoNotePayload) => Promise<void>;
}

export function MemoCreateModal({
  open,
  submitting,
  error,
  onClose,
  onSubmit,
}: MemoCreateModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!open) {
      setTitle("");
      setContent("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      title: title.trim(),
      content: content.trim(),
    });
  }

  return (
    <div className="modal-shell" onClick={onClose}>
      <div className="modal-overlay" />
      <div className="modal-card modal-card--form" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">메모 추가</h2>
            <p className="modal-subtitle">개인 메모 공간에 바로 확인할 내용을 정리해 두세요.</p>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="메모 작성 모달 닫기">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-5">
            <div className="field">
              <label className="field-label" htmlFor="memo-title">메모 제목</label>
              <input
                id="memo-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="form-input"
                placeholder="예: 다음 주 클라이언트 미팅 준비"
                maxLength={80}
                required
                autoFocus
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="memo-content">메모 내용</label>
              <textarea
                id="memo-content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                className="form-textarea min-h-[160px]"
                placeholder="기억해야 할 일정, 체크할 항목, 개인 메모를 입력해 주세요."
                required
              />
            </div>

            {error ? (
              <div className="error-bar">{error}</div>
            ) : null}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="secondary-button" disabled={submitting}>
              취소
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "저장 중..." : "메모 저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
