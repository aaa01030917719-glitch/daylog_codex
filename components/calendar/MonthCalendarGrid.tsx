"use client";

import { useState, type MouseEvent } from "react";
import { CalendarEventChip } from "@/components/calendar/CalendarEventChip";
import type { CalendarItem } from "@/components/calendar/types";
import { buildCalendarDays, toDateKey } from "@/lib/calendar/shared";

interface MonthCalendarGridProps {
  year: number;
  month: number;
  items: CalendarItem[];
  isLoading?: boolean;
  onDateClick: (dateStr: string) => void;
  onEventClick: (item: CalendarItem) => void;
  onMoreClick: (dateStr: string, items: CalendarItem[]) => void;
}

interface CalendarTooltipState {
  item: CalendarItem;
  x: number;
  y: number;
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function resolveTooltipDescription(item: CalendarItem) {
  const description = item.description?.trim();
  return description && description.length > 0 ? description : null;
}

function estimateTooltipHeight(item: CalendarItem) {
  const description = resolveTooltipDescription(item);
  if (!description) {
    return 60;
  }

  const lineCount = Math.min(4, Math.max(1, Math.ceil(description.length / 28)));
  return 58 + lineCount * 18;
}

export function MonthCalendarGrid({
  year,
  month,
  items,
  isLoading = false,
  onDateClick,
  onEventClick,
  onMoreClick,
}: MonthCalendarGridProps) {
  const [tooltip, setTooltip] = useState<CalendarTooltipState | null>(null);
  const todayKey = toDateKey(new Date());
  const days = buildCalendarDays(year, month);

  function openTooltip(event: MouseEvent<HTMLButtonElement>, item: CalendarItem) {
    const rect = event.currentTarget.getBoundingClientRect();
    const tooltipWidth = 248;
    const tooltipHeight = estimateTooltipHeight(item);
    const viewportPadding = 12;
    const offset = 10;
    const preferredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const nextLeft = Math.min(
      Math.max(viewportPadding, preferredLeft),
      window.innerWidth - tooltipWidth - viewportPadding
    );
    const fitsBelow =
      rect.bottom + offset + tooltipHeight <= window.innerHeight - viewportPadding;
    const nextTop = fitsBelow
      ? rect.bottom + offset
      : Math.max(viewportPadding, rect.top - tooltipHeight - offset);

    setTooltip({
      item,
      x: nextLeft,
      y: nextTop,
    });
  }

  function closeTooltip() {
    setTooltip(null);
  }

  return (
    <>
      <div className="cal-grid-wrap">
        <div className="day-labels">
          {DAY_LABELS.map((label, index) => (
            <div
              key={label}
              className={`day-label${index === 0 ? " sun" : ""}${index === 6 ? " sat" : ""}`}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="month-grid">
          {days.map((day, index) => {
            const date = new Date(day.year, day.month, day.day);
            const dateStr = toDateKey(date);
            const dayOfWeek = index % 7;
            const dayItems = items.filter(
              (item) => item.startDate <= dateStr && item.endDate >= dateStr
            );
            const visibleItems = dayItems.slice(0, 3);
            const hiddenCount = Math.max(dayItems.length - visibleItems.length, 0);

            return (
              <div
                key={dateStr}
                className={`day-cell${day.isCurrentMonth ? "" : " other-month"}${
                  dateStr === todayKey ? " today" : ""
                }${dayOfWeek === 0 ? " sun" : ""}${dayOfWeek === 6 ? " sat" : ""}`}
                onClick={() => onDateClick(dateStr)}
              >
                <div className="day-num">{day.day}</div>
                <div className="calendar-event-chips">
                  {visibleItems.map((item) => (
                    <CalendarEventChip
                      key={`${item.id}-${dateStr}`}
                      item={item}
                      onClick={onEventClick}
                      onMouseEnter={(event) => openTooltip(event, item)}
                      onMouseMove={(event) => openTooltip(event, item)}
                      onMouseLeave={closeTooltip}
                    />
                  ))}
                  {hiddenCount > 0 ? (
                    <button
                      type="button"
                      className="more-events"
                      onClick={(event) => {
                        event.stopPropagation();
                        onMoreClick(dateStr, dayItems);
                      }}
                    >
                      +{hiddenCount}개 더보기
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {isLoading ? (
          <div className="calendar-loading-chip">일정을 불러오는 중...</div>
        ) : null}
      </div>

      {tooltip ? (
        <div
          className="pointer-events-none fixed z-[140] w-[248px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 shadow-[var(--shadow)]"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="break-words text-[12px] font-semibold leading-5 text-[var(--text-primary)]">
            {tooltip.item.title}
          </div>
          {resolveTooltipDescription(tooltip.item) ? (
            <div className="mt-1 break-words text-[11.5px] leading-5 text-[var(--text-secondary)]">
              {resolveTooltipDescription(tooltip.item)}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
