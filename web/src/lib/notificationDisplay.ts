import type { AppNotification, NotificationType } from './types';

// Every FK on a Notification can be null, either because it never applied
// to this type or because the row it pointed to was deleted later (see
// schema.prisma's Notification model - onDelete: SetNull everywhere except
// userId). linkFor() returns null whenever it can't build a real link,
// which both NotificationBell and the /notifications page treat as "render
// as plain, non-clickable text" - never a crash.
export function linkFor(n: AppNotification): string | null {
  switch (n.type) {
    case 'MENTION':
    case 'ISSUE_ASSIGNED':
    case 'COMMENT_ON_REPORTED_OR_ASSIGNED_ISSUE':
      if (n.workspaceId && n.projectId && n.issueId && n.issue) {
        return `/workspaces/${n.workspaceId}/projects/${n.projectId}/issues/${n.issueId}`;
      }
      return null;
    case 'SPRINT_STARTED':
    case 'SPRINT_COMPLETED':
      if (n.workspaceId && n.projectId && n.sprintId && n.sprint) {
        return `/workspaces/${n.workspaceId}/projects/${n.projectId}/sprints/${n.sprintId}`;
      }
      return null;
    case 'WORKSPACE_ROLE_CHANGED':
    case 'MEMBER_ADDED':
      if (n.workspaceId && n.workspace) {
        return `/workspaces/${n.workspaceId}`;
      }
      return null;
    default:
      return null;
  }
}

// A plain one-or-two-letter glyph per type, not an icon font/library this
// project doesn't otherwise depend on - same "no new heavy dependency for
// one small feature" reasoning as everywhere else in this codebase.
const TYPE_GLYPH: Record<NotificationType, string> = {
  MENTION: '@',
  ISSUE_ASSIGNED: '→',
  WORKSPACE_ROLE_CHANGED: '↑',
  MEMBER_ADDED: '+',
  COMMENT_ON_REPORTED_OR_ASSIGNED_ISSUE: '✎',
  SPRINT_STARTED: '▶',
  SPRINT_COMPLETED: '✓',
};

export function glyphFor(type: NotificationType): string {
  return TYPE_GLYPH[type] ?? '•';
}
