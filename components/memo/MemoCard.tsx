"use client";

import { memo } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  MEMO_COLORS,
  MEMO_COLOR_ORDER,
  type MemoColor,
  type MemoNoteSummary,
} from "@/components/memo/types";

interface MemoCardProps {
  note: MemoNoteSummary;
  deleting: boolean;
  onOpen: (note: MemoNoteSummary) => void;
  onDelete: (note: MemoNoteSummary) => void;
  onColorChange: (id: string, color: MemoColor) => void;
}

function formatMemoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return format(date, "yyyy.MM.dd", { locale: ko });
}

function MemoCardComponent({
  note,
  deleting,
  onOpen,
  onDelete,
  onColorChange,
}: MemoCardProps) {
  const tone = MEMO_COLORS[note.color ?? "yellow"];

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(note)}
      onKeyDown={(event) => {
        if (event.currentTarget !== event.target) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(note);
        }
      }}
      className="group relative flex min-h-[200px] cursor-pointer flex-col rounded-[14px] border-[1.5px] px-4 pb-[14px] pt-[14px] text-left shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition duration-150 hover:-translate-y-[2px] hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)]"
      style={{
        background: tone.bg,
        borderColor: tone.border,
      }}
    >
      <div className="pointer-events-none absolute left-4 top-3 z-20 inline-flex max-w-[calc(100%-64px)] translate-y-[-2px] items-center gap-[5px] rounded-full bg-[rgba(255,255,255,0.9)] px-[8px] py-[6px] opacity-0 shadow-[0_4px_12px_rgba(15,23,42,0.08)] transition-[opacity,transform] duration-200 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
        {MEMO_COLOR_ORDER.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Change memo color to ${color}`}
            className="h-3 w-3 rounded-full border-[1.5px] border-black/10 transition-transform hover:scale-125"
            style={{ background: MEMO_COLORS[color].border }}
            onClick={(event) => {
              event.stopPropagation();
              onColorChange(note.id, color);
            }}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label="Delete memo"
        className="pointer-events-none absolute right-3 top-3 z-30 flex h-[24px] w-[24px] items-center justify-center rounded-full text-sm leading-none text-black/30 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 hover:bg-[var(--danger-light)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-40"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(note);
        }}
        disabled={deleting}
      >
        X
      </button>

      <div
        className="flex-1 whitespace-pre-wrap text-[13.5px] leading-[1.65] text-[var(--text-primary)]"
        style={{
          wordBreak: "break-all",
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 10,
          WebkitBoxOrient: "vertical",
        }}
      >
        {note.content}
      </div>

      <div className="mt-[14px] text-[11.5px] font-normal text-[var(--text-muted)]">
        {formatMemoDate(note.createdAt)}
      </div>
    </article>
  );
}

export const MemoCard = memo(MemoCardComponent);
