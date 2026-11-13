import Link from 'next/link';
import * as projectsApi from '@/lib/api/projects';
import * as workspacesApi from '@/lib/api/workspaces';
import { requireSessionToken } from '@/lib/session';
import { EmptyState } from '@/components/ui/States';
import { CreateProjectForm } from './CreateProjectForm';

export default async function WorkspaceOverviewPage(
  props: {
    params: Promise<{ workspaceId: string }>;
  }
) {
  const params = await props.params;
  const token = await requireSessionToken();
  const [workspace, projects] = await Promise.all([
    workspacesApi.getWorkspace(token, params.workspaceId),
    projectsApi.listProjects(token, params.workspaceId),
  ]);
  const canManage = workspace.myRole === 'OWNER' || workspace.myRole === 'ADMIN';

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">{workspace.name}</h1>
        <p className="text-sm text-gray-500">/{workspace.slug}</p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">Projects</h2>
        {projects.length === 0 ? (
          <EmptyState title="No projects yet." hint="Create one below to get started." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/workspaces/${workspace.id}/projects/${p.id}`}
                className="card p-4 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{p.name}</h3>
                  <span className="text-xs text-gray-400">{p.key}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {p._count?.issues ?? 0} issue{p._count?.issues === 1 ? '' : 's'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {canManage && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">New project</h2>
          <CreateProjectForm workspaceId={workspace.id} />
        </section>
      )}
    </div>
  );
}
