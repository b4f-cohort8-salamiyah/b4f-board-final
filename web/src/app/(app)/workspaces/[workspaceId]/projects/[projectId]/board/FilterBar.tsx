'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import type { WorkspaceMember } from '@/lib/types';

// Filters live in the URL, per
// ../../../../../../../projects/b4f-board/specification/FRONTEND-ARCHITECTURE.md,
// "Frontend state ownership" - shareable/bookmarkable, no client state
// duplicating what the URL already represents.
export function FilterBar({ members }: { members: WorkspaceMember[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-6 py-3 dark:border-gray-800">
      <input
        type="search"
        placeholder="Search title or key…"
        defaultValue={searchParams.get('q') ?? ''}
        onChange={(e) => setParam('q', e.target.value)}
        className="field-input w-48"
      />
      <select
        defaultValue={searchParams.get('priority') ?? ''}
        onChange={(e) => setParam('priority', e.target.value)}
        className="field-input w-36"
      >
        <option value="">All priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="URGENT">Urgent</option>
      </select>
      <select
        defaultValue={searchParams.get('assignee') ?? ''}
        onChange={(e) => setParam('assignee', e.target.value)}
        className="field-input w-44"
      >
        <option value="">All assignees</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.user.name}
          </option>
        ))}
      </select>
    </div>
  );
}
