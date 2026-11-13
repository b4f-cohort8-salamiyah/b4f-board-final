'use client';

import { useState } from 'react';
import { addMemberAction } from '@/lib/actions/workspaces';
import { FormError, SubmitButton } from '@/components/ui/FormParts';
import { UserPicker } from '@/components/ui/UserPicker';
import { useToast } from '@/context/ToastContext';
import type { UserSearchResult } from '@/lib/types';

// Toast-replay bug fix (same root cause as CreateSprintForm/CommentForm):
// calling the action directly and toasting on its resolution, instead of
// watching useActionState's `state` via an effect, means there is nothing
// left for Next's client-side Router Cache to "replay" on an unrelated
// later visit to this page.
export function AddMemberForm({ workspaceId }: { workspaceId: string }) {
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<UserSearchResult | null>(null);
  const toast = useToast();

  async function action(formData: FormData) {
    if (!selected) return;
    setError(undefined);
    setPending(true);
    const result = await addMemberAction(workspaceId, {}, formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    toast.success(`${selected.name} added to the workspace.`);
    setSelected(null);
  }

  return (
    <form action={action} className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <div className="flex-1">
        {selected ? (
          <div className="field-input flex items-center justify-between gap-2">
            <span className="truncate text-sm">
              <strong>{selected.name}</strong>{' '}
              <span className="text-gray-400">{selected.email}</span>
            </span>
            <button
              type="button"
              className="flex-shrink-0 text-xs text-gray-500 hover:underline"
              onClick={() => setSelected(null)}
            >
              Change
            </button>
          </div>
        ) : (
          <UserPicker
            workspaceId={workspaceId}
            placeholder="Search teammates by name or email…"
            onSelect={setSelected}
          />
        )}
        <input type="hidden" name="email" value={selected?.email ?? ''} />
        <FormError message={error} />
      </div>
      <SubmitButton disabled={!selected || pending}>Add member</SubmitButton>
    </form>
  );
}
