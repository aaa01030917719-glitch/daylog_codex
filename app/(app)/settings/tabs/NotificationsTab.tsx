"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  NOTIFICATION_ITEMS,
  type NotificationLevel,
  type NotificationRule,
  type WorkspaceSettings,
} from "../types";

interface NotificationsTabProps {
  settings: WorkspaceSettings;
  onSave: (settings: WorkspaceSettings) => void;
  onError: (message: string | null) => void;
}

type NotificationsFormState = {
  notificationRules: NotificationRule[];
  checkoutAlertTime: string;
  missingAlertTime: string;
};

function createFormState(settings: WorkspaceSettings): NotificationsFormState {
  return {
    notificationRules: settings.notificationRules.map((rule) => ({ ...rule })),
    checkoutAlertTime: settings.checkoutAlertTime,
    missingAlertTime: settings.missingAlertTime,
  };
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "알림 설정을 저장하지 못했습니다.";
  } catch {
    return "알림 설정을 저장하지 못했습니다.";
  }
}

export function NotificationsTab({ settings, onSave, onError }: NotificationsTabProps) {
  const [form, setForm] = useState<NotificationsFormState>(() => createFormState(settings));
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm(createFormState(settings));
  }, [settings]);

  const groupedRows = useMemo(() => {
    let currentGroup = "";
    return NOTIFICATION_ITEMS.map((item) => {
      const isNewGroup = item.group !== currentGroup;
      currentGroup = item.group;
      return { item, isNewGroup };
    });
  }, []);

  function updateRule(key: string, level: NotificationLevel) {
    setForm((current) => ({
      ...current,
      notificationRules: current.notificationRules.map((rule) =>
        rule.key === key ? { ...rule, level } : rule
      ),
    }));
  }

  async function handleSave() {
    setSaving(true);
    setSuccessMessage(null);
    onError(null);

    try {
      const notificationPayload = Object.fromEntries(
        form.notificationRules.map((rule) => [`notif_${rule.key}`, rule.level])
      );

      const response = await fetch("/api/settings/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkoutAlertTime: form.checkoutAlertTime,
          missingAlertTime: form.missingAlertTime,
          ...notificationPayload,
        }),
      });

      if (!response.ok) {
        onError(await readErrorMessage(response));
        return;
      }

      const data = (await response.json()) as { settings: WorkspaceSettings };
      onSave(data.settings);
      setSuccessMessage("알림 정책을 저장했습니다.");
    } catch {
      onError("알림 정책을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">알림</div>
          <div>
            <h2 className="settings-card__title">알림 설정</h2>
            <p className="settings-card__desc">
              중요도에 따라 Web Push, 배지, 끄기 중 원하는 알림 수준을 선택합니다.
            </p>
          </div>
        </div>
        <div className="settings-card__body space-y-4">
          <div className="settings-summary-grid">
            <div className="settings-stat-card">
              <div className="settings-stat-card__label">Web Push</div>
              <div className="settings-stat-card__value text-[1rem]">즉시 팝업</div>
              <div className="settings-stat-card__sub">중요한 업무 알림에 권장합니다.</div>
            </div>
            <div className="settings-stat-card">
              <div className="settings-stat-card__label">배지</div>
              <div className="settings-stat-card__value text-[1rem]">접속 후 확인</div>
              <div className="settings-stat-card__sub">실시간 팝업 없이 헤더에서 확인합니다.</div>
            </div>
            <div className="settings-stat-card">
              <div className="settings-stat-card__label">끄기</div>
              <div className="settings-stat-card__value text-[1rem]">알림 없음</div>
              <div className="settings-stat-card__sub">참고용 정보만 조용하게 관리합니다.</div>
            </div>
          </div>

          <div className="table-shell">
            <table className="data-table notif-matrix">
              <thead>
                <tr>
                  <th>알림 항목</th>
                  <th>Web Push</th>
                  <th>배지</th>
                  <th>끄기</th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.map(({ item, isNewGroup }) => {
                  const currentLevel =
                    form.notificationRules.find((rule) => rule.key === item.key)?.level ??
                    item.defaultLevel;

                  return (
                    <Fragment key={item.key}>
                      {isNewGroup ? (
                        <tr>
                          <td colSpan={4} className="notif-group-label">
                            {item.group}
                          </td>
                        </tr>
                      ) : null}
                      <tr>
                        <td>
                          <div className="notif-matrix__label">{item.label}</div>
                          <div className="notif-matrix__sub">{item.sub}</div>
                        </td>
                        {(["push", "badge", "off"] as NotificationLevel[]).map((level) => (
                          <td key={level}>
                            <input
                              type="radio"
                              name={item.key}
                              checked={currentLevel === level}
                              onChange={() => updateRule(item.key, level)}
                            />
                          </td>
                        ))}
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">PWA</div>
          <div>
            <h2 className="settings-card__title">기기 알림 안내</h2>
            <p className="settings-card__desc">
              모바일에서도 즉시 알림을 안정적으로 받으려면 홈 화면에 Daylog를 추가해 주세요.
            </p>
          </div>
        </div>
        <div className="settings-card__body space-y-3">
          <div className="rounded-2xl border border-[#b7e4c7] bg-[var(--success-light)] px-4 py-3 text-sm font-medium text-[#15803d]">
            Web Push를 허용한 브라우저에서는 즉시 알림이 팝업으로 전달됩니다.
          </div>
          <ol className="space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
            <li>1. 모바일 브라우저에서 Daylog를 연 뒤 브라우저 메뉴를 엽니다.</li>
            <li>2. &quot;홈 화면에 추가&quot; 또는 &quot;앱 설치&quot; 메뉴를 선택합니다.</li>
            <li>3. 설치 후 알림 허용을 켜면 중요한 알림을 빠르게 받을 수 있습니다.</li>
          </ol>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">시간</div>
          <div>
            <h2 className="settings-card__title">자동 알림 시간</h2>
            <p className="settings-card__desc">
              근무 관리 자동 알림은 아래 시간 기준으로 발송됩니다.
            </p>
          </div>
        </div>
        <div className="settings-card__body space-y-4">
          <div className="settings-grid-two">
            <label className="field">
              <span className="field-label">퇴근 누락 알림</span>
              <input
                type="time"
                value={form.checkoutAlertTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, checkoutAlertTime: event.target.value }))
                }
                className="form-input"
              />
            </label>
            <label className="field">
              <span className="field-label">다음 날 미기록 알림</span>
              <input
                type="time"
                value={form.missingAlertTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, missingAlertTime: event.target.value }))
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

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="secondary-button btn--sm"
              onClick={() => setForm(createFormState(settings))}
              disabled={saving}
            >
              초기화
            </button>
            <button
              type="button"
              className="primary-button btn--sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "저장 중..." : "알림 설정 저장"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
