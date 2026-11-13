// Shared types mirroring backend DTOs/responses - see
// ../../../projects/b4f-board/specification/DOMAIN-MODEL.md.

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type IssueStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type SprintStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  myRole: WorkspaceRole;
  _count?: { projects: number; members: number };
}

export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
  user: { id: string; name: string; email: string };
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  createdAt: string;
  _count?: { issues: number };
}

export interface IssueSummary {
  id: string;
  projectId: string;
  key: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  assigneeId: string | null;
  reporterId: string | null;
  storyPoints: number | null;
  sprintId: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string } | null;
  reporter?: { id: string; name: string } | null;
  project?: { id: string; key: string; name: string; workspaceId: string };
  _count?: { comments: number };
}

export interface SprintPoints {
  issueCount: number;
  totalPoints: number;
  completedPoints: number;
  remainingPoints: number;
  completionPercent: number;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  points?: SprintPoints;
}

export interface SprintDetail extends Sprint {
  points: SprintPoints;
  project: { id: string; key: string; name: string; workspaceId: string };
}

export interface IssueDetail extends IssueSummary {
  description: string | null;
  project: { id: string; key: string; name: string; workspaceId: string };
}

export interface Comment {
  id: string;
  issueId: string;
  authorId: string | null;
  body: string;
  createdAt: string;
  author: { id: string; name: string } | null;
}

export interface ActivityEntry {
  id: string;
  issueId: string | null;
  workspaceId: string;
  actorId: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string } | null;
  issue?: { id: string; key: string; title: string } | null;
  workspace?: { id: string; name: string; slug: string };
}

export interface UserSearchResult {
  id: string;
  name: string;
  email: string;
}

export type NotificationType =
  | 'MENTION'
  | 'ISSUE_ASSIGNED'
  | 'WORKSPACE_ROLE_CHANGED'
  | 'MEMBER_ADDED'
  | 'COMMENT_ON_REPORTED_OR_ASSIGNED_ISSUE'
  | 'SPRINT_STARTED'
  | 'SPRINT_COMPLETED';

// Every FK below can be null - either it never applied to this
// notification's type, or the row it pointed to was deleted later (the API
// sets it to null rather than deleting the notification - see
// schema.prisma's Notification model). The UI must render a sensible link
// target (or none) from whichever of these are actually present, never
// assume they are.
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId: string;
  readAt: string | null;
  createdAt: string;
  actorUserId: string | null;
  actorUser: { id: string; name: string } | null;
  workspaceId: string | null;
  workspace: { id: string; name: string } | null;
  projectId: string | null;
  project: { id: string; name: string; key: string } | null;
  issueId: string | null;
  issue: { id: string; key: string; title: string } | null;
  commentId: string | null;
  sprintId: string | null;
  sprint: { id: string; name: string } | null;
}

export interface ApiErrorShape {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}
