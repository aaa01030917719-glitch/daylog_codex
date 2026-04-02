"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ko } from "date-fns/locale";

export interface WorkspaceCalendarEvent {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  color: string;
  allDay: boolean;
  scheduleLabel?: string;
}

export interface WorkspaceLeaveMarker {
  date: string;
  kind: "leave" | "half";
}

interface WorkspaceMonthCalendarProps {
  events: WorkspaceCalendarEvent[];
  leaveMarkers: WorkspaceLeaveMarker[];
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function toDateKey(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function buildUpcomingLeaveLabel(leaveMarkers: WorkspaceLeaveMarker[]) {
  const todayKey = toDateKey(new Date());
  const next = [...leaveMarkers]
    .sort((left, right) => left.date.localeCompare(right.date))
    .find((item) => item.date >= todayKey);

  if (!next) return null;

  const date = new Date(next.date);
  const prefix = next.kind === "leave" ? "예정 연차" : "예정 반차";
  return {
    label: prefix,
    dateLabel: format(date, "M월 d일 (EEE)", { locale: ko }),
    subLabel:
      next.kind === "leave"
        ? "캘린더에서 휴가 일정을 함께 확인할 수 있습니다."
        : "반차 일정도 근무 캘린더에 함께 표시됩니다.",
  };
}

export function WorkspaceMonthCalendar({
  events,
  leaveMarkers,
}: WorkspaceMonthCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const eventDaySet = useMemo(
    () =>
      new Set(
        events.map((event) => {
          return toDateKey(new Date(event.startAt));
        })
      ),
    [events]
  );

  const leaveDaySet = useMemo(
    () => new Set(leaveMarkers.filter((item) => item.kind === "leave").map((item) => item.date)),
    [leaveMarkers]
  );

  const halfDaySet = useMemo(
    () => new Set(leaveMarkers.filter((item) => item.kind === "half").map((item) => item.date)),
    [leaveMarkers]
  );

  const upcomingLeave = useMemo(() => buildUpcomingLeaveLabel(leaveMarkers), [leaveMarkers]);

  return (
    <section className="card-panel">
      <div className="card-header">
        <div>
          <h2 className="card-title">이번 달 일정</h2>
          <p className="card-description">휴가 일정과 주요 이벤트를 한눈에 확인하세요.</p>
        </div>
      </div>

      <div className="card-body">
        <div className="workspace-calendar__nav">
          <button
            type="button"
            className="workspace-calendar__nav-button"
            onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
            aria-label="이전 달"
          >
            이전
          </button>
          <span className="workspace-calendar__month">
            {format(currentMonth, "yyyy년 M월", { locale: ko })}
          </span>
          <button
            type="button"
            className="workspace-calendar__nav-button"
            onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
            aria-label="다음 달"
          >
            다음
          </button>
        </div>

        <div className="workspace-calendar__labels">
          {DAY_LABELS.map((label) => (
            <div key={label} className="workspace-calendar__day-label">
              {label}
            </div>
          ))}
        </div>

        <div className="workspace-calendar__grid">
          {monthDays.map((day) => {
            const dayKey = toDateKey(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isLeave = leaveDaySet.has(dayKey);
            const isHalf = halfDaySet.has(dayKey);
            const hasEvent = eventDaySet.has(dayKey);

            return (
              <div
                key={dayKey}
                className={[
                  "workspace-calendar__cell",
                  isToday(day) ? "is-today" : "",
                  !isCurrentMonth ? "is-other-month" : "",
                  isLeave ? "is-leave" : "",
                  isHalf ? "is-half" : "",
                  hasEvent ? "has-event" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {format(day, "d")}
              </div>
            );
          })}
        </div>

        <div className="workspace-calendar__legend">
          <span className="workspace-calendar__legend-item">
            <span className="workspace-calendar__legend-dot workspace-calendar__legend-dot--leave" />
            연차
          </span>
          <span className="workspace-calendar__legend-item">
            <span className="workspace-calendar__legend-dot workspace-calendar__legend-dot--half" />
            반차
          </span>
          <span className="workspace-calendar__legend-item">
            <span className="workspace-calendar__legend-dot workspace-calendar__legend-dot--event" />
            일정
          </span>
        </div>

        <div className="workspace-calendar__banner">
          {upcomingLeave ? (
            <>
              <div className="workspace-calendar__banner-label">{upcomingLeave.label}</div>
              <div className="workspace-calendar__banner-date">{upcomingLeave.dateLabel}</div>
              <div className="workspace-calendar__banner-sub">{upcomingLeave.subLabel}</div>
            </>
          ) : (
            <>
              <div className="workspace-calendar__banner-label">예정 휴가 없음</div>
              <div className="workspace-calendar__banner-date">이번 달 등록된 휴가 일정이 없습니다.</div>
              <div className="workspace-calendar__banner-sub">
                새 휴가 일정이 생기면 이 카드에 먼저 표시됩니다.
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
