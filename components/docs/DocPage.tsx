"use client";

import { useMemo, useState } from "react";
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";
import { CalendarRange, FileText, Plus } from "lucide-react";
import { DocCreateModal } from "@/components/docs/DocCreateModal";
import { DocDetailModal } from "@/components/docs/DocDetailModal";
import { FilterChipGroup } from "@/components/ui/FilterChipGroup";
import {
  formatDocumentReasonPreview,
  getDocumentStatusLabel,
  getDocumentTypeLabel,
  type DocumentCreatePayload,
  type DocumentMemberOption,
  type DocumentStats,
  type DocumentSummary,
} from "@/lib/documents";

interface DocPageProps {
  initialDocuments: DocumentSummary[];
  initialSelectedDocumentId?: string | null;
  stats: DocumentStats;
  members: DocumentMemberOption[];
  approverName: string;
}

type ListFilter = "ALL" | "LEAVE" | "APPROVAL";

const LIST_FILTER_ITEMS: Array<{ value: ListFilter; label: string }> = [
  { value: "ALL", label: "전체" },
  { value: "LEAVE", label: "연차" },
  { value: "APPROVAL", label: "결재" },
];

function statusTone(status: DocumentSummary["status"]) {
  switch (status) {
    case "APPROVED":
      return "status-badge status-badge--success";
    case "REJECTED":
      return "status-badge status-badge--danger";
    case "CANCELLED":
      return "status-badge status-badge--neutral";
    default:
      return "status-badge status-badge--warning";
  }
}

function typeTone(type: DocumentSummary["type"]) {
  switch (type) {
    case "LEAVE":
      return "status-badge status-badge--warning";
    case "HALF_DAY":
    case "AM_HALF_DAY":
    case "PM_HALF_DAY":
      return "status-badge status-badge--accent";
    case "OUT_OF_OFFICE":
    case "EARLY_LEAVE":
      return "status-badge status-badge--neutral";
    case "APPROVAL":
      return "status-badge status-badge--purple";
    default:
      return "status-badge status-badge--neutral";
  }
}

function normalizeFilter(type: DocumentSummary["type"], filter: ListFilter) {
  if (filter === "ALL") {
    return true;
  }

  if (filter === "LEAVE") {
    return (
      type === "LEAVE" ||
      type === "HALF_DAY" ||
      type === "AM_HALF_DAY" ||
      type === "PM_HALF_DAY" ||
      type === "OUT_OF_OFFICE" ||
      type === "EARLY_LEAVE"
    );
  }

  return type === "APPROVAL" || type === "OTHER";
}

export function DocPage({
  initialDocuments,
  initialSelectedDocumentId = null,
  stats,
  members,
  approverName,
}: DocPageProps) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [filter, setFilter] = useState<ListFilter>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailDocumentId, setDetailDocumentId] = useState<string | null>(initialSelectedDocumentId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailSubmitting, setDetailSubmitting] = useState(false);

  const filteredDocuments = useMemo(
    () => documents.filter((document) => normalizeFilter(document.type, filter)),
    [documents, filter]
  );

  const selectedDocument =
    documents.find((document) => document.id === detailDocumentId) ?? null;

  const calendarDays = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const rangeStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  }, []);

  const calendarEvents = useMemo(() => {
    return documents.filter(
      (document) =>
        (
          document.type === "LEAVE" ||
          document.type === "HALF_DAY" ||
          document.type === "AM_HALF_DAY" ||
          document.type === "PM_HALF_DAY"
        ) &&
        document.status !== "CANCELLED" &&
        document.startDate
    );
  }, [documents]);

  async function handleCreate(payload: DocumentCreatePayload) {
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? "신청서를 저장하지 못했어요.");
        return;
      }

      setDocuments((current) => [data.document as DocumentSummary, ...current]);
      setCreateOpen(false);
    } catch (requestError) {
      console.error("[DOCUMENT_CREATE]", requestError);
      setError("신청서를 저장하지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelDocument(document: DocumentSummary) {
    const shouldCancel = window.confirm("이 신청을 취소할까요?");
    if (!shouldCancel) {
      return;
    }

    setDetailSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data?.error ?? "신청을 취소하지 못했어요.");
        return;
      }

      setDocuments((current) =>
        current.map((item) =>
          item.id === document.id ? (data.document as DocumentSummary) : item
        )
      );
      setDetailDocumentId(document.id);
    } catch (requestError) {
      console.error("[DOCUMENT_CANCEL]", requestError);
      setError("신청을 취소하지 못했어요.");
    } finally {
      setDetailSubmitting(false);
    }
  }

  async function handleDecideDocument(
    document: DocumentSummary,
    status: "APPROVED" | "REJECTED"
  ) {
    if (!document.approvalId) {
      setError("결재 정보를 찾을 수 없어요.");
      return;
    }

    setDetailSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/approvals/${document.approvalId}/decide`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.error ?? "결재 상태를 업데이트하지 못했어요.");
        return;
      }

      setDocuments((current) =>
        current.map((item) =>
          item.id === document.id
            ? {
                ...item,
                status,
                rejectionReason: status === "REJECTED" ? item.rejectionReason : null,
              }
            : item
        )
      );
    } catch (requestError) {
      console.error("[DOCUMENT_DECIDE]", requestError);
      setError("결재 상태를 업데이트하지 못했어요.");
    } finally {
      setDetailSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-shell doc-page-shell">
        <section className="page-header">
          <div className="page-header__meta">
            <div className="page-header__eyebrow">Document Workflow</div>
            <h1 className="page-title">휴가·결재</h1>
            <p className="page-subtitle">내 신청 문서는 이곳에서 관리하세요</p>
          </div>
          <div className="page-actions">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setCreateOpen(true);
              }}
              className="primary-button"
            >
              <Plus size={16} />
              신청하기
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="workspace-stat-card">
            <div className="workspace-stat-card__icon" aria-hidden="true">
              🌴
            </div>
            <div className="workspace-stat-card__label">남은 연차</div>
            <div
              className="workspace-stat-card__value"
              style={{ color: "var(--success)" }}
            >
              {stats.remainingDays.toFixed(stats.remainingDays % 1 === 0 ? 0 : 1)}일
            </div>
            <div className="workspace-stat-card__sub">
              올해 벌써 {stats.usedDays.toFixed(stats.usedDays % 1 === 0 ? 0 : 1)}일 썼어요
            </div>
          </article>
          <article className="workspace-stat-card">
            <div className="workspace-stat-card__icon" aria-hidden="true">
              📄
            </div>
            <div className="workspace-stat-card__label">처리 대기</div>
            <div
              className="workspace-stat-card__value"
              style={{ color: "var(--warning)" }}
            >
              {stats.pendingCount}건
            </div>
            <div className="workspace-stat-card__sub">결재 대기 문서를 모아봤어요</div>
          </article>
          <article className="workspace-stat-card">
            <div className="workspace-stat-card__icon" aria-hidden="true">
              🗓️
            </div>
            <div className="workspace-stat-card__label">이번 달 신청</div>
            <div
              className="workspace-stat-card__value"
              style={{ color: "var(--success)" }}
            >
              {stats.submittedThisMonth}건
            </div>
            <div className="workspace-stat-card__sub">
              승인 {stats.approvedThisMonth}건 · 반려 {stats.rejectedThisMonth}건
            </div>
          </article>
        </section>

        {error ? (
          <div className="rounded-[14px] border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <article className="card-panel overflow-hidden">
            <div className="card-header !flex-row items-start justify-between gap-4">
  <div className="min-w-0">
    <h2 className="card-title">신청 내역</h2>
    <p className="card-description">
      {`내 문서 ${filteredDocuments.length}건`}
    </p>
  </div>

  <FilterChipGroup
    aria-label="휴가 결재 문서 필터"
    className="!w-auto !justify-end !self-start"
    items={LIST_FILTER_ITEMS}
    activeValue={filter}
    onChange={setFilter}
  />
</div>

            {filteredDocuments.length === 0 ? (
              <div className="card-body">
                <div className="empty-panel min-h-[280px]">
                  <FileText size={42} className="text-[var(--text-muted)]" />
                  <p className="empty-panel__title">아직 신청한 내역이 없어요.</p>
                  <p className="empty-panel__description">
                    새 신청을 하면 이 목록에 차곡차곡 보여드릴게요.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--surface)]">
                <div className="border-t border-[var(--border-light)]" />
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>문서</th>
                      <th>종류</th>
                      <th>신청일</th>
                      <th>상태</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocuments.map((document) => (
                      <tr key={document.id}>
                        <td>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[var(--text-primary)]">
                              {document.title}
                            </div>
                            <div className="mt-1 text-xs text-[var(--text-muted)]">
                              {formatDocumentReasonPreview(document.reason) || "적어둔 내용이 없어요"}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={typeTone(document.type)}>
                            {getDocumentTypeLabel(document.type)}
                          </span>
                        </td>
                        <td>
                          {format(new Date(document.createdAt), "yyyy.MM.dd", { locale: ko })}
                        </td>
                        <td>
                          <span className={statusTone(document.status)}>
                            {getDocumentStatusLabel(document.status)}
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => setDetailDocumentId(document.id)}
                            className="text-button"
                          >
                            상세 보기
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>

          <div className="space-y-4">
            <article className="card-panel">
              <div className="card-header">
                <div>
                  <h2 className="card-title">📅 이번 달 일정</h2>
                  <p className="card-description">연차와 반차 일정을 달력으로 확인해보세요.</p>
                </div>
                <CalendarRange size={18} className="text-[var(--text-muted)]" />
              </div>
              <div className="card-body">
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-[var(--text-muted)]">
                  {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                    <div key={day}>{day}</div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-7 gap-2">
                  {calendarDays.map((day) => {
                    const matchedDocument = calendarEvents.find((document) => {
                      if (!document.startDate) {
                        return false;
                      }

                      const start = new Date(document.startDate);
                      const end = new Date(document.endDate ?? document.startDate);

                      return eachDayOfInterval({ start, end }).some((item) =>
                        isSameDay(item, day)
                      );
                    });

                    const isHalfDay = matchedDocument?.type === "HALF_DAY";

                    return (
                      <div
                        key={day.toISOString()}
                        className={`flex h-10 items-center justify-center rounded-[10px] border text-sm ${
                          isSameMonth(day, new Date())
                            ? "border-[var(--border-light)] text-[var(--text-primary)]"
                            : "border-transparent text-[var(--text-muted)]"
                        } ${
                          matchedDocument
                            ? isHalfDay
                              ? "bg-[#fef9c3] border-[#facc15]"
                              : "bg-[#fff0e6] border-[#fb923c]"
                            : "bg-[var(--surface-2)]"
                        }`}
                      >
                        {format(day, "d", { locale: ko })}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 space-y-2 text-xs text-[var(--text-secondary)]">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-[4px] bg-[#fff0e6]" />
                    연차
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-[4px] bg-[#fef9c3]" />
                    반차
                  </div>
                </div>
              </div>
            </article>

            <article className="card-panel">
              <div className="card-header">
                <div>
                  <h2 className="card-title">신청 안내</h2>
                  
                </div>
              </div>
              <div className="card-body space-y-3 text-sm leading-6 text-[var(--text-secondary)]">
                <p>- 연차는 최소 3일 전에 신청해 주세요.</p>
                <p>- 반차는 당일에도 여유 있게 신청해보세요.</p>
                <p>- 결재 요청은 증빙 파일명이 있으면 좋아요.</p>
                <p>- 문의할 내용은 전달함에서 대표님께 바로 보내세요.</p>
                {stats.upcomingDays > 0 ? (
                  <div className="rounded-[14px] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-xs font-medium text-[var(--text-primary)]">
                    다가오는 연차가 {stats.upcomingDays.toFixed(
                      stats.upcomingDays % 1 === 0 ? 0 : 1
                    )}일 있어요.
                  </div>
                ) : null}
              </div>
            </article>
          </div>
        </section>
      </div>

      <DocCreateModal
        open={createOpen}
        submitting={submitting}
        error={error}
        approverName={approverName}
        members={members}
        stats={stats}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <DocDetailModal
        open={selectedDocument !== null}
        document={selectedDocument}
        submitting={detailSubmitting}
        canDecide={false}
        onClose={() => setDetailDocumentId(null)}
        onCancel={handleCancelDocument}
        onApprove={(document) => handleDecideDocument(document, "APPROVED")}
        onReject={(document) => handleDecideDocument(document, "REJECTED")}
      />
    </>
  );
}
