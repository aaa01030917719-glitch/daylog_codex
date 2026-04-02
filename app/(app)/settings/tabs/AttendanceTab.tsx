"use client";

import { useEffect, useMemo, useState } from "react";
import type { WorkspaceMemberRow, WorkspaceSettings } from "../types";

interface AttendanceTabProps {
  settings: WorkspaceSettings;
  members: WorkspaceMemberRow[];
  onSave: (settings: WorkspaceSettings) => void;
  onError: (message: string | null) => void;
}

interface AttendanceRecordResponse {
  records: Array<{
    date: string;
    checkIn: string | null;
    checkOut: string | null;
    workMinutes: number | null;
    status: string;
    memo: string | null;
    user: {
      id: string;
      name: string | null;
    };
  }>;
  error?: string;
}

type AttendanceFormState = {
  checkoutConfirmPopup: boolean;
  showAttendanceMemo: boolean;
  excludeOwnerAttendance: boolean;
  notifyCheckoutMissed: boolean;
  notifyNextDayMissing: boolean;
  checkoutAlertTime: string;
  missingAlertTime: string;
};

function createFormState(settings: WorkspaceSettings): AttendanceFormState {
  return {
    checkoutConfirmPopup: settings.checkoutConfirmPopup,
    showAttendanceMemo: settings.showAttendanceMemo,
    excludeOwnerAttendance: settings.excludeOwnerAttendance,
    notifyCheckoutMissed: settings.notifyCheckoutMissed,
    notifyNextDayMissing: settings.notifyNextDayMissing,
    checkoutAlertTime: settings.checkoutAlertTime,
    missingAlertTime: settings.missingAlertTime,
  };
}

function getDefaultDateRange() {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const to = today.toISOString().slice(0, 10);
  return { from, to };
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "출퇴근 설정을 저장하지 못했습니다.";
  } catch {
    return "출퇴근 설정을 저장하지 못했습니다.";
  }
}

function formatTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function AttendanceTab({ settings, members, onSave, onError }: AttendanceTabProps) {
  const [form, setForm] = useState<AttendanceFormState>(() => createFormState(settings));
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [exportRange, setExportRange] = useState(() => ({
    ...getDefaultDateRange(),
    memberId: "ALL",
  }));

  useEffect(() => {
    setForm(createFormState(settings));
  }, [settings]);

  const exportTargetLabel = useMemo(() => {
    if (exportRange.memberId === "ALL") {
      return "전체 직원";
    }

    return members.find((member) => member.userId === exportRange.memberId)?.name ?? "선택 멤버";
  }, [exportRange.memberId, members]);

  async function handleSave() {
    setSaving(true);
    setSuccessMessage(null);
    onError(null);

    try {
      const response = await fetch("/api/settings/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        onError(await readErrorMessage(response));
        return;
      }

      const data = (await response.json()) as { settings: WorkspaceSettings };
      onSave(data.settings);
      setSuccessMessage("출퇴근 설정을 저장했습니다.");
    } catch {
      onError("출퇴근 설정을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setSuccessMessage(null);
    onError(null);

    try {
      const XLSX = await import("xlsx");
      const memberTargets =
        exportRange.memberId === "ALL"
          ? members.map((member) => ({ id: member.userId, name: member.name }))
          : [
              {
                id: exportRange.memberId,
                name:
                  members.find((member) => member.userId === exportRange.memberId)?.name ??
                  "선택 멤버",
              },
            ];

      const recordResponses = await Promise.all(
        memberTargets.map(async (member) => {
          const params = new URLSearchParams({
            userId: member.id,
            from: exportRange.from,
            to: exportRange.to,
          });

          const response = await fetch(`/api/attendance?${params.toString()}`);
          const data = (await response.json()) as AttendanceRecordResponse;

          if (!response.ok) {
            throw new Error(data.error ?? "근무 기록을 가져오지 못했습니다.");
          }

          return data.records.map((record) => ({
            memberName: member.name,
            ...record,
          }));
        })
      );

      const rows = recordResponses.flat();
      const worksheet = XLSX.utils.aoa_to_sheet([
        ["직원", "날짜", "출근", "퇴근", "근무시간(분)", "상태", "메모"],
        ...rows.map((record) => [
          record.memberName,
          record.date.slice(0, 10),
          formatTime(record.checkIn),
          formatTime(record.checkOut),
          record.workMinutes ?? "",
          record.status,
          record.memo ?? "",
        ]),
      ]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "출퇴근");
      XLSX.writeFile(
        workbook,
        `daylog_attendance_${exportRange.from}_${exportRange.to}.xlsx`
      );
      setSuccessMessage("출퇴근 기록을 파일로 내보냈습니다.");
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "출퇴근 기록을 내보내지 못했습니다."
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">기록</div>
          <div>
            <h2 className="settings-card__title">출퇴근 설정</h2>
            <p className="settings-card__desc">
              출퇴근 버튼 동작, 근무 메모 노출, 자동 알림 발송 여부를 설정합니다.
            </p>
          </div>
        </div>
        <div className="settings-card__body space-y-4">
          <div className="toggle-row">
            <div className="toggle-row__info">
              <div className="toggle-row__label">퇴근 전 확인 팝업</div>
              <div className="toggle-row__desc">
                실수로 퇴근 버튼을 누르지 않도록 한 번 더 확인합니다.
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.checkoutConfirmPopup}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    checkoutConfirmPopup: event.target.checked,
                  }))
                }
              />
              <span className="toggle__slider" />
            </label>
          </div>
          <div className="toggle-row">
            <div className="toggle-row__info">
              <div className="toggle-row__label">근무 메모 입력 표시</div>
              <div className="toggle-row__desc">
                출퇴근 처리 시 사유나 메모를 함께 남길 수 있도록 표시합니다.
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.showAttendanceMemo}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    showAttendanceMemo: event.target.checked,
                  }))
                }
              />
              <span className="toggle__slider" />
            </label>
          </div>
          <div className="toggle-row">
            <div className="toggle-row__info">
              <div className="toggle-row__label">OWNER 출퇴근 집계 제외</div>
              <div className="toggle-row__desc">
                OWNER 계정은 출퇴근 버튼과 통계 대상에서 제외합니다.
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.excludeOwnerAttendance}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    excludeOwnerAttendance: event.target.checked,
                  }))
                }
              />
              <span className="toggle__slider" />
            </label>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">알림</div>
          <div>
            <h2 className="settings-card__title">자동 알림</h2>
            <p className="settings-card__desc">
              퇴근 누락과 다음 날 미기록 알림을 언제 보낼지 함께 관리합니다.
            </p>
          </div>
        </div>
        <div className="settings-card__body space-y-4">
          <div className="toggle-row">
            <div className="toggle-row__info">
              <div className="toggle-row__label">퇴근 누락 알림</div>
              <div className="toggle-row__desc">
                퇴근 시간이 지났는데 퇴근 기록이 없으면 안내합니다.
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.notifyCheckoutMissed}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notifyCheckoutMissed: event.target.checked,
                  }))
                }
              />
              <span className="toggle__slider" />
            </label>
          </div>
          <div className="toggle-row">
            <div className="toggle-row__info">
              <div className="toggle-row__label">다음 날 미기록 알림</div>
              <div className="toggle-row__desc">
                전날 출퇴근 기록이 비어 있으면 다음 날 아침 다시 안내합니다.
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={form.notifyNextDayMissing}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notifyNextDayMissing: event.target.checked,
                  }))
                }
              />
              <span className="toggle__slider" />
            </label>
          </div>

          <div className="settings-grid-two">
            <label className="field">
              <span className="field-label">퇴근 누락 알림 시간</span>
              <input
                type="time"
                value={form.checkoutAlertTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    checkoutAlertTime: event.target.value,
                  }))
                }
                className="form-input"
              />
            </label>
            <label className="field">
              <span className="field-label">다음 날 미기록 알림 시간</span>
              <input
                type="time"
                value={form.missingAlertTime}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    missingAlertTime: event.target.value,
                  }))
                }
                className="form-input"
              />
            </label>
          </div>

          {successMessage ? (
            <div className="rounded-2xl border border-[#b7e4c7] bg-[var(--success-light)] px-4 py-3 text-sm font-medium text-[#15803d]">
              {successMessage}
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              className="primary-button btn--sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "저장 중..." : "출퇴근 설정 저장"}
            </button>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">기록</div>
          <div>
            <h2 className="settings-card__title">근무 기록 내보내기</h2>
            <p className="settings-card__desc">
              기간과 대상을 선택해 출퇴근 기록을 파일로 내려받을 수 있습니다.
            </p>
          </div>
        </div>
        <div className="settings-card__body space-y-4">
          <div className="settings-grid-three">
            <label className="field">
              <span className="field-label">시작일</span>
              <input
                type="date"
                value={exportRange.from}
                onChange={(event) =>
                  setExportRange((current) => ({ ...current, from: event.target.value }))
                }
                className="form-input"
              />
            </label>
            <label className="field">
              <span className="field-label">종료일</span>
              <input
                type="date"
                value={exportRange.to}
                onChange={(event) =>
                  setExportRange((current) => ({ ...current, to: event.target.value }))
                }
                className="form-input"
              />
            </label>
            <label className="field">
              <span className="field-label">대상</span>
              <select
                value={exportRange.memberId}
                onChange={(event) =>
                  setExportRange((current) => ({
                    ...current,
                    memberId: event.target.value,
                  }))
                }
                className="form-select"
              >
                <option value="ALL">전체 직원</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
            <div className="text-sm text-[var(--text-secondary)]">
              선택 범위: <strong>{exportRange.from}</strong> ~ <strong>{exportRange.to}</strong> /{" "}
              {exportTargetLabel}
            </div>
            <button
              type="button"
              className="success-button btn--sm"
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? "내보내는 중..." : "엑셀 다운로드"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
