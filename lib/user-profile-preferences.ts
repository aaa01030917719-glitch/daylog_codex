"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeThemeColor } from "@/lib/utils";

export interface UserProfilePreferences {
  name?: string;
  position?: string;
  accountId?: string;
  email?: string;
  joinedAt?: string;
  personalColor?: string;
}

interface ProfileApiResponse {
  profiles?: Array<
    UserProfilePreferences & {
      userId: string;
    }
  >;
}

export interface UserProfileLookupIdentity {
  userId?: string | null;
  email?: string | null;
  name?: string | null;
}

type UserProfileLookupInput = string | UserProfileLookupIdentity;

export const USER_PROFILE_EVENT = "daylog:user-profile-change";

export const PROFILE_COLOR_OPTIONS = [
  { hex: "#4F7CFF", name: "블루" },
  { hex: "#22C55E", name: "그린" },
  { hex: "#8B5CF6", name: "바이올렛" },
  { hex: "#F97316", name: "오렌지" },
  { hex: "#EC4899", name: "핑크" },
  { hex: "#14B8A6", name: "민트" },
  { hex: "#EAB308", name: "옐로" },
  { hex: "#64748B", name: "슬레이트" },
] as const;

interface UserAccentPalette {
  solid: string;
  softBackground: string;
  softBorder: string;
  text: string;
  avatarText: string;
}

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
    return normalizeThemeColor(color);
  }

  return toHexColor(
    rgb.r + (target.r - rgb.r) * ratio,
    rgb.g + (target.g - rgb.g) * ratio,
    rgb.b + (target.b - rgb.b) * ratio
  );
}

function getReadableTextColor(color: string) {
  const rgb = parseHexChannelPairs(color);
  if (!rgb) {
    return "#FFFFFF";
  }

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.67 ? "#111827" : "#FFFFFF";
}

export function createUserProfileStorageKey(userId: string) {
  return `daylog:user-profile:${userId}`;
}

export function loadUserProfilePreferences(userId: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(createUserProfileStorageKey(userId));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as UserProfilePreferences;
    return {
      ...parsed,
      personalColor: parsed.personalColor
        ? normalizeThemeColor(parsed.personalColor)
        : undefined,
    } satisfies UserProfilePreferences;
  } catch {
    return null;
  }
}

export function saveUserProfilePreferences(
  userId: string,
  profile: UserProfilePreferences
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedProfile = {
    ...profile,
    personalColor: profile.personalColor
      ? normalizeThemeColor(profile.personalColor)
      : undefined,
  } satisfies UserProfilePreferences;

  window.localStorage.setItem(
    createUserProfileStorageKey(userId),
    JSON.stringify(normalizedProfile)
  );
  window.dispatchEvent(
    new CustomEvent(USER_PROFILE_EVENT, {
      detail: { userId, profile: normalizedProfile },
    })
  );
}

function mergeProfileSources(
  serverProfile: UserProfilePreferences | null | undefined,
  localProfile: UserProfilePreferences | null | undefined
) {
  if (!serverProfile && !localProfile) {
    return null;
  }

  return {
    ...serverProfile,
    ...localProfile,
    personalColor: serverProfile?.personalColor ?? localProfile?.personalColor,
  } satisfies UserProfilePreferences;
}

function normalizeLookupValue(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\s+/g, " ").toLowerCase();
}

export function findUserProfilePreferences(
  profiles: Map<string, UserProfilePreferences>,
  identity: UserProfileLookupIdentity
) {
  const directUserId = identity.userId?.trim();
  if (directUserId) {
    const directProfile = profiles.get(directUserId);
    if (directProfile) {
      return directProfile;
    }
  }

  const normalizedUserId = normalizeLookupValue(identity.userId);
  const normalizedEmail = normalizeLookupValue(identity.email);
  const normalizedName = normalizeLookupValue(identity.name);

  if (!normalizedUserId && !normalizedEmail && !normalizedName) {
    return null;
  }

  for (const [userId, profile] of Array.from(profiles.entries())) {
    if (normalizedUserId && normalizeLookupValue(userId) === normalizedUserId) {
      return profile;
    }

    if (normalizedEmail && normalizeLookupValue(profile.email) === normalizedEmail) {
      return profile;
    }

    if (normalizedName && normalizeLookupValue(profile.name) === normalizedName) {
      return profile;
    }
  }

  return null;
}

export function getUserAccentPalette(color?: string | null): UserAccentPalette {
  const solid = normalizeThemeColor(color);

  return {
    solid,
    softBackground: mixHexColor(solid, { r: 255, g: 255, b: 255 }, 0.9),
    softBorder: mixHexColor(solid, { r: 255, g: 255, b: 255 }, 0.72),
    text: mixHexColor(solid, { r: 17, g: 24, b: 39 }, 0.18),
    avatarText: getReadableTextColor(solid),
  };
}

export function resolveUserDisplayName(
  fallbackName: string,
  profile?: UserProfilePreferences | null
) {
  const nextName = profile?.name?.trim();
  return nextName && nextName.length > 0 ? nextName : fallbackName;
}

export function useUserProfilePreferences(inputs: UserProfileLookupInput[]) {
  const [profiles, setProfiles] = useState<Map<string, UserProfilePreferences>>(
    new Map()
  );

  const normalizedLookup = useMemo(() => {
    const userIds = new Set<string>();
    const emails = new Set<string>();
    const names = new Set<string>();

    for (const input of inputs) {
      if (typeof input === "string") {
        const userId = input.trim();
        if (userId) {
          userIds.add(userId);
        }
        continue;
      }

      const userId = input.userId?.trim();
      const email = input.email?.trim();
      const name = input.name?.trim();

      if (userId) {
        userIds.add(userId);
      }

      if (email) {
        emails.add(email);
      }

      if (name) {
        names.add(name);
      }
    }

    return {
      userIds: Array.from(userIds).sort(),
      emails: Array.from(emails).sort(),
      names: Array.from(names).sort(),
    };
  }, [inputs]);

  const { userIds: normalizedUserIds, emails: normalizedEmails, names: normalizedNames } =
    normalizedLookup;
  const normalizedUserIdsKey = normalizedUserIds.join(",");
  const normalizedEmailsKey = normalizedEmails.join(",");
  const normalizedNamesKey = normalizedNames.join(",");

  useEffect(() => {
    const userIds = normalizedUserIdsKey ? normalizedUserIdsKey.split(",") : [];
    const emails = normalizedEmailsKey ? normalizedEmailsKey.split(",") : [];
    const names = normalizedNamesKey ? normalizedNamesKey.split(",") : [];

    async function syncProfiles() {
      const nextProfiles = new Map<string, UserProfilePreferences>();

      userIds.forEach((userId) => {
        const profile = loadUserProfilePreferences(userId);
        if (profile) {
          nextProfiles.set(userId, profile);
        }
      });

      if (userIds.length > 0 || emails.length > 0 || names.length > 0) {
        try {
          const params = new URLSearchParams();

          if (userIds.length > 0) {
            params.set("userIds", userIds.join(","));
          }

          if (emails.length > 0) {
            params.set("emails", emails.join(","));
          }

          if (names.length > 0) {
            params.set("names", names.join(","));
          }

          const response = await fetch(`/api/settings/profile?${params.toString()}`, {
            cache: "no-store",
          });

          if (response.ok) {
            const data = (await response.json()) as ProfileApiResponse;

            for (const entry of data.profiles ?? []) {
              const localProfile = loadUserProfilePreferences(entry.userId);
              const mergedProfile = mergeProfileSources(entry, localProfile);

              if (mergedProfile) {
                nextProfiles.set(entry.userId, mergedProfile);
              }
            }
          }
        } catch {
          // Keep local fallback when the server profile lookup is unavailable.
        }
      }

      setProfiles(nextProfiles);
    }

    void syncProfiles();

    function handleProfileChange() {
      void syncProfiles();
    }

    window.addEventListener(USER_PROFILE_EVENT, handleProfileChange);
    window.addEventListener("storage", handleProfileChange);

    return () => {
      window.removeEventListener(USER_PROFILE_EVENT, handleProfileChange);
      window.removeEventListener("storage", handleProfileChange);
    };
  }, [normalizedEmailsKey, normalizedNamesKey, normalizedUserIdsKey]);

  return profiles;
}
