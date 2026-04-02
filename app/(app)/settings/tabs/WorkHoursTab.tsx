"use client";

import { useEffect, useMemo, useState } from "react";
import type { WeekdaySetting, WorkspaceSettings } from "../types";

interface WorkHoursTabProps {
  settings: WorkspaceSettings;
  onSave: (settings: WorkspaceSettings) => void;
  onError: (message: string | null) => void;
}

type WorkHoursFormState = {
  checkInTime: string;
  checkOutTime: string;
  lateGraceMinutes: number;
  workHoursPerDay: number;
  weekdaySettings: WeekdaySetting[];
};

function createFormState(settings: WorkspaceSettings): WorkHoursFormState {
  return {
    checkInTime: settings.checkInTime,
    checkOutTime: settings.checkOutTime,
    lateGraceMinutes: settings.lateGraceMinutes,
    workHoursPerDay: settings.workHoursPerDay,
    weekdaySettings: settings.weekdaySettings.map((weekday) => ({ ...weekday })),
  };
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "근무 시간 설정을 저장하지 못했습니다.";
  } catch {
    return "근무 시간 설정을 저장하지 못했습니다.";
  }
}

export function WorkHoursTab({ settings, onSave, onError }: WorkHoursTabProps) {
  const [form, setForm] = useState<WorkHoursFormState>(() => createFormState(settings));
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm(createFormState(settings));
  }, [settings]);

  const activeWorkdays = useMemo(
    () => form.weekdaySettings.filter((weekday) => !weekday.isOff).length,
    [form.weekdaySettings]
  );

  async function handleSave() {
    if (!form.checkInTime || !form.checkOutTime) {
      onError("기본 출근 시간과 퇴근 시간을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setSuccessMessage(null);
    onError(null);

    try {
      const weekdayPayload = Object.fromEntries(
        form.weekdaySettings.flatMap((weekday) => [
          [`weekdayCheckIn_${weekday.dayIndex}`, weekday.checkInTime],
          [`weekdayCheckOut_${weekday.dayIndex}`, weekday.checkOutTime],
          [`weekdayOff_${weekday.dayIndex}`, weekday.isOff],
        ])
      );

      const response = await fetch("/api/settings/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkInTime: form.checkInTime,
          checkOutTime: form.checkOutTime,
          lateGraceMinutes: form.lateGraceMinutes,
          workHoursPerDay: form.workHoursPerDay,
          ...weekdayPayload,
        }),
      });

      if (!response.ok) {
        onError(await readErrorMessage(response));
        return;
      }

      const data = (await response.json()) as { settings: WorkspaceSettings };
      onSave(data.settings);
      setSuccessMessage("근무 시간 기준을 저장했습니다.");
    } catch {
      onError("근무 시간 기준을 저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <section className="settings-summary-grid">
        <div className="settings-stat-card">
          <div className="settings-stat-card__label">기본 출근</div>
          <div className="settings-stat-card__value">{form.checkInTime}</div>
          <div className="settings-stat-card__sub">이후 출근부터 지각 기준이 적용됩니다.</div>
        </div>
        <div className="settings-stat-card">
          <div className="settings-stat-card__label">기본 퇴근</div>
          <div className="settings-stat-card__value">{form.checkOutTime}</div>
          <div className="settings-stat-card__sub">이전 퇴근은 조기 퇴근으로 기록됩니다.</div>
        </div>
        <div className="settings-stat-card">
          <div className="settings-stat-card__label">근무 기준</div>
          <div className="settings-stat-card__value">{form.workHoursPerDay}h</div>
          <div className="settings-stat-card__sub">활성 근무일은 주 {activeWorkdays}일입니다.</div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">근무</div>
          <div>
            <h2 className="settings-card__title">근무 시간</h2>
            <p className="settings-card__desc">
              기본 출퇴근 시간, 지각 허용 범위, 하루 기준 근무 시간을 설정합니다.
            </p>
          </div>
        </div>
        <div className="settings-card__body space-y-5">
          <div className="settings-grid-two">
            <label className="field">
              <span className="field-label">기본 출근 시간</span>
              <input
                type="time"
                value={form.checkInTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, checkInTime: event.target.value }))
                }
                className="form-input"
              />
            </label>
            <label className="field">
              <span className="field-label">기본 퇴근 시간</span>
              <input
                type="time"
                value={form.checkOutTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, checkOutTime: event.target.value }))
                }
                className="form-input"
              />
            </label>
          </div>

          <div className="settings-grid-two">
            <label className="field">
              <span className="field-label">지각 허용 범위</span>
              <select
                value={String(form.lateGraceMinutes)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    lateGraceMinutes: Number(event.target.value),
                  }))
                }
                className="form-select"
              >
                <option value="0">허용 안 함</option>
                <option value="5">5분</option>
                <option value="10">10분</option>
                <option value="15">15분</option>
                <option value="30">30분</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">1일 기준 근무 시간</span>
              <select
                value={String(form.workHoursPerDay)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    workHoursPerDay: Number(event.target.value),
                  }))
                }
                className="form-select"
              >
                <option value="7">7시간</option>
                <option value="8">8시간</option>
                <option value="9">9시간</option>
                <option value="10">10시간</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">요일</div>
          <div>
            <h2 className="settings-card__title">요일별 근무 설정</h2>
            <p className="settings-card__desc">
              요일별로 다른 출퇴근 시간을 지정하거나 휴무일로 제외할 수 있습니다.
            </p>
          </div>
        </div>
        <div className="settings-card__body space-y-4">
          <div className="grid grid-cols-[84px_1fr_20px_1fr_88px] gap-3 border-b border-[var(--border)] pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] max-md:hidden">
            <div>요일</div>
            <div>출근</div>
            <div />
            <div>퇴근</div>
            <div>휴무</div>
          </div>

          <div>
            {form.weekdaySettings.map((weekday, index) => (
              <div key={weekday.dayIndex} className={`hours-row ${weekday.isOff ? "is-off" : ""}`}>
                <div className="hours-row__label">{weekday.label}</div>
                <input
                  type="time"
                  value={weekday.checkInTime}
                  disabled={weekday.isOff}
                  onChange={(event) =>
                    setForm((current) => {
                      const next = [...current.weekdaySettings];
                      next[index] = { ...weekday, checkInTime: event.target.value };
                      return { ...current, weekdaySettings: next };
                    })
                  }
                  className="form-input"
                />
                <div className="hours-row__sep">~</div>
                <input
                  type="time"
                  value={weekday.checkOutTime}
                  disabled={weekday.isOff}
                  onChange={(event) =>
                    setForm((current) => {
                      const next = [...current.weekdaySettings];
                      next[index] = { ...weekday, checkOutTime: event.target.value };
                      return { ...current, weekdaySettings: next };
                    })
                  }
                  className="form-input"
                />
                <label className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={weekday.isOff}
                    onChange={(event) =>
                      setForm((current) => {
                        const next = [...current.weekdaySettings];
                        next[index] = { ...weekday, isOff: event.target.checked };
                        return { ...current, weekdaySettings: next };
                      })
                    }
                  />
                  휴무
                </label>
              </div>
            ))}
          </div>

          {successMessage ? (
            <div className="rounded-2xl border border-[#b7e4c7] bg-[var(--success-light)] px-4 py-3 text-sm font-medium text-[#15803d]">
              {successMessage}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="secondary-button btn--sm"
              onClick={() => setForm(createFormState(settings))}
              disabled={submitting}
            >
              초기화
            </button>
            <button
              type="button"
              className="primary-button btn--sm"
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting ? "저장 중..." : "근무 시간 저장"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
