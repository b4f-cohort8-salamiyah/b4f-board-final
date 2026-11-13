'use client';

import { useState, useTransition } from 'react';
import { startSprintAction, completeSprintAction } from '@/lib/actions/sprints';
import type { SprintStatus } from '@/lib/types';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '@/context/ToastContext';

// Starting a sprint has no confirmation - it's the normal, expected
// single-click flow. Completing one does: it's forward-only and can never
// be reactivated (see SprintsService), which is exactly the "destructive/
// irreversible in the current model" case the audit asked confirmations
// for.
export function SprintLifecycleControls({
  sprintId,
  status,
  canManage,
  revalidateBasePath,
}: {
  sprintId: string;
  status: SprintStatus;
  canManage: boolean;
  revalidateBasePath: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirmingComplete, setConfirmingComplete] = useState(false);
  const toast = useToast();

  if (!canManage || status === 'COMPLETED') return null;

  function start() {
    startTransition(async () => {
      const result = await startSprintAction(sprintId, revalidateBasePath);
      if (result?.error) toast.error(result.error);
      else toast.success('Sprint started.');
    });
  }

  function complete() {
    startTransition(async () => {
      const result = await completeSprintAction(sprintId, revalidateBasePath);
      if (result?.error) toast.error(result.error);
      else toast.success('Sprint completed.');
      setConfirmingComplete(false);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {status === 'PLANNED' && (
        <button type="button" className="btn-primary" disabled={isPending} onClick={start}>
          Start sprint
        </button>
      )}
      {status === 'ACTIVE' && (
        <button
          type="button"
          className="btn-secondary"
          disabled={isPending}
          onClick={() => setConfirmingComplete(true)}
        >
          Complete sprint
        </button>
      )}
      <ConfirmDialog
        open={confirmingComplete}
        title="Complete sprint"
        description="Complete this sprint? This can't be undone - a completed sprint can never be reactivated or edited again."
        confirmLabel="Complete"
        danger={false}
        pending={isPending}
        onConfirm={complete}
        onCancel={() => setConfirmingComplete(false)}
      />
    </div>
  );
}
