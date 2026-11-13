'use client';

import { useState } from 'react';
import { createSprintAction } from '@/lib/actions/sprints';
import { FormError, SubmitButton } from '../ui/FormParts';
import { useToast } from '@/context/ToastContext';

// Toast-replay bug fix: this used to be useActionState + a useEffect that
// fired toast.success() whenever `state` changed (guarded by a `mounted`
// ref). That looked safe in isolation, but Next's client-side Router Cache
// can keep this component's fiber alive across a navigation away and back,
// and re-deliver a `state` object that looks "new" (a fresh reference) even
// though it represents the SAME earlier success - the effect then re-fires
// on a page visit that has nothing to do with a new submission. Calling the
// action directly here and toasting immediately on its resolution means
// there is no persisted "state" for any later render to replay - the toast
// fires exactly once, synchronously tied to this one real submission.
export function CreateSprintForm({
  projectId,
  revalidateBasePath,
}: {
  projectId: string;
  revalidateBasePath: string;
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function action(formData: FormData) {
    setError(undefined);
    setPending(true);
    const result = await createSprintAction(projectId, revalidateBasePath, {}, formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    toast.success('Sprint created.');
  }

  return (
    <form action={action} className="card flex flex-col gap-3 p-4 sm:max-w-sm">
      <FormError message={error} />
      <label className="flex flex-col gap-1 text-sm">
        Name
        <input name="name" required className="field-input" placeholder="Sprint 1" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Goal (optional)
        <textarea name="goal" className="field-input" rows={2} />
      </label>
      <SubmitButton disabled={pending}>Create sprint</SubmitButton>
    </form>
  );
}
