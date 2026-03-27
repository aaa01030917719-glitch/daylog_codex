"use client";

import { useState } from "react";
import { AttendanceCalendar } from "./AttendanceCalendar";
import { AttendanceList } from "./AttendanceList";
import { ExportButton } from "./ExportButton";

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

interface Member {
  id: string;
  name: string | null;
  image: string | null;
}

interface Props {
  initialRecords: AttendanceRecord[];
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
  currentUserName: string;
}

type ViewMode = "calendar" | "list";

export function AttendanceClientPage({
  initialRecords,
  members,
  isAdmin,
  currentUserId,
  currentUserName,
}: Omit<Props, "workspaceId">) {
  const [view, setView] = useState<ViewMode>("calendar");
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUserId);
  const [selectedUserName, setSelectedUserName] = useState<string>(currentUserName);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(false);

  async function fetchRecords(userId: string, year: number, month: number) {
    setLoading(true);
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const params = new URLSearchParams({ userId, from, to });

    try {
      const res = await fetch(`/api/attendance?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleUserChange(userId: string) {
    const member = members.find((m) => m.id === userId);
    setSelectedUserId(userId);
    setSelectedUserName(member?.name ?? currentUserName);
    fetchRecords(userId, currentYear, currentMonth);
  }

  function handleMonthChange(year: number, month: number) {
    setCurrentYear(year);
    setCurrentMonth(month);
    fetchRecords(selectedUserId, year, month);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ fontFamily: "Noto Serif KR, serif", fontSize: "1.5rem", fontWeight: 700, color: "#0D0D0D" }}>
          출퇴근 관리
        </h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {isAdmin && members.length > 0 && (
            <select
              value={selectedUserId}
              onChange={(e) => handleUserChange(e.target.value)}
              style={{
                border: "1px solid #E8E0C8",
                borderRadius: "0.5rem",
                padding: "0.375rem 0.75rem",
                fontSize: "0.875rem",
                background: "#fff",
                color: "#2D2D2D",
              }}
            >
              <option value={currentUserId}>{currentUserName} (나)</option>
              {members
                .filter((m) => m.id !== currentUserId)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          )}

          <div style={{ display: "flex", border: "1px solid #E8E0C8", borderRadius: "0.5rem", overflow: "hidden" }}>
            <button
              onClick={() => setView("calendar")}
              style={{
                padding: "0.375rem 0.875rem",
                fontSize: "0.875rem",
                background: view === "calendar" ? "#F56B23" : "#fff",
                color: view === "calendar" ? "#fff" : "#555",
                border: "none",
                cursor: "pointer",
              }}
            >
              캘린더형
            </button>
            <button
              onClick={() => setView("list")}
              style={{
                padding: "0.375rem 0.875rem",
                fontSize: "0.875rem",
                background: view === "list" ? "#F56B23" : "#fff",
                color: view === "list" ? "#fff" : "#555",
                border: "none",
                cursor: "pointer",
              }}
            >
              리스트형
            </button>
          </div>

          <ExportButton
            records={records}
            userName={selectedUserName}
            year={currentYear}
            month={currentMonth}
          />
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#999" }}>불러오는 중...</div>
      )}

      {!loading && view === "calendar" && (
        <AttendanceCalendar
          records={records}
          year={currentYear}
          month={currentMonth}
          onMonthChange={handleMonthChange}
        />
      )}

      {!loading && view === "list" && (
        <AttendanceList
          records={records}
          year={currentYear}
          month={currentMonth}
          onMonthChange={handleMonthChange}
        />
      )}
    </div>
  );
}
