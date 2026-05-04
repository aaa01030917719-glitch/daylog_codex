"use client";

import { useEffect, useState } from "react";

interface TaskTagModalProps {
  isOpen: boolean;
  title?: string;
  existingNames: string[];
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export function TaskTagModal({
  isOpen,
  title = "태그 추가",
  existingNames,
  onClose,
  onSubmit,
}: TaskTagModalProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setError(null);
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setError("태그 이름을 입력해 주세요.");
      return;
    }

    if (existingNames.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      setError("같은 이름의 태그가 이미 있습니다.");
      return;
    }

    onSubmit(trimmed);
    setName("");
    setError(null);
  }

  return (
    <div className="modal-shell" onClick={onClose}>
      <div className="modal-overlay" />
      <div
        className="modal-card modal-card--form pointer-events-auto flex w-full max-w-[420px] flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h3 className="modal-title">{title}</h3>
            <p className="modal-subtitle">태그 이름을 입력하고 저장해 주세요.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body space-y-4">
            <div className="field">
              <label className="field-label" htmlFor="task-tag-name">
                태그 이름
              </label>
              <input
                id="task-tag-name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) {
                    setError(null);
                  }
                }}
                className="form-input"
                placeholder="예: 디자인"
                autoFocus
              />
            </div>
            {error ? (
              <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
                {error}
              </div>
            ) : null}
          </div>
          <div className="modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>
              취소
            </button>
            <button type="submit" className="primary-button">
              추가
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
