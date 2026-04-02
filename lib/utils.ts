import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_THEME_COLOR = "#4F7CFF";

function clampColorChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function parseHexChannelPairs(color: string) {
  const normalized = color.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function toHexColor(r: number, g: number, b: number) {
  return `#${[r, g, b]
    .map((channel) => clampColorChannel(channel).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

function mixHexColor(color: string, target: { r: number; g: number; b: number }, ratio: number) {
  const rgb = parseHexChannelPairs(color);
  if (!rgb) {
    return DEFAULT_THEME_COLOR;
  }

  return toHexColor(
    rgb.r + (target.r - rgb.r) * ratio,
    rgb.g + (target.g - rgb.g) * ratio,
    rgb.b + (target.b - rgb.b) * ratio
  );
}

export function normalizeInviteCode(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const inviteSegment = "/invite/";
  const inviteIndex = trimmed.lastIndexOf(inviteSegment);
  if (inviteIndex >= 0) {
    return trimmed
      .slice(inviteIndex + inviteSegment.length)
      .split(/[/?#]/)[0]
      .trim();
  }

  try {
    const parsed = new URL(trimmed);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const invitePathIndex = segments.lastIndexOf("invite");
    if (invitePathIndex >= 0 && segments[invitePathIndex + 1]) {
      return segments[invitePathIndex + 1].trim();
    }
  } catch {
    return trimmed.replace(/[\r\n]/g, "").trim();
  }

  return trimmed.replace(/[\r\n]/g, "").trim();
}

export function createInvitePath(inviteCode: string) {
  return `/invite/${encodeURIComponent(normalizeInviteCode(inviteCode))}`;
}

export function createInviteUrl(origin: string, inviteCode: string) {
  return `${origin.replace(/\/$/, "")}${createInvitePath(inviteCode)}`;
}

export function normalizeThemeColor(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return DEFAULT_THEME_COLOR;
}

export function createThemeCssVariables(themeColor: string | null | undefined) {
  const accent = normalizeThemeColor(themeColor);

  return {
    "--accent": accent,
    "--accent-hover": mixHexColor(accent, { r: 0, g: 0, b: 0 }, 0.12),
    "--accent-light": mixHexColor(accent, { r: 255, g: 255, b: 255 }, 0.9),
  } as Record<string, string>;
}

export const WORKSPACE_THEME_STORAGE_KEY = "daylog.workspace.themeColor";
export const WORKSPACE_THEME_EVENT = "daylog:workspace-theme-change";
