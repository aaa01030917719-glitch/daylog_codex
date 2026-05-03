"use client";

import {
  formatAttendanceTime,
  getAttendanceStatusStyle,
  type TodayAttendanceRow,
} from "@/components/attendance/attendance-utils";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/StatusBadge";
import {
  getUserAccentPalette,
  resolveUserDisplayName,
  useUserProfilePreferences,
} from "@/lib/user-profile-preferences";

interface MemberActionControls {
  canCheckIn: boolean;
  canCheckOut: boolean;
  canOpenEditRequest: boolean;
  checkingIn: boolean;
  checkingOut: boolean;
  currentStatusLabel: string;
  currentStatusVariant: StatusBadgeVariant;
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
      <p className="empty-panel__title">오늘 기록이 없어요.</p>
      <p className="empty-panel__description">
        {isAdmin
          ? "팀원 기록이 생기면 오늘 현황을 여기서 볼 수 있어요."
          : "아직 출근 전이에요."}
      </p>
    </div>
  );
}

export function TodayAttendanceCard({ rows, isAdmin, currentDate, memberActions }: TodayAttendanceCardProps) {
  const profileMap = useUserProfilePreferences(rows.map((row) => row.id));

  return (
    <section className="card-panel flex min-w-0 flex-col overflow-hidden min-h-[400px]">
      <div className="card-header">
        <div>
          <h2 className="card-title">오늘 출퇴근</h2>
          <p className="card-description">{currentDate}</p>
        </div>
        {memberActions ? (
          <StatusBadge variant={memberActions.currentStatusVariant}>
            {memberActions.currentStatusLabel}
          </StatusBadge>
        ) : null}
      </div>

      {memberActions ? (
        <div className="mt-3 border-b border-[var(--border-light)] px-6 pb-5">
  <div className="flex items-center gap-2">
    <button
      type="button"
      onClick={memberActions.onCheckIn}
      disabled={!memberActions.canCheckIn || memberActions.checkingIn}
      className="primary-button px-3 py-2 text-sm"
    >
      {memberActions.checkingIn ? "출근 확인 중..." : "출근했어요"}
    </button>

    <button
      type="button"
      onClick={memberActions.onCheckOut}
      disabled={!memberActions.canCheckOut || memberActions.checkingOut}
      className="success-button px-3 py-2 text-sm"
    >
      {memberActions.checkingOut ? "퇴근 확인 중..." : "퇴근할게요"}
    </button>

    {memberActions.canOpenEditRequest ? (
      <button
        type="button"
        onClick={memberActions.onOpenEditRequest}
        className="secondary-button px-3 py-2 text-sm ml-auto"
      >
        수정요청
      </button>
    ) : null}
  </div>



          
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="card-body flex-1">
          <EmptyState isAdmin={isAdmin} />
        </div>
      ) : (
        <div className="bg-[var(--surface)] overflow-x-auto">
          <div className="border-t border-[var(--border-light)]" />
          <table className="data-table">
            <thead>
              <tr>
                {["이름", "출근", "퇴근", "상태", "비고"].map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const tone = getAttendanceStatusStyle(row.status);
                const profile = profileMap.get(row.id) ?? null;
                const palette = getUserAccentPalette(profile?.personalColor);
                const displayName = resolveUserDisplayName(row.name, profile);
                return (
                  <tr key={row.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                          style={{ background: palette.solid, color: palette.avatarText }}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {displayName}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatAttendanceTime(row.checkIn) === "-" ? "기록 없음" : formatAttendanceTime(row.checkIn)}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs text-[var(--text-muted)]">
                        {formatAttendanceTime(row.checkOut) === "-" ? "기록 없음" : formatAttendanceTime(row.checkOut)}
                      </span>
                    </td>
                    <td>
                      <StatusBadge variant={tone.variant} dotColor={tone.dot}>
                        {tone.label}
                      </StatusBadge>
                    </td>
                    <td>
                      {row.memo?.trim() ? (
                        row.memo
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">기록 없음</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
