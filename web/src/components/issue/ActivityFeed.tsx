import type { ActivityEntry } from '@/lib/types';
import { EmptyState } from '../ui/States';

function describe(entry: ActivityEntry) {
  const actor = entry.actor?.name ?? 'Someone';
  switch (entry.action) {
    case 'ISSUE_CREATED':
      return `${actor} created this issue`;
    case 'STATUS_CHANGED': {
      const meta = entry.metadata as { from?: string; to?: string } | null;
      return `${actor} moved this from ${meta?.from ?? '?'} to ${meta?.to ?? '?'}`;
    }
    case 'ASSIGNED':
      return `${actor} changed the assignee`;
    case 'COMMENTED':
      return `${actor} commented`;
    case 'ISSUE_UPDATED':
      return `${actor} updated this issue`;
    default:
      return `${actor} did something`;
  }
}

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState title="No activity yet." />;
  }
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {entries.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-2 text-gray-600 dark:text-gray-400">
          <span>{describe(e)}</span>
          <time className="flex-shrink-0 text-xs text-gray-400">
            {new Date(e.createdAt).toLocaleString()}
          </time>
        </li>
      ))}
    </ul>
  );
}
