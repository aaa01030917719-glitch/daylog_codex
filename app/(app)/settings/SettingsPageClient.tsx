"use client";

import { useEffect, useState } from "react";
import type {
  InviteLinkRow,
  MemberRoleValue,
  SettingsTab,
  WorkspaceMemberRow,
  WorkspaceSettings,
} from "./types";
import { getSettingsTabNav } from "./types";
import { GeneralTab } from "./tabs/GeneralTab";
import { MembersTab } from "./tabs/MembersTab";
import { WorkHoursTab } from "./tabs/WorkHoursTab";
import { AttendanceTab } from "./tabs/AttendanceTab";
import { NotificationsTab } from "./tabs/NotificationsTab";
import { DangerTab } from "./tabs/DangerTab";
import { SubscriptionsTab } from "./tabs/SubscriptionsTab";
import { ProfileTab } from "./tabs/ProfileTab";
import {
  createPersonalSettingsStorageKey,
  loadPersonalSettings,
  mergePersonalSettings,
} from "./personal-settings";

interface SettingsPageClientProps {
  initialSettings: WorkspaceSettings;
  initialMembers: WorkspaceMemberRow[];
  initialInviteLinks: InviteLinkRow[];
  userRole: MemberRoleValue;
  currentUserId: string;
}

export function SettingsPageClient({
  initialSettings,
  initialMembers,
  initialInviteLinks,
  userRole,
  currentUserId,
}: SettingsPageClientProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    userRole === "OWNER" ? "general" : "profile"
  );
  const [settings, setSettings] = useState(initialSettings);
  const [members, setMembers] = useState(initialMembers);
  const [inviteLinks, setInviteLinks] = useState(initialInviteLinks);
  const [error, setError] = useState<string | null>(null);
  const isMember = userRole === "MEMBER";
  const personalMode = userRole === "ADMIN" || userRole === "MEMBER";
  const navSections = getSettingsTabNav(userRole);
  const personalStorageKey = personalMode
    ? createPersonalSettingsStorageKey(initialSettings.id, currentUserId)
    : null;

  useEffect(() => {
    if (
      personalMode &&
      (activeTab === "general" ||
        activeTab === "members" ||
        activeTab === "danger" ||
        activeTab === "subscriptions")
    ) {
      setActiveTab("profile");
    }
  }, [activeTab, personalMode]);

  useEffect(() => {
    if (!personalMode || !personalStorageKey) {
      return;
    }

    const overrides = loadPersonalSettings(personalStorageKey);
    setSettings((current) => mergePersonalSettings(current, overrides));
  }, [personalMode, personalStorageKey]);

  const currentMember =
    members.find((member) => member.userId === currentUserId) ?? null;

  return (
    <div className="page-shell">
      <section className="page-header">
          <div className="page-header__meta">
            <div className="page-header__eyebrow">
              {personalMode ? "Personal Settings" : "Workspace Settings"}
            </div>
            <h1 className="page-title">
              {personalMode ? "내 설정" : "워크스페이스 설정"}
            </h1>
            <p className="page-subtitle">
              {personalMode
                ? "내 프로필, 근무 시간, 출퇴근 기준, 알림을 개인별로 관리합니다."
                : "기본 정보, 멤버 관리, 근무 설정과 알림 정책을 한곳에서 관리합니다."}
            </p>
          </div>
        </section>

      {error ? (
        <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
          {error}
        </div>
      ) : null}

      <div className="settings-layout">
        <nav
          className="settings-nav"
          aria-label={personalMode ? "내 설정 탭" : "워크스페이스 설정 탭"}
        >
          {navSections.map((section) => (
            <div key={section.section}>
              <div className="settings-nav__section">{section.section}</div>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <button
                    key={`${section.section}-${item.id}`}
                    type="button"
                    className={`settings-nav__item ${activeTab === item.id ? "is-active" : ""}`}
                    onClick={() => {
                      setActiveTab(item.id);
                      setError(null);
                    }}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="settings-stack">
          {activeTab === "profile" ? (
            <ProfileTab
              currentUser={currentMember}
              members={members}
              onError={setError}
              onPersonalColorSaved={(personalColor) => {
                setMembers((current) =>
                  current.map((member) =>
                    member.userId === currentUserId
                      ? { ...member, personalColor }
                      : member
                  )
                );
              }}
            />
          ) : null}
          {activeTab === "general" ? (
            <GeneralTab settings={settings} onSave={setSettings} onError={setError} />
          ) : null}
          {activeTab === "members" ? (
            <MembersTab
              members={members}
              inviteLinks={inviteLinks}
              onMembersUpdate={setMembers}
              onLinksUpdate={setInviteLinks}
              onError={setError}
              readOnly={isMember}
            />
          ) : null}
          {activeTab === "subscriptions" ? (
            <SubscriptionsTab
              members={members}
              userRole={userRole}
              onError={setError}
            />
          ) : null}
          {activeTab === "workhours" ? (
            <WorkHoursTab
              settings={settings}
              onSave={setSettings}
              onError={setError}
              readOnly={false}
              personalMode={personalMode}
              personalStorageKey={personalStorageKey}
            />
          ) : null}
          {activeTab === "attendance" ? (
            <AttendanceTab
              settings={settings}
              members={members}
              onSave={setSettings}
              onError={setError}
              readOnly={false}
              personalMode={personalMode}
              personalStorageKey={personalStorageKey}
            />
          ) : null}
          {activeTab === "notifications" ? (
            <NotificationsTab
              settings={settings}
              onSave={setSettings}
              onError={setError}
              readOnly={false}
              personalMode={personalMode}
              personalStorageKey={personalStorageKey}
            />
          ) : null}
          {activeTab === "danger" && !personalMode ? (
            <DangerTab
              workspaceName={settings.name}
              inviteLinks={inviteLinks}
              onError={setError}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
