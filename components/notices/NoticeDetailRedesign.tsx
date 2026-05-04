"use client";

import { useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarDays, Check, Pencil, Trash2, UserRound, Users2, X } from "lucide-react";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import { getPriorityLabel } from "@/lib/notices";
import type { NoticePageNotice } from "@/components/notices/noticePageTypes";

interface NoticeDetailModalProps {
  open: boolean;
  notice: NoticePageNotice | null;
  isAdmin: boolean;
  confirming: boolean;
  deleting: boolean;
  onClose: () => void;
  onConfirmRead: (notice: NoticePageNotice) => Promise<void> | void;
  onEdit: (notice: NoticePageNotice) => void;
  onDelete: (notice: NoticePageNotice) => Promise<void> | void;
}

function getCategoryTone(category: NoticePageNotice["category"]) {
  switch (category) {
    case "일정":
      return "bg-[var(--accent-light)] text-[var(--accent)]";
    case "시설":
      return "bg-[var(--warning-light)] text-[#c2410c]";
    case "인사":
      return "bg-[var(--success-light)] text-[var(--success)]";
    default:
      return "bg-[var(--surface-3)] text-[var(--text-secondary)]";
  }
}

function getPriorityTone(priority: NoticePageNotice["priority"]) {
  switch (priority) {
    case "urgent":
      return "bg-[var(--danger-light)] text-[var(--danger)]";
    case "important":
      return "bg-[var(--warning-light)] text-[#c2410c]";
    default:
      return "bg-[var(--success-light)] text-[var(--success)]";
  }
}

function avatarTone(index: number) {
  return ["av-blue", "av-green", "av-purple", "av-orange"][index % 4];
}

export function NoticeDetailModal({
  open,
  notice,
  isAdmin,
  confirming,
  deleting,
  onClose,
  onConfirmRead,
  onEdit,
  onDelete,
}: NoticeDetailModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || !notice) {
    return null;
  }

  const isConfirmed = notice.isRead;
  const readCountLabel = `${notice.readBy.length}명 확인`;
  const canConfirm = notice.requireReadConfirm && !isAdmin;

  return (
    <div
      className="modal-shell"
      onClick={() => {
        if (!confirming && !deleting) {
          onClose();
        }
      }}
    >
      <div className="modal-overlay" />
      <div
        className="modal-card pointer-events-auto flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[18px] bg-white shadow-[0_24px_64px_rgba(0,0,0,0.18),0_0_0_1px_rgba(255,255,255,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[var(--border-light)] px-[26px] pb-[18px] pt-[22px]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getCategoryTone(notice.category)}`}>
                  {notice.category}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityTone(notice.priority)}`}>
                  {getPriorityLabel(notice.priority)}
                </span>
              </div>
              <h2 className="mt-4 text-[19px] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                {notice.title}
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1.5">
                  <UserRound size={13} />
                  {notice.authorName}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} />
                  {format(new Date(notice.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users2 size={13} />
                  {notice.target.join(", ")}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-icon-sm"
              aria-label="공지 상세 닫기"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="custom-scroll flex-1 overflow-y-auto px-[26px] py-[22px]">
          <div className="space-y-6">
            <div className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
              {notice.content}
            </div>

            <div className="border-t border-[var(--border-light)] pt-6">
              <CommentsPanel
                embedded
                title="댓글"
                targetType="notice"
                targetId={notice.id}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[var(--border-light)] px-[26px] py-[14px]">
          <div className="flex min-w-0 items-center gap-3">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(notice)}
                  className="btn-modal btn-modal-ghost"
                  disabled={deleting}
                >
                  <Pencil size={14} />
                  수정
                </button>
                <button
                  type="button"
                  onClick={() => void onDelete(notice)}
                  className="btn-modal btn-modal-danger"
                  disabled={deleting}
                >
                  <Trash2 size={14} />
                  {deleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
            ) : (
              <>
                <div className="flex -space-x-2">
                  {notice.readBy.slice(0, 4).map((reader, index) => (
                    <span
                      key={reader.userId}
                      className={`avatar ${avatarTone(index)} h-8 w-8 border-2 border-white text-xs`}
                      title={reader.name}
                    >
                      {reader.name.slice(0, 1)}
                    </span>
                  ))}
                </div>
                <span className="text-sm font-medium text-[var(--text-secondary)]">{readCountLabel}</span>
              </>
            )}
          </div>

          {canConfirm ? (
            <button
              type="button"
              onClick={() => void onConfirmRead(notice)}
              className={`btn-modal ${
                isConfirmed ? "btn-modal-primary" : "bg-[var(--success-light)] text-[var(--success)]"
              }`}
              disabled={confirming}
            >
              <Check size={15} />
              {confirming ? "확인 중..." : isConfirmed ? "확인 완료" : "읽음 확인"}
            </button>
          ) : (
            <button type="button" onClick={onClose} className="btn-modal btn-modal-ghost">
              닫기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
