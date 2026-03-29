"use client";

import { useState, useEffect, useCallback } from "react";
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
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function calcElapsed(checkInIso: string) {
  const diffMs = Date.now() - new Date(checkInIso).getTime();
  const totalMin = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

function calcWorked(checkInIso: string, checkOutIso: string) {
  const diffMs = new Date(checkOutIso).getTime() - new Date(checkInIso).getTime();
  const totalMin = Math.round(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

export function CheckInBanner({ initialAttendance }: CheckInBannerProps) {
  const [attendance, setAttendance] = useState<AttendanceData | null>(initialAttendance);
  const [elapsed, setElapsed] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // 경과시간 실시간 업데이트 (근무 중일 때만)
  const updateElapsed = useCallback(() => {
    if (attendance?.checkIn && !attendance.checkOut) {
      setElapsed(calcElapsed(attendance.checkIn));
    }
  }, [attendance?.checkIn, attendance?.checkOut]);

  useEffect(() => {
    if (!attendance?.checkIn || attendance.checkOut) return;
    updateElapsed();
    const timer = setInterval(updateElapsed, 60000);
    return () => clearInterval(timer);
  }, [attendance?.checkIn, attendance?.checkOut, updateElapsed]);

  // 근무 중 페이지 이탈 시 경고
  const isWorking = !!attendance?.checkIn && !attendance?.checkOut;
  useEffect(() => {
    if (!isWorking) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "퇴근 처리를 하지 않으셨습니다.";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isWorking]);

  async function handleCheckIn() {
    setLoading(true);
    const optimistic = new Date().toISOString();
    setAttendance({ checkIn: optimistic, checkOut: null, status: "NORMAL" });

    try {
      const res = await fetch("/api/attendance/check-in", { method: "POST" });
      if (res.status === 409) {
        // 이미 출근 처리된 경우 — 서버 값으로 갱신
        return;
      }
      if (!res.ok) {
        setAttendance(initialAttendance);
      } else {
        const data = await res.json();
        setAttendance({ checkIn: data.checkIn, checkOut: null, status: data.status });
      }
    } catch {
      setAttendance(initialAttendance);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut() {
    const res = await fetch("/api/attendance/check-out", { method: "POST" });
    if (!res.ok) throw new Error("퇴근 처리 실패");
    const data = await res.json();
    setAttendance((prev) =>
      prev ? { ...prev, checkOut: data.checkOut } : prev
    );
    setShowCheckout(false);
  }

  // ── 상태 3: 퇴근 완료 ──────────────────────────────────────
  if (attendance?.checkIn && attendance.checkOut) {
    return (
      <div
        className="rounded-xl px-5 py-4 flex items-center justify-between gap-3"
        style={{ background: "#F0FBF4", border: "1px solid #BBF7D0" }}
      >
        <div className="min-w-0 overflow-hidden">
          <p className="text-sm font-medium" style={{ color: "#166534" }}>
            오늘 퇴근 완료
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#2A8C50" }}>
            {formatTime(attendance.checkIn)} ~ {formatTime(attendance.checkOut)}
            &nbsp;·&nbsp;총 {calcWorked(attendance.checkIn, attendance.checkOut)}
          </p>
        </div>
        <button
          disabled
          className="rounded-lg px-4 py-1.5 text-sm font-medium cursor-default"
          style={{ background: "#dcfce7", color: "#166534" }}
        >
          퇴근 완료
        </button>
      </div>
    );
  }

  // ── 상태 2: 근무 중 ───────────────────────────────────────
  if (attendance?.checkIn) {
    return (
      <>
        <div
          className="rounded-xl px-5 py-4 flex items-center justify-between gap-3"
          style={{ background: "#F0FBF4", border: "1px solid #BBF7D0" }}
        >
          <div className="min-w-0 overflow-hidden">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: "#22c55e" }}
              />
              <span className="text-sm font-medium" style={{ color: "#166534" }}>
                근무 중
              </span>
              {attendance.status === "LATE" && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: "#FEF0E8", color: "#F56B23" }}
                >
                  지각
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: "#2A8C50" }}>
              출근 {formatTime(attendance.checkIn)}
              {elapsed && <>&nbsp;·&nbsp;{elapsed} 경과</>}
            </p>
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

        {showCheckout && (
          <CheckoutConfirmModal
            checkInTime={attendance.checkIn}
            onConfirm={handleCheckOut}
            onClose={() => setShowCheckout(false)}
          />
        )}
      </>
    );
  }

  // ── 상태 1: 출근 전 ──────────────────────────────────────
  return (
    <div
      className="rounded-xl px-5 py-4 flex items-center justify-between"
      style={{ background: "#FEF0E8" }}
    >
      <span className="text-sm font-medium" style={{ color: "#F56B23" }}>
        아직 출근 전이에요
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
