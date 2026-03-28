"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

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

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  NORMAL: { bg: "#E8F7EE", text: "#2A8C50", label: "정상" },
  LATE: { bg: "#FFF8E6", text: "#D4A200", label: "지각" },
  EARLY_LEAVE: { bg: "#EEF3FC", text: "#3B5BDB", label: "조퇴" },
  ABSENT: { bg: "#FDECEA", text: "#D93025", label: "결근" },
  OVERTIME: { bg: "#FEF0E8", text: "#F56B23", label: "초과근무" },
  HOLIDAY: { bg: "#F0F0F0", text: "#777", label: "휴가" },
};

function formatTime(d: string | Date | null): string {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`;
}

function formatMinutes(m: number | null): string {
  if (!m) return "-";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}시간 ${min}분` : `${min}분`;
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
      {/* Month navigation */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginBottom: "1rem" }}>
        <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: "0.25rem" }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D" }}>
          {year}년 {MONTHS[month]}
        </span>
        <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: "0.25rem" }}>
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
                const s = STATUS_STYLES[r.status];

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
                      {formatTime(r.checkIn)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#2D2D2D" }}>
                      {formatTime(r.checkOut)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#2D2D2D" }}>
                      {formatMinutes(r.workMinutes)}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          display: "inline-block",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          padding: "0.125rem 0.5rem",
                          borderRadius: "9999px",
                          background: s?.bg,
                          color: s?.text,
                        }}
                      >
                        {s?.label ?? r.status}
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
