import * as authApi from '@/lib/api/auth';
import * as usersApi from '@/lib/api/users';
import * as workspacesApi from '@/lib/api/workspaces';
import { requireSessionToken } from '@/lib/session';
import { ProfileForm } from './ProfileForm';

export default async function ProfilePage() {
  const token = await requireSessionToken();
  // Reuses the same low-cost endpoints the Dashboard already calls - no new
  // backend surface needed for this account-summary line.
  const [user, workspaces, myIssues] = await Promise.all([
    authApi.me(token),
    workspacesApi.listWorkspaces(token),
    usersApi.myIssues(token),
  ]);
  const openIssueCount = myIssues.filter((i) => i.status !== 'DONE').length;

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Your profile</h1>
      <ProfileForm user={user} workspaceCount={workspaces.length} openIssueCount={openIssueCount} />
    </div>
  );
}
