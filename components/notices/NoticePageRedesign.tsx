"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { BellRing, CheckCheck, FileText, Megaphone, Plus } from "lucide-react";
import { NoticeDetailModal } from "@/components/notices/NoticeDetailRedesign";
import { MinuteWriteModal } from "@/components/notices/MinuteWriteModal";
import { NoticeWriteModal } from "@/components/notices/NoticeWriteRedesign";
import { FilterChipGroup } from "@/components/ui/FilterChipGroup";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getPriorityLabel } from "@/lib/notices";
import type {
  NoticeMinuteSummary,
  NoticePageLeaveStatus,
  NoticePageNotice,
  NoticeWritePayload,
} from "@/components/notices/noticePageTypes";

interface NoticePageProps {
  initialNotices: NoticePageNotice[];
  initialLeaveStatuses: NoticePageLeaveStatus[];
  initialMinutes: NoticeMinuteSummary[];
  isAdmin: boolean;
  isOwner: boolean;
  initialTab?: NoticeTabValue;
}

type NoticeTabValue = "NOTICES" | "LEAVE" | "MINUTES";
type NoticeCategoryFilter = "전체" | "공지" | "일정" | "시설" | "인사";
type ModalState =
  | {
      mode: "create" | "edit";
      notice: NoticePageNotice | null;
    }
  | null;

const TAB_LABELS: Record<NoticeTabValue, string> = {
  NOTICES: "공지",
  LEAVE: "연차 현황",
  MINUTES: "회의록",
};

const CATEGORY_FILTERS: NoticeCategoryFilter[] = ["전체", "공지", "일정", "시설", "인사"];

const TAB_ITEMS = (Object.keys(TAB_LABELS) as NoticeTabValue[]).map((tab) => ({
  value: tab,
  label: TAB_LABELS[tab],
}));

const CATEGORY_FILTER_ITEMS = CATEGORY_FILTERS.map((category) => ({
  value: category,
  label: category,
}));

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

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-6 py-10 text-center">
      <FileText size={34} className="text-[var(--text-muted)]" />
      <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
    </div>
  );
}

function StatRow({
  label,
  value,
  valueClassName = "text-[var(--text-primary)]",
  bordered = true,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-[9px] text-sm ${
        bordered ? "border-b border-[var(--border-light)]" : ""
      }`}
    >
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className={`font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}

export function NoticePage({
  initialNotices,
  initialLeaveStatuses,
  initialMinutes,
  isAdmin,
  isOwner,
  initialTab = "NOTICES",
}: NoticePageProps) {
  const [activeTab, setActiveTab] = useState<NoticeTabValue>(initialTab);
  const [categoryFilter, setCategoryFilter] = useState<NoticeCategoryFilter>("전체");
  const [notices, setNotices] = useState(initialNotices);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(initialMinutes);
  const [minuteModalOpen, setMinuteModalOpen] = useState(false);
  const [minuteSubmitting, setMinuteSubmitting] = useState(false);
  const [minuteError, setMinuteError] = useState<string | null>(null);
  const [confirmingReadId, setConfirmingReadId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredNotices = useMemo(() => {
    if (categoryFilter === "전체") {
      return notices;
    }

    return notices.filter((notice) => notice.category === categoryFilter);
  }, [categoryFilter, notices]);

  const selectedNotice = notices.find((notice) => notice.id === selectedNoticeId) ?? null;
  const unreadCount = notices.filter((notice) => !notice.isRead).length;
  const importantCount = notices.filter(
    (notice) => notice.priority === "important" || notice.priority === "urgent"
  ).length;
  const confirmedCount = notices.filter(
    (notice) => notice.requireReadConfirm && notice.readBy.length > 0
  ).length;
  const confirmRequiredNotices = notices.filter((notice) => notice.requireReadConfirm);

  function getPriorityTone(priority: NoticePageNotice["priority"]) {
    if (priority === "urgent") {
      return "bg-[var(--danger-light)] text-[var(--danger)]";
    }

    if (priority === "important") {
      return "bg-[var(--warning-light)] text-[#c2410c]";
    }

    return "bg-[var(--surface-3)] text-[var(--text-secondary)]";
  }

  async function handleCreateMinute(payload: { title: string; content: string }) {
    setMinuteSubmitting(true);
    setMinuteError(null);

    try {
      const response = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          emoji: "📝",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setMinuteError(data?.error ?? "회의록을 저장하지 못했어요.");
        return;
      }

      const page = data.page as {
        id: string;
        title: string;
        updatedAt?: string;
        author?: { name?: string | null };
      };

      setMinutes((current) => [
        {
          id: page.id,
          title: page.title,
          updatedAt: page.updatedAt ?? new Date().toISOString(),
          authorName: page.author?.name ?? "이름 없음",
        },
        ...current,
      ]);
      setMinuteModalOpen(false);
      window.location.href = `/docs/${page.id}?source=meeting-note`;
    } catch (requestError) {
      console.error("[MINUTE_CREATE]", requestError);
      setMinuteError("회의록을 저장하지 못했어요.");
    } finally {
      setMinuteSubmitting(false);
    }
  }

  async function handleSubmitNotice(payload: NoticeWritePayload) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        modalState?.mode === "edit" && modalState.notice
          ? `/api/notices/${modalState.notice.id}`
          : "/api/notices",
        {
          method: modalState?.mode === "edit" ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "공지를 저장하지 못했어요.");
        return;
      }

      const nextNotice = data.notice as NoticePageNotice;
      setNotices((current) =>
        modalState?.mode === "edit"
          ? current.map((notice) => (notice.id === nextNotice.id ? nextNotice : notice))
          : [nextNotice, ...current]
      );
      setModalState(null);
      setActiveTab("NOTICES");
    } catch (requestError) {
      console.error("[NOTICE_SUBMIT]", requestError);
      setError("공지를 저장하지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function markRead(notice: NoticePageNotice) {
    setConfirmingReadId(notice.id);
    setError(null);

    try {
      const response = await fetch(`/api/notices/${notice.id}/read`, {
        method: "PATCH",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "읽음 확인을 저장하지 못했어요.");
        return;
      }

      setNotices((current) =>
        current.map((item) => (item.id === notice.id ? (data.notice as NoticePageNotice) : item))
      );
    } catch (requestError) {
      console.error("[NOTICE_READ]", requestError);
      setError("읽음 확인을 저장하지 못했어요.");
    } finally {
      setConfirmingReadId(null);
    }
  }

  async function handleDeleteNotice(notice: NoticePageNotice) {
    const shouldDelete = window.confirm("이 공지를 삭제할까요?");
    if (!shouldDelete) {
      return;
    }

    setDeletingId(notice.id);
    setError(null);

    try {
      const response = await fetch(`/api/notices/${notice.id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "공지를 삭제하지 못했어요.");
        return;
      }

      setNotices((current) => current.filter((item) => item.id !== notice.id));
      setSelectedNoticeId(null);
    } catch (requestError) {
      console.error("[NOTICE_DELETE]", requestError);
      setError("공지를 삭제하지 못했어요.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleOpenDetail(notice: NoticePageNotice) {
    setSelectedNoticeId(notice.id);

    if (!notice.isRead) {
      setNotices((current) =>
        current.map((item) =>
          item.id === notice.id ? { ...item, isRead: true } : item
        )
      );
    }

    if (!notice.isRead && !notice.requireReadConfirm) {
      await markRead(notice);
    }
  }

  return (
    <>
      <div className="page-shell w-full">
        <section className="page-header">
          <div className="page-header__meta">
            <div className="page-header__eyebrow uppercase">NOTICE CENTER</div>
            <h1 className="page-title">공지사항</h1>
            <p className="page-subtitle">팀 소식과 연차 현황을 확인해보세요</p>
          </div>
          {isAdmin ? (
            <div className="page-actions">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setModalState({ mode: "create", notice: null });
                }}
                className="primary-button px-[18px] py-[9px]"
              >
                <Plus size={16} />
                공지 올리기
              </button>
            </div>
          ) : null}
        </section>

        <section className="w-full">
          <FilterChipGroup
            aria-label="공지사항 화면 탭"
            items={TAB_ITEMS}
            activeValue={activeTab}
            onChange={setActiveTab}
          />
        </section>

        {error ? (
          <div className="rounded-[14px] border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        {activeTab === "NOTICES" ? (
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px] max-[900px]:grid-cols-1">
            <article className="overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white shadow-[var(--shadow)]">
              <div className="border-b border-[var(--border-light)] px-5 pb-[14px] pt-[18px]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">공지</h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      총 {notices.length}건 · 아직 안 읽은 공지 {unreadCount}건
                    </p>
                  </div>
                  <FilterChipGroup
                    aria-label="공지 카테고리 필터"
                    items={CATEGORY_FILTER_ITEMS}
                    activeValue={categoryFilter}
                    onChange={setCategoryFilter}
                    size="sm"
                  />
                </div>
              </div>

              <div>
                {filteredNotices.length === 0 ? (
                  <div className="p-5">
                    <EmptyPanel
                      title="표시할 공지가 없어요"
                      description="새 공지가 올라오면 가장 먼저 여기서 볼 수 있어요"
                    />
                  </div>
                ) : (
                  filteredNotices.map((notice, index) => (
                    <button
                      key={notice.id}
                      type="button"
                      onClick={() => void handleOpenDetail(notice)}
                      className={`flex w-full items-start gap-4 px-5 py-[15px] text-left transition hover:bg-[var(--surface-2)] ${
                        index !== filteredNotices.length - 1 ? "border-b border-[var(--border-light)]" : ""
                      }`}
                    >
                      <span
                        className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                          notice.isRead ? "bg-[var(--border)]" : "bg-[var(--accent)]"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-sm font-semibold ${
                            notice.isRead
                              ? "text-[var(--text-secondary)]"
                              : "text-[var(--text-primary)]"
                          }`}
                        >
                          {notice.title}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-muted)]">
                          {notice.authorName} ·{" "}
                          {format(new Date(notice.createdAt), "yyyy.MM.dd", { locale: ko })} ·{" "}
                          {notice.target.join(", ")}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getCategoryTone(notice.category)}`}
                        >
                          {notice.category}
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getPriorityTone(notice.priority)}`}
                        >
                          {getPriorityLabel(notice.priority)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </article>

            <div className="grid gap-4 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1 xl:grid-cols-1">
              <article className="rounded-[14px] border border-[var(--border-light)] bg-white p-5 shadow-[var(--shadow)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--accent-light)] text-[var(--accent)]">
                    <Megaphone size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">공지 현황</p>
                    <p className="text-xs text-[var(--text-muted)]">지금 확인해야 할 공지예요</p>
                  </div>
                </div>
                <div className="mt-5">
                  <StatRow label="전체 공지" value={`${notices.length}건`} />
                  <StatRow
                    label="안 읽음"
                    value={`${unreadCount}건`}
                    valueClassName="text-[var(--warning)]"
                  />
                  <StatRow
                    label="중요 공지"
                    value={`${importantCount}건`}
                    valueClassName="text-[var(--warning)]"
                  />
                  <StatRow
                    label="읽음 확인"
                    value={`${confirmedCount}건`}
                    bordered={false}
                  />
                </div>
              </article>

              <article className="rounded-[14px] border border-[var(--border-light)] bg-white p-5 shadow-[var(--shadow)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[var(--success-light)] text-[var(--success)]">
                    <CheckCheck size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">읽음 확인 현황</p>
                    <p className="text-xs text-[var(--text-muted)]">확인 응답이 필요한 공지예요</p>
                  </div>
                </div>

                {confirmRequiredNotices.length === 0 ? (
                  <div className="flex min-h-[146px] flex-col items-center justify-center text-center">
                    <BellRing size={28} className="text-[var(--text-muted)]" />
                    <p className="mt-4 text-sm font-medium text-[var(--text-secondary)]">
                      확인이 필요한 공지가 없어요
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                      읽음 확인 요청 공지가 생기면 여기서 바로 볼 수 있어요
                    </p>
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {confirmRequiredNotices.slice(0, 4).map((notice) => (
                      <button
                        key={notice.id}
                        type="button"
                        onClick={() => setSelectedNoticeId(notice.id)}
                        className="w-full rounded-[12px] border border-[var(--border-light)] bg-[var(--surface-2)] px-4 py-3 text-left transition hover:border-[var(--accent)]"
                      >
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {notice.title}
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border-light)]">
                            <div
                              className="h-full rounded-full bg-[var(--accent)]"
                              style={{
                                width: `${
                                  notice.targetMemberCount > 0
                                    ? Math.round((notice.readBy.length / notice.targetMemberCount) * 100)
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-[var(--accent)]">
                            {notice.readBy.length}/{notice.targetMemberCount}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </article>
            </div>
          </section>
        ) : null}

        {activeTab === "LEAVE" ? (
          <section className="overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white shadow-[var(--shadow)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-light)] px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                  {format(new Date(), "yyyy년 M월", { locale: ko })} 연차 현황
                </h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">팀 연차 현황을 한 번에 볼 수 있어요</p>
              </div>
              {isOwner ? (
                <button type="button" className="secondary-button">
                  내려받기
                </button>
              ) : null}
            </div>
            {!isOwner ? (
              <div className="p-5">
                <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--border)] bg-[var(--surface-2)] px-6 py-10 text-center">
                  <FileText size={34} className="text-[var(--text-muted)]" />
                  <p className="mt-4 text-base font-semibold text-[var(--text-primary)]">
                    휴가·결재에서 확인해주세요
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                    내 연차현황과 신청내역은 휴가·결재 페이지에서 확인할 수 있어요.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/docs";
                    }}
                    className="primary-button mt-5 px-[18px] py-[9px]"
                  >
                    휴가·결재에서 확인하기
                  </button>
                </div>
              </div>
            ) : initialLeaveStatuses.length === 0 ? (
              <div className="p-5">
                <EmptyPanel
                  title="연차 현황이 아직 없어요"
                  description="휴가 정보가 쌓이면 여기서 바로 확인할 수 있어요"
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>총</th>
                      <th>사용</th>
                      <th>잔여</th>
                      <th>예정</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {initialLeaveStatuses.map((item) => (
                      <tr key={item.memberId}>
                        <td className="font-semibold text-[var(--text-primary)]">{item.memberName}</td>
                        <td>{item.totalAnnualLeave}</td>
                        <td>{item.usedAnnualLeave}</td>
                        <td
                          className={
                            item.remainingAnnualLeave === 0
                              ? "font-semibold text-[var(--danger)]"
                              : "font-semibold text-[var(--accent)]"
                          }
                        >
                          {item.remainingAnnualLeave}
                        </td>
                        <td>{item.plannedLabel}</td>
                        <td>
                          <StatusBadge
                            variant={item.remainingAnnualLeave === 0 ? "rejected" : "approved"}
                          >
                            {item.statusLabel}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {activeTab === "MINUTES" ? (
          <section className="overflow-hidden rounded-[14px] border border-[var(--border-light)] bg-white shadow-[var(--shadow)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--border-light)] px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">회의록</h2>
                <p className="mt-1 text-xs text-[var(--text-muted)]">회의록을 최신순으로 볼 수 있어요</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMinuteError(null);
                  setMinuteModalOpen(true);
                }}
                className="primary-button"
              >
                기록하기
              </button>
            </div>
            <div className="space-y-3 p-5">
              {minutes.length === 0 ? (
                <EmptyPanel
                  title="회의록이 아직 없어요"
                  description="회의록을 작성하면 여기서 바로 확인할 수 있어요"
                />
              ) : (
                minutes.map((minute) => (
                  <button
                    key={minute.id}
                    type="button"
                    onClick={() => {
                      window.location.href = `/docs/${minute.id}?source=meeting-note`;
                    }}
                    className="w-full rounded-[14px] border border-[var(--border-light)] bg-[var(--surface)] px-4 py-4 text-left transition hover:bg-[var(--surface-2)]"
                  >
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{minute.title}</p>
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      {minute.authorName} · {format(new Date(minute.updatedAt), "yyyy.MM.dd", { locale: ko })}
                    </p>
                  </button>
                ))
              )}
            </div>
          </section>
        ) : null}
      </div>

      <NoticeWriteModal
        open={modalState !== null}
        mode={modalState?.mode ?? "create"}
        submitting={submitting}
        error={error}
        initialValues={
          modalState?.mode === "edit" && modalState.notice
            ? {
                title: modalState.notice.title,
                content: modalState.notice.content,
                category: modalState.notice.category,
                priority: modalState.notice.priority,
                target: modalState.notice.target,
                requireReadConfirm: modalState.notice.requireReadConfirm,
                sendPush: false,
              }
            : null
        }
        onClose={() => setModalState(null)}
        onSubmit={handleSubmitNotice}
      />

      <NoticeDetailModal
        open={selectedNotice !== null}
        notice={selectedNotice}
        isAdmin={isAdmin}
        confirming={confirmingReadId === selectedNotice?.id}
        deleting={deletingId === selectedNotice?.id}
        onClose={() => setSelectedNoticeId(null)}
        onConfirmRead={markRead}
        onEdit={(notice) => {
          setModalState({ mode: "edit", notice });
          setSelectedNoticeId(null);
        }}
        onDelete={handleDeleteNotice}
      />
      <MinuteWriteModal
        open={minuteModalOpen}
        submitting={minuteSubmitting}
        error={minuteError}
        onClose={() => setMinuteModalOpen(false)}
        onSubmit={handleCreateMinute}
      />
    </>
  );
}
