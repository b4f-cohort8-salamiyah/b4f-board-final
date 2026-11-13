import Link from 'next/link';
import * as workspacesApi from '@/lib/api/workspaces';
import { requireSessionToken } from '@/lib/session';
import { RoleBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import { CreateWorkspaceForm } from './CreateWorkspaceForm';

export default async function WorkspacesPage() {
  const token = await requireSessionToken();
  const workspaces = await workspacesApi.listWorkspaces(token);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Your workspaces</h1>
      </div>

      {workspaces.length === 0 ? (
        <EmptyState
          title="You're not in any workspaces yet."
          hint="Create one to get started."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {workspaces.map((w) => (
            <Link key={w.id} href={`/workspaces/${w.id}`} className="card p-4 hover:shadow-md">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-medium">{w.name}</h2>
                <RoleBadge role={w.myRole} />
              </div>
              <p className="text-xs text-gray-500">
                {w._count?.projects ?? 0} project{w._count?.projects === 1 ? '' : 's'} ·{' '}
                {w._count?.members ?? 0} member{w._count?.members === 1 ? '' : 's'}
              </p>
            </Link>
          ))}
        </div>
      )}

      <CreateWorkspaceForm />
    </div>
  );
}
