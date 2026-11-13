import 'server-only';
import type {
  ActivityEntry,
  IssueDetail,
  IssuePriority,
  IssueStatus,
  IssueSummary,
} from '../types';
import { apiFetch } from './client';

export interface IssueQuery {
  status?: IssueStatus;
  priority?: IssuePriority;
  assignee?: string;
  q?: string;
  sprintId?: string;
  backlog?: 'true';
}

export function listIssues(token: string, projectId: string, query: IssueQuery = {}) {
  return apiFetch<IssueSummary[]>(`/projects/${projectId}/issues`, {
    token,
    query: { ...query },
  });
}

export function createIssue(
  token: string,
  projectId: string,
  dto: {
    title: string;
    description?: string;
    priority?: IssuePriority;
    assigneeId?: string;
    storyPoints?: number;
    sprintId?: string;
  },
) {
  return apiFetch<IssueSummary>(`/projects/${projectId}/issues`, {
    method: 'POST',
    token,
    body: dto,
  });
}

export function getIssue(token: string, id: string) {
  return apiFetch<IssueDetail>(`/issues/${id}`, { token });
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  status?: IssueStatus;
  priority?: IssuePriority;
  assigneeId?: string | null;
  storyPoints?: number | null;
  sprintId?: string | null;
}

export function updateIssue(token: string, id: string, dto: UpdateIssueInput) {
  return apiFetch<IssueSummary>(`/issues/${id}`, { method: 'PATCH', token, body: dto });
}

export function deleteIssue(token: string, id: string) {
  return apiFetch<{ deleted: true }>(`/issues/${id}`, { method: 'DELETE', token });
}

export function listIssueActivity(token: string, id: string) {
  return apiFetch<ActivityEntry[]>(`/issues/${id}/activity`, { token });
}
