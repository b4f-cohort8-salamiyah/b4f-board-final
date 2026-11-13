import 'server-only';
import type { ActivityEntry, IssueSummary, UserSearchResult } from '../types';
import { apiFetch } from './client';

export function updateMe(
  token: string,
  dto: { name?: string; password?: string; currentPassword?: string },
) {
  return apiFetch(`/users/me`, { method: 'PATCH', token, body: dto });
}

export function myIssues(token: string) {
  return apiFetch<IssueSummary[]>('/users/me/issues', { token });
}

export function myActivity(token: string) {
  return apiFetch<ActivityEntry[]>('/users/me/activity', { token });
}

export function searchUsers(token: string, q: string, workspaceId?: string, membersOnly?: boolean) {
  return apiFetch<UserSearchResult[]>('/users/search', {
    token,
    query: { q, workspaceId, membersOnly: membersOnly ? 'true' : undefined },
  });
}
