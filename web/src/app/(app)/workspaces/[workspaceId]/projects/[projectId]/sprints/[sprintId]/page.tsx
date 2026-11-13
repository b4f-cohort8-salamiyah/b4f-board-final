import Link from 'next/link';
import * as issuesApi from '@/lib/api/issues';
import * as sprintsApi from '@/lib/api/sprints';
import * as workspacesApi from '@/lib/api/workspaces';
import { orNotFound } from '@/lib/api/client';
import { requireSessionToken } from '@/lib/session';
import { SprintStatusBadge } from '@/components/ui/Badge';
import { SprintPointsSummary } from '@/components/sprint/SprintPointsSummary';
import { SprintLifecycleControls } from '@/components/sprint/SprintLifecycleControls';
import { EditSprintForm } from '@/components/sprint/EditSprintForm';
import { MoveToSprintSelect } from '@/components/sprint/MoveToSprintSelect';
import { EmptyState } from '@/components/ui/States';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
}

export default async function SprintDetailPage(props: {
  params: Promise<{ workspaceId: string; projectId: string; sprintId: string }>;
}) {
  const { workspaceId, projectId, sprintId } = await props.params;
  const token = await requireSessionToken();
  const basePath = `/workspaces/${workspaceId}/projects/${projectId}`;

  const [sprint, issues, allSprints, workspace] = await Promise.all([
    orNotFound(sprintsApi.getSprint(token, sprintId)),
    issuesApi.listIssues(token, projectId, { sprintId }),
    sprintsApi.listSprints(token, projectId),
    workspacesApi.getWorkspace(token, workspaceId),
  ]);

  const isAdminOrOwner = workspace.myRole === 'OWNER' || workspace.myRole === 'ADMIN';
  // Includes this sprint itself so the <select> can accurately show "this is
  // where the issue currently is" as one of its real options, not just
  // defaulting to a value absent from the list.
  const movableSprints = allSprints.filter((s) => s.status !== 'COMPLETED');
  const revalidateBasePath = `${basePath}/sprints/${sprintId}`;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div>
        <Link href={`${basePath}/backlog`} className="text-xs text-gray-500 hover:underline">
          ← Backlog
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold">{sprint.name}</h1>
          <SprintStatusBadge status={sprint.status} />
        </div>
        {sprint.goal && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{sprint.goal}</p>
        )}
        <div className="mt-2 flex gap-4 text-xs text-gray-500">
          <span>Start: {formatDate(sprint.startDate)}</span>
          <span>End: {formatDate(sprint.endDate)}</span>
        </div>
      </div>

      <SprintPointsSummary points={sprint.points} />

      {isAdminOrOwner && (
        <div className="flex flex-wrap items-center gap-2">
          <SprintLifecycleControls
            sprintId={sprint.id}
            status={sprint.status}
            canManage={isAdminOrOwner}
            revalidateBasePath={revalidateBasePath}
          />
          {sprint.status === 'PLANNED' && (
            <EditSprintForm sprint={sprint} revalidateBasePath={revalidateBasePath} />
          )}
          {sprint.status === 'ACTIVE' && (
            <Link href={`${basePath}/board`} className="btn-secondary">
              Open board
            </Link>
          )}
        </div>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">
          Issues in this sprint ({issues.length})
        </h2>
        {issues.length === 0 ? (
          <EmptyState title="No issues in this sprint yet." hint="Move some in from the Backlog." />
        ) : (
          <ul className="card divide-y divide-gray-100 dark:divide-gray-800">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <a
                  href={`${basePath}/issues/${issue.id}`}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  <span className="text-gray-400">{issue.key}</span> {issue.title}
                  {issue.storyPoints != null && (
                    <span className="ml-2 text-xs text-gray-400">({issue.storyPoints} pts)</span>
                  )}
                </a>
                {sprint.status !== 'COMPLETED' && (
                  <MoveToSprintSelect
                    issueId={issue.id}
                    currentSprintId={issue.sprintId}
                    movableSprints={movableSprints}
                    revalidateBasePath={revalidateBasePath}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
