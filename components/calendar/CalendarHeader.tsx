"use client";

import type { CalendarView } from "@/components/calendar/types";
import { formatCalendarMonthLabel } from "@/lib/calendar/shared";

interface CalendarHeaderProps {
  year: number;
  month: number;
  viewMode: CalendarView;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
  onCreateClick: () => void;
}

export function CalendarHeader({
  year,
  month,
  viewMode,
  onPrev,
  onNext,
  onToday,
  onViewChange,
}: CalendarHeaderProps) {
  return (
    <header className="cal-header">
      <div className="cal-nav-group">
        <button type="button" className="btn-today" onClick={onToday}>
          오늘
        </button>
        <button type="button" className="btn-arrow" onClick={onPrev} aria-label="이전 달">
          ‹
        </button>
        <button type="button" className="btn-arrow" onClick={onNext} aria-label="다음 달">
          ›
        </button>
        <span className="cal-month-title">{formatCalendarMonthLabel(year, month)}</span>
      </div>

      <div className="cal-header-right">
        <button type="button" className="header-icon-btn" aria-label="검색">
          🔍
        </button>
        <button type="button" className="header-icon-btn" aria-label="알림">
          🔔
        </button>
        <button type="button" className="header-icon-btn" aria-label="설정">
          ⚙️
        </button>
        <select
          className="view-select"
          value={viewMode}
          onChange={() => onViewChange("month")}
          aria-label="보기 선택"
        >
          <option value="month">월</option>
        </select>
      </div>
    </header>
  );
}
