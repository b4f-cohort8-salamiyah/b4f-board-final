'use client';

import { useState } from 'react';
import type { CurrentUser } from '@/lib/types';
import { updateProfileAction } from '@/lib/actions/profile';
import { FormError, SubmitButton } from '@/components/ui/FormParts';
import { Avatar } from '@/components/ui/Avatar';
import { useToast } from '@/context/ToastContext';

// Toast-replay bug fix (same root cause/fix as the other forms in this
// pass): calling the action directly and toasting on its resolution, not
// via an effect watching useActionState's `state`, removes the possibility
// of Next's client-side Router Cache replaying an old success on a later,
// unrelated page visit.
export function ProfileForm({
  user,
  workspaceCount,
  openIssueCount,
}: {
  user: CurrentUser;
  workspaceCount: number;
  openIssueCount: number;
}) {
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const toast = useToast();

  async function action(formData: FormData) {
    setError(undefined);
    const newPassword = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');
    if (newPassword && newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setPending(true);
    const result = await updateProfileAction({}, formData);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    toast.success('Profile updated.');
  }

  return (
    <form action={action} className="card flex max-w-sm flex-col gap-4 p-5">
      <div className="flex items-center gap-3">
        <Avatar name={user.name} size="md" />
        <div className="min-w-0">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {workspaceCount} workspace{workspaceCount === 1 ? '' : 's'} · {openIssueCount} open issue
        {openIssueCount === 1 ? '' : 's'} assigned to you
      </p>

      <FormError message={error} />

      <label className="flex flex-col gap-1 text-sm">
        Email
        <input value={user.email} disabled className="field-input opacity-60" />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Display name
        <input name="name" defaultValue={user.name} className="field-input" />
      </label>

      <div className="flex flex-col gap-3 border-t border-gray-200 pt-3 dark:border-gray-800">
        <h2 className="text-xs font-semibold uppercase text-gray-400">Security</h2>
        <label className="flex flex-col gap-1 text-sm">
          Current password
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            className="field-input"
          />
          <span className="text-xs text-gray-400">
            Only required if you&apos;re setting a new password.
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          New password (optional)
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            className="field-input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Confirm new password
          <input
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            className="field-input"
          />
        </label>
      </div>

      <SubmitButton disabled={pending}>Save</SubmitButton>
    </form>
  );
}
