'use client';

import { useDroppable } from '@dnd-kit/core';
import type { IssueStatus } from '@/lib/types';
import { IssueCard, type BoardIssue } from './IssueCard';

const LABELS: Record<IssueStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done',
};

export function BoardColumn({
  status,
  issues,
  revalidateBasePath,
}: {
  status: IssueStatus;
  // href and canChangeStatus are precomputed server-side (see board/page.tsx)
  // and carried as plain data, not callbacks - a Client Component (this one
  // needs useDroppable) can't receive a function prop from its Server
  // Component parent.
  issues: BoardIssue[];
  revalidateBasePath: string;
}) {
  // Droppable target for drag-and-drop (see DndBoard) - the column itself is
  // the drop zone, id'd by status so onDragEnd can read it directly.
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex w-72 flex-shrink-0 flex-col gap-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
        {LABELS[status]} <span className="text-gray-400">({issues.length})</span>
      </h3>
      <div
        ref={setNodeRef}
        className={`flex min-h-16 flex-col gap-2 rounded-lg p-1 transition-colors ${
          isOver ? 'bg-blue-50 dark:bg-blue-950/40' : ''
        }`}
      >
        {issues.map((issue) => (
          <IssueCard key={issue.id} issue={issue} revalidateBasePath={revalidateBasePath} />
        ))}
        {issues.length === 0 && (
          <p className="rounded-md border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400 dark:border-gray-800">
            No issues
          </p>
        )}
      </div>
    </div>
  );
}
