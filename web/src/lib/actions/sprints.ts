'use server';

import * as sprintsApi from '../api/sprints';
import { updateIssue } from '../api/issues';
import { ApiError } from '../api/client';
import { requireSessionToken } from '../session';
import { assertUuid, safeRevalidate } from './validation';

export interface FormState {
  error?: string;
}

export async function createSprintAction(
  projectId: string,
  revalidateBasePath: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  assertUuid(projectId, 'projectId');
  const token = await requireSessionToken();
  const name = String(formData.get('name') ?? '').trim();
  const goal = String(formData.get('goal') ?? '').trim() || undefined;
  if (!name) return { error: 'Sprint name is required.' };

  try {
    await sprintsApi.createSprint(token, projectId, { name, goal });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Could not create the sprint.' };
  }
  safeRevalidate(revalidateBasePath);
  return {};
}

export async function updateSprintAction(
  sprintId: string,
  revalidateBasePath: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  assertUuid(sprintId, 'sprintId');
  const token = await requireSessionToken();
  const name = String(formData.get('name') ?? '').trim();
  const goal = String(formData.get('goal') ?? '').trim() || undefined;
  const startDate = String(formData.get('startDate') ?? '').trim() || undefined;
  const endDate = String(formData.get('endDate') ?? '').trim() || undefined;
  if (!name) return { error: 'Sprint name is required.' };

  try {
    await sprintsApi.updateSprint(token, sprintId, { name, goal, startDate, endDate });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Could not update the sprint.' };
  }
  safeRevalidate(revalidateBasePath);
  return {};
}

export async function startSprintAction(
  sprintId: string,
  revalidateBasePath: string,
): Promise<FormState> {
  assertUuid(sprintId, 'sprintId');
  const token = await requireSessionToken();
  try {
    await sprintsApi.startSprint(token, sprintId);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Could not start the sprint.' };
  }
  safeRevalidate(revalidateBasePath);
  return {};
}

export async function completeSprintAction(
  sprintId: string,
  revalidateBasePath: string,
): Promise<FormState> {
  assertUuid(sprintId, 'sprintId');
  const token = await requireSessionToken();
  try {
    await sprintsApi.completeSprint(token, sprintId);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Could not complete the sprint.' };
  }
  safeRevalidate(revalidateBasePath);
  return {};
}

export async function moveIssueToSprintAction(
  issueId: string,
  sprintId: string | null,
  revalidateBasePath: string,
): Promise<FormState> {
  assertUuid(issueId, 'issueId');
  if (sprintId) assertUuid(sprintId, 'sprintId');
  const token = await requireSessionToken();
  // Reuses the existing issue-update endpoint/authorization (assignee,
  // reporter, or workspace Admin/Owner) - moving an issue into/out of a
  // sprint is just another field on it, not a new mutation shape. See
  // api/src/issues/issues.service.ts.
  try {
    await updateIssue(token, issueId, { sprintId });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Could not move that issue.' };
  }
  safeRevalidate(revalidateBasePath);
  return {};
}
