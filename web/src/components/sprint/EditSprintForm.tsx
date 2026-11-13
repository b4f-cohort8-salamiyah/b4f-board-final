'use client';

import { useState } from 'react';
import { updateSprintAction } from '@/lib/actions/sprints';
import { FormError, SubmitButton } from '../ui/FormParts';
import { useToast } from '@/context/ToastContext';
import type { Sprint } from '@/lib/types';

function toDateInputValue(iso: string | null) {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function EditSprintForm({
  sprint,
  revalidateBasePath,
}: {
  sprint: Sprint;
  revalidateBasePath: string;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const toast = useToast();

  if (!editing) {
    return (
      <button type="button" className="btn-secondary" onClick={() => setEditing(true)}>
        Edit sprint
      </button>
    );
  }

  // Same fix as CreateSprintForm/CommentForm/etc: call the action directly
  // and toast on its resolution instead of watching useActionState's
  // `state` via an effect, so there is nothing for Next's client-side
  // Router Cache to replay on a later, unrelated visit to this page.
  async function action(formData: FormData) {
    setError(undefined);
    const result = await updateSprintAction(sprint.id, revalidateBasePath, {}, formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setEditing(false);
    toast.success('Sprint updated.');
  }

  return (
    <form action={action} className="card flex flex-col gap-3 p-4">
      <FormError message={error} />
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input name="name" required defaultValue={sprint.name} className="field-input" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Goal
        <textarea name="goal" defaultValue={sprint.goal ?? ''} className="field-input" rows={2} />
      </label>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Start date
          <input
            type="date"
            name="startDate"
            defaultValue={toDateInputValue(sprint.startDate)}
            className="field-input"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          End date
          <input
            type="date"
            name="endDate"
            defaultValue={toDateInputValue(sprint.endDate)}
            className="field-input"
          />
        </label>
      </div>
      <div className="flex gap-2">
        <SubmitButton>Save</SubmitButton>
        <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
