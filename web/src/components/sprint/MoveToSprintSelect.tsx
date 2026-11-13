'use client';

import { useTransition } from 'react';
import { moveIssueToSprintAction } from '@/lib/actions/sprints';
import type { Sprint } from '@/lib/types';
import { useToast } from '@/context/ToastContext';

export function MoveToSprintSelect({
  issueId,
  currentSprintId,
  // PLANNED and ACTIVE sprints are both valid move targets - a completed
  // sprint is never offered (its own rule, see SprintsService). "Backlog"
  // (empty value) is always offered to move something back out, regardless
  // of which sprint it's currently in.
  movableSprints,
  revalidateBasePath,
}: {
  issueId: string;
  currentSprintId: string | null;
  movableSprints: Sprint[];
  revalidateBasePath: string;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  function onChange(value: string) {
    const sprintId = value === '' ? null : value;
    const targetLabel =
      value === '' ? 'the Backlog' : movableSprints.find((s) => s.id === value)?.name ?? 'the sprint';
    startTransition(async () => {
      const result = await moveIssueToSprintAction(issueId, sprintId, revalidateBasePath);
      if (result?.error) toast.error(result.error);
      else toast.success(`Issue moved to ${targetLabel}.`);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        // Keyed on the current value so a server-driven prop change (the
        // issue actually moved) always remounts this as a fresh uncontrolled
        // <select> with the right defaultValue, instead of relying on React
        // to notice a defaultValue prop changed post-mount (it never does).
        key={currentSprintId ?? 'backlog'}
        defaultValue={currentSprintId ?? ''}
        disabled={isPending}
        className="field-input text-xs"
        aria-label="Move to sprint"
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Backlog</option>
        {movableSprints.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.status === 'ACTIVE' ? ' (active)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
