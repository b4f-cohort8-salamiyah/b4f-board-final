'use client';

import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { updateIssueStatusAction } from '@/lib/actions/issues';
import type { IssueStatus } from '@/lib/types';
import { BoardColumn } from './BoardColumn';
import type { BoardIssue } from './IssueCard';
import { useToast } from '@/context/ToastContext';

const STATUS_LABEL: Record<IssueStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done',
};

const STATUSES: IssueStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

export function DndBoard({
  issues: serverIssues,
  revalidateBasePath,
}: {
  issues: BoardIssue[];
  revalidateBasePath: string;
}) {
  // Local optimistic copy - moved immediately on drop, rolled back if the
  // PATCH fails. Re-synced whenever the server gives us a fresh list (a
  // filter changed, or revalidation refreshed the page).
  const [issues, setIssues] = useState(serverIssues);
  useEffect(() => setIssues(serverIssues), [serverIssues]);
  const toast = useToast();

  // A small activation distance lets a plain click on the card's link or
  // status <select> behave as a normal click, not a drag start - dragging
  // only begins once the pointer actually moves. See useDraggable's
  // onPointerDown-stopPropagation in IssueCard for the select specifically.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const issueId = String(active.id);
    const newStatus = over.id as IssueStatus;
    const issue = issues.find((i) => i.id === issueId);
    if (!issue || issue.status === newStatus) return;
    // Belt-and-braces: IssueCard already disables dragging when
    // canChangeStatus is false, but the real authorization boundary is the
    // PATCH endpoint itself (see IssuesService.requireCanMutate) - this
    // check only avoids an optimistic UI flash for a request we already
    // know will be rejected.
    if (!issue.canChangeStatus) return;

    const previousIssues = issues;
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i)));

    updateIssueStatusAction(issueId, newStatus, revalidateBasePath)
      .then(() => toast.success(`${issue.key} moved to ${STATUS_LABEL[newStatus]}.`))
      .catch(() => {
        setIssues(previousIssues);
        toast.error(`Could not update ${issue.key}'s status.`);
      });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto px-6 pb-6">
        {STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            issues={issues.filter((i) => i.status === status)}
            revalidateBasePath={revalidateBasePath}
          />
        ))}
      </div>
    </DndContext>
  );
}
