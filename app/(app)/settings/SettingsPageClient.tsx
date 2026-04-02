"use client";

import { useState } from "react";
import type {
  InviteLinkRow,
  SettingsTab,
  WorkspaceMemberRow,
  WorkspaceSettings,
} from "./types";
import { SETTINGS_TAB_NAV } from "./types";
import { GeneralTab } from "./tabs/GeneralTab";
import { MembersTab } from "./tabs/MembersTab";
import { WorkHoursTab } from "./tabs/WorkHoursTab";
import { AttendanceTab } from "./tabs/AttendanceTab";
import { NotificationsTab } from "./tabs/NotificationsTab";
import { DangerTab } from "./tabs/DangerTab";

interface SettingsPageClientProps {
  initialSettings: WorkspaceSettings;
  initialMembers: WorkspaceMemberRow[];
  initialInviteLinks: InviteLinkRow[];
}

export function SettingsPageClient({
  initialSettings,
  initialMembers,
  initialInviteLinks,
}: SettingsPageClientProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [settings, setSettings] = useState(initialSettings);
  const [members, setMembers] = useState(initialMembers);
  const [inviteLinks, setInviteLinks] = useState(initialInviteLinks);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="page-shell">
      <section className="page-header">
        <div className="page-header__meta">
          <div className="page-header__eyebrow">Workspace Settings</div>
          <h1 className="page-title">워크스페이스 설정</h1>
          <p className="page-subtitle">
            기본 정보, 멤버 관리, 근무 설정과 알림 정책을 한곳에서 관리합니다.
          </p>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-[#fecaca] bg-[var(--danger-light)] px-4 py-3 text-sm font-medium text-[#b42318]">
          {error}
        </div>
      ) : null}

      <div className="settings-layout">
        <nav className="settings-nav" aria-label="워크스페이스 설정 탭">
          {SETTINGS_TAB_NAV.map((section) => (
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
            />
          ) : null}
          {activeTab === "workhours" ? (
            <WorkHoursTab settings={settings} onSave={setSettings} onError={setError} />
          ) : null}
          {activeTab === "attendance" ? (
            <AttendanceTab
              settings={settings}
              members={members}
              onSave={setSettings}
              onError={setError}
            />
          ) : null}
          {activeTab === "notifications" ? (
            <NotificationsTab settings={settings} onSave={setSettings} onError={setError} />
          ) : null}
          {activeTab === "danger" ? (
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
