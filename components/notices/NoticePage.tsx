"use client";

export { NoticePage } from "@/components/notices/NoticePageRedesign";

/*

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { FileText, Megaphone, Plus } from "lucide-react";
import { NoticeDetailModal } from "@/components/notices/NoticeDetailModal";
import { NoticeWriteModal } from "@/components/notices/NoticeWriteModal";
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
}

type NoticeTabValue = "NOTICES" | "LEAVE" | "MINUTES";
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

function EmptyPanel({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-panel min-h-[240px]">
      <FileText size={40} className="text-[var(--text-muted)]" />
      <p className="empty-panel__title">{title}</p>
      <p className="empty-panel__description">{description}</p>
    </div>
  );
}

export function NoticePage({
  initialNotices,
  initialLeaveStatuses,
  initialMinutes,
  isAdmin,
}: NoticePageProps) {
  const [activeTab, setActiveTab] = useState<NoticeTabValue>("NOTICES");
  const [categoryFilter, setCategoryFilter] = useState<"전체" | "공지" | "일정" | "시설" | "인사">(
    "전체"
  );
  const [notices, setNotices] = useState(initialNotices);
  const [modalState, setModalState] = useState<ModalState>(null);
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingReadId, setConfirmingReadId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredNotices = useMemo(() => {
    if (categoryFilter === "전체") {
      return notices;
    }

    return notices.filter((notice) => notice.category === categoryFilter);
  }, [categoryFilter, notices]);

  const selectedNotice =
    notices.find((notice) => notice.id === selectedNoticeId) ?? null;

  const unreadCount = notices.filter((notice) => !notice.isRead).length;
  const requireReadCount = notices.filter((notice) => notice.requireReadConfirm).length;
  const importantCount = notices.filter(
    (notice) => notice.priority === "important" || notice.priority === "urgent"
  ).length;

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
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "공지를 저장하지 못했어요.");
        return;
      }

      const nextNotice = data.notice as NoticePageNotice;
      setNotices((current) => {
        if (modalState?.mode === "edit") {
          return current.map((notice) =>
            notice.id === nextNotice.id ? nextNotice : notice
          );
        }

        return [nextNotice, ...current];
      });
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

    if (!notice.isRead && !notice.requireReadConfirm) {
      await markRead(notice);
    }
  }

  return (
    <>
      <div className="page-shell">
        <section className="page-header">
          <div className="page-header__meta">
            <div className="page-header__eyebrow">Notice Center</div>
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
                className="primary-button"
              >
                <Plus size={16} />
                공지 올리기
              </button>
            </div>
          ) : null}
        </section>

        <section className="page-control-strip">
          <div className="pill-group">
            {(Object.keys(TAB_LABELS) as NoticeTabValue[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`pill-tab ${activeTab === tab ? "is-active" : ""}`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <div className="rounded-[14px] border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        {activeTab === "NOTICES" ? (
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
            <article className="card-panel">
              <div className="card-header">
                <div>
                  <h2 className="card-title">공지</h2>
                  <p className="card-description">
                    총 {notices.length}건 · 아직 안 읽은 공지 {unreadCount}건
                  </p>
                </div>
                <div className="pill-group">
                  {(["전체", "공지", "일정", "시설", "인사"] as const).map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setCategoryFilter(category)}
                      className={`pill-tab ${categoryFilter === category ? "is-active" : ""}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card-body space-y-3">
                {filteredNotices.length === 0 ? (
                  <EmptyPanel
                    title="표시할 공지가 없어요."
                    description="새 공지가 올라오면 가장 먼저 여기서 볼 수 있어요."
                  />
                ) : (
                  filteredNotices.map((notice) => (
                    <button
                      key={notice.id}
                      type="button"
                      onClick={() => void handleOpenDetail(notice)}
                      className={`list-card w-full text-left ${
                        !notice.isRead ? "bg-[rgba(79,124,255,0.03)]" : ""
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`mt-1 h-3 w-3 rounded-full ${
                            notice.isRead ? "bg-[var(--border)]" : "bg-[var(--accent)]"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold text-[var(--text-primary)]">
                              {notice.title}
                            </span>
                            {!notice.isRead ? (
                              <span className="status-badge status-badge--accent">NEW</span>
                            ) : null}
                            {notice.priority !== "normal" ? (
                              <span
                                className={`status-badge ${
                                  notice.priority === "urgent"
                                    ? "status-badge--danger"
                                    : "status-badge--warning"
                                }`}
                              >
                                {notice.priority === "urgent" ? "긴급" : "중요"}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 text-sm text-[var(--text-secondary)]">
                            {notice.authorName} ·{" "}
                            {format(new Date(notice.createdAt), "yyyy.MM.dd", { locale: ko })} ·{" "}
                            {notice.target.join(", ")}
                            {notice.requireReadConfirm ? " · 읽음 확인" : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="status-badge status-badge--neutral">
                            {notice.category}
                          </span>
                          {notice.requireReadConfirm ? (
                            <div className="mt-2 text-xs font-medium text-[var(--text-muted)]">
                              {notice.readBy.length}/{notice.targetMemberCount} 읽었어요
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </article>

            <div className="space-y-4">
              <article className="card-panel p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--accent-light)] text-[var(--accent)]">
                    <Megaphone size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">
                      공지 현황
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      지금 살펴볼 항목만 모아봤어요.
                    </div>
                  </div>
                </div>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">전체 공지</span>
                    <span className="font-semibold text-[var(--text-primary)]">{notices.length}건</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">안 읽음</span>
                    <span className="font-semibold text-[var(--accent)]">{unreadCount}건</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">중요 공지</span>
                    <span className="font-semibold text-[var(--warning)]">{importantCount}건</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)]">읽음 확인</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {requireReadCount}건
                    </span>
                  </div>
                </div>
              </article>

              {isAdmin ? (
                <article className="card-panel p-5">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    읽음 확인 현황
                  </div>
                  <div className="mt-4 space-y-4">
                    {notices.filter((notice) => notice.requireReadConfirm).length > 0 ? (
                      notices
                        .filter((notice) => notice.requireReadConfirm)
                        .slice(0, 4)
                        .map((notice) => {
                          const percent =
                            notice.targetMemberCount > 0
                              ? Math.round((notice.readBy.length / notice.targetMemberCount) * 100)
                              : 0;

                          return (
                            <div key={notice.id} className="space-y-2">
                              <div className="truncate text-sm font-medium text-[var(--text-primary)]">
                                {notice.title}
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--border-light)]">
                                  <div
                                    className="h-full rounded-full bg-[var(--accent)]"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-[var(--accent)]">
                                  {notice.readBy.length}/{notice.targetMemberCount}
                                </span>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="text-sm text-[var(--text-muted)]">
                        읽음 확인이 필요한 공지가 아직 없어요.
                      </div>
                    )}
                  </div>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        {activeTab === "LEAVE" ? (
          <section className="card-panel overflow-hidden">
            <div className="card-header">
              <div>
                <h2 className="card-title">연차 현황</h2>
                <p className="card-description">
                  {format(new Date(), "M월", { locale: ko })} 연차 현황이에요
                </p>
              </div>
              {isAdmin ? (
                <button type="button" className="secondary-button">
                  내보내기
                </button>
              ) : null}
            </div>
            {initialLeaveStatuses.length === 0 ? (
              <div className="card-body">
                <EmptyPanel
                  title="연차 현황이 없어요."
                  description="휴가 정보가 쌓이면 여기서 한눈에 볼 수 있어요."
                />
              </div>
            ) : (
              <div className="bg-[var(--surface)]">
                <div className="border-t border-[var(--border-light)]" />
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
                        <td className="font-semibold text-[var(--text-primary)]">
                          {item.memberName}
                        </td>
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
                          <span
                            className={`status-badge ${
                              item.statusLabel === "정상"
                                ? "status-badge--success"
                                : "status-badge--danger"
                            }`}
                          >
                            {item.statusLabel}
                          </span>
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
          <section className="card-panel">
            <div className="card-header">
              <div>
                <h2 className="card-title">회의록</h2>
                <p className="card-description">
                  회의록 문서를 모아서 보여드려요.
                </p>
              </div>
              {isAdmin ? (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = "/docs";
                  }}
                  className="primary-button"
                >
                  기록하기
                </button>
              ) : null}
            </div>
            <div className="card-body space-y-3">
              {initialMinutes.length === 0 ? (
                <EmptyPanel
                  title="회의록이 아직 없어요."
                  description="회의록을 작성하면 이 탭에서 바로 볼 수 있어요."
                />
              ) : (
                initialMinutes.map((minute) => (
                  <button
                    key={minute.id}
                    type="button"
                    onClick={() => {
                      window.location.href = `/docs/${minute.id}`;
                    }}
                    className="list-card w-full text-left"
                  >
                    <div className="text-base font-semibold text-[var(--text-primary)]">
                      {minute.title}
                    </div>
                    <div className="mt-2 text-sm text-[var(--text-secondary)]">
                      {minute.authorName} ·{" "}
                      {format(new Date(minute.updatedAt), "yyyy.MM.dd", { locale: ko })}
                    </div>
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
    </>
  );
}
*/
