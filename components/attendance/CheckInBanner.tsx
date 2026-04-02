"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckoutConfirmModal } from "@/components/modals/CheckoutConfirmModal";

interface AttendanceData {
  checkIn: string;
  checkOut: string | null;
  status: string;
}

interface CheckInBannerProps {
  initialAttendance: AttendanceData | null;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function formatDuration(startIso: string, endIso: string) {
  const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
  const totalMinutes = Math.max(0, Math.round(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

function calcElapsed(checkInIso: string) {
  return formatDuration(checkInIso, new Date().toISOString());
}

async function readError(response: Response) {
  try {
    const data = await response.json();
    if (typeof data?.error === "string") {
      return data.error;
    }
  } catch {
    return null;
  }

  return null;
}

export function CheckInBanner({ initialAttendance }: CheckInBannerProps) {
  const [attendance, setAttendance] = useState<AttendanceData | null>(initialAttendance);
  const [elapsed, setElapsed] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateElapsed = useCallback(() => {
    if (attendance?.checkIn && !attendance.checkOut) {
      setElapsed(calcElapsed(attendance.checkIn));
    }
  }, [attendance?.checkIn, attendance?.checkOut]);

  useEffect(() => {
    if (!attendance?.checkIn || attendance.checkOut) {
      return;
    }

    updateElapsed();
    const timer = window.setInterval(updateElapsed, 60000);
    return () => window.clearInterval(timer);
  }, [attendance?.checkIn, attendance?.checkOut, updateElapsed]);

  const isWorking = Boolean(attendance?.checkIn && !attendance?.checkOut);

  useEffect(() => {
    if (!isWorking) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "퇴근 처리가 아직 완료되지 않았습니다.";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isWorking]);

  async function syncTodayAttendance() {
    try {
      const response = await fetch("/api/attendance/today");
      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { attendance?: AttendanceData | null };
      setAttendance(data.attendance ?? initialAttendance);
    } catch {
      setAttendance(initialAttendance);
    }
  }

  async function handleCheckIn() {
    setLoading(true);
    setMessage(null);

    const optimisticCheckIn = new Date().toISOString();
    setAttendance({ checkIn: optimisticCheckIn, checkOut: null, status: "NORMAL" });

    try {
      const response = await fetch("/api/attendance/check-in", { method: "POST" });

      if (response.status === 409) {
        await syncTodayAttendance();
        setMessage("이미 출근 처리되었습니다.");
        return;
      }

      if (!response.ok) {
        setAttendance(initialAttendance);
        setMessage((await readError(response)) ?? "출근 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const data = (await response.json()) as AttendanceData;
      setAttendance({ checkIn: data.checkIn, checkOut: null, status: data.status });
    } catch {
      setAttendance(initialAttendance);
      setMessage("출근 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut() {
    setMessage(null);

    const response = await fetch("/api/attendance/check-out", { method: "POST" });
    if (!response.ok) {
      throw new Error((await readError(response)) ?? "퇴근 처리에 실패했습니다.");
    }

    const data = (await response.json()) as AttendanceData;
    setAttendance((previous) => (previous ? { ...previous, checkOut: data.checkOut } : previous));
    setShowCheckout(false);
  }

  if (attendance?.checkIn && attendance.checkOut) {
    return (
      <div
        className="flex items-center justify-between gap-3 rounded-xl px-5 py-4"
        style={{ background: "#F0FBF4", border: "1px solid #BBF7D0" }}
      >
        <div className="min-w-0 overflow-hidden">
          <p className="text-sm font-medium" style={{ color: "#166534" }}>
            오늘 퇴근 완료
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "#2A8C50" }}>
            {formatTime(attendance.checkIn)} ~ {formatTime(attendance.checkOut)}
            &nbsp;·&nbsp;총 {formatDuration(attendance.checkIn, attendance.checkOut)}
          </p>
        </div>
        <button
          disabled
          className="cursor-default rounded-lg px-4 py-1.5 text-sm font-medium"
          style={{ background: "#dcfce7", color: "#166534" }}
        >
          퇴근 완료
        </button>
      </div>
    );
  }

  if (attendance?.checkIn) {
    return (
      <>
        <div
          className="flex items-center justify-between gap-3 rounded-xl px-5 py-4"
          style={{ background: "#F0FBF4", border: "1px solid #BBF7D0" }}
        >
          <div className="min-w-0 overflow-hidden">
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: "#22c55e" }}
              />
              <span className="text-sm font-medium" style={{ color: "#166534" }}>
                근무 중
              </span>
              {attendance.status === "LATE" ? (
                <span
                  className="rounded px-1.5 py-0.5 text-xs"
                  style={{ background: "#FEF0E8", color: "#F56B23" }}
                >
                  지각
                </span>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs" style={{ color: "#2A8C50" }}>
              출근 {formatTime(attendance.checkIn)}
              {elapsed ? <>&nbsp;·&nbsp;{elapsed} 경과</> : null}
            </p>
            {message ? (
              <p className="mt-2 text-xs font-medium" style={{ color: "#166534" }}>
                {message}
              </p>
            ) : null}
          </div>
          <button
            onClick={() => setShowCheckout(true)}
            className="rounded-lg px-4 py-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{
              background: "#FFFFFF",
              border: "2px solid #fca5a5",
              color: "#dc2626",
            }}
          >
            퇴근하기
          </button>
        </div>

        {showCheckout ? (
          <CheckoutConfirmModal
            checkInTime={attendance.checkIn}
            onConfirm={handleCheckOut}
            onClose={() => setShowCheckout(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-5 py-4"
      style={{ background: "#FEF0E8" }}
    >
      <div className="min-w-0">
        <span className="text-sm font-medium" style={{ color: "#F56B23" }}>
          아직 출근 전입니다
        </span>
        {message ? (
          <p className="mt-2 text-xs font-medium" style={{ color: "#C05621" }}>
            {message}
          </p>
        ) : null}
      </div>
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
