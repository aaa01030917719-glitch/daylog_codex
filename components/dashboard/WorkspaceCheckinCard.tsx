"use client";

import { useEffect, useMemo, useState } from "react";

type AttendanceCode =
  | "NORMAL"
  | "LATE"
  | "HOLIDAY"
  | "EARLY_LEAVE"
  | "OVERTIME"
  | "ABSENT"
  | null;

interface WorkspaceCheckinCardProps {
  initialCheckInLabel: string;
  initialCheckOutLabel: string;
  initialStatusLabel: string;
  initialSummaryLabel: string;
  initialHasCheckIn: boolean;
  initialHasCheckOut: boolean;
}

interface AttendanceApiPayload {
  attendance?: {
    checkIn: string | null;
    checkOut: string | null;
    status: AttendanceCode;
  } | null;
  error?: string;
}

function formatClockTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatClockDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatAttendanceTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getStatusLabel(status: AttendanceCode) {
  switch (status) {
    case "NORMAL":
      return "출근";
    case "LATE":
      return "지각";
    case "HOLIDAY":
      return "연차";
    case "EARLY_LEAVE":
      return "반차";
    case "OVERTIME":
      return "추가근무";
    case "ABSENT":
      return "부재";
    default:
      return "미기록";
  }
}

function buildSummary(hasCheckIn: boolean, hasCheckOut: boolean, status: AttendanceCode) {
  if (!hasCheckIn) return "오늘 출근 기록이 없습니다.";
  if (hasCheckOut) return `${getStatusLabel(status)} 상태로 오늘 근무가 마감되었습니다.`;
  return `${getStatusLabel(status)} 상태로 근무 중입니다.`;
}

export function WorkspaceCheckinCard({
  initialCheckInLabel,
  initialCheckOutLabel,
  initialStatusLabel,
  initialSummaryLabel,
  initialHasCheckIn,
  initialHasCheckOut,
}: WorkspaceCheckinCardProps) {
  const [now, setNow] = useState(() => new Date());
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkInLabel, setCheckInLabel] = useState(initialCheckInLabel);
  const [checkOutLabel, setCheckOutLabel] = useState(initialCheckOutLabel);
  const [statusLabel, setStatusLabel] = useState(initialStatusLabel);
  const [summaryLabel, setSummaryLabel] = useState(initialSummaryLabel);
  const [hasCheckIn, setHasCheckIn] = useState(initialHasCheckIn);
  const [hasCheckOut, setHasCheckOut] = useState(initialHasCheckOut);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const canCheckIn = useMemo(() => !hasCheckIn && !checkingIn, [hasCheckIn, checkingIn]);
  const canCheckOut = useMemo(
    () => hasCheckIn && !hasCheckOut && !checkingOut,
    [hasCheckIn, hasCheckOut, checkingOut]
  );

  async function refreshTodayAttendance() {
    const response = await fetch("/api/attendance/today");
    const data = (await response.json()) as AttendanceApiPayload & {
      hasCheckIn?: boolean;
      hasCheckOut?: boolean;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "오늘 근무 현황을 불러오지 못했습니다.");
    }

    const attendance = data.attendance;
    const nextHasCheckIn = Boolean(data.hasCheckIn);
    const nextHasCheckOut = Boolean(data.hasCheckOut);
    const nextStatus = attendance?.status ?? null;

    setHasCheckIn(nextHasCheckIn);
    setHasCheckOut(nextHasCheckOut);
    setCheckInLabel(attendance?.checkIn ? formatAttendanceTime(attendance.checkIn) : "-");
    setCheckOutLabel(attendance?.checkOut ? formatAttendanceTime(attendance.checkOut) : "-");
    setStatusLabel(getStatusLabel(nextStatus));
    setSummaryLabel(buildSummary(nextHasCheckIn, nextHasCheckOut, nextStatus));
  }

  async function handleCheckIn() {
    setCheckingIn(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/attendance/check-in", { method: "POST" });
      const data = (await response.json()) as AttendanceApiPayload;

      if (!response.ok) {
        throw new Error(data.error ?? "출근 처리에 실패했습니다.");
      }

      await refreshTodayAttendance();
      setFeedback("출근 기록이 저장되었습니다.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "출근 처리에 실패했습니다.");
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleCheckOut() {
    setCheckingOut(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/attendance/check-out", { method: "POST" });
      const data = (await response.json()) as AttendanceApiPayload;

      if (!response.ok) {
        throw new Error(data.error ?? "퇴근 처리에 실패했습니다.");
      }

      await refreshTodayAttendance();
      setFeedback("퇴근 기록이 저장되었습니다.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "퇴근 처리에 실패했습니다.");
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <section className="workspace-checkin-card">
      <div className="workspace-checkin-card__label">출퇴근</div>
      <div className="workspace-checkin-card__time">{formatClockTime(now)}</div>
      <div className="workspace-checkin-card__date">{formatClockDate(now)}</div>

      <div className="workspace-checkin-card__buttons">
        <button
          type="button"
          className="workspace-checkin-button workspace-checkin-button--in"
          onClick={handleCheckIn}
          disabled={!canCheckIn}
        >
          {checkingIn ? "출근 처리 중..." : "출근하기"}
        </button>
        <button
          type="button"
          className="workspace-checkin-button workspace-checkin-button--out"
          onClick={handleCheckOut}
          disabled={!canCheckOut}
        >
          {checkingOut ? "퇴근 처리 중..." : "퇴근하기"}
        </button>
      </div>

      <div className="workspace-checkin-card__summary">
        오늘 상태 <span>{statusLabel}</span>
      </div>
      <div className="workspace-checkin-card__meta">
        <span>출근 {checkInLabel}</span>
        <span>퇴근 {checkOutLabel}</span>
      </div>
      <div className="workspace-checkin-card__description">{summaryLabel}</div>
      {feedback ? <div className="workspace-checkin-card__feedback">{feedback}</div> : null}
    </section>
  );
}
