"use client";

import { Download } from "lucide-react";
import type { AttendanceRecord } from "./attendance-utils";

interface Props {
  records: AttendanceRecord[];
  userName: string;
  year: number;
  month: number;
  emphasized?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  NORMAL: "출근",
  LATE: "지각",
  EARLY_LEAVE: "반차",
  ABSENT: "부재",
  OVERTIME: "추가근무",
  HOLIDAY: "연차",
};

function formatTime(d: string | Date | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getHours().toString().padStart(2, "0")}:${dt
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function ExportButton({
  records,
  userName,
  year,
  month,
  emphasized = false,
}: Props) {
  async function handleExport() {
    const XLSX = await import("xlsx");

    const header = ["날짜", "출근", "퇴근", "근무시간(분)", "상태", "메모"];
    const rows = records.map((r) => {
      const d = new Date(r.date);
      const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
      return [
        dateStr,
        formatTime(r.checkIn),
        formatTime(r.checkOut),
        r.workMinutes ?? "",
        STATUS_LABELS[r.status] ?? r.status,
        r.memo ?? "",
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "출퇴근");

    const filename = `daylog_출퇴근_${year}_${month + 1}_${userName}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
      style={{
        border: emphasized ? "none" : "1px solid #E8E0C8",
        borderRadius: "0.75rem",
        background: emphasized ? "#F56B23" : "#fff",
        color: emphasized ? "#fff" : "#2D2D2D",
        boxShadow: emphasized ? "0 10px 20px rgba(245,107,35,0.18)" : "none",
        cursor: "pointer",
      }}
    >
      <Download size={15} />
      엑셀 다운로드
    </button>
  );
}
