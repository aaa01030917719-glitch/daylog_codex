"use client";

import { useEffect, useMemo, useState } from "react";
import {
  INDUSTRY_OPTIONS,
  TEAM_SIZE_OPTIONS,
  THEME_COLORS,
  type WorkspaceSettings,
} from "../types";
import {
  WORKSPACE_THEME_EVENT,
  WORKSPACE_THEME_STORAGE_KEY,
  createInviteUrl,
  normalizeThemeColor,
} from "@/lib/utils";

interface GeneralTabProps {
  settings: WorkspaceSettings;
  onSave: (settings: WorkspaceSettings) => void;
  onError: (message: string | null) => void;
}

type GeneralFormState = {
  name: string;
  description: string;
  industry: string;
  teamSize: string;
  themeColor: string;
};

function createFormState(settings: WorkspaceSettings): GeneralFormState {
  return {
    name: settings.name,
    description: settings.description ?? "",
    industry: settings.industry ?? "",
    teamSize: settings.teamSize ?? "",
    themeColor: settings.themeColor ?? "#4F7CFF",
  };
}

async function readErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error ?? "설정을 저장하지 못했습니다.";
  } catch {
    return "설정을 저장하지 못했습니다.";
  }
}

export function GeneralTab({ settings, onSave, onError }: GeneralTabProps) {
  const [form, setForm] = useState<GeneralFormState>(() => createFormState(settings));
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setForm(createFormState(settings));
  }, [settings]);

  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") {
      return `/invite/${settings.inviteCode}`;
    }

    return createInviteUrl(window.location.origin, settings.inviteCode);
  }, [settings.inviteCode]);

  const previewColor =
    THEME_COLORS.find((color) => color.hex === form.themeColor) ?? THEME_COLORS[0];

  async function handleSave() {
    if (!form.name.trim()) {
      onError("워크스페이스 이름을 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setSuccessMessage(null);
    onError(null);

    try {
      const response = await fetch("/api/settings/workspace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          industry: form.industry || null,
          teamSize: form.teamSize || null,
          themeColor: form.themeColor,
        }),
      });

      if (!response.ok) {
        onError(await readErrorMessage(response));
        return;
      }

      const data = (await response.json()) as { settings: WorkspaceSettings };
      onSave(data.settings);
      const nextThemeColor = normalizeThemeColor(data.settings.themeColor);
      window.localStorage.setItem(WORKSPACE_THEME_STORAGE_KEY, nextThemeColor);
      window.dispatchEvent(
        new CustomEvent(WORKSPACE_THEME_EVENT, {
          detail: { themeColor: nextThemeColor },
        })
      );
      setSuccessMessage("기본 정보가 저장되었습니다.");
    } catch {
      onError("기본 정보를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setSuccessMessage("초대 링크를 복사했습니다.");
    } catch {
      onError("초대 링크를 복사하지 못했습니다.");
    }
  }

  return (
    <>
      <div className="space-y-6">
      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">기본</div>
          <div>
            <h2 className="settings-card__title">기본 정보</h2>
            <p className="settings-card__desc">
              워크스페이스 이름, 설명, 업종, 팀 규모를 관리합니다.
            </p>
          </div>
        </div>
        <div className="settings-card__body space-y-6">
          <div className="settings-logo-upload">
            <div className="settings-logo-preview">
              {settings.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={settings.logoUrl}
                  alt="워크스페이스 로고"
                  className="h-full w-full rounded-[18px] object-cover"
                />
              ) : (
                form.name.trim().charAt(0).toUpperCase() || "D"
              )}
            </div>
            <div className="space-y-2">
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                워크스페이스 로고
              </div>
              <p className="settings-help-text">
                로고 업로드는 다음 단계에서 연결할 수 있습니다. 현재는 이름 첫 글자를 기본
                심볼로 사용합니다.
              </p>
            </div>
          </div>

          <div className="settings-grid-two">
            <label className="field">
              <span className="field-label">워크스페이스 이름</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="form-input"
                maxLength={50}
                placeholder="워크스페이스 이름을 입력해 주세요"
              />
            </label>
            <label className="field">
              <span className="field-label">생성일</span>
              <input
                value={new Date(settings.createdAt).toLocaleDateString("ko-KR")}
                readOnly
                className="form-input bg-[var(--surface-2)]"
              />
            </label>
          </div>

          <label className="field">
            <span className="field-label">설명</span>
            <input
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className="form-input"
              maxLength={80}
              placeholder="워크스페이스를 짧게 소개해 주세요"
            />
          </label>

          <div className="settings-grid-two">
            <label className="field">
              <span className="field-label">업종</span>
              <select
                value={form.industry}
                onChange={(event) =>
                  setForm((current) => ({ ...current, industry: event.target.value }))
                }
                className="form-select"
              >
                <option value="">선택 안 함</option>
                {INDUSTRY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field-label">팀 규모</span>
              <select
                value={form.teamSize}
                onChange={(event) =>
                  setForm((current) => ({ ...current, teamSize: event.target.value }))
                }
                className="form-select"
              >
                <option value="">선택 안 함</option>
                {TEAM_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="field">
            <span className="field-label">테마 색상</span>
            <div className="color-palette">
              {THEME_COLORS.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  className={`color-swatch ${form.themeColor === color.hex ? "is-selected" : ""}`}
                  style={{ backgroundColor: color.hex }}
                  onClick={() =>
                    setForm((current) => ({ ...current, themeColor: color.hex }))
                  }
                  aria-label={color.name}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-xl border border-[var(--border)]"
                style={{ backgroundColor: previewColor.hex }}
              />
              <div>
                <div className="text-sm font-semibold text-[var(--text-primary)]">
                  {previewColor.name}
                </div>
                <div className="text-xs text-[var(--text-muted)]">{previewColor.hex}</div>
              </div>
            </div>
          </div>

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
              {submitting ? "저장 중..." : "변경 사항 저장"}
            </button>
          </div>
          {successMessage ? (
            <div className="mt-3 rounded-2xl border border-[#b7e4c7] bg-[var(--success-light)] px-4 py-3 text-sm font-medium text-[#15803d]">
              {successMessage}
            </div>
          ) : null}
        </div>

      </section>

      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">초대</div>
          <div>
            <h2 className="settings-card__title">초대 링크</h2>
            <p className="settings-card__desc">
              기본 초대 링크를 빠르게 복사할 수 있습니다. 상세한 초대 링크 관리는 멤버 관리
              탭에서 이어서 확인할 수 있습니다.
            </p>
          </div>
        </div>
        <div className="settings-card__body space-y-4">
          <div className="settings-link-box">
            <div className="settings-link-box__value">{inviteLink}</div>
            <button
              type="button"
              className="secondary-button btn--sm"
              onClick={handleCopyInviteLink}
            >
              복사
            </button>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
