'use client';

import { useState, useTransition } from 'react';
import type { WorkspaceMember, WorkspaceRole } from '@/lib/types';
import { removeMemberAction, updateMemberRoleAction } from '@/lib/actions/workspaces';
import { Avatar } from '@/components/ui/Avatar';
import { RoleBadge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/context/ToastContext';

export function MembersList({
  workspaceId,
  members,
  myRole,
  myUserId,
}: {
  workspaceId: string;
  members: WorkspaceMember[];
  myRole: WorkspaceRole;
  myUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [removing, setRemoving] = useState<WorkspaceMember | null>(null);
  const toast = useToast();
  const isOwner = myRole === 'OWNER';
  const isAdmin = myRole === 'ADMIN';

  const canChangeRole = (target: WorkspaceMember) => isOwner && target.role !== 'OWNER';
  const canRemove = (target: WorkspaceMember) => {
    if (target.role === 'OWNER') return false;
    if (target.role === 'ADMIN') return isOwner;
    return isOwner || isAdmin;
  };

  function changeRole(member: WorkspaceMember, role: 'ADMIN' | 'MEMBER') {
    startTransition(async () => {
      const result = await updateMemberRoleAction(workspaceId, member.userId, role);
      if (result?.error) toast.error(result.error);
      else toast.success(`${member.user.name}'s role changed to ${role === 'ADMIN' ? 'Admin' : 'Member'}.`);
    });
  }

  function confirmRemove() {
    if (!removing) return;
    const target = removing;
    startTransition(async () => {
      const result = await removeMemberAction(workspaceId, target.userId);
      if (result?.error) toast.error(result.error);
      else toast.success(`${target.user.name} removed from the workspace.`);
      setRemoving(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="card divide-y divide-gray-100 dark:divide-gray-800">
        {members.map((m) => (
          <li key={m.id} className="flex items-center gap-3 p-3">
            <Avatar name={m.user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.user.name} {m.userId === myUserId && <span className="text-gray-400">(you)</span>}
              </p>
              <p className="truncate text-xs text-gray-500">{m.user.email}</p>
            </div>

            {canChangeRole(m) ? (
              <select
                defaultValue={m.role}
                disabled={isPending}
                className="field-input w-32"
                onChange={(e) => changeRole(m, e.target.value as 'ADMIN' | 'MEMBER')}
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
              </select>
            ) : (
              <RoleBadge role={m.role} />
            )}

            {canRemove(m) && (
              <button
                type="button"
                disabled={isPending}
                className="btn-danger"
                onClick={() => setRemoving(m)}
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={removing !== null}
        title="Remove member"
        description={
          removing && (
            <>
              Remove <strong>{removing.user.name}</strong> ({removing.user.email}) from this
              workspace? They will lose access to every project and issue here immediately.
            </>
          )
        }
        confirmLabel="Remove"
        pending={isPending}
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}
