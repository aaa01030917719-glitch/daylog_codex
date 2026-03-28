"use client";

import { useState, useEffect, useCallback } from "react";

interface AttendanceData {
  checkIn: string | null;
  status: string;
}








interface CheckInBannerProps {
  initialAttendance: AttendanceData | null;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function calcWorkedTime(checkInStr: string) {
  const now = new Date();
  const checkIn = new Date(checkInStr);
  const diffMs = now.getTime() - checkIn.getTime();
  const totalMin = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}시간 ${m}분`;
}

export function CheckInBanner({ initialAttendance }: CheckInBannerProps) {
  const [attendance, setAttendance] = useState<AttendanceData | null>(initialAttendance);
  const [workedTime, setWorkedTime] = useState("");
  const [loading, setLoading] = useState(false);

  const updateWorkedTime = useCallback(() => {
    if (attendance?.checkIn) {
      setWorkedTime(calcWorkedTime(attendance.checkIn));
    }
  }, [attendance?.checkIn]);

  useEffect(() => {
    if (!attendance?.checkIn) return;
    updateWorkedTime();
    const timer = setInterval(updateWorkedTime, 60000);
    return () => clearInterval(timer);
  }, [attendance?.checkIn, updateWorkedTime]);

  async function handleCheckIn() {
    setLoading(true);
    // 낙관적 UI
    const now = new Date().toISOString();
    setAttendance({ checkIn: now, status: "NORMAL" });

    try {
      const res = await fetch("/api/attendance/check-in", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        if (res.status === 409) return; // already checked in
        setAttendance(initialAttendance);
        console.error(data.error);
      } else {
        const data = await res.json();
        setAttendance({ checkIn: data.checkIn, status: data.status });
      }
    } catch {
      setAttendance(initialAttendance);
    } finally {
      setLoading(false);
    }
  }

  if (attendance?.checkIn) {
    return (
      <div className="rounded-xl px-5 py-3.5 flex items-center gap-3" style={{ background: "#F0FBF4" }}>
        <span className="text-sm font-medium" style={{ color: "#2A8C50" }}>
          🟢 {formatTime(attendance.checkIn)} 출근 완료
          {attendance.status === "LATE" && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "#FEF0E8", color: "#F56B23" }}>
              지각
            </span>
          )}
        </span>
        <span className="text-xs" style={{ color: "#2A8C50" }}>
          근무 중 {workedTime}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-xl px-5 py-3.5 flex items-center justify-between" style={{ background: "#FEF0E8" }}>
      <span className="text-sm font-medium" style={{ color: "#F56B23" }}>
        🟡 아직 출근 전이에요
      </span>
      <button
        onClick={handleCheckIn}
        disabled={loading}
        className="rounded-lg px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ background: "#F56B23" }}
      >
        {loading ? "처리 중..." : "출근하기"}
      </button>
    </div>
  );
}
