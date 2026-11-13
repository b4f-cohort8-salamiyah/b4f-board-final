import * as authApi from '@/lib/api/auth';
import * as workspacesApi from '@/lib/api/workspaces';
import { requireSessionToken } from '@/lib/session';
import { MembersList } from './MembersList';
import { AddMemberForm } from './AddMemberForm';

export default async function WorkspaceSettingsPage(
  props: {
    params: Promise<{ workspaceId: string }>;
  }
) {
  const params = await props.params;
  const token = await requireSessionToken();
  const [workspace, members, me] = await Promise.all([
    workspacesApi.getWorkspace(token, params.workspaceId),
    workspacesApi.listMembers(token, params.workspaceId),
    authApi.me(token),
  ]);
  const canManage = workspace.myRole === 'OWNER' || workspace.myRole === 'ADMIN';

  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="text-xl font-semibold">Members</h1>

      <MembersList
        workspaceId={workspace.id}
        members={members}
        myRole={workspace.myRole}
        myUserId={me.id}
      />

      {canManage && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">Add a member</h2>
          <p className="mb-2 text-xs text-gray-500">
            They need a B4F Board account already - this adds an existing account to the
            workspace, it doesn&apos;t create one.
          </p>
          <AddMemberForm workspaceId={workspace.id} />
        </section>
      )}
    </div>
  );
}
