"use client";

interface MemoDeleteConfirmProps {
  open: boolean;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function MemoDeleteConfirm({
  open,
  deleting,
  onClose,
  onConfirm,
}: MemoDeleteConfirmProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-center justify-center bg-[rgba(16,20,36,0.5)] p-4 backdrop-blur-[4px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-[340px] rounded-[14px] bg-[var(--surface)] px-7 pb-[22px] pt-7 text-center shadow-[0_16px_48px_rgba(0,0,0,0.15)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-[14px] flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger-light)] text-[22px]">
          🗑️
        </div>
        <div className="mb-[6px] text-base font-bold text-[var(--text-primary)]">
          메모를 삭제할까요?
        </div>
        <div className="mb-[22px] text-[13px] leading-[1.55] text-[var(--text-muted)]">
          삭제한 메모는 복구할 수 없어요.
        </div>
        <div className="flex justify-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] border border-[var(--border)] bg-[var(--surface-2)] px-5 py-2 text-[13px] font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-3)]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-[6px] bg-[var(--danger)] px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#dc2626] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={deleting}
          >
            {deleting ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}
