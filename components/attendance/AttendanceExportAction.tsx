"use client";

import { Download } from "lucide-react";
import type { AttendanceRecord } from "@/components/attendance/attendance-utils";

interface AttendanceExportActionProps {
  records: AttendanceRecord[];
  userName: string;
  year: number;
  month: number;
}

const STATUS_LABELS: Record<string, string> = {
  NORMAL: "출근",
  LATE: "지각",
  EARLY_LEAVE: "반차",
  ABSENT: "부재",
  OVERTIME: "추가근무",
  HOLIDAY: "연차",
};

function formatTime(value: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function AttendanceExportAction({
  records,
  userName,
  year,
  month,
}: AttendanceExportActionProps) {
  async function handleExport() {
    const XLSX = await import("xlsx");

    const header = ["날짜", "출근", "퇴근", "근무시간(분)", "상태", "메모"];
    const rows = records.map((record) => {
      const date = new Date(record.date);
      const dateLabel = `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;

      return [
        dateLabel,
        formatTime(record.checkIn),
        formatTime(record.checkOut),
        record.workMinutes ?? "",
        STATUS_LABELS[record.status] ?? record.status,
        record.memo ?? "",
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "출퇴근");

    XLSX.writeFile(workbook, `daylog_출퇴근_${year}_${month + 1}_${userName}.xlsx`);
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="primary-button"
    >
      <Download size={15} />
      엑셀 다운로드
    </button>
  );
}
