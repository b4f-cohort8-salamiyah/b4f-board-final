import Link from 'next/link';
import * as issuesApi from '@/lib/api/issues';
import * as sprintsApi from '@/lib/api/sprints';
import * as workspacesApi from '@/lib/api/workspaces';
import { requireSessionToken } from '@/lib/session';
import { CreateSprintForm } from '@/components/sprint/CreateSprintForm';
import { SprintLifecycleControls } from '@/components/sprint/SprintLifecycleControls';
import { SprintPointsSummary } from '@/components/sprint/SprintPointsSummary';
import { MoveToSprintSelect } from '@/components/sprint/MoveToSprintSelect';
import { SprintStatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import type { Sprint } from '@/lib/types';
import { CreateIssueModal, type SprintOption } from '../board/CreateIssueModal';

export default async function BacklogPage(props: {
  params: Promise<{ workspaceId: string; projectId: string }>;
}) {
  const { workspaceId, projectId } = await props.params;
  const token = await requireSessionToken();
  const basePath = `/workspaces/${workspaceId}/projects/${projectId}`;

  const [sprints, backlogIssues, members, workspace] = await Promise.all([
    sprintsApi.listSprints(token, projectId),
    issuesApi.listIssues(token, projectId, { backlog: 'true' }),
    workspacesApi.listMembers(token, workspaceId),
    workspacesApi.getWorkspace(token, workspaceId),
  ]);

  const isAdminOrOwner = workspace.myRole === 'OWNER' || workspace.myRole === 'ADMIN';
  const activeSprint = sprints.find((s) => s.status === 'ACTIVE');
  const plannedSprints = sprints.filter((s) => s.status === 'PLANNED');
  const completedSprints = sprints.filter((s) => s.status === 'COMPLETED');
  // Valid move targets for any issue on this page, regardless of where it
  // currently sits - a completed sprint is never a target (see
  // SprintsService's documented rules).
  const movableSprints = [...(activeSprint ? [activeSprint] : []), ...plannedSprints];

  // Issue creation never requires a sprint to exist - "Backlog" (no sprint)
  // is always offered and is the default here, since this is the Backlog
  // page; an active/planned sprint can be explicitly chosen instead.
  const createIssueSprintOptions: SprintOption[] = [
    { id: '', label: 'Backlog' },
    ...(activeSprint
      ? [{ id: activeSprint.id, label: `Active Sprint (${activeSprint.name})` }]
      : []),
    ...plannedSprints.map((s) => ({ id: s.id, label: s.name })),
  ];

  const plannedWithIssues = await Promise.all(
    plannedSprints.map(async (sprint) => ({
      sprint,
      issues: await issuesApi.listIssues(token, projectId, { sprintId: sprint.id }),
    })),
  );

  function SprintSection({ sprint, issues }: { sprint: Sprint; issues: typeof backlogIssues }) {
    return (
      <div key={sprint.id} className="card flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href={`${basePath}/sprints/${sprint.id}`}
                className="font-medium hover:underline"
              >
                {sprint.name}
              </Link>
              <SprintStatusBadge status={sprint.status} />
            </div>
            {sprint.goal && <p className="text-sm text-gray-500">{sprint.goal}</p>}
          </div>
          <SprintLifecycleControls
            sprintId={sprint.id}
            status={sprint.status}
            canManage={isAdminOrOwner}
            revalidateBasePath={`${basePath}/backlog`}
          />
        </div>
        {sprint.points && <SprintPointsSummary points={sprint.points} />}
        {issues.length === 0 ? (
          <p className="text-xs text-gray-400">No issues in this sprint yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <a
                  href={`${basePath}/issues/${issue.id}`}
                  className="min-w-0 flex-1 truncate hover:underline"
                >
                  <span className="text-gray-400">{issue.key}</span> {issue.title}
                  {issue.storyPoints != null && (
                    <span className="ml-2 text-xs text-gray-400">({issue.storyPoints} pts)</span>
                  )}
                </a>
                <MoveToSprintSelect
                  issueId={issue.id}
                  currentSprintId={issue.sprintId}
                  movableSprints={movableSprints}
                  revalidateBasePath={`${basePath}/backlog`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Backlog</h1>
        <div className="flex gap-2">
          <CreateIssueModal
            projectId={projectId}
            workspaceId={workspaceId}
            revalidateBasePath={`${basePath}/backlog`}
            members={members}
            sprintOptions={createIssueSprintOptions}
            defaultSprintId=""
          />
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">Active sprint</h2>
        {activeSprint ? (
          <SprintSection
            sprint={activeSprint}
            issues={await issuesApi.listIssues(token, projectId, { sprintId: activeSprint.id })}
          />
        ) : (
          <EmptyState
            title="No active sprint right now."
            hint={
              plannedSprints.length > 0
                ? 'Start one of the planned sprints below to populate the board.'
                : 'Create a sprint below, then start it to populate the board.'
            }
          />
        )}
      </section>

      {plannedWithIssues.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">Planned sprints</h2>
          <div className="flex flex-col gap-3">
            {plannedWithIssues.map(({ sprint, issues }) => (
              <SprintSection key={sprint.id} sprint={sprint} issues={issues} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">
          Backlog ({backlogIssues.length})
        </h2>
        {backlogIssues.length === 0 ? (
          <EmptyState title="The backlog is empty." hint="New issues with no sprint land here." />
        ) : (
          <ul className="card divide-y divide-gray-100 dark:divide-gray-800">
            {backlogIssues.map((issue) => (
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
                {movableSprints.length > 0 ? (
                  <MoveToSprintSelect
                    issueId={issue.id}
                    currentSprintId={null}
                    movableSprints={movableSprints}
                    revalidateBasePath={`${basePath}/backlog`}
                  />
                ) : (
                  <span className="text-xs text-gray-400">Create a sprint to plan this in</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdminOrOwner && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">New sprint</h2>
          <CreateSprintForm projectId={projectId} revalidateBasePath={`${basePath}/backlog`} />
        </section>
      )}

      {completedSprints.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">Completed sprints</h2>
          <ul className="flex flex-col gap-2">
            {completedSprints.map((sprint) => (
              <li
                key={sprint.id}
                className="card flex items-center justify-between gap-2 p-3 text-sm"
              >
                <Link href={`${basePath}/sprints/${sprint.id}`} className="hover:underline">
                  {sprint.name}
                </Link>
                {sprint.points && <SprintPointsSummary points={sprint.points} />}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
