'use client';

import { useActionState } from 'react';
import { createProjectAction, type FormState } from '@/lib/actions/projects';
import { FormError, SubmitButton } from '@/components/ui/FormParts';

const initialState: FormState = {};

export function CreateProjectForm({ workspaceId }: { workspaceId: string }) {
  const action = createProjectAction.bind(null, workspaceId);
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card flex flex-col gap-3 p-4 sm:max-w-sm">
      <FormError message={state.error} />
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input name="name" required className="field-input" placeholder="Website" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Key
        <input
          name="key"
          required
          pattern="[A-Za-z][A-Za-z0-9]{1,9}"
          className="field-input uppercase"
          placeholder="WEB"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Description (optional)
        <textarea name="description" className="field-input" rows={2} />
      </label>
      <SubmitButton>Create project</SubmitButton>
    </form>
  );
}
