import type { WorkspaceSettings } from "./types";

type PersonalSettingsSubset = Pick<
  WorkspaceSettings,
  | "checkInTime"
  | "checkOutTime"
  | "lateGraceMinutes"
  | "workHoursPerDay"
  | "weekdaySettings"
  | "checkoutConfirmPopup"
  | "showAttendanceMemo"
  | "notifyCheckoutMissed"
  | "notifyNextDayMissing"
  | "checkoutAlertTime"
  | "missingAlertTime"
  | "notificationRules"
>;

export function createPersonalSettingsStorageKey(
  workspaceId: string,
  userId: string
) {
  return `daylog:personal-settings:${workspaceId}:${userId}`;
}

function pickPersonalSettings(settings: WorkspaceSettings): PersonalSettingsSubset {
  return {
    checkInTime: settings.checkInTime,
    checkOutTime: settings.checkOutTime,
    lateGraceMinutes: settings.lateGraceMinutes,
    workHoursPerDay: settings.workHoursPerDay,
    weekdaySettings: settings.weekdaySettings.map((weekday) => ({ ...weekday })),
    checkoutConfirmPopup: settings.checkoutConfirmPopup,
    showAttendanceMemo: settings.showAttendanceMemo,
    notifyCheckoutMissed: settings.notifyCheckoutMissed,
    notifyNextDayMissing: settings.notifyNextDayMissing,
    checkoutAlertTime: settings.checkoutAlertTime,
    missingAlertTime: settings.missingAlertTime,
    notificationRules: settings.notificationRules.map((rule) => ({ ...rule })),
  };
}

export function savePersonalSettings(
  storageKey: string,
  settings: WorkspaceSettings
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify(pickPersonalSettings(settings))
  );
}

export function loadPersonalSettings(
  storageKey: string
): Partial<WorkspaceSettings> | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as Partial<WorkspaceSettings>;
  } catch {
    return null;
  }
}

export function mergePersonalSettings(
  base: WorkspaceSettings,
  overrides: Partial<WorkspaceSettings> | null
): WorkspaceSettings {
  if (!overrides) {
    return base;
  }

  return {
    ...base,
    checkInTime: overrides.checkInTime ?? base.checkInTime,
    checkOutTime: overrides.checkOutTime ?? base.checkOutTime,
    lateGraceMinutes: overrides.lateGraceMinutes ?? base.lateGraceMinutes,
    workHoursPerDay: overrides.workHoursPerDay ?? base.workHoursPerDay,
    weekdaySettings: overrides.weekdaySettings
      ? overrides.weekdaySettings.map((weekday) => ({ ...weekday }))
      : base.weekdaySettings,
    checkoutConfirmPopup:
      overrides.checkoutConfirmPopup ?? base.checkoutConfirmPopup,
    showAttendanceMemo: overrides.showAttendanceMemo ?? base.showAttendanceMemo,
    notifyCheckoutMissed:
      overrides.notifyCheckoutMissed ?? base.notifyCheckoutMissed,
    notifyNextDayMissing:
      overrides.notifyNextDayMissing ?? base.notifyNextDayMissing,
    checkoutAlertTime: overrides.checkoutAlertTime ?? base.checkoutAlertTime,
    missingAlertTime: overrides.missingAlertTime ?? base.missingAlertTime,
    notificationRules: overrides.notificationRules
      ? overrides.notificationRules.map((rule) => ({ ...rule }))
      : base.notificationRules,
  };
}
