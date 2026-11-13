import 'server-only';
import type { Sprint, SprintDetail } from '../types';
import { apiFetch } from './client';

export interface SprintDto {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

export function listSprints(token: string, projectId: string) {
  return apiFetch<Sprint[]>(`/projects/${projectId}/sprints`, { token });
}

export function createSprint(token: string, projectId: string, dto: SprintDto) {
  return apiFetch<Sprint>(`/projects/${projectId}/sprints`, { method: 'POST', token, body: dto });
}

export function getSprint(token: string, id: string) {
  return apiFetch<SprintDetail>(`/sprints/${id}`, { token });
}

export function updateSprint(token: string, id: string, dto: Partial<SprintDto>) {
  return apiFetch<Sprint>(`/sprints/${id}`, { method: 'PATCH', token, body: dto });
}

export function startSprint(token: string, id: string) {
  return apiFetch<Sprint>(`/sprints/${id}/start`, { method: 'POST', token });
}

export function completeSprint(token: string, id: string) {
  return apiFetch<Sprint>(`/sprints/${id}/complete`, { method: 'POST', token });
}
