import 'server-only';
import type { ActivityEntry, Workspace, WorkspaceMember, WorkspaceRole } from '../types';
import { apiFetch } from './client';

export function listWorkspaces(token: string) {
  return apiFetch<Workspace[]>('/workspaces', { token });
}

export function createWorkspace(token: string, dto: { name: string; slug: string }) {
  return apiFetch<Workspace>('/workspaces', { method: 'POST', token, body: dto });
}

export function getWorkspace(token: string, id: string) {
  return apiFetch<Workspace>(`/workspaces/${id}`, { token });
}

export function updateWorkspace(token: string, id: string, dto: { name?: string }) {
  return apiFetch<Workspace>(`/workspaces/${id}`, { method: 'PATCH', token, body: dto });
}

export function deleteWorkspace(token: string, id: string) {
  return apiFetch<{ deleted: true }>(`/workspaces/${id}`, { method: 'DELETE', token });
}

export function listMembers(token: string, workspaceId: string) {
  return apiFetch<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`, { token });
}

export function addMember(token: string, workspaceId: string, email: string) {
  return apiFetch<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
    method: 'POST',
    token,
    body: { email },
  });
}

export function updateMemberRole(
  token: string,
  workspaceId: string,
  userId: string,
  role: Exclude<WorkspaceRole, 'OWNER'>,
) {
  return apiFetch<WorkspaceMember>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: 'PATCH',
    token,
    body: { role },
  });
}

export function removeMember(token: string, workspaceId: string, userId: string) {
  return apiFetch<{ removed: true }>(`/workspaces/${workspaceId}/members/${userId}`, {
    method: 'DELETE',
    token,
  });
}

export function listWorkspaceActivity(token: string, workspaceId: string) {
  return apiFetch<ActivityEntry[]>(`/workspaces/${workspaceId}/activity`, { token });
}
