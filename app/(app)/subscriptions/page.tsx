import { SubscriptionsManagementPage } from "@/components/subscriptions/SubscriptionsManagementPage";
import { getWorkspaceMembers, requireWorkspaceMember } from "../settings/data";

export default async function SubscriptionsPage() {
  const { workspace, member } = await requireWorkspaceMember();
  const members = await getWorkspaceMembers(workspace.id);

  return (
    <SubscriptionsManagementPage
      members={members}
      userRole={member.role}
      workspaceName={workspace.name}
    />
  );
}
