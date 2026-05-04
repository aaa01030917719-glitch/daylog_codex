"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useDirtyLeaveGuard } from "@/hooks/useDirtyLeaveGuard";
import {
  NOTICE_CATEGORY_VALUES,
  NOTICE_TARGET_OPTIONS,
  getPriorityLabel,
} from "@/lib/notices";
import type {
  NoticeCategoryValue,
  NoticePriorityValue,
  NoticeWritePayload,
} from "@/components/notices/noticePageTypes";

interface NoticeWriteModalProps {
  open: boolean;
  mode: "create" | "edit";
  submitting: boolean;
  error: string | null;
  initialValues?: NoticeWritePayload | null;
  onClose: () => void;
  onSubmit: (payload: NoticeWritePayload) => Promise<void> | void;
}

type DraftTab = "content" | "target";

function getDefaultValues(): NoticeWritePayload {
  return {
    title: "",
    content: "",
    category: "공지",
    priority: "important",
    target: ["전체 대상"],
    requireReadConfirm: true,
    sendPush: true,
  };
}

export function NoticeWriteModal({
  open,
  mode,
  submitting,
  error,
  initialValues,
  onClose,
  onSubmit,
}: NoticeWriteModalProps) {
  const [activeTab, setActiveTab] = useState<DraftTab>("content");
  const [form, setForm] = useState<NoticeWritePayload>(getDefaultValues);
  const initialForm = initialValues ?? getDefaultValues();
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

    setActiveTab("content");
    setForm(initialValues ?? getDefaultValues());
  }, [initialValues, open]);

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

  function toggleTarget(value: string) {
    setForm((current) => {
      if (value === "전체 대상") {
        return { ...current, target: ["전체 대상"] };
      }

      const nextTarget = current.target.includes(value)
        ? current.target.filter((item) => item !== value)
        : [...current.target.filter((item) => item !== "전체 대상"), value];

      return {
        ...current,
        target: nextTarget.length > 0 ? nextTarget : ["전체 대상"],
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      return;
    }

    if (!form.content.trim()) {
      return;
    }

    await onSubmit({
      ...form,
      title: form.title.trim(),
      content: form.content.trim(),
    });
  }

  return (
    <div className="modal-shell" onClick={requestClose}>
      <div className="modal-overlay" />
      <div
        className="modal-card pointer-events-auto flex w-full max-w-[600px] flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--border-light)] px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[20px] font-bold text-[var(--text-primary)]">
                {mode === "edit" ? "공지 수정" : "공지 올리기"}
              </h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                내용 작성과 대상 설정을 나눠서 정리할 수 있어요
              </p>
            </div>
            <button type="button" onClick={requestClose} className="btn-icon-sm" aria-label="공지 작성 닫기">
              <X size={16} />
            </button>
          </div>

          <div className="mt-5 modal-tabs border-b border-[var(--border-light)]">
            {[
              { id: "content" as const, label: "내용 작성" },
              { id: "target" as const, label: "대상 설정" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`modal-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-5">
            {activeTab === "content" ? (
              <>
                <div className="field">
                  <label className="field-label" htmlFor="notice-write-title">
                    제목
                  </label>
                  <input
                    id="notice-write-title"
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    className="form-input"
                    placeholder="제목을 입력해주세요"
                    maxLength={120}
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="field">
                    <label className="field-label" htmlFor="notice-category">
                      카테고리
                    </label>
                    <select
                      id="notice-category"
                      value={form.category}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          category: event.target.value as NoticeCategoryValue,
                        }))
                      }
                      className="form-select"
                    >
                      {NOTICE_CATEGORY_VALUES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label className="field-label">중요도</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["normal", "important", "urgent"] as NoticePriorityValue[]).map((priority) => (
                        <button
                          key={priority}
                          type="button"
                          onClick={() => setForm((current) => ({ ...current, priority }))}
                          className={`rounded-[12px] border px-3 py-3 text-sm font-semibold ${
                            form.priority === priority
                              ? priority === "urgent"
                                ? "border-[#ef4444] bg-[var(--danger-light)] text-[#b42318]"
                                : priority === "important"
                                  ? "border-[#f97316] bg-[var(--warning-light)] text-[#c2410c]"
                                  : "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                              : "border-[var(--border)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {getPriorityLabel(priority)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="notice-write-content">
                    내용
                  </label>
                  <textarea
                    id="notice-write-content"
                    value={form.content}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, content: event.target.value }))
                    }
                    className="form-textarea min-h-[140px]"
                    placeholder="전달할 내용을 적어주세요"
                    required
                  />
                </div>
              </>
            ) : (
              <>
                <div className="field">
                  <label className="field-label">공개 대상</label>
                  <div className="flex flex-wrap gap-2">
                    {NOTICE_TARGET_OPTIONS.map((target) => {
                      const isSelected = form.target.includes(target);
                      return (
                        <button
                          key={target}
                          type="button"
                          onClick={() => toggleTarget(target)}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                            isSelected
                              ? "border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]"
                              : "border-[var(--border)] bg-white text-[var(--text-secondary)]"
                          }`}
                        >
                          {target}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4">
                  <label className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        읽음 확인 요청하기
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)]">
                        공지를 읽었는지 버튼으로 확인받아요
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.requireReadConfirm}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          requireReadConfirm: event.target.checked,
                        }))
                      }
                    />
                  </label>

                  <label className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        푸시 알림 보내기
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)]">
                        대상자에게 공지를 바로 알려줄 수 있어요
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={form.sendPush}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, sendPush: event.target.checked }))
                      }
                    />
                  </label>
                </div>
              </>
            )}

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
            <button type="submit" className="btn-modal btn-modal-primary" disabled={submitting}>
              {submitting ? "저장 중..." : mode === "edit" ? "공지 저장" : "공지 올리기"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
