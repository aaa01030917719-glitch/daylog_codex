"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatAttendanceMinutes,
  formatAttendanceTime,
  getAttendanceStatusStyle,
} from "./attendance-utils";

interface AttendanceRecord {
  id: string;
  date: string | Date;
  checkIn: string | Date | null;
  checkOut: string | Date | null;
  workMinutes: number | null;
  status: string;
  memo: string | null;
  user: { id: string; name: string | null; image: string | null };
}

interface Props {
  records: AttendanceRecord[];
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
}

const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

export function AttendanceList({ records, year, month, onMonthChange }: Props) {
  function prevMonth() {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  }

  function nextMonth() {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <button
          onClick={prevMonth}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: "0.25rem" }}
        >
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D" }}>
          {year}년 {MONTHS[month]}
        </span>
        <button
          onClick={nextMonth}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: "0.25rem" }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #E8E0C8", borderRadius: "0.75rem", overflow: "hidden" }}>
        {records.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#999", fontSize: "0.875rem" }}>
            이번 달 출퇴근 기록이 없습니다.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F5EED5" }}>
                {["날짜", "출근", "퇴근", "근무시간", "상태", "메모"].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: "#555",
                      borderBottom: "1px solid #E8E0C8",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => {
                const d = new Date(r.date);
                const weekday = d.toLocaleDateString("ko-KR", { weekday: "short" });
                const dateStr = `${d.getMonth() + 1}/${d.getDate()} (${weekday})`;
                const tone = getAttendanceStatusStyle(r.status);

                return (
                  <tr
                    key={r.id}
                    style={{
                      background: idx % 2 === 0 ? "#fff" : "#FAF7EE",
                      borderBottom: "1px solid #E8E0C8",
                    }}
                  >
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#2D2D2D", fontWeight: 500 }}>
                      {dateStr}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#2D2D2D" }}>
                      {formatAttendanceTime(r.checkIn)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#2D2D2D" }}>
                      {formatAttendanceTime(r.checkOut)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#2D2D2D" }}>
                      {formatAttendanceMinutes(r.workMinutes)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "0.125rem 0.5rem",
                          borderRadius: "9999px",
                          background: tone.bg,
                          color: tone.text,
                        }}
                      >
                        {tone.label}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#555" }}>
                      {r.memo ?? "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
