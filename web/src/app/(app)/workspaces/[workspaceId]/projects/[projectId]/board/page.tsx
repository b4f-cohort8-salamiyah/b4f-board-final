import Link from 'next/link';
import * as authApi from '@/lib/api/auth';
import * as issuesApi from '@/lib/api/issues';
import * as sprintsApi from '@/lib/api/sprints';
import * as workspacesApi from '@/lib/api/workspaces';
import { requireSessionToken } from '@/lib/session';
import { DndBoard } from '@/components/board/DndBoard';
import type { BoardIssue } from '@/components/board/IssueCard';
import { EmptyState } from '@/components/ui/States';
import { SprintStatusBadge } from '@/components/ui/Badge';
import { SprintPointsSummary } from '@/components/sprint/SprintPointsSummary';
import type { IssuePriority, IssueStatus } from '@/lib/types';
import { CreateIssueModal, type SprintOption } from './CreateIssueModal';
import { FilterBar } from './FilterBar';

export default async function BoardPage(props: {
  params: Promise<{ workspaceId: string; projectId: string }>;
  searchParams: Promise<{
    status?: IssueStatus;
    priority?: IssuePriority;
    assignee?: string;
    q?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const token = await requireSessionToken();
  const [sprints, members, workspace, me] = await Promise.all([
    sprintsApi.listSprints(token, params.projectId),
    workspacesApi.listMembers(token, params.workspaceId),
    workspacesApi.getWorkspace(token, params.workspaceId),
    authApi.me(token),
  ]);

  const isAdminOrOwner = workspace.myRole === 'OWNER' || workspace.myRole === 'ADMIN';
  const basePath = `/workspaces/${params.workspaceId}/projects/${params.projectId}`;
  // The Board always represents the active sprint, if one exists - see
  // specification decision recorded alongside the Phase C sprint work.
  // Without an active sprint there is nothing for status columns to show;
  // sending the user to the Backlog (where a sprint is created/started) is
  // more useful than an empty, context-free board.
  const activeSprint = sprints.find((s) => s.status === 'ACTIVE');

  if (!activeSprint) {
    return (
      <div className="p-6">
        <EmptyState
          title="No active sprint right now."
          hint="Start a sprint from the Backlog to see its issues here."
        />
        <div className="mt-4 text-center">
          <Link href={`${basePath}/backlog`} className="text-sm text-blue-600 hover:underline">
            Go to Backlog →
          </Link>
        </div>
      </div>
    );
  }

  const issues = await issuesApi.listIssues(token, params.projectId, {
    ...searchParams,
    sprintId: activeSprint.id,
  });
  // Precomputed here, server-side, as plain data - DndBoard/BoardColumn are
  // Client Components (useDroppable/useDraggable need the browser) and
  // can't receive these as callback props from a Server Component.
  const boardIssues: BoardIssue[] = issues.map((issue) => ({
    ...issue,
    href: `${basePath}/issues/${issue.id}`,
    canChangeStatus: isAdminOrOwner || issue.assigneeId === me.id || issue.reporterId === me.id,
  }));

  const sprintOptions: SprintOption[] = [
    { id: activeSprint.id, label: `Active Sprint (${activeSprint.name})` },
    { id: '', label: 'Backlog' },
  ];

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 pt-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={`${basePath}/sprints/${activeSprint.id}`}
              className="text-sm font-semibold hover:underline"
            >
              {activeSprint.name}
            </Link>
            <SprintStatusBadge status={activeSprint.status} />
          </div>
          {activeSprint.goal && <p className="text-xs text-gray-500">{activeSprint.goal}</p>}
          {activeSprint.points && (
            <div className="mt-1">
              <SprintPointsSummary points={activeSprint.points} />
            </div>
          )}
        </div>
        <Link href={`${basePath}/backlog`} className="text-xs text-blue-600 hover:underline">
          Backlog
        </Link>
      </div>
      <FilterBar members={members} />
      <div className="flex items-center justify-between px-6 py-3">
        <p className="text-sm text-gray-500">{issues.length} issue(s) match your filters</p>
        <CreateIssueModal
          projectId={params.projectId}
          workspaceId={params.workspaceId}
          revalidateBasePath={`${basePath}/board`}
          members={members}
          sprintOptions={sprintOptions}
          defaultSprintId={activeSprint.id}
        />
      </div>
      <DndBoard issues={boardIssues} revalidateBasePath={`${basePath}/board`} />
    </div>
  );
}
