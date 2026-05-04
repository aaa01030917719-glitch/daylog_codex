"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useDirtyLeaveGuard } from "@/hooks/useDirtyLeaveGuard";
import {
  MEMO_COLORS,
  MEMO_COLOR_ORDER,
  type MemoColor,
  type MemoNoteSummary,
} from "@/components/memo/types";

interface MemoEditModalProps {
  open: boolean;
  note: MemoNoteSummary | null;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: { content: string; color: MemoColor }) => Promise<void>;
}

function formatDisplayDate(value: string | null) {
  if (!value) {
    return format(new Date(), "yyyy.MM.dd", { locale: ko });
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, "yyyy.MM.dd", { locale: ko });
}

export function MemoEditModal({
  open,
  note,
  submitting,
  error,
  onClose,
  onSave,
}: MemoEditModalProps) {
  const [content, setContent] = useState("");
  const [color, setColor] = useState<MemoColor>("yellow");

  useEffect(() => {
    if (!open) {
      setContent("");
      setColor("yellow");
      return;
    }

    setContent(note?.content ?? "");
    setColor(note?.color ?? "yellow");
  }, [note, open]);

  const isDirty =
    open &&
    (content !== (note?.content ?? "") || color !== (note?.color ?? "yellow"));

  const { requestClose } = useDirtyLeaveGuard({
    isDirty,
    onDiscard: onClose,
    disabled: submitting || !open,
    message: "나가면 이 내용은 저장되지 않고 사라집니다.",
  });

  const currentTone = useMemo(() => MEMO_COLORS[color], [color]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        if (!submitting) {
          void onSave({
            content: content.trim(),
            color,
          });
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [color, content, onSave, open, submitting]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-[rgba(16,20,36,0.45)] p-4 backdrop-blur-[4px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <div
        className="flex min-h-[360px] w-full max-w-[520px] flex-col overflow-hidden rounded-[18px] border-2 shadow-[0_20px_60px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.4)]"
        style={{
          background: currentTone.bg,
          borderColor: currentTone.border,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pb-0 pt-4">
          <div className="flex items-center gap-[6px]">
            {MEMO_COLOR_ORDER.map((item) => (
              <button
                key={item}
                type="button"
                aria-label={`${item} 메모 색상`}
                className={`h-3 w-3 rounded-full border-[1.5px] border-black/10 transition-transform hover:scale-125 ${
                  color === item ? "scale-125 ring-2 ring-white/80 ring-offset-1 ring-offset-transparent" : ""
                }`}
                style={{ background: MEMO_COLORS[item].border }}
                onClick={() => setColor(item)}
              />
            ))}
          </div>

          <button
            type="button"
            aria-label="메모 닫기"
            onClick={requestClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10 text-[15px] text-black/40 transition hover:bg-black/15 hover:text-black/70"
          >
            ✕
          </button>
        </div>

        <div className="flex-1">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="mt-[14px] min-h-[260px] w-full flex-1 resize-none border-none bg-transparent px-4 text-sm leading-[1.7] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            placeholder="메모를 입력하세요..."
            autoFocus
          />
        </div>

        <div className="flex items-center justify-between px-4 pb-4 pt-3">
          <span className="text-[11.5px] text-[var(--text-muted)]">
            {formatDisplayDate(note?.createdAt ?? null)}
          </span>
          <button
            type="button"
            onClick={() =>
              void onSave({
                content: content.trim(),
                color,
              })
            }
            className="rounded-[6px] bg-[var(--accent)] px-[18px] py-[7px] text-[13px] font-semibold text-white shadow-[0_2px_8px_rgba(79,124,255,0.3)] transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>

        {error ? (
          <div className="px-4 pb-4">
            <div className="rounded-[10px] border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
              {error}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
