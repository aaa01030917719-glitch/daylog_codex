"use client";

import { useEffect, useState } from "react";
import { useDirtyLeaveGuard } from "@/hooks/useDirtyLeaveGuard";
import type { IdeaPostPayload, IdeaVisibility } from "@/components/ideas/types";

interface IdeaPostModalProps {
  mode: "create" | "edit";
  open: boolean;
  initialValues?: IdeaPostPayload | null;
  submitting: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: IdeaPostPayload) => void | Promise<void>;
}

const DEFAULT_VALUES: IdeaPostPayload = {
  title: "",
  content: "",
  visibility: "SHARED",
};

const VISIBILITY_OPTIONS: Array<{ value: IdeaVisibility; label: string; description: string }> = [
  {
    value: "SHARED",
    label: "팀과 함께 보기",
    description: "팀원이 함께 볼 수 있어요.",
  },
  {
    value: "PRIVATE",
    label: "나만 보기",
    description: "작성한 사람만 볼 수 있어요.",
  },
];

export function IdeaPostModal({
  mode,
  open,
  initialValues,
  submitting,
  error,
  onClose,
  onSubmit,
}: IdeaPostModalProps) {
  const [form, setForm] = useState<IdeaPostPayload>(DEFAULT_VALUES);
  const initialForm = initialValues ?? DEFAULT_VALUES;
  const isDirty = open && JSON.stringify(form) !== JSON.stringify(initialForm);
  const { requestClose } = useDirtyLeaveGuard({
    isDirty,
    onDiscard: onClose,
    disabled: submitting || !open,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(initialValues ?? DEFAULT_VALUES);
  }, [initialValues, open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: IdeaPostPayload = {
      title: form.title.trim(),
      content: form.content.trim(),
      visibility: form.visibility,
    };

    if (!payload.title || !payload.content) {
      return;
    }

    await onSubmit(payload);
  }

  return (
    <div className="modal-shell" onClick={requestClose}>
      <div className="modal-overlay" />
      <div className="modal-card modal-card--form" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{mode === "create" ? "아이디어 적기" : "아이디어 수정"}</h2>
            <p className="modal-subtitle">제목과 내용을 편하게 적어보세요</p>
          </div>
          <button type="button" onClick={requestClose} className="icon-button" aria-label="아이디어 모달 닫기">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="field">
              <span className="field-label">공개 설정</span>
              <div className="grid gap-3 sm:grid-cols-2">
                {VISIBILITY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`choice-card cursor-pointer ${form.visibility === option.value ? "is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="idea-visibility"
                      value={option.value}
                      checked={form.visibility === option.value}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          visibility: event.target.value as IdeaVisibility,
                        }))
                      }
                      className="sr-only"
                    />
                    <div className="text-sm font-semibold text-[var(--text-primary)]">{option.label}</div>
                    <div className="text-xs leading-5 text-[var(--text-secondary)]">{option.description}</div>
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="idea-title">
                제목
              </label>
              <input
                id="idea-title"
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                className="form-input"
                placeholder="어떤 아이디어인가요?"
                maxLength={120}
                required
              />
            </div>

            <div className="field">
              <label className="field-label" htmlFor="idea-content">
                내용
              </label>
              <textarea
                id="idea-content"
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({ ...current, content: event.target.value }))
                }
                className="form-textarea min-h-[180px]"
                placeholder="생각나는 대로 편하게 적어보세요"
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
            <button type="button" onClick={requestClose} className="secondary-button">
              취소
            </button>
            <button type="submit" disabled={submitting} className="primary-button">
              {submitting ? "저장 중..." : mode === "create" ? "올리기" : "저장하기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
