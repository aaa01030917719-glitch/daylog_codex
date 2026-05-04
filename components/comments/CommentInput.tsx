"use client";

import { Loader2 } from "lucide-react";

interface CommentInputProps {
  value: string;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function CommentInput({
  value,
  isSubmitting,
  onChange,
  onSubmit,
}: CommentInputProps) {
  return (
    <div className="comment-input-area border-t border-[var(--border-light)] p-[14px_20px]">
      <div className="comment-input-box">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={1}
          placeholder="댓글을 입력하세요"
          className="max-h-[120px] min-h-5 w-full resize-none bg-transparent text-[13.5px] leading-6 text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          onInput={(event) => {
            event.currentTarget.style.height = "auto";
            event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 120)}px`;
          }}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11.5px] text-[var(--text-muted)]">
          공백만 입력한 댓글은 등록되지 않습니다.
        </p>
        <button
          type="button"
          className="comment-submit-btn inline-flex items-center justify-center gap-1.5"
          onClick={onSubmit}
          disabled={isSubmitting || !value.trim()}
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : null}
          등록
        </button>
      </div>
    </div>
  );
}
