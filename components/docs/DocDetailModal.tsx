"use client";

import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { X } from "lucide-react";
import {
  getAttendanceEditDisplay,
  getDocumentStatusLabel,
  getDocumentTypeLabel,
  getHalfDayPeriodLabel,
  type DocumentSummary,
} from "@/lib/documents";

interface DocDetailModalProps {
  open: boolean;
  document: DocumentSummary | null;
  submitting: boolean;
  canDecide?: boolean;
  onClose: () => void;
  onCancel: (document: DocumentSummary) => Promise<void> | void;
  onApprove?: (document: DocumentSummary) => Promise<void> | void;
  onReject?: (document: DocumentSummary) => Promise<void> | void;
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return format(new Date(value), "yyyy.MM.dd", { locale: ko });
}

function statusTone(status: DocumentSummary["status"]) {
  switch (status) {
    case "APPROVED":
      return "leave-status-badge approved";
    case "REJECTED":
      return "leave-status-badge rejected";
    case "CANCELLED":
      return "leave-status-badge pending";
    default:
      return "leave-status-badge review";
  }
}

function doneNoticeTone(status: DocumentSummary["status"]) {
  return status === "APPROVED" ? "leave-done-notice approved" : "leave-done-notice rejected";
}

function doneNoticeLabel(status: DocumentSummary["status"]) {
  if (status === "APPROVED") {
    return "승인된 요청입니다.";
  }

  if (status === "REJECTED") {
    return "반려된 요청입니다.";
  }

  return "취소된 요청입니다.";
}

function renderInfoValue(value: string | null | undefined) {
  if (!value) {
    return <span className="leave-info-value empty">없음</span>;
  }

  return <span className="leave-info-value">{value}</span>;
}

function formatDocumentPeriod(document: DocumentSummary) {
  const attendanceEdit = getAttendanceEditDisplay(document.reason);
  if (attendanceEdit) {
    return attendanceEdit.periodLabel;
  }

  if (document.type === "HALF_DAY") {
    return `${formatDate(document.startDate)} · ${getHalfDayPeriodLabel(document.halfDayPeriod)}`;
  }

  if (
    document.type === "AM_HALF_DAY" ||
    document.type === "PM_HALF_DAY" ||
    document.type === "OUT_OF_OFFICE" ||
    document.type === "EARLY_LEAVE"
  ) {
    return `${formatDate(document.startDate)} · ${getDocumentTypeLabel(document.type)}`;
  }

  return `${formatDate(document.startDate)} - ${formatDate(document.endDate)}`;
}

export function DocDetailModal({
  open,
  document,
  submitting,
  canDecide = false,
  onClose,
  onCancel,
  onApprove,
  onReject,
}: DocDetailModalProps) {
  if (!open || !document) {
    return null;
  }

  const isProcessed =
    document.status === "APPROVED" ||
    document.status === "REJECTED" ||
    document.status === "CANCELLED";
  const attendanceEdit = getAttendanceEditDisplay(document.reason);
  const canShowDecisionActions =
    canDecide &&
    !isProcessed &&
    Boolean(document.approvalId) &&
    typeof onApprove === "function" &&
    typeof onReject === "function";

  return (
    <div className="leave-modal-overlay" onClick={() => !submitting && onClose()}>
      <div className="leave-modal" onClick={(event) => event.stopPropagation()}>
        <div className="leave-modal-header">
          <div className="leave-modal-badge-row">
            <span className="leave-type-badge">{getDocumentTypeLabel(document.type)}</span>
            <span className={statusTone(document.status)}>
              {getDocumentStatusLabel(document.status)}
            </span>
          </div>

          <h2 className="leave-modal-title">{document.title}</h2>
          <p className="leave-modal-sub">
            신청일 {format(new Date(document.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
          </p>

          <button
            type="button"
            onClick={onClose}
            className="leave-close-btn"
            aria-label="요청 상세 닫기"
            disabled={submitting}
          >
            <X size={16} />
          </button>
        </div>

        <div className="leave-modal-body">
          <div className="leave-info-group">
            <div className="leave-info-row">
              <span className="leave-info-label">신청 기간</span>
              <span className="leave-info-value">{formatDocumentPeriod(document)}</span>
            </div>
            <div className="leave-info-row">
              <span className="leave-info-label">결재자</span>
              {renderInfoValue(document.approverName)}
            </div>
            <div className="leave-info-row">
              <span className="leave-info-label">참조자</span>
              {renderInfoValue(document.ccUserName)}
            </div>
            {document.amount ? (
              <div className="leave-info-row">
                <span className="leave-info-label">금액</span>
                <span className="leave-info-value">
                  {document.amount.toLocaleString("ko-KR")}원
                </span>
              </div>
            ) : null}
            {document.costType ? (
              <div className="leave-info-row">
                <span className="leave-info-label">용도</span>
                <span className="leave-info-value">{document.costType}</span>
              </div>
            ) : null}
            {document.attachmentName ? (
              <div className="leave-info-row">
                <span className="leave-info-label">첨부 파일</span>
                <span className="leave-info-value">{document.attachmentName}</span>
              </div>
            ) : null}
          </div>

          <div className="leave-section-divider" />

          <div className="leave-reason-section">
            <div className="leave-reason-label">사유</div>
            <div
              className={`leave-reason-text ${
                attendanceEdit?.reasonText || (!attendanceEdit && document.reason) ? "" : "empty"
              }`}
            >
              {attendanceEdit
                ? attendanceEdit.reasonText || "작성된 사유가 없습니다."
                : document.reason || "작성된 사유가 없습니다."}
            </div>
          </div>

          {document.status === "REJECTED" && document.rejectionReason ? (
            <>
              <div className="leave-section-divider" />
              <div className="leave-reason-section">
                <div className="leave-reason-label">반려 사유</div>
                <div className="leave-reason-text">{document.rejectionReason}</div>
              </div>
            </>
          ) : null}
        </div>

        <div className="leave-modal-footer">
          {isProcessed ? (
            <div className={doneNoticeTone(document.status)}>{doneNoticeLabel(document.status)}</div>
          ) : null}

          {document.canCancel && !canShowDecisionActions ? (
            <button
              type="button"
              onClick={() => void onCancel(document)}
              className="btn-modal btn-modal-danger"
              disabled={submitting}
            >
              {submitting ? "처리 중..." : "요청 취소"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="btn-modal btn-modal-ghost"
            disabled={submitting}
          >
            닫기
          </button>

          {canShowDecisionActions ? (
            <>
              <button
                type="button"
                onClick={() => void onReject?.(document)}
                className="btn-modal btn-modal-danger"
                disabled={submitting}
              >
                {submitting ? "처리 중..." : "반려"}
              </button>
              <button
                type="button"
                onClick={() => void onApprove?.(document)}
                className="btn-modal btn-modal-primary"
                disabled={submitting}
              >
                {submitting ? "처리 중..." : "승인"}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
