'use client';

import { useState } from 'react';
import type { WorkspaceMember } from '@/lib/types';
import { createIssueAction } from '@/lib/actions/issues';
import { Modal } from '@/components/ui/Modal';
import { MentionTextarea } from '@/components/ui/MentionTextarea';
import { FormError, SubmitButton } from '@/components/ui/FormParts';
import { useToast } from '@/context/ToastContext';

export interface SprintOption {
  id: string;
  label: string;
}

export function CreateIssueModal({
  projectId,
  workspaceId,
  revalidateBasePath,
  members,
  sprintOptions,
  defaultSprintId = '',
  triggerLabel = 'New issue',
}: {
  projectId: string;
  workspaceId: string;
  revalidateBasePath: string;
  members: WorkspaceMember[];
  // Empty id ('') always means "Backlog, no sprint" - an issue is never
  // required to have one. Omit this prop entirely to hide the control (a
  // plain "New issue" button that always creates into the Backlog).
  sprintOptions?: SprintOption[];
  defaultSprintId?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const toast = useToast();

  // Same fix as CreateSprintForm/CommentForm/etc: call the action directly
  // and toast on its resolution instead of watching useActionState's
  // `state` via an effect, so there is nothing for Next's client-side
  // Router Cache to replay on a later, unrelated visit to this page.
  async function action(formData: FormData) {
    setError(undefined);
    const result = await createIssueAction(projectId, revalidateBasePath, {}, formData);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setOpen(false);
    toast.success('Issue created.');
  }

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        {triggerLabel}
      </button>
      {open && (
        <Modal title="New issue" onClose={() => setOpen(false)}>
          <form action={action} className="flex flex-col gap-3">
            <FormError message={error} />
            <label className="flex flex-col gap-1 text-sm">
              Title
              <input name="title" required autoFocus className="field-input" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Description (optional)
              <MentionTextarea
                name="description"
                workspaceId={workspaceId}
                rows={3}
                placeholder="Type @ to mention someone"
              />
            </label>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1 text-sm">
                Priority
                <select name="priority" defaultValue="MEDIUM" className="field-input">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm">
                Assignee
                <select name="assigneeId" defaultValue="" className="field-input">
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex w-28 flex-col gap-1 text-sm">
                Points
                <input
                  name="storyPoints"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="—"
                  className="field-input"
                />
              </label>
            </div>
            {sprintOptions && sprintOptions.length > 0 && (
              <label className="flex flex-col gap-1 text-sm">
                Sprint
                <select name="sprintId" defaultValue={defaultSprintId} className="field-input">
                  {sprintOptions.map((opt) => (
                    <option key={opt.id || 'backlog'} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <SubmitButton>Create issue</SubmitButton>
          </form>
        </Modal>
      )}
    </>
  );
}
