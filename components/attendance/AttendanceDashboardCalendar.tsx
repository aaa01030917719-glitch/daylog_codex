"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatAttendanceMinutes,
  formatAttendanceTime,
  getAttendanceStatusStyle,
  hasAnnualLeave,
  hasHalfDay,
  type AttendanceRecord,
} from "@/components/attendance/attendance-utils";

interface AttendanceDashboardCalendarProps {
  records: AttendanceRecord[];
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
}

const MONTH_LABELS = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function AttendanceDashboardCalendar({
  records,
  year,
  month,
  onMonthChange,
}: AttendanceDashboardCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const recordMap = useMemo(() => {
    const map = new Map<number, AttendanceRecord>();

    for (const record of records) {
      const recordDate = new Date(record.date);
      map.set(recordDate.getDate(), record);
    }

    return map;
  }, [records]);

  const cells: Array<number | null> = [...Array(firstDay).fill(null)];
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const selectedRecord = selectedDay ? recordMap.get(selectedDay) ?? null : null;
  const selectedDate = selectedDay ? new Date(year, month, selectedDay) : null;

  function handlePrevMonth() {
    if (month === 0) {
      onMonthChange(year - 1, 11);
      return;
    }

    onMonthChange(year, month - 1);
  }

  function handleNextMonth() {
    if (month === 11) {
      onMonthChange(year + 1, 0);
      return;
    }

    onMonthChange(year, month + 1);
  }

  return (
    <>
      <section className="card-panel flex h-full flex-col">
        <div className="card-header">
          <div>
            <div className="subtle-label">Monthly Attendance</div>
            <h2 className="card-title mt-2">월간 근무 현황</h2>
            <p className="card-description">날짜를 클릭하면 출퇴근 기록과 연차 사용 여부를 자세히 확인할 수 있습니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handlePrevMonth} className="icon-button" aria-label="이전 달">
              <ChevronLeft size={18} />
            </button>
            <div>
              {year}년 {MONTH_LABELS[month]}
            </div>
            <button type="button" onClick={handleNextMonth} className="icon-button" aria-label="다음 달">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="card-body">
          <div className="grid grid-cols-7 gap-3 text-center text-sm font-semibold text-[var(--text-muted)]">
            {WEEKDAY_LABELS.map((weekday) => (
              <div key={weekday} className="py-2">
                {weekday}
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-3">
            {cells.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="min-h-[92px] rounded-[18px]" />;
              }

              const record = recordMap.get(day) ?? null;
              const tone = record ? getAttendanceStatusStyle(record.status) : null;
              const isToday =
                today.getFullYear() === year &&
                today.getMonth() === month &&
                today.getDate() === day;
              const weekdayIndex = (firstDay + day - 1) % 7;
              const dayColor =
                weekdayIndex === 0 ? "#f97316" : weekdayIndex === 6 ? "#4f7cff" : "#334155";

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className="relative min-h-[92px] rounded-[18px] p-3 text-left transition-all hover:-translate-y-0.5"
                  style={{
                    border: isToday ? "2px solid var(--accent)" : "1px solid var(--border)",
                    background: tone ? tone.bg : "var(--surface)",
                    boxShadow: isToday ? "0 14px 24px rgba(79,124,255,0.14)" : "var(--shadow-sm)",
                  }}
                >
                  <div className="text-base font-semibold" style={{ color: isToday ? "var(--accent)" : dayColor }}>
                    {day}
                  </div>

                  <div className="mt-3 min-h-[32px]">
  {record ? (
    <div className="space-y-1">
      <div
        className="inline-flex items-center gap-1 text-xs font-semibold"
        style={{ color: tone?.text }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: tone?.dot }}
        />
        {tone?.label}
      </div>
      <div className="text-xs text-[var(--text-secondary)]">
        출근 {formatAttendanceTime(record.checkIn)}
      </div>
    </div>
  ) : (
    <div className="text-xs font-medium text-[var(--text-muted)]">
      {isToday ? "오늘" : ""}
    </div>
  )}
</div>
</button>
);
})}
</div>

          <div className="mt-5 flex flex-wrap gap-3">
            {["NORMAL", "LATE", "EARLY_LEAVE", "HOLIDAY", "OVERTIME"].map((status) => {
              const tone = getAttendanceStatusStyle(status);
              return (
                <div key={status} className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone.dot }} />
                  {tone.label}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {selectedDate ? (
        <div className="modal-shell" onClick={() => setSelectedDay(null)}>
          <div className="modal-overlay" />
          <div className="modal-card max-w-xl" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {selectedDate.toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                  })}
                </h3>
                <p className="modal-subtitle">선택한 날짜의 근무 상세 내역입니다.</p>
              </div>
            </div>

            <div className="modal-body space-y-3 text-sm">
              <DetailRow label="상태" value={getAttendanceStatusStyle(selectedRecord?.status).label} />
              <DetailRow label="연차 사용" value={hasAnnualLeave(selectedRecord) ? "사용" : "없음"} />
              <DetailRow label="반차 사용" value={hasHalfDay(selectedRecord) ? "사용" : "없음"} />
              <DetailRow label="출근 시간" value={formatAttendanceTime(selectedRecord?.checkIn ?? null)} />
              <DetailRow label="퇴근 시간" value={formatAttendanceTime(selectedRecord?.checkOut ?? null)} />
              <DetailRow label="근무 시간" value={formatAttendanceMinutes(selectedRecord?.workMinutes ?? null)} />
              <DetailRow label="메모" value={selectedRecord?.memo?.trim() || "기록된 메모가 없습니다."} multiline />
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setSelectedDay(null)} className="secondary-button w-full">
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function DetailRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 ${
        multiline ? "space-y-2" : "flex items-center justify-between gap-4"
      }`}
    >
      <div className="text-sm font-semibold text-[var(--text-primary)]">{label}</div>
      <div
        className={`text-sm text-[var(--text-secondary)] ${
          multiline ? "whitespace-pre-wrap leading-7" : "text-right"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
