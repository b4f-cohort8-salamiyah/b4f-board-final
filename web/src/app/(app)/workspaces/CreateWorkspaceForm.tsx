'use client';

import { useActionState, useState } from 'react';
import { createWorkspaceAction, type FormState } from '@/lib/actions/workspaces';
import { FormError, SubmitButton } from '@/components/ui/FormParts';

const initialState: FormState = {};

export function CreateWorkspaceForm() {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createWorkspaceAction, initialState);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        New workspace
      </button>
    );
  }

  return (
    <form action={formAction} className="card flex flex-col gap-3 p-4">
      <FormError message={state.error} />
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input name="name" required className="field-input" placeholder="Marketing Site Revamp" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Slug
        <input
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          className="field-input"
          placeholder="marketing-site-revamp"
        />
      </label>
      <div className="flex gap-2">
        <SubmitButton>Create</SubmitButton>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
