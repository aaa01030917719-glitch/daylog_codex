"use client";

import { useEffect, useMemo, useState } from "react";
import { useDirtyLeaveGuard } from "@/hooks/useDirtyLeaveGuard";
import {
  PROFILE_COLOR_OPTIONS,
  getUserAccentPalette,
  loadUserProfilePreferences,
  resolveUserDisplayName,
  saveUserProfilePreferences,
  type UserProfilePreferences,
} from "@/lib/user-profile-preferences";
import { ROLE_LABELS, type WorkspaceMemberRow } from "../types";

interface ProfileTabProps {
  currentUser: WorkspaceMemberRow | null;
  members: WorkspaceMemberRow[];
  onError: (message: string | null) => void;
  onPersonalColorSaved: (personalColor: string | null) => void;
}

interface ProfileFormState {
  name: string;
  position: string;
  accountId: string;
  email: string;
  joinedAt: string;
  personalColor: string;
}

function getDefaultPosition(member: WorkspaceMemberRow | null) {
  if (!member) {
    return "";
  }

  if (member.department?.trim()) {
    return member.department.trim();
  }

  switch (member.role) {
    case "OWNER":
      return "대표";
    case "ADMIN":
      return "관리자";
    default:
      return "멤버";
  }
}

function createDefaultFormState(member: WorkspaceMemberRow | null): ProfileFormState {
  const email = member?.email ?? "";

  return {
    name: member?.name ?? "이름 없음",
    position: getDefaultPosition(member),
    accountId: email.split("@")[0] ?? "",
    email,
    joinedAt: member?.joinedAt ?? "",
    personalColor: member?.personalColor ?? PROFILE_COLOR_OPTIONS[0].hex,
  };
}

function mergeProfileState(
  member: WorkspaceMemberRow | null,
  savedProfile: UserProfilePreferences | null
): ProfileFormState {
  const base = createDefaultFormState(member);

  return {
    ...base,
    name: resolveUserDisplayName(base.name, savedProfile),
    position: savedProfile?.position?.trim() || base.position,
    accountId: savedProfile?.accountId?.trim() || base.accountId,
    email: savedProfile?.email?.trim() || base.email,
    joinedAt: savedProfile?.joinedAt?.trim() || base.joinedAt,
    personalColor: member?.personalColor || savedProfile?.personalColor || base.personalColor,
  };
}

function formatJoinedDate(value: string) {
  if (!value) {
    return "가입일 정보 없음";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function ProfileTab({
  currentUser,
  members,
  onError,
  onPersonalColorSaved,
}: ProfileTabProps) {
  const savedProfile = useMemo(
    () => (currentUser ? loadUserProfilePreferences(currentUser.userId) : null),
    [currentUser]
  );
  const [savedState, setSavedState] = useState<ProfileFormState>(() =>
    mergeProfileState(currentUser, savedProfile)
  );
  const [form, setForm] = useState<ProfileFormState>(() =>
    mergeProfileState(currentUser, savedProfile)
  );
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const usedColorSet = useMemo(
    () =>
      new Set(
        members
          .filter(
            (member) =>
              member.userId !== currentUser?.userId && Boolean(member.personalColor)
          )
          .map((member) => member.personalColor as string)
      ),
    [currentUser?.userId, members]
  );

  useEffect(() => {
    const merged = mergeProfileState(
      currentUser,
      currentUser ? loadUserProfilePreferences(currentUser.userId) : null
    );
    setSavedState(merged);
    setForm(merged);
  }, [currentUser]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedState);
  const palette = getUserAccentPalette(form.personalColor);
  const displayName = form.name.trim() || "이름 없음";

  const { requestClose } = useDirtyLeaveGuard({
    isDirty: editing && isDirty,
    onDiscard: () => {
      setForm(savedState);
      setEditing(false);
    },
    disabled: saving || !editing,
    message: "나가면 작성 중인 내용은 저장되지 않고 사라집니다. 나가시겠습니까?",
  });

  async function handleSave() {
    if (!currentUser) {
      onError("프로필 정보를 불러오지 못했습니다.");
      return;
    }

    if (!form.name.trim()) {
      onError("이름을 입력해주세요.");
      return;
    }

    if (!form.position.trim()) {
      onError("직책을 입력해주세요.");
      return;
    }

    if (!form.accountId.trim()) {
      onError("아이디를 입력해주세요.");
      return;
    }

    if (usedColorSet.has(form.personalColor)) {
      onError("이미 다른 사용자가 사용 중인 색상입니다.");
      return;
    }

    setSaving(true);
    onError(null);

    try {
      const nextState = {
        ...form,
        name: form.name.trim(),
        position: form.position.trim(),
        accountId: form.accountId.trim(),
      };

      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personalColor: nextState.personalColor,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { error?: string; profile?: { personalColor?: string | null } }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "개인 색상을 저장하지 못했습니다.");
      }

      const persistedColor =
        data?.profile?.personalColor?.trim() || nextState.personalColor;

      saveUserProfilePreferences(currentUser.userId, {
        name: nextState.name,
        position: nextState.position,
        accountId: nextState.accountId,
        email: nextState.email,
        joinedAt: nextState.joinedAt,
        personalColor: persistedColor,
      });

      const persistedState = {
        ...nextState,
        personalColor: persistedColor,
      };

      setSavedState(persistedState);
      setForm(persistedState);
      setEditing(false);
      onPersonalColorSaved(persistedColor);
      setSuccessMessage("프로필 정보를 저장했습니다.");
    } catch (saveError) {
      onError(
        saveError instanceof Error
          ? saveError.message
          : "프로필 정보를 저장하지 못했습니다."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!currentUser) {
    return (
      <section className="settings-card">
        <div className="settings-card__body">
          <div className="empty-panel min-h-[220px]">
            <p className="empty-panel__title">프로필 정보를 찾지 못했어요.</p>
            <p className="empty-panel__description">
              다시 로그인한 뒤 워크스페이스 설정으로 돌아오면 정보를 다시 불러올 수 있어요.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">프로필</div>
          <div>
            <h2 className="settings-card__title">프로필 관리</h2>
            <p className="settings-card__desc">
              이름, 직책, 아이디, 개인 색상을 관리하고 댓글·달력·출퇴근 식별 색상으로 바로 반영할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="settings-card__body">
          <div className="profile-settings-card">
            <div className="profile-settings-hero">
              <div className="profile-settings-avatar-wrap">
                <div
                  className="profile-settings-avatar"
                  style={{ background: palette.solid, color: palette.avatarText }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="min-w-0">
                <div className="profile-settings-name">{displayName}</div>
                <div className="profile-settings-position">
                  {form.position.trim() || ROLE_LABELS[currentUser.role]}
                </div>
              </div>
            </div>

            {!editing ? (
              <div className="space-y-5">
                <div className="profile-settings-info-grid">
                  <div className="profile-settings-info-item profile-settings-info-item--wide">
                    <div className="profile-settings-info-label">아이디</div>
                    <div className="profile-settings-info-value">{savedState.accountId || "없음"}</div>
                  </div>
                  <div className="profile-settings-info-item profile-settings-info-item--wide">
                    <div className="profile-settings-info-label">이메일</div>
                    <div className="profile-settings-info-value">{savedState.email || "없음"}</div>
                  </div>
                  <div className="profile-settings-info-item">
                    <div className="profile-settings-info-label">이름</div>
                    <div className="profile-settings-info-value">{savedState.name}</div>
                  </div>
                  <div className="profile-settings-info-item">
                    <div className="profile-settings-info-label">직책</div>
                    <div className="profile-settings-info-value">{savedState.position || "없음"}</div>
                  </div>
                  <div className="profile-settings-info-item profile-settings-info-item--wide">
                    <div className="profile-settings-info-label">가입 날짜</div>
                    <div className="profile-settings-info-value">{formatJoinedDate(savedState.joinedAt)}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface-2)] px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-2xl border"
                      style={{
                        background: palette.softBackground,
                        borderColor: palette.softBorder,
                      }}
                    />
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        개인 색상
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {form.personalColor} 색상은 댓글, 달력, 출퇴근 식별 요소에 사용됩니다.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    className="secondary-button btn--sm"
                    onClick={() => {
                      setEditing(true);
                      setSuccessMessage(null);
                      onError(null);
                    }}
                  >
                    프로필 수정하기
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {isDirty ? (
                  <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-sm font-medium text-[#92400e]">
                    저장되지 않은 변경사항이 있어요.
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="field">
                    <span className="field-label">아이디</span>
                    <input
                      value={form.accountId}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, accountId: event.target.value }))
                      }
                      className="form-input"
                      placeholder="아이디를 입력해주세요"
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">가입 날짜</span>
                    <input
                      value={formatJoinedDate(form.joinedAt)}
                      readOnly
                      className="form-input bg-[var(--surface-2)]"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="field">
                    <span className="field-label">이름</span>
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, name: event.target.value }))
                      }
                      className="form-input"
                      placeholder="이름을 입력해주세요"
                    />
                  </label>
                  <label className="field">
                    <span className="field-label">직책</span>
                    <input
                      value={form.position}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, position: event.target.value }))
                      }
                      className="form-input"
                      placeholder="직책을 입력해주세요"
                    />
                  </label>
                </div>

                <label className="field">
                  <span className="field-label">이메일</span>
                  <input value={form.email} readOnly className="form-input bg-[var(--surface-2)]" />
                </label>

                <div className="field">
                  <span className="field-label">개인 색상</span>
                  <div className="profile-settings-color-grid">
                    {PROFILE_COLOR_OPTIONS.map((color) => {
                      const isUsedByOther = usedColorSet.has(color.hex);

                      return (
                        <button
                          key={color.hex}
                          type="button"
                          className={`profile-settings-color-swatch ${
                            form.personalColor === color.hex ? "is-selected" : ""
                          } ${isUsedByOther ? "cursor-not-allowed opacity-35" : ""}`}
                          style={{ backgroundColor: color.hex }}
                          onClick={() => {
                            if (isUsedByOther) {
                              onError("이미 다른 사용자가 사용 중인 색상입니다.");
                              return;
                            }

                            onError(null);
                            setForm((current) => ({ ...current, personalColor: color.hex }));
                          }}
                          aria-label={`${color.name} 색상 선택`}
                          disabled={isUsedByOther}
                          title={isUsedByOther ? "이미 다른 사용자가 사용 중인 색상입니다." : color.name}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    이미 사용 중인 색상은 비활성화되며, 같은 워크스페이스 안에서는 중복 선택할 수 없습니다.
                  </p>

                  <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--surface-2)] px-4 py-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
                        style={{
                          background: palette.softBackground,
                          borderColor: palette.softBorder,
                          color: palette.text,
                        }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: palette.solid }}
                        />
                        댓글/출퇴근 식별 미리보기
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        너무 밝은 색도 자동으로 보정해서 텍스트 가독성을 유지합니다.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="secondary-button btn--sm"
                    onClick={requestClose}
                    disabled={saving}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="primary-button btn--sm"
                    onClick={() => void handleSave()}
                    disabled={saving || !isDirty}
                  >
                    {saving ? "저장 중..." : "수정 완료"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {successMessage ? (
            <div className="mt-4 rounded-2xl border border-[#b7e4c7] bg-[var(--success-light)] px-4 py-3 text-sm font-medium text-[#15803d]">
              {successMessage}
            </div>
          ) : null}
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card__header">
          <div className="settings-card__icon">계정</div>
          <div>
            <h2 className="settings-card__title">계정 안내</h2>
            <p className="settings-card__desc">
              프로필 정보는 본인 설정으로만 저장되며 다른 멤버 정보에는 영향을 주지 않습니다.
            </p>
          </div>
        </div>
        <div className="settings-card__body">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 text-sm leading-7 text-[var(--text-secondary)]">
            이름, 직책, 아이디, 개인 색상은 현재 로그인한 계정에만 적용됩니다. 저장 후에는 댓글과 출퇴근
            화면에서 본인을 식별하는 색상으로 바로 반영됩니다.
          </div>
        </div>
      </section>
    </div>
  );
}
