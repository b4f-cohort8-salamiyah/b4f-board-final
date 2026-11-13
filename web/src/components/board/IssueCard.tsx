'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { IssueStatus, IssueSummary } from '@/lib/types';
import { updateIssueStatusAction } from '@/lib/actions/issues';
import { Avatar } from '../ui/Avatar';
import { PriorityBadge } from '../ui/Badge';
import { useToast } from '@/context/ToastContext';

// href and canChangeStatus are precomputed server-side (board/page.tsx) and
// carried on the issue itself as plain data - see BoardColumn.tsx for why.
export type BoardIssue = IssueSummary & { href: string; canChangeStatus: boolean };

const STATUSES: { value: IssueStatus; label: string }[] = [
  { value: 'TODO', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'REVIEW', label: 'Review' },
  { value: 'DONE', label: 'Done' },
];

export function IssueCard({
  issue,
  revalidateBasePath,
}: {
  issue: BoardIssue;
  revalidateBasePath: string;
}) {
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  // Drag-and-drop is an alternative to the status <select> below, not a
  // replacement for it - the select stays as the keyboard/screen-reader-
  // accessible way to change status, and is also what a user with
  // canChangeStatus=false correctly never sees. Disabling the draggable
  // hook entirely when the user can't change status means a card that
  // can't be moved doesn't even visually pick up as draggable.
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: issue.id,
    disabled: !issue.canChangeStatus || isPending,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 10,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(issue.canChangeStatus ? { ...listeners, ...attributes } : {})}
      className={`card flex flex-col gap-2 p-3 ${issue.canChangeStatus ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <Link href={issue.href} className="text-sm font-medium hover:underline">
        <span className="text-gray-400">{issue.key}</span> {issue.title}
      </Link>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={issue.priority} />
          {issue.storyPoints != null && (
            <span
              title="Story points"
              className="rounded-full bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            >
              {issue.storyPoints}
            </span>
          )}
        </div>
        {issue.assignee ? (
          <Avatar name={issue.assignee.name} />
        ) : (
          <span className="text-xs text-gray-400">Unassigned</span>
        )}
      </div>
      {issue.canChangeStatus && (
        <select
          value={issue.status}
          disabled={isPending}
          className="field-input text-xs"
          // Drag handles and interactive form controls don't mix well under
          // dnd-kit's pointer sensor - stop the pointer event from also
          // being seen as a potential drag start on this element.
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => {
            const newStatus = e.target.value as IssueStatus;
            const label = STATUSES.find((s) => s.value === newStatus)?.label ?? newStatus;
            startTransition(async () => {
              try {
                await updateIssueStatusAction(issue.id, newStatus, revalidateBasePath);
                toast.success(`${issue.key} moved to ${label}.`);
              } catch {
                toast.error(`Could not update ${issue.key}'s status.`);
              }
            });
          }}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
