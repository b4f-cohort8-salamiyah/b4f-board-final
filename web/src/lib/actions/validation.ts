import 'server-only';
import { revalidatePath } from 'next/cache';

// Server Actions are public mutation entry points - see
// ../../../../projects/b4f-board/specification/FRONTEND-ARCHITECTURE.md.
// TypeScript types are compile-time only; they do not stop a direct,
// hand-crafted call to a Server Action's endpoint from sending whatever
// shape it wants. Everything here validates TRANSPORT SHAPE only - it
// never decides membership/role/ownership, which stays in Nest.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function assertUuid(value: unknown, field: string): asserts value is string {
  if (!isUuid(value)) {
    throw new Error(`Invalid ${field}: expected a UUID, got ${JSON.stringify(value)}`);
  }
}

const ISSUE_STATUSES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
const ISSUE_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
// OWNER is intentionally excluded - role changes to/from Owner are not a
// thing this action set supports, see AUTH-AND-PERMISSIONS.md.
const ASSIGNABLE_ROLES = ['ADMIN', 'MEMBER'] as const;

export type IssueStatusInput = (typeof ISSUE_STATUSES)[number];
export type IssuePriorityInput = (typeof ISSUE_PRIORITIES)[number];
export type AssignableRoleInput = (typeof ASSIGNABLE_ROLES)[number];

export function assertIssueStatus(value: unknown): asserts value is IssueStatusInput {
  if (!(ISSUE_STATUSES as readonly unknown[]).includes(value)) {
    throw new Error(`Invalid status: ${JSON.stringify(value)}`);
  }
}

export function assertIssuePriority(value: unknown): asserts value is IssuePriorityInput {
  if (!(ISSUE_PRIORITIES as readonly unknown[]).includes(value)) {
    throw new Error(`Invalid priority: ${JSON.stringify(value)}`);
  }
}

export function assertAssignableRole(value: unknown): asserts value is AssignableRoleInput {
  if (!(ASSIGNABLE_ROLES as readonly unknown[]).includes(value)) {
    throw new Error(`Invalid role: ${JSON.stringify(value)}`);
  }
}

export function assertNonEmptyString(
  value: unknown,
  field: string,
  maxLength = 5000,
): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  if (value.length > maxLength) {
    throw new Error(`${field} is too long`);
  }
}

// Finite whitelist of real B4F Board route shapes - see
// specification/UI-SCREENS.md for the URL model. A Server Action must
// never call revalidatePath() with an arbitrary client-controlled string;
// this is what stands in for that, per the spec's Server Action security
// notes (Phase 3C.1). safeRevalidate() logs and no-ops on anything that
// doesn't match - a failed revalidation degrades to "the next navigation
// shows fresh data anyway" rather than a security problem.
const REVALIDATE_PATH_PATTERNS: RegExp[] = [
  /^\/dashboard$/,
  /^\/profile$/,
  /^\/notifications$/,
  /^\/workspaces$/,
  /^\/workspaces\/[0-9a-f-]{36}$/,
  /^\/workspaces\/[0-9a-f-]{36}\/settings$/,
  /^\/workspaces\/[0-9a-f-]{36}\/projects\/[0-9a-f-]{36}$/,
  /^\/workspaces\/[0-9a-f-]{36}\/projects\/[0-9a-f-]{36}\/board$/,
  /^\/workspaces\/[0-9a-f-]{36}\/projects\/[0-9a-f-]{36}\/backlog$/,
  /^\/workspaces\/[0-9a-f-]{36}\/projects\/[0-9a-f-]{36}\/sprints\/[0-9a-f-]{36}$/,
  /^\/workspaces\/[0-9a-f-]{36}\/projects\/[0-9a-f-]{36}\/issues\/[0-9a-f-]{36}$/,
];

export function isKnownRoutePath(path: string): boolean {
  return REVALIDATE_PATH_PATTERNS.some((re) => re.test(path));
}

export function safeRevalidate(path: string): void {
  if (!isKnownRoutePath(path)) {
    console.warn(`safeRevalidate: refusing unrecognized path ${JSON.stringify(path)}`);
    return;
  }
  revalidatePath(path);
}
