"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ko } from "date-fns/locale";

interface CalendarEvent {
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  color: string;
  allDay: boolean;
}

interface MiniCalendarProps {
  events: CalendarEvent[];
}

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function MiniCalendar({ events }: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const today = new Date();
  const todayEvents = events.filter((e) => isSameDay(new Date(e.startAt), today));
  const eventDays = new Set(events.map((e) => format(new Date(e.startAt), "yyyy-MM-dd")));

  function prev() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }
  function next() {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* 달력 */}
      <div
        className="rounded-xl bg-white p-4 flex-shrink-0"
        style={{ border: "1px solid #E8E0C8", minWidth: 260 }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={prev}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F5EED5] transition-colors"
            style={{ color: "#555" }}
          >
            ‹
          </button>
          <span className="font-serif text-sm font-semibold" style={{ color: "#0D0D0D" }}>
            {format(currentMonth, "yyyy년 M월", { locale: ko })}
          </span>
          <button
            onClick={next}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[#F5EED5] transition-colors"
            style={{ color: "#555" }}
          >
            ›
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_LABELS.map((d, i) => (
            <div
              key={d}
              className="text-center text-xs py-1 font-medium"
              style={{ color: i === 0 ? "#F56B23" : i === 6 ? "#4A7CF6" : "#999" }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const inMonth = isSameMonth(day, currentMonth);
            const isT = isToday(day);
            const hasEvent = eventDays.has(key);
            const isSun = day.getDay() === 0;
            const isSat = day.getDay() === 6;

            return (
              <div key={key} className="flex flex-col items-center py-0.5">
                <div
                  className="w-7 h-7 flex items-center justify-center rounded-full text-xs transition-colors"
                  style={{
                    background: isT ? "#F56B23" : undefined,
                    color: isT
                      ? "#fff"
                      : !inMonth
                      ? "#ccc"
                      : isSun
                      ? "#F56B23"
                      : isSat
                      ? "#4A7CF6"
                      : "#333",
                    fontWeight: isT ? 700 : 400,
                  }}
                >
                  {format(day, "d")}
                </div>
                {hasEvent && !isT && (
                  <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: "#F56B23" }} />
                )}
                {!hasEvent && <div className="w-1 h-1 mt-0.5" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* 오늘 일정 */}
      <div className="flex-1 rounded-xl bg-white p-4" style={{ border: "1px solid #E8E0C8" }}>
        <h3 className="font-serif text-sm font-semibold mb-3" style={{ color: "#0D0D0D" }}>
          오늘 일정 · {format(today, "M월 d일 (eee)", { locale: ko })}
        </h3>
        {todayEvents.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: "#999" }}>오늘 일정이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {todayEvents.map((ev) => (
              <li key={ev.id} className="flex items-start gap-2.5">
                <div
                  className="w-1 rounded-full mt-1 flex-shrink-0"
                  style={{ background: ev.color, height: 32 }}
                />
                <div>
                  <p className="text-sm font-medium" style={{ color: "#2D2D2D" }}>{ev.title}</p>
                  <p className="text-xs" style={{ color: "#999" }}>
                    {ev.allDay
                      ? "종일"
                      : `${format(new Date(ev.startAt), "HH:mm")} – ${format(new Date(ev.endAt), "HH:mm")}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
