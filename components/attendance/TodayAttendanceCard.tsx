"use client";

import {
  formatAttendanceTime,
  getAttendanceStatusStyle,
  type TodayAttendanceRow,
} from "@/components/attendance/attendance-utils";

interface MemberActionControls {
  canCheckIn: boolean;
  canCheckOut: boolean;
  checkingIn: boolean;
  checkingOut: boolean;
  currentStatusLabel: string;
  feedback: { type: "success" | "error"; message: string } | null;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onOpenEditRequest: () => void;
}

interface TodayAttendanceCardProps {
  rows: TodayAttendanceRow[];
  isAdmin: boolean;
  currentDate: string;
  memberActions?: MemberActionControls;
}

function EmptyState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="empty-panel min-h-[280px]">
      <p className="empty-panel__title">오늘 기록이 없습니다.</p>
      <p className="empty-panel__description">
        {isAdmin
          ? "구성원의 출근 기록이 생기면 이 영역에서 오늘 현황을 바로 확인할 수 있습니다."
          : "출근 버튼을 눌러 오늘 근무 기록을 시작해 주세요."}
      </p>
    </div>
  );
}

export function TodayAttendanceCard({ rows, isAdmin, currentDate, memberActions }: TodayAttendanceCardProps) {
  return (
    <section className="card-panel flex h-full flex-col">
      <div className="card-header">
        <div>
          <h2 className="card-title">오늘 근무 현황</h2>
          <p className="card-description">{currentDate}</p>
        </div>
        {!isAdmin && memberActions ? (
          <span className="status-badge status-badge--accent">{memberActions.currentStatusLabel}</span>
        ) : null}
      </div>

      {!isAdmin && memberActions ? (
        <div className="border-b border-[var(--border-light)] px-6 pb-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={memberActions.onCheckIn}
              disabled={!memberActions.canCheckIn || memberActions.checkingIn}
              className="primary-button px-3 py-2 text-sm"
            >
              {memberActions.checkingIn ? "출근 처리 중..." : "출근"}
            </button>
            <button
              type="button"
              onClick={memberActions.onCheckOut}
              disabled={!memberActions.canCheckOut || memberActions.checkingOut}
              className="success-button px-3 py-2 text-sm"
            >
              {memberActions.checkingOut ? "퇴근 처리 중..." : "퇴근"}
            </button>
            <button type="button" onClick={memberActions.onOpenEditRequest} className="secondary-button px-3 py-2 text-sm">
              근무시간 수정 요청
            </button>
          </div>
          {memberActions.feedback ? (
            <div
              className={`mt-3 rounded-2xl px-4 py-3 text-sm font-medium ${
                memberActions.feedback.type === "success"
                  ? "border border-[#b7e4c7] bg-[var(--success-light)] text-[#15803d]"
                  : "border border-[#fecaca] bg-[var(--danger-light)] text-[#b42318]"
              }`}
            >
              {memberActions.feedback.message}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="card-body flex-1 overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState isAdmin={isAdmin} />
        ) : (
          <div className="table-shell border-0 shadow-none">
            <table className="data-table">
              <thead>
                <tr>
                  {["이름", "출근", "퇴근", "상태", "메모"].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const tone = getAttendanceStatusStyle(row.status);
                  return (
                    <tr key={row.id}>
                      <td className="font-semibold text-[var(--text-primary)]">{row.name}</td>
                      <td>{formatAttendanceTime(row.checkIn)}</td>
                      <td>{formatAttendanceTime(row.checkOut)}</td>
                      <td>
                        <span className="status-badge" style={{ background: tone.bg, color: tone.text }}>
                          <span className="status-badge__dot" style={{ background: tone.dot }} />
                          {tone.label}
                        </span>
                      </td>
                      <td>{row.memo?.trim() ? row.memo : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
