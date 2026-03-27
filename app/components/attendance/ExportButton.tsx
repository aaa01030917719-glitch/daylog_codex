"use client";

import { Download } from "lucide-react";

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
  userName: string;
  year: number;
  month: number;
}

const STATUS_LABELS: Record<string, string> = {
  NORMAL: "정상",
  LATE: "지각",
  EARLY_LEAVE: "조퇴",
  ABSENT: "결근",
  OVERTIME: "초과근무",
  HOLIDAY: "휴가",
};

function formatTime(d: string | Date | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getHours().toString().padStart(2, "0")}:${dt.getMinutes().toString().padStart(2, "0")}`;
}

export function ExportButton({ records, userName, year, month }: Props) {
  async function handleExport() {
    const XLSX = await import("xlsx");

    const header = ["날짜", "출근", "퇴근", "근무시간(분)", "상태", "메모"];
    const rows = records.map((r) => {
      const d = new Date(r.date);
      const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
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

    const filename = `daylog_출퇴근_${year}년${month + 1}월_${userName}.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  return (
    <button
      onClick={handleExport}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.375rem 0.875rem",
        border: "1px solid #E8E0C8",
        borderRadius: "0.5rem",
        background: "#fff",
        color: "#2D2D2D",
        fontSize: "0.875rem",
        cursor: "pointer",
      }}
    >
      <Download size={14} />
      Excel 다운로드
    </button>
  );
}
