"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  formatAttendanceTime,
  getAttendanceEditRequestStatusInfo,
  getAttendanceStatusStyle,
  hasAnnualLeave,
  hasHalfDay,
  type AttendanceEditRequestSummary,
  type AttendanceRecord,
} from "@/components/attendance/attendance-utils";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge";
import {
  getUserAccentPalette,
  resolveUserDisplayName,
  useUserProfilePreferences,
} from "@/lib/user-profile-preferences";

interface AttendanceDashboardCalendarProps {
  records: AttendanceRecord[];
  teamRecords?: AttendanceRecord[];
  editRequests?: AttendanceEditRequestSummary[];
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  ownerActions?: {
    canRequest: boolean;
    onRequest: (dateText: string) => void;
  };
}

const MONTH_LABELS = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const EMPTY_ATTENDANCE_RECORDS: AttendanceRecord[] = [];
const EMPTY_EDIT_REQUESTS: AttendanceEditRequestSummary[] = [];

type AttendanceDetailRow = {
  key: string;
  userId: string;
  name: string;
  checkIn: string | Date | null;
  checkOut: string | Date | null;
  recordStatus: string | null;
  memo: string | null;
  request: AttendanceEditRequestSummary | null;
  hasRecord: boolean;
};

function toDateKey(value: string | Date) {
  if (typeof value === "string") {
    const matched = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (matched) {
      return matched[1];
    }
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCompactStatusStyle(row: AttendanceDetailRow) {
  if (row.checkIn && !row.checkOut && row.recordStatus && row.recordStatus !== "HOLIDAY") {
    return {
      label: "출근중",
      dot: "#4f7cff",
      variant: "active" as StatusBadgeVariant,
    };
  }

  if (row.recordStatus) {
    const tone = getAttendanceStatusStyle(row.recordStatus);
    return {
      label: tone.label,
      dot: tone.dot,
      variant: tone.variant,
    };
  }

  return {
    label: "미기록",
    dot: "#94a3b8",
    variant: "neutral" as StatusBadgeVariant,
  };
}

function formatPopupTime(value: string | Date | null) {
  return value ? formatAttendanceTime(value) : "—";
}

export function AttendanceDashboardCalendar({
  records,
  teamRecords = [],
  editRequests = [],
  year,
  month,
  onMonthChange,
  ownerActions,
}: AttendanceDashboardCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [teamTooltip, setTeamTooltip] = useState<{
    x: number;
    y: number;
    records: AttendanceRecord[];
  } | null>(null);

  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const recordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();

    for (const record of records) {
      const dateKey = toDateKey(record.date);
      if (!dateKey) {
        continue;
      }
      map.set(dateKey, record);
    }

    return map;
  }, [records]);
  const teamRecordMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();

    for (const record of teamRecords) {
      const dateKey = toDateKey(record.date);
      if (!dateKey) {
        continue;
      }
      const existing = map.get(dateKey) ?? [];
      existing.push(record);
      map.set(dateKey, existing);
    }

    for (const [dateKey, items] of Array.from(map.entries())) {
      map.set(
        dateKey,
        [...items].sort((left, right) => {
          const leftHasCheckIn = left.checkIn ? 1 : 0;
          const rightHasCheckIn = right.checkIn ? 1 : 0;
          if (leftHasCheckIn !== rightHasCheckIn) {
            return rightHasCheckIn - leftHasCheckIn;
          }

          return (left.user.name ?? "").localeCompare(right.user.name ?? "", "ko");
        })
      );
    }

    return map;
  }, [teamRecords]);
  const editRequestMap = useMemo(() => {
    const map = new Map<string, AttendanceEditRequestSummary[]>();

    for (const request of editRequests) {
      const requestDateKey = toDateKey(request.requestDate);
      if (!requestDateKey) {
        continue;
      }
      if (!requestDateKey.startsWith(`${year}-${String(month + 1).padStart(2, "0")}-`)) {
        continue;
      }

      const existing = map.get(requestDateKey) ?? [];
      existing.push(request);
      map.set(requestDateKey, existing);
    }

    for (const [dateKey, items] of Array.from(map.entries())) {
      map.set(
        dateKey,
        [...items].sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        )
      );
    }

    return map;
  }, [editRequests, month, year]);
  const profileMap = useUserProfilePreferences(
    useMemo(
      () =>
        Array.from(
          new Set([
            ...teamRecords.map((record) => record.user.id),
            ...editRequests.map((request) => request.requesterId).filter(Boolean),
          ])
        ),
      [editRequests, teamRecords]
    )
  );

  const cells: Array<number | null> = [...Array(firstDay).fill(null)];
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const selectedDate = selectedDay ? new Date(year, month, selectedDay) : null;
  const selectedDateValue = selectedDate
    ? toDateKey(selectedDate)
    : null;
  const selectedRecord = selectedDateValue ? recordMap.get(selectedDateValue) ?? null : null;
  const selectedTeamRecords = selectedDateValue
    ? teamRecordMap.get(selectedDateValue) ?? EMPTY_ATTENDANCE_RECORDS
    : EMPTY_ATTENDANCE_RECORDS;
  const selectedDayRequests = selectedDateValue
    ? editRequestMap.get(selectedDateValue) ?? EMPTY_EDIT_REQUESTS
    : EMPTY_EDIT_REQUESTS;
  const latestSelectedRequest = selectedDayRequests[0] ?? null;
  const selectedDetailRows = useMemo(() => {
    const rowMap = new Map<string, AttendanceDetailRow>();

    for (const record of selectedTeamRecords) {
      const key = record.user.id;
      rowMap.set(key, {
        key,
        userId: record.user.id,
        name: record.user.name ?? "이름 없음",
        checkIn: record.checkIn ?? null,
        checkOut: record.checkOut ?? null,
        recordStatus: record.status ?? null,
        memo: record.memo ?? null,
        request:
          selectedDayRequests.find((request) => request.requesterId === record.user.id) ?? null,
        hasRecord: true,
      });
    }

    for (const request of selectedDayRequests) {
      const key = request.requesterId || request.id;
      const existing = rowMap.get(key);

      if (existing) {
        existing.request = request;
        rowMap.set(key, existing);
        continue;
      }

      rowMap.set(key, {
        key,
        userId: request.requesterId,
        name: request.requesterName || "이름 없음",
        checkIn: request.originalCheckIn ?? null,
        checkOut: request.originalCheckOut ?? null,
        recordStatus: null,
        memo: null,
        request,
        hasRecord: false,
      });
    }

    if (rowMap.size === 0 && selectedRecord) {
      rowMap.set(selectedRecord.user.id, {
        key: selectedRecord.user.id,
        userId: selectedRecord.user.id,
        name: selectedRecord.user.name ?? "이름 없음",
        checkIn: selectedRecord.checkIn ?? null,
        checkOut: selectedRecord.checkOut ?? null,
        recordStatus: selectedRecord.status ?? null,
        memo: selectedRecord.memo ?? null,
        request: latestSelectedRequest,
        hasRecord: true,
      });
    }

    return Array.from(rowMap.values()).sort((left, right) => {
      if (left.hasRecord !== right.hasRecord) {
        return left.hasRecord ? -1 : 1;
      }

      return left.name.localeCompare(right.name, "ko");
    });
  }, [latestSelectedRequest, selectedDayRequests, selectedRecord, selectedTeamRecords]);
  const hasAttendanceDetailContent = useMemo(
    () =>
      selectedDetailRows.some(
        (row) =>
          row.hasRecord ||
          Boolean(row.recordStatus || row.request || row.checkIn || row.checkOut || row.memo?.trim())
      ),
    [selectedDetailRows]
  );

  function handlePrevMonth() {
    if (month === 0) {
      onMonthChange(year - 1, 11);
      return;
    }

    onMonthChange(year, month - 1);
  }

  function handleNextMonth() {
    if (month === 11) {
      onMonthChange(year + 1, 0);
      return;
    }

    onMonthChange(year, month + 1);
  }

  function openTeamTooltip(
    event: React.MouseEvent<HTMLDivElement>,
    dayRecords: AttendanceRecord[]
  ) {
    if (dayRecords.length === 0) {
      return;
    }

    const tooltipWidth = 260;
    const tooltipHeight = Math.min(48 + dayRecords.length * 26, 220);
    const nextX = Math.min(event.clientX + 16, window.innerWidth - tooltipWidth - 12);
    const nextY = Math.min(event.clientY + 16, window.innerHeight - tooltipHeight - 12);

    setTeamTooltip({
      x: Math.max(12, nextX),
      y: Math.max(12, nextY),
      records: dayRecords,
    });
  }

  function closeTeamTooltip() {
    setTeamTooltip(null);
  }

  return (
    <>
      <section className="card-panel flex h-full flex-col">
        <div className="card-header">
          <div>
           <h2 className="card-title mt-2">월간 근무 현황</h2>
            <p className="card-description">날짜를 클릭하면 출퇴근 기록과 연차 사용 여부를 자세히 확인할 수 있습니다.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handlePrevMonth} className="icon-button" aria-label="이전 달">
              <ChevronLeft size={18} />
            </button>
            <div>
              {year}년 {MONTH_LABELS[month]}
            </div>
            <button type="button" onClick={handleNextMonth} className="icon-button" aria-label="다음 달">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="card-body">
          <div className="grid grid-cols-7 gap-3 text-center text-sm font-semibold text-[var(--text-muted)]">
            {WEEKDAY_LABELS.map((weekday) => (
              <div key={weekday} className="py-2">
                {weekday}
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-7 gap-3">
            {cells.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-[118px] rounded-[18px]" />;
              }

              const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const record = recordMap.get(dateKey) ?? null;
              const dayTeamRecords = teamRecordMap.get(dateKey) ?? [];
              const primaryTeamRecord = dayTeamRecords[0] ?? null;
              const hasMultipleTeamRecords = dayTeamRecords.length > 1;
              const tone = record ? getAttendanceStatusStyle(record.status) : null;
              const isToday =
                today.getFullYear() === year &&
                today.getMonth() === month &&
                today.getDate() === day;
              const weekdayIndex = (firstDay + day - 1) % 7;
              const dayColor =
                weekdayIndex === 0 ? "#f97316" : weekdayIndex === 6 ? "#4f7cff" : "#334155";

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className="relative h-[118px] overflow-hidden rounded-[18px] p-3 text-left transition-all hover:-translate-y-0.5"
                  style={{
                    border: isToday ? "2px solid var(--accent)" : "1px solid var(--border)",
                    background: tone ? tone.bg : "var(--surface)",
                    boxShadow: isToday ? "0 14px 24px rgba(79,124,255,0.14)" : "var(--shadow-sm)",
                  }}
                >
                  <div className="flex h-full flex-col">
                    <div className="text-base font-semibold" style={{ color: isToday ? "var(--accent)" : dayColor }}>
                      {day}
                    </div>

                    <div className="mt-3 min-h-[34px] max-h-[40px] overflow-hidden">
                      {record ? (
                        <div className="space-y-1">
                          <div
                            className="inline-flex items-center gap-1 text-xs font-semibold"
                            style={{ color: tone?.text }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: tone?.dot }}
                            />
                            {tone?.label}
                          </div>
                          {!hasAnnualLeave(record) && !hasHalfDay(record) && (
                            <div className="truncate text-xs text-[var(--text-secondary)]">
                              출근 {formatAttendanceTime(record.checkIn)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs font-medium text-[var(--text-muted)]">
                          {isToday ? "오늘" : ""}
                        </div>
                      )}
                    </div>

                    {dayTeamRecords.length > 0 ? (
                      <div
                        className="mt-auto pt-2"
                        onMouseEnter={(event) => openTeamTooltip(event, dayTeamRecords)}
                        onMouseMove={(event) => openTeamTooltip(event, dayTeamRecords)}
                        onMouseLeave={closeTeamTooltip}
                      >
                        {hasMultipleTeamRecords ? (
                          <span className="inline-flex max-w-full items-center rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-[10px] font-semibold leading-4 text-[var(--text-secondary)]">
                            {`${dayTeamRecords.length}명 기록`}
                          </span>
                        ) : primaryTeamRecord ? (
                          <TeamRecordBadge
                            record={primaryTeamRecord}
                            profileMap={profileMap}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {["NORMAL", "LATE", "EARLY_LEAVE", "HOLIDAY", "OVERTIME"].map((status) => {
              const tone = getAttendanceStatusStyle(status);
              return (
                <div key={status} className="inline-flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: tone.dot }} />
                  {tone.label}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {selectedDate && hasAttendanceDetailContent ? (
        <div className="modal-shell" onClick={() => setSelectedDay(null)}>
          <div className="modal-overlay" />
          <div className="modal-card max-w-xl" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {selectedDate.toLocaleDateString("ko-KR", {
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                  })}
                </h3>
                <p className="modal-subtitle">선택한 날짜의 근무 상세 내역입니다.</p>
              </div>
            </div>

            <div className="modal-body text-sm">
              {selectedDetailRows.length > 0 ? (
                <div className="overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface)]">
                  <div className="hidden grid-cols-[minmax(0,1.35fr)_72px_72px_92px_minmax(0,1.2fr)] items-center gap-3 border-b border-[var(--border-light)] bg-[var(--surface-2)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)] md:grid">
                    <div>직원</div>
                    <div className="text-center">출근</div>
                    <div className="text-center">퇴근</div>
                    <div className="text-center">상태</div>
                    <div>메모</div>
                  </div>

                  <div className="divide-y divide-[var(--border-light)]">
                    {selectedDetailRows.map((row) => {
                      const profile = profileMap.get(row.userId) ?? null;
                      const palette = getUserAccentPalette(profile?.personalColor);
                      const displayName = resolveUserDisplayName(row.name, profile);
                      const initials = displayName.trim().slice(0, 1).toUpperCase() || "?";
                      const statusTone = getCompactStatusStyle(row);
                      const requestStatus = row.request
                        ? getAttendanceEditRequestStatusInfo(row.request).label
                        : null;
                      const memoText =
                        row.memo?.trim() ||
                        row.request?.reason?.trim() ||
                        "기록 없음";

                      return (
                        <div
                          key={row.key}
                          className="px-4 py-3 md:grid md:grid-cols-[minmax(0,1.35fr)_72px_72px_92px_minmax(0,1.2fr)] md:items-center md:gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                              style={{
                                background: palette.softBackground,
                                color: palette.text,
                                border: `1px solid ${palette.softBorder}`,
                              }}
                            >
                              {initials}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-[var(--text-primary)]">
                                  {displayName}
                                </span>
                                <StatusBadge
                                  variant={statusTone.variant}
                                  dotColor={statusTone.dot}
                                  className="md:hidden"
                                >
                                  {statusTone.label}
                                </StatusBadge>
                                {requestStatus ? (
                                  <span className="inline-flex items-center rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                                    수정 요청 {requestStatus}
                                  </span>
                                ) : null}
                              </div>
                              <div className="mt-2 flex items-center gap-3 text-[12px] text-[var(--text-secondary)] md:hidden">
                                <span>출근 {formatPopupTime(row.checkIn)}</span>
                                <span>퇴근 {formatPopupTime(row.checkOut)}</span>
                              </div>
                              <div className="mt-2 truncate text-[12px] leading-5 text-[var(--text-secondary)] md:hidden">
                                {memoText}
                              </div>
                            </div>
                          </div>

                          <div className="hidden text-center text-sm text-[var(--text-secondary)] md:block">
                            {formatPopupTime(row.checkIn)}
                          </div>
                          <div className="hidden text-center text-sm text-[var(--text-secondary)] md:block">
                            {formatPopupTime(row.checkOut)}
                          </div>
                          <div className="hidden justify-center md:flex">
                            <StatusBadge
                              variant={statusTone.variant}
                              dotColor={statusTone.dot}
                            >
                              {statusTone.label}
                            </StatusBadge>
                          </div>
                          <div className="hidden min-w-0 md:block">
                            <div className="truncate text-sm text-[var(--text-secondary)]">
                              {memoText}
                            </div>
                            {requestStatus ? (
                              <div className="mt-1 text-[11px] text-[var(--text-muted)]">
                                수정 요청 {requestStatus}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setSelectedDay(null)} className="secondary-button">
                닫기
              </button>
              {ownerActions?.canRequest && selectedDateValue ? (
                <button
                  type="button"
                  onClick={() => ownerActions.onRequest(selectedDateValue)}
                  className="primary-button"
                >
                  수정 요청하기
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : selectedDate ? (
        <div className="fixed inset-0 z-[1000]" onClick={() => setSelectedDay(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-[1010] flex min-h-full items-center justify-center p-5">
            <div
              className="w-full max-w-sm rounded-[18px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-[var(--border-light)] px-5 py-4">
                <h3 className="text-base font-semibold text-[var(--text-primary)]">기록 없음</h3>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm leading-6 text-[var(--text-secondary)]">
                  선택한 날짜에는 출퇴근 기록이나 수정 요청이 없습니다.
                </p>
              </div>
              <div className="flex justify-end border-t border-[var(--border-light)] px-5 py-3">
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="secondary-button"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {teamTooltip ? (
        <div
          className="pointer-events-none fixed z-[120] w-[260px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 shadow-[var(--shadow)]"
          style={{ left: teamTooltip.x, top: teamTooltip.y }}
        >
          <div className="text-xs font-semibold text-[var(--text-primary)]">출퇴근 기록</div>
          <div className="mt-2 space-y-2">
            {teamTooltip.records.map((record) => {
              const profile = profileMap.get(record.user.id) ?? null;
              const palette = getUserAccentPalette(profile?.personalColor);
              const displayName = resolveUserDisplayName(record.user.name ?? "이름 없음", profile);

              return (
                <div
                  key={record.id}
                  className="rounded-xl px-2.5 py-2"
                  style={{ background: palette.softBackground }}
                >
                  <div
                    className="text-xs font-semibold text-[var(--text-primary)]"
                  >
                    {displayName}
                  </div>
                  <div className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">
                    {`출근 ${record.checkIn ? formatAttendanceTime(record.checkIn) : "없음"} - 퇴근 ${
                      record.checkOut ? formatAttendanceTime(record.checkOut) : "없음"
                    }`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
}

function TeamRecordBadge({
  record,
  profileMap,
}: {
  record: AttendanceRecord;
  profileMap: ReturnType<typeof useUserProfilePreferences>;
}) {
  const profile = profileMap.get(record.user.id) ?? null;
  const fullName = resolveUserDisplayName(record.user.name ?? "팀원", profile);
  const displayName = fullName.length > 4 ? `${fullName.slice(0, 4)}…` : fullName;
  const palette = getUserAccentPalette(profile?.personalColor);

  return (
    <span
      className="inline-flex max-w-full items-center truncate rounded-[8px] px-1.5 py-0.5 text-[10px] font-medium leading-4"
      style={{
        background: palette.softBackground,
        color: palette.text,
        border: `1px solid ${palette.softBorder}`,
      }}
      title={`${fullName} · 출근 ${formatAttendanceTime(record.checkIn)} / 퇴근 ${formatAttendanceTime(record.checkOut)}`}
    >
      {`${displayName} 기록`}
    </span>
  );
}
