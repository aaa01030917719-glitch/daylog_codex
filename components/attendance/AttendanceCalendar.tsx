"use client";

import { useState } from "react";
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
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function AttendanceCalendar({ records, year, month, onMonthChange }: Props) {
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const recordMap = new Map<number, AttendanceRecord>();
  for (const r of records) {
    const d = new Date(r.date);
    recordMap.set(d.getDate(), r);
  }

  function prevMonth() {
    if (month === 0) onMonthChange(year - 1, 11);
    else onMonthChange(year, month - 1);
  }

  function nextMonth() {
    if (month === 11) onMonthChange(year + 1, 0);
    else onMonthChange(year, month + 1);
  }

  const cells: (number | null)[] = [...Array(firstDay).fill(null)];
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#F5EED5" }}>
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              style={{
                textAlign: "center",
                padding: "0.625rem",
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: i === 0 ? "#D93025" : i === 6 ? "#3B5BDB" : "#555",
              }}
            >
              {w}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((day, idx) => {
            if (!day) {
              return (
                <div
                  key={`empty-${idx}`}
                  style={{
                    minHeight: "5rem",
                    borderBottom: "1px solid #E8E0C8",
                    borderRight: idx % 7 !== 6 ? "1px solid #E8E0C8" : undefined,
                  }}
                />
              );
            }

            const record = recordMap.get(day);
            const isToday =
              today.getFullYear() === year &&
              today.getMonth() === month &&
              today.getDate() === day;
            const statusInfo = record ? getAttendanceStatusStyle(record.status) : null;
            const dayOfWeek = (firstDay + day - 1) % 7;

            return (
              <div
                key={day}
                onClick={() => record && setSelectedRecord(record)}
                style={{
                  minHeight: "5rem",
                  padding: "0.375rem",
                  borderBottom: "1px solid #E8E0C8",
                  borderRight: idx % 7 !== 6 ? "1px solid #E8E0C8" : undefined,
                  background: statusInfo ? statusInfo.bg : "#fff",
                  cursor: record ? "pointer" : "default",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    width: "1.625rem",
                    height: "1.625rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    fontSize: "0.8125rem",
                    fontWeight: isToday ? 700 : 400,
                    color: isToday
                      ? "#fff"
                      : dayOfWeek === 0
                        ? "#D93025"
                        : dayOfWeek === 6
                          ? "#3B5BDB"
                          : "#2D2D2D",
                    background: isToday ? "#F56B23" : "transparent",
                    border: isToday ? "2px solid #F56B23" : "none",
                    marginBottom: "0.25rem",
                  }}
                >
                  {day}
                </div>
                {record && (
                  <div>
                    <div style={{ fontSize: "0.6875rem", color: statusInfo?.text, fontWeight: 600 }}>
                      {statusInfo?.label}
                    </div>
                    {record.checkIn && (
                      <div style={{ fontSize: "0.6875rem", color: "#555" }}>
                        {formatAttendanceTime(record.checkIn)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
        {["NORMAL", "LATE", "EARLY_LEAVE", "ABSENT", "HOLIDAY"].map((status) => {
          const tone = getAttendanceStatusStyle(status);
          return (
            <div key={status} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
              <div
                style={{
                  width: "0.75rem",
                  height: "0.75rem",
                  borderRadius: "0.125rem",
                  background: tone.bg,
                  border: `1px solid ${tone.text}`,
                }}
              />
              <span style={{ fontSize: "0.75rem", color: "#555" }}>{tone.label}</span>
            </div>
          );
        })}
      </div>

      {selectedRecord && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setSelectedRecord(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "0.75rem",
              padding: "1.5rem",
              width: "calc(100% - 2rem)",
              maxWidth: "24rem",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: 600, color: "#0D0D0D", marginBottom: "0.25rem" }}>
                {new Date(selectedRecord.date).toLocaleDateString("ko-KR", {
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </h3>
              {selectedRecord.status && (
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    padding: "0.125rem 0.5rem",
                    borderRadius: "9999px",
                    background: getAttendanceStatusStyle(selectedRecord.status).bg,
                    color: getAttendanceStatusStyle(selectedRecord.status).text,
                  }}
                >
                  {getAttendanceStatusStyle(selectedRecord.status).label}
                </span>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              <Row label="출근" value={formatAttendanceTime(selectedRecord.checkIn)} />
              <Row label="퇴근" value={formatAttendanceTime(selectedRecord.checkOut)} />
              <Row label="근무 시간" value={formatAttendanceMinutes(selectedRecord.workMinutes)} />
              {selectedRecord.memo && <Row label="메모" value={selectedRecord.memo} />}
            </div>

            <button
              onClick={() => setSelectedRecord(null)}
              style={{
                marginTop: "1.25rem",
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #E8E0C8",
                borderRadius: "0.5rem",
                background: "#fff",
                cursor: "pointer",
                fontSize: "0.875rem",
                color: "#555",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
      <span style={{ color: "#999" }}>{label}</span>
      <span style={{ color: "#2D2D2D", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
