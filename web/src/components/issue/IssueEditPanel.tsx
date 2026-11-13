'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { IssueDetail, IssuePriority, IssueStatus, WorkspaceMember } from '@/lib/types';
import { deleteIssueAction, updateIssueAction } from '@/lib/actions/issues';
import { PriorityBadge, StatusBadge } from '../ui/Badge';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { MentionText } from '../ui/MentionText';
import { MentionTextarea } from '../ui/MentionTextarea';
import { useToast } from '@/context/ToastContext';

const STATUSES: IssueStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const PRIORITIES: IssuePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function IssueEditPanel({
  issue,
  members,
  canMutate,
  workspaceId,
  revalidateBasePath,
  boardPath,
}: {
  issue: IssueDetail;
  members: WorkspaceMember[];
  canMutate: boolean;
  workspaceId: string;
  revalidateBasePath: string;
  boardPath: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const toast = useToast();

  function saveDescription(formData: FormData) {
    const description = String(formData.get('description') ?? '');
    startTransition(async () => {
      await updateIssueAction(issue.id, revalidateBasePath, { description });
      toast.success('Description updated.');
      setEditingDescription(false);
    });
  }

  const descriptionBlock = canMutate ? (
    editingDescription ? (
      <form
        action={saveDescription}
        className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-800"
      >
        <MentionTextarea
          name="description"
          workspaceId={workspaceId}
          rows={4}
          defaultValue={issue.description ?? ''}
          placeholder="Describe the issue… (type @ to mention someone)"
        />
        <div className="flex gap-2">
          <button type="submit" disabled={isPending} className="btn-primary">
            Save
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setEditingDescription(false)}
          >
            Cancel
          </button>
        </div>
      </form>
    ) : (
      <div className="group flex items-start justify-between gap-2">
        {issue.description ? (
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
            <MentionText text={issue.description} />
          </p>
        ) : (
          <p className="text-sm italic text-gray-400">No description yet.</p>
        )}
        <button
          type="button"
          className="flex-shrink-0 text-xs text-blue-600 hover:underline"
          onClick={() => setEditingDescription(true)}
        >
          Edit
        </button>
      </div>
    )
  ) : issue.description ? (
    <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
      <MentionText text={issue.description} />
    </p>
  ) : null;

  if (!canMutate) {
    return (
      <div className="flex flex-col gap-3">
        {descriptionBlock}
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={issue.status} />
          <PriorityBadge priority={issue.priority} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {descriptionBlock}
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Status
          <select
            defaultValue={issue.status}
            disabled={isPending}
            className="field-input"
            onChange={(e) => {
              const status = e.target.value as IssueStatus;
              startTransition(async () => {
                await updateIssueAction(issue.id, revalidateBasePath, { status });
                toast.success('Status updated.');
              });
            }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Priority
          <select
            defaultValue={issue.priority}
            disabled={isPending}
            className="field-input"
            onChange={(e) => {
              const priority = e.target.value as IssuePriority;
              startTransition(async () => {
                await updateIssueAction(issue.id, revalidateBasePath, { priority });
                toast.success('Priority updated.');
              });
            }}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-500">
          Assignee
          <select
            defaultValue={issue.assigneeId ?? ''}
            disabled={isPending}
            className="field-input"
            onChange={(e) => {
              const assigneeId = e.target.value || null;
              startTransition(async () => {
                await updateIssueAction(issue.id, revalidateBasePath, { assigneeId });
                toast.success('Assignee updated.');
              });
            }}
          >
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex w-24 flex-col gap-1 text-xs text-gray-500">
          Points
          <input
            type="number"
            min={0}
            step={1}
            defaultValue={issue.storyPoints ?? ''}
            disabled={isPending}
            placeholder="—"
            className="field-input"
            onBlur={(e) => {
              const raw = e.target.value.trim();
              const value = raw === '' ? null : Number(raw);
              if (value === issue.storyPoints) return;
              if (value !== null && (!Number.isInteger(value) || value < 0)) return;
              startTransition(async () => {
                await updateIssueAction(issue.id, revalidateBasePath, { storyPoints: value });
                toast.success('Story points updated.');
              });
            }}
          />
        </label>
      </div>

      <button
        type="button"
        className="w-fit text-xs text-red-600 hover:underline"
        onClick={() => setConfirmingDelete(true)}
      >
        Delete issue
      </button>
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete issue"
        description="Delete this issue permanently? This can't be undone."
        confirmLabel="Delete"
        pending={isPending}
        onConfirm={() =>
          startTransition(async () => {
            await deleteIssueAction(issue.id, revalidateBasePath);
            toast.success(`${issue.key} deleted.`);
            router.push(boardPath);
          })
        }
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
