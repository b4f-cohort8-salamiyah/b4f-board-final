import type { IssuePriority, IssueStatus, SprintStatus } from '@/lib/types';

const STATUS_LABEL: Record<IssueStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done',
};

const STATUS_CLASS: Record<IssueStatus, string> = {
  TODO: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  REVIEW: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  DONE: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

const PRIORITY_LABEL: Record<IssuePriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

const PRIORITY_CLASS: Record<IssuePriority, string> = {
  LOW: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

export function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_CLASS[priority]}`}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
};

const SPRINT_STATUS_CLASS: Record<SprintStatus, string> = {
  PLANNED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  ACTIVE: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

export function SprintStatusBadge({ status }: { status: SprintStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SPRINT_STATUS_CLASS[status]}`}>
      {SPRINT_STATUS_LABEL[status]}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium capitalize text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {role.toLowerCase()}
    </span>
  );
}
