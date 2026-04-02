"use client";

import { useEffect, useState } from "react";
import {
  NOTICE_BADGE_OPTIONS,
  type NoticeBadgeValue,
  type NoticePayload,
} from "@/components/notices/types";

interface NoticeCreateModalProps {
  open: boolean;
  submitting: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: NoticePayload) => void | Promise<void>;
}

function getTodayValue() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultValues(): NoticePayload {
  const today = getTodayValue();

  return {
    title: "",
    content: "",
    badge: "NOTICE",
    startDate: today,
    endDate: today,
  };
}

export function NoticeCreateModal({
  open,
  submitting,
  error,
  onClose,
  onSubmit,
}: NoticeCreateModalProps) {
  const [form, setForm] = useState<NoticePayload>(getDefaultValues);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(getDefaultValues());
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: NoticePayload = {
      title: form.title.trim(),
      content: form.content.trim(),
      badge: form.badge,
      startDate: form.startDate,
      endDate: form.endDate,
    };

    if (!payload.title || !payload.content || !payload.startDate || !payload.endDate) {
      return;
    }

    await onSubmit(payload);
  }

  return (
    <div className="modal-shell" onClick={onClose}>
      <div className="modal-overlay" />
      <div className="modal-card modal-card--form" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">공지 작성</h2>
            <p className="modal-subtitle">제목, 내용, 공지 기간, 뱃지를 입력해 공지를 등록하세요.</p>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="공지 작성 모달 닫기">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="field">
              <label className="field-label" htmlFor="notice-title">
                제목
              </label>
              <input
                id="notice-title"
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                className="form-input"
                placeholder="공지 제목을 입력해 주세요"
                maxLength={120}
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="field">
                <label className="field-label" htmlFor="notice-badge">
                  뱃지
                </label>
                <select
                  id="notice-badge"
                  value={form.badge}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      badge: event.target.value as NoticeBadgeValue,
                    }))
                  }
                  className="form-select"
                >
                  {NOTICE_BADGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="notice-start-date">
                  시작일
                </label>
                <input
                  id="notice-start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startDate: event.target.value }))
                  }
                  className="form-input"
                  required
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="notice-end-date">
                  종료일
                </label>
                <input
                  id="notice-end-date"
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endDate: event.target.value }))
                  }
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="notice-content">
                내용
              </label>
              <textarea
                id="notice-content"
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({ ...current, content: event.target.value }))
                }
                className="form-textarea min-h-[200px]"
                placeholder="공지 내용을 입력해 주세요"
                required
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
                {error}
              </div>
            ) : null}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="secondary-button">
              취소
            </button>
            <button type="submit" disabled={submitting} className="primary-button">
              {submitting ? "저장 중..." : "공지 등록"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
