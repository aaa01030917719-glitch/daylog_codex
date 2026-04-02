"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatAttendanceMinutes,
  formatAttendanceTime,
  getAttendanceStatusStyle,
  type AttendanceRecord,
} from "@/components/attendance/attendance-utils";

interface AttendanceDashboardListProps {
  records: AttendanceRecord[];
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  title?: string;
}

const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

export function AttendanceDashboardList({
  records,
  year,
  month,
  onMonthChange,
  title,
}: AttendanceDashboardListProps) {
  function handlePrevMonth() {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  }

  function handleNextMonth() {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  }

  return (
    <section className="card-panel">
      <div className="card-header">
        <div>
          <h2 className="card-title">월별 출퇴근 기록{title ? ` · ${title}` : ""}</h2>
          <p className="card-description">달력 보기와 동일한 월 이동 기준으로 근무 기록을 확인합니다.</p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={handlePrevMonth} className="icon-button">
            <ChevronLeft size={18} />
          </button>
          <div className="summary-chip">
            {year}년 {MONTHS[month]}
          </div>
          <button type="button" onClick={handleNextMonth} className="icon-button">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="card-body">
        {records.length === 0 ? (
          <div className="empty-panel min-h-[220px]">
            <p className="empty-panel__title">이번 달 근무 기록이 없습니다.</p>
            <p className="empty-panel__description">기록이 생성되면 날짜 순서대로 이 영역에 표시됩니다.</p>
          </div>
        ) : (
          <div className="table-shell border-0 shadow-none">
            <table className="data-table">
              <thead>
                <tr>
                  {["날짜", "출근", "퇴근", "근무 시간", "상태", "메모"].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const date = new Date(record.date);
                  const weekday = date.toLocaleDateString("ko-KR", { weekday: "short" });
                  const tone = getAttendanceStatusStyle(record.status);

                  return (
                    <tr key={record.id}>
                      <td className="font-semibold text-[var(--text-primary)]">{`${date.getMonth() + 1}/${date.getDate()} (${weekday})`}</td>
                      <td>{formatAttendanceTime(record.checkIn)}</td>
                      <td>{formatAttendanceTime(record.checkOut)}</td>
                      <td>{formatAttendanceMinutes(record.workMinutes)}</td>
                      <td>
                        <span className="status-badge" style={{ background: tone.bg, color: tone.text }}>
                          <span className="status-badge__dot" style={{ background: tone.dot }} />
                          {tone.label}
                        </span>
                      </td>
                      <td>{record.memo?.trim() ? record.memo : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}