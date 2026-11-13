import Link from 'next/link';
import * as usersApi from '@/lib/api/users';
import * as workspacesApi from '@/lib/api/workspaces';
import { requireSessionToken } from '@/lib/session';
import { EmptyState } from '@/components/ui/States';
import { PriorityBadge, StatusBadge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';

function describeActivity(entry: Awaited<ReturnType<typeof usersApi.myActivity>>[number]) {
  const actor = entry.actor?.name ?? 'Someone';
  const issue = entry.issue ? `${entry.issue.key} — ${entry.issue.title}` : null;
  switch (entry.action) {
    case 'ISSUE_CREATED':
      return `${actor} created ${issue}`;
    case 'STATUS_CHANGED':
      return `${actor} changed status on ${issue}`;
    case 'ASSIGNED':
      return `${actor} changed the assignee on ${issue}`;
    case 'COMMENTED':
      return `${actor} commented on ${issue}`;
    case 'ISSUE_UPDATED':
      return `${actor} updated ${issue}`;
    case 'MEMBER_ADDED':
      return `${actor} added a member to ${entry.workspace?.name}`;
    case 'MEMBER_REMOVED':
      return `${actor} removed a member from ${entry.workspace?.name}`;
    case 'MEMBER_ROLE_CHANGED':
      return `${actor} changed a member's role in ${entry.workspace?.name}`;
    default:
      return `${actor} did something`;
  }
}

export default async function DashboardPage() {
  const token = await requireSessionToken();
  const [issues, activity, workspaces] = await Promise.all([
    usersApi.myIssues(token),
    usersApi.myActivity(token),
    workspacesApi.listWorkspaces(token),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {workspaces.length} workspace{workspaces.length === 1 ? '' : 's'} —{' '}
          <Link href="/workspaces" className="text-blue-600 hover:underline">
            view all
          </Link>
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">
          Assigned to me ({issues.length})
        </h2>
        {issues.length === 0 ? (
          <EmptyState title="Nothing assigned to you right now." />
        ) : (
          <ul className="card divide-y divide-gray-100 dark:divide-gray-800">
            {issues.map((issue) => (
              <li key={issue.id} className="flex items-center justify-between gap-3 p-3">
                <Link
                  href={`/workspaces/${issue.project?.workspaceId}/projects/${issue.projectId}/issues/${issue.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-medium">
                    <span className="text-gray-400">{issue.key}</span> {issue.title}
                  </p>
                </Link>
                <PriorityBadge priority={issue.priority} />
                <StatusBadge status={issue.status} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase text-gray-500">Recent activity</h2>
        {activity.length === 0 ? (
          <EmptyState title="No recent activity yet." />
        ) : (
          <ul className="card divide-y divide-gray-100 dark:divide-gray-800">
            {activity.slice(0, 15).map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 p-3 text-sm">
                <Avatar name={entry.actor?.name ?? '?'} />
                <span className="flex-1">{describeActivity(entry)}</span>
                <time className="flex-shrink-0 text-xs text-gray-400">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
