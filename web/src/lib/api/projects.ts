import 'server-only';
import type { Project } from '../types';
import { apiFetch } from './client';

export function listProjects(token: string, workspaceId: string) {
  return apiFetch<Project[]>(`/workspaces/${workspaceId}/projects`, { token });
}

export function createProject(
  token: string,
  workspaceId: string,
  dto: { name: string; key: string; description?: string },
) {
  return apiFetch<Project>(`/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    token,
    body: dto,
  });
}

export function getProject(token: string, id: string) {
  return apiFetch<Project>(`/projects/${id}`, { token });
}

export function updateProject(
  token: string,
  id: string,
  dto: { name?: string; description?: string },
) {
  return apiFetch<Project>(`/projects/${id}`, { method: 'PATCH', token, body: dto });
}

export function deleteProject(token: string, id: string) {
  return apiFetch<{ deleted: true }>(`/projects/${id}`, { method: 'DELETE', token });
}
