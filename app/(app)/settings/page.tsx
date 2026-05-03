import {
  getInviteLinks,
  getWorkspaceMembers,
  getWorkspaceSettings,
  requireWorkspaceMember,
} from "./data";
import { SettingsPageClient } from "./SettingsPageClient";

export default async function SettingsPage() {
  const { workspace, member, session } = await requireWorkspaceMember();

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
      userRole={member.role}
      currentUserId={session.user.id}
    />
  );
}
