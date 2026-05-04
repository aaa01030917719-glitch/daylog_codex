"use client";

interface MemoAddCardProps {
  onClick: () => void;
}

export function MemoAddCard({ onClick }: MemoAddCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[200px] flex-col items-center justify-center gap-[6px] rounded-[14px] border-2 border-dashed border-[var(--border)] bg-transparent text-[13.5px] font-medium text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-light)] hover:text-[var(--accent)]"
    >
      <span className="text-[22px] font-light leading-none">+</span>
      <span>새 메모</span>
    </button>
  );
}
