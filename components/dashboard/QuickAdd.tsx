"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ModalType = "ceo" | null;

interface QuickAddModalProps {
  onClose: () => void;
}

function QuickAddModal({ onClose }: QuickAddModalProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) {
      return;
    }

    setLoading(true);
    try {
      await fetch("/api/board/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "CEO_MESSAGE",
          content: content.trim(),
        }),
      });
      setDone(true);
      setTimeout(onClose, 800);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-shell" onClick={onClose}>
      <div className="modal-overlay" />
      <div className="modal-card max-w-xl" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">대표님께 전달</h3>
            <p className="modal-subtitle">업무에 필요한 전달 사항을 간단히 남겨보세요.</p>
          </div>
          <button type="button" onClick={onClose} className="icon-button" aria-label="닫기">
            ×
          </button>
        </div>
        <div className="modal-body">
          {done ? (
            <p className="rounded-2xl border border-[#bae8c9] bg-[var(--success-light)] px-4 py-8 text-center text-sm font-semibold text-[#15803d]">
              전달 사항이 등록되었습니다.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="field">
                <label className="field-label" htmlFor="quick-add-message">
                  전달 내용
                </label>
                <textarea
                  id="quick-add-message"
                  placeholder="대표님께 공유할 내용을 입력해 주세요."
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  rows={4}
                  required
                  className="form-textarea min-h-[140px]"
                />
              </div>
              <div className="modal-footer border-t-0 px-0 pb-0 pt-2">
                <button type="button" onClick={onClose} className="secondary-button">
                  취소
                </button>
                <button type="submit" disabled={loading} className="primary-button">
                  {loading ? "등록 중..." : "전달 등록"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

interface QuickAddProps {
  userRole?: string;
}

export function QuickAdd({ userRole }: QuickAddProps) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalType>(null);
  const isOwner = userRole === "OWNER" || userRole === "ADMIN";

  const buttons = [
    {
      key: "idea" as const,
      label: "아이디어 관리 열기",
      description: "공유 아이디어와 개인 보관 메모를 확인합니다.",
      onClick: () => router.push("/ideas"),
    },
    ...(!isOwner
      ? [
          {
            key: "ceo" as const,
            label: "대표님께 전달",
            description: "대표 확인이 필요한 전달 사항을 바로 보냅니다.",
            onClick: () => setModal("ceo"),
          },
        ]
      : []),
  ];

  return (
    <>
      <div className={`grid grid-cols-1 gap-3 ${buttons.length > 1 ? "sm:grid-cols-2" : ""}`}>
        {buttons.map(({ key, label, description, onClick }) => (
          <button
            key={key}
            type="button"
            onClick={onClick}
            className="rounded-[18px] border border-dashed border-[var(--border)] bg-white px-4 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--accent)] hover:bg-[var(--accent-light)]"
          >
            <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
            <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>
          </button>
        ))}
      </div>
      {modal === "ceo" ? <QuickAddModal onClose={() => setModal(null)} /> : null}
    </>
  );
}
