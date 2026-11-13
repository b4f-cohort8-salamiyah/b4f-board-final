'use server';

import * as issuesApi from '../api/issues';
import { ApiError } from '../api/client';
import { requireSessionToken } from '../session';
import type { IssuePriority, IssueStatus } from '../types';
import { assertIssuePriority, assertIssueStatus, assertUuid, safeRevalidate } from './validation';

export interface FormState {
  error?: string;
}

export async function createIssueAction(
  projectId: string,
  revalidateBasePath: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  assertUuid(projectId, 'projectId');
  const token = await requireSessionToken();
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || undefined;

  const rawPriority = formData.get('priority');
  let priority: IssuePriority | undefined;
  if (rawPriority) {
    assertIssuePriority(rawPriority);
    priority = rawPriority;
  }

  const rawAssigneeId = String(formData.get('assigneeId') ?? '').trim();
  const assigneeId = rawAssigneeId ? rawAssigneeId : undefined;
  if (assigneeId) assertUuid(assigneeId, 'assigneeId');

  const rawStoryPoints = String(formData.get('storyPoints') ?? '').trim();
  let storyPoints: number | undefined;
  if (rawStoryPoints) {
    const parsed = Number(rawStoryPoints);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return { error: 'Story points must be a whole number of 0 or more.' };
    }
    storyPoints = parsed;
  }

  // Omitted/empty means "create in the Backlog" (no sprint) - never required.
  // See CreateIssueModal: Board passes the active sprint's id by default,
  // Backlog passes nothing.
  const rawSprintId = String(formData.get('sprintId') ?? '').trim();
  const sprintId = rawSprintId ? rawSprintId : undefined;
  if (sprintId) assertUuid(sprintId, 'sprintId');

  if (!title) {
    return { error: 'Title is required.' };
  }

  try {
    await issuesApi.createIssue(token, projectId, {
      title,
      description,
      priority,
      assigneeId,
      storyPoints,
      sprintId,
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Could not create the issue.' };
  }

  safeRevalidate(revalidateBasePath);
  return {};
}

// Called directly from the board's status control - see
// specification/DOMAIN-MODEL.md, "Board without drag-and-drop": the same
// endpoint drag-and-drop would use later, just triggered by a select here.
export async function updateIssueStatusAction(
  issueId: string,
  status: string,
  revalidateBasePath: string,
) {
  assertUuid(issueId, 'issueId');
  assertIssueStatus(status);
  const token = await requireSessionToken();
  await issuesApi.updateIssue(token, issueId, { status });
  safeRevalidate(revalidateBasePath);
}

export interface UpdateIssueActionInput {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  storyPoints?: number | null;
}

export async function updateIssueAction(
  issueId: string,
  revalidateBasePath: string,
  dto: UpdateIssueActionInput,
) {
  assertUuid(issueId, 'issueId');
  if (dto.status !== undefined) assertIssueStatus(dto.status);
  if (dto.priority !== undefined) assertIssuePriority(dto.priority);
  if (dto.assigneeId) assertUuid(dto.assigneeId, 'assigneeId');
  if (dto.title !== undefined && typeof dto.title !== 'string') {
    throw new Error('Invalid title');
  }
  if (dto.storyPoints != null && (!Number.isInteger(dto.storyPoints) || dto.storyPoints < 0)) {
    throw new Error('Invalid storyPoints');
  }

  const token = await requireSessionToken();
  const validated: {
    title?: string;
    description?: string;
    status?: IssueStatus;
    priority?: IssuePriority;
    assigneeId?: string | null;
    storyPoints?: number | null;
  } = {
    title: dto.title,
    description: dto.description,
    status: dto.status as IssueStatus | undefined,
    priority: dto.priority as IssuePriority | undefined,
    assigneeId: dto.assigneeId === undefined ? undefined : dto.assigneeId,
    storyPoints: dto.storyPoints === undefined ? undefined : dto.storyPoints,
  };
  await issuesApi.updateIssue(token, issueId, validated);
  safeRevalidate(revalidateBasePath);
}

export async function deleteIssueAction(issueId: string, revalidateBasePath: string) {
  assertUuid(issueId, 'issueId');
  const token = await requireSessionToken();
  await issuesApi.deleteIssue(token, issueId);
  safeRevalidate(revalidateBasePath);
}
