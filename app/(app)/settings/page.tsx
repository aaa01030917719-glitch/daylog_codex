import { getInviteLinks, getWorkspaceMembers, getWorkspaceSettings, requireOwner } from "./data";
import { SettingsPageClient } from "./SettingsPageClient";

export default async function SettingsPage() {
  const { workspace } = await requireOwner();

  const [settings, members, inviteLinks] = await Promise.all([
    getWorkspaceSettings(workspace.id),
    getWorkspaceMembers(workspace.id),
    getInviteLinks(workspace.id),
  ]);

  return (
    <SettingsPageClient
      initialSettings={settings}
      initialMembers={members}
      initialInviteLinks={inviteLinks}
    />
  );
}
