"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { NoticeCreateModal } from "@/components/notices/NoticeCreateModal";
import {
  type NoticeBadgeValue,
  type NoticePayload,
  type NoticeSummary,
  type NoticeTab,
} from "@/components/notices/types";

interface NoticesPageClientProps {
  initialNotices: NoticeSummary[];
}

const TAB_LABELS: Record<NoticeTab, string> = {
  NOTICES: "공지사항",
  LEAVE: "연차 현황",
  MINUTES: "회의록",
};

const BADGE_STYLES: Record<
  NoticeBadgeValue,
  { label: string; className: string }
> = {
  SCHEDULE: { label: "일정", className: "status-badge status-badge--accent" },
  FACILITY: { label: "시설", className: "status-badge status-badge--success" },
  NOTICE: { label: "공지", className: "status-badge status-badge--warning" },
  WORK: { label: "업무", className: "status-badge status-badge--purple" },
  OTHER: { label: "기타", className: "status-badge status-badge--neutral" },
};

function sortNotices(notices: NoticeSummary[]) {
  return [...notices].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function isExpiredNotice(notice: NoticeSummary) {
  return new Date(notice.endDate).getTime() < Date.now();
}

function isNewNotice(notice: NoticeSummary) {
  const threeDays = 1000 * 60 * 60 * 24 * 3;
  return Date.now() - new Date(notice.createdAt).getTime() <= threeDays;
}

async function parseErrorMessage(response: Response) {
  try {
    const data = await response.json();
    if (data?.error && typeof data.error === "string") {
      return data.error;
    }
  } catch {
    return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
  }

  return "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

function EmptyList({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-panel min-h-[220px]">
      <p className="empty-panel__title">{title}</p>
      <p className="empty-panel__description">{description}</p>
    </div>
  );
}

function NoticeCard({ notice }: { notice: NoticeSummary }) {
  const badge = BADGE_STYLES[notice.badge];
  const expired = isExpiredNotice(notice);

  return (
    <article className={`list-card ${expired ? "opacity-80" : ""}`}>
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={badge.className}>{badge.label}</span>
            {isNewNotice(notice) ? <span className="status-badge status-badge--accent">NEW</span> : null}
            {expired ? <span className="status-badge status-badge--neutral">종료됨</span> : null}
          </div>

          <h2 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">{notice.title}</h2>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[var(--text-secondary)]">
            <span>작성자 {notice.authorName}</span>
            <span>
              공지 기간 {format(new Date(notice.startDate), "yyyy.MM.dd", { locale: ko })} - {" "}
              {format(new Date(notice.endDate), "yyyy.MM.dd", { locale: ko })}
            </span>
          </div>

          <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">
            {notice.content}
          </p>
        </div>

        <div className="shrink-0 text-xs font-medium text-[var(--text-muted)]">
          {format(new Date(notice.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
        </div>
      </div>
    </article>
  );
}

export function NoticesPageClient({ initialNotices }: NoticesPageClientProps) {
  const [activeTab, setActiveTab] = useState<NoticeTab>("NOTICES");
  const [notices, setNotices] = useState<NoticeSummary[]>(() => sortNotices(initialNotices));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedNotices = useMemo(() => sortNotices(notices), [notices]);

  async function handleCreateNotice(payload: NoticePayload) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/notices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setError(await parseErrorMessage(response));
        return;
      }

      const createdNotice = (await response.json()) as NoticeSummary;
      setNotices((current) => sortNotices([createdNotice, ...current]));
      setIsModalOpen(false);
      setActiveTab("NOTICES");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-shell">
        <section className="page-header">
          <div className="page-header__meta">
            <div className="page-header__eyebrow">Notice Center</div>
            <h1 className="page-title">공지사항</h1>
            <p className="page-subtitle">
              운영 공지, 일정 공지, 시설 안내를 한곳에서 최신 순서로 확인할 수 있습니다.
            </p>
          </div>
          <div className="page-actions">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setIsModalOpen(true);
              }}
              className="primary-button"
            >
              공지 작성
            </button>
          </div>
        </section>

        <section className="page-control-strip">
          <div className="pill-group">
            {(Object.keys(TAB_LABELS) as NoticeTab[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`pill-tab ${isActive ? "is-active" : ""}`}
                >
                  {TAB_LABELS[tab]}
                </button>
              );
            })}
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        {activeTab === "NOTICES" ? (
          <section className="space-y-4">
            {sortedNotices.length === 0 ? (
              <EmptyList
                title="등록된 공지사항이 없습니다."
                description="새 공지를 작성하면 최신 순서대로 이 영역에 표시됩니다."
              />
            ) : (
              sortedNotices.map((notice) => <NoticeCard key={notice.id} notice={notice} />)
            )}
          </section>
        ) : null}

        {activeTab === "LEAVE" ? (
          <section className="space-y-4">
            <section className="card-panel">
              <div className="card-header">
                <div>
                  <h2 className="card-title">연차 현황</h2>
                  <p className="card-description">연차 데이터 연결 전까지는 구조와 안내 문구만 먼저 제공합니다.</p>
                </div>
              </div>
            </section>
            <EmptyList
              title="표시할 연차 현황이 없습니다."
              description="연차 관리 데이터가 연결되면 구성원별 사용 현황을 이 탭에서 확인할 수 있습니다."
            />
          </section>
        ) : null}

        {activeTab === "MINUTES" ? (
          <section className="space-y-4">
            <section className="card-panel">
              <div className="card-header">
                <div>
                  <h2 className="card-title">회의록</h2>
                  <p className="card-description">회의록 리스트 구조를 먼저 준비해 두었습니다.</p>
                </div>
              </div>
            </section>
            <EmptyList
              title="표시할 회의록이 없습니다."
              description="회의록 데이터가 연결되면 최신 회의 기록을 이 탭에서 확인할 수 있습니다."
            />
          </section>
        ) : null}
      </div>

      <NoticeCreateModal
        open={isModalOpen}
        submitting={submitting}
        error={error}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        onSubmit={handleCreateNotice}
      />
    </>
  );
}
