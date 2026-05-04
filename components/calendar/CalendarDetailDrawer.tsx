"use client";

import { useRouter } from "next/navigation";
import type { CalendarItem } from "@/components/calendar/types";

type DrawerSelection =
  | { type: "item"; item: CalendarItem }
  | { type: "date"; date: string; items: CalendarItem[] }
  | null;

interface CalendarDetailDrawerProps {
  open: boolean;
  selection: DrawerSelection;
  onClose: () => void;
  onSelectItem: (item: CalendarItem) => void;
  onEditItem: (item: CalendarItem) => void;
  onDeleteItem: (item: CalendarItem) => void;
  onCreateFromDate: (date: string) => void;
}

function formatDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDateLabel(startDate);
  }

  return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
}

function formatDateTimeLabel(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWorkMinutes(value: number | null | undefined) {
  if (!value) {
    return "-";
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

function formatAttendanceStatus(status: string | null | undefined) {
  switch (status) {
    case "NORMAL":
      return "정상";
    case "LATE":
      return "지각";
    case "EARLY_LEAVE":
      return "조퇴/반차";
    case "OVERTIME":
      return "초과근무";
    case "ABSENT":
      return "결근";
    case "HOLIDAY":
      return "휴가";
    default:
      return status || "-";
  }
}

function formatLeaveStatus(status: string | null | undefined) {
  switch (status) {
    case "APPROVED":
      return "승인 완료";
    case "PENDING":
      return "승인 대기";
    case "REJECTED":
      return "반려";
    default:
      return status || "-";
  }
}

function formatLeaveType(value: string | null | undefined) {
  switch (value) {
    case "HALF_AM":
      return "오전 반차";
    case "HALF_PM":
      return "오후 반차";
    case "FULL_DAY":
      return "연차";
    default:
      return value || "연차";
  }
}

function getSourceLabel(item: CalendarItem) {
  switch (item.source) {
    case "attendance":
      return "근태 기록";
    case "leave":
      return "휴가/연차 기록";
    case "holiday":
      return "공휴일";
    case "project":
      return "프로젝트 일정";
    case "calendarEvent":
    default:
      return "일정";
  }
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="calendar-detail-row">
      <span className="calendar-detail-row__label">{label}</span>
      <span className="calendar-detail-row__value">{value}</span>
    </div>
  );
}

export function CalendarDetailDrawer({
  open,
  selection,
  onClose,
  onSelectItem,
  onEditItem,
  onDeleteItem,
  onCreateFromDate,
}: CalendarDetailDrawerProps) {
  const router = useRouter();

  return (
    <div className={`calendar-drawer-shell${open ? " is-open" : ""}`}>
      <div className="calendar-drawer-overlay" onClick={onClose} />
      <aside className="calendar-drawer">
        {!selection ? null : selection.type === "date" ? (
          <>
            <div className="calendar-drawer__header">
              <div>
                <div className="calendar-drawer__eyebrow">날짜 일정</div>
                <h3 className="calendar-drawer__title">{formatDateLabel(selection.date)}</h3>
              </div>
              <button type="button" className="calendar-drawer__close" onClick={onClose}>
                ✕
              </button>
            </div>

            <div className="calendar-drawer__body">
              {selection.items.length === 0 ? (
                <div className="calendar-empty-state">등록된 일정이 없습니다.</div>
              ) : (
                <div className="calendar-drawer-list">
                  {selection.items.map((item) => (
                    <button
                      key={`${item.id}-${selection.date}`}
                      type="button"
                      className="calendar-drawer-list__item"
                      onClick={() => onSelectItem(item)}
                    >
                      <span
                        className="calendar-drawer-list__dot"
                        style={{ background: item.color }}
                      />
                      <div className="calendar-drawer-list__meta">
                        <span className="calendar-drawer-list__title">{item.title}</span>
                        <span className="calendar-drawer-list__sub">
                          {getSourceLabel(item)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="calendar-drawer__footer">
              <button
                type="button"
                className="calendar-drawer__button calendar-drawer__button--accent"
                onClick={() => onCreateFromDate(selection.date)}
              >
                이 날짜 일정 만들기
              </button>
              <button
                type="button"
                className="calendar-drawer__button calendar-drawer__button--ghost"
                onClick={onClose}
              >
                닫기
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="calendar-drawer__header">
              <div>
                <div className="calendar-drawer__eyebrow">{getSourceLabel(selection.item)}</div>
                <h3 className="calendar-drawer__title">{selection.item.title}</h3>
              </div>
              <button type="button" className="calendar-drawer__close" onClick={onClose}>
                ✕
              </button>
            </div>

            <div className="calendar-drawer__body">
              <div className="calendar-detail-badge-row">
                <span
                  className="calendar-detail-badge"
                  style={{
                    background: selection.item.color,
                    color: selection.item.textColor,
                  }}
                >
                  {selection.item.status === "PENDING"
                    ? `${getSourceLabel(selection.item)} · 대기`
                    : getSourceLabel(selection.item)}
                </span>
              </div>

              <div className="calendar-detail-card">
                <DetailRow
                  label="기간"
                  value={formatDateRange(
                    selection.item.startDate,
                    selection.item.endDate
                  )}
                />

                {selection.item.source === "attendance" ? (
                  <>
                    <DetailRow
                      label="출근 시간"
                      value={formatDateTimeLabel(selection.item.checkIn)}
                    />
                    <DetailRow
                      label="퇴근 시간"
                      value={formatDateTimeLabel(selection.item.checkOut)}
                    />
                    <DetailRow
                      label="근무 시간"
                      value={formatWorkMinutes(selection.item.workMinutes)}
                    />
                    <DetailRow
                      label="상태"
                      value={formatAttendanceStatus(selection.item.status)}
                    />
                  </>
                ) : null}

                {selection.item.source === "leave" ? (
                  <>
                    <DetailRow
                      label="유형"
                      value={formatLeaveType(selection.item.leaveType)}
                    />
                    <DetailRow
                      label="상태"
                      value={formatLeaveStatus(selection.item.status)}
                    />
                    <DetailRow
                      label="결재자"
                      value={selection.item.approverName || "-"}
                    />
                  </>
                ) : null}

                {selection.item.projectName ? (
                  <DetailRow label="프로젝트" value={selection.item.projectName} />
                ) : null}

                {selection.item.description ? (
                  <div className="calendar-detail-note">
                    <div className="calendar-detail-note__label">메모</div>
                    <div className="calendar-detail-note__value">
                      {selection.item.description}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="calendar-drawer__footer">
              {selection.item.source === "calendarEvent" && selection.item.canEdit ? (
                <button
                  type="button"
                  className="calendar-drawer__button calendar-drawer__button--accent"
                  onClick={() => onEditItem(selection.item)}
                >
                  수정
                </button>
              ) : null}

              {selection.item.source === "calendarEvent" && selection.item.canDelete ? (
                <button
                  type="button"
                  className="calendar-drawer__button calendar-drawer__button--danger"
                  onClick={() => onDeleteItem(selection.item)}
                >
                  삭제
                </button>
              ) : null}

              {selection.item.source === "attendance" ? (
                <button
                  type="button"
                  className="calendar-drawer__button calendar-drawer__button--accent"
                  onClick={() => router.push(selection.item.actionHref || "/attendance")}
                >
                  근무시간 수정요청
                </button>
              ) : null}

              {selection.item.source === "leave" ? (
                <button
                  type="button"
                  className="calendar-drawer__button calendar-drawer__button--accent"
                  onClick={() => router.push(selection.item.actionHref || "/docs")}
                >
                  휴가 상세 보기
                </button>
              ) : null}

              {selection.item.source === "project" ? (
                <button
                  type="button"
                  className="calendar-drawer__button calendar-drawer__button--accent"
                  onClick={() =>
                    router.push(selection.item.actionHref || `/projects/${selection.item.projectId}`)
                  }
                >
                  프로젝트 상세 보기
                </button>
              ) : null}

              <button
                type="button"
                className="calendar-drawer__button calendar-drawer__button--ghost"
                onClick={onClose}
              >
                닫기
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
