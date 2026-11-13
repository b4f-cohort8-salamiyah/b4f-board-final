'use server';

import { redirect } from 'next/navigation';
import * as workspacesApi from '../api/workspaces';
import { ApiError } from '../api/client';
import { requireSessionToken } from '../session';
import { assertAssignableRole, assertUuid, safeRevalidate } from './validation';

export interface FormState {
  error?: string;
}

export async function createWorkspaceAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const token = await requireSessionToken();
  const name = String(formData.get('name') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();

  if (!name || !slug) {
    return { error: 'Name and slug are required.' };
  }

  let workspace;
  try {
    workspace = await workspacesApi.createWorkspace(token, { name, slug });
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 409) {
      return { error: 'That slug is already taken.' };
    }
    return { error: 'Could not create the workspace. Check the slug format and try again.' };
  }

  safeRevalidate('/workspaces');
  redirect(`/workspaces/${workspace.id}`);
}

export async function addMemberAction(
  workspaceId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  assertUuid(workspaceId, 'workspaceId');
  const token = await requireSessionToken();
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Email is required.' };

  try {
    await workspacesApi.addMember(token, workspaceId, email);
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.message };
    }
    return { error: 'Could not add that member.' };
  }
  safeRevalidate(`/workspaces/${workspaceId}/settings`);
  return {};
}

export async function updateMemberRoleAction(
  workspaceId: string,
  userId: string,
  role: string,
): Promise<FormState> {
  assertUuid(workspaceId, 'workspaceId');
  assertUuid(userId, 'userId');
  assertAssignableRole(role);
  const token = await requireSessionToken();
  try {
    await workspacesApi.updateMemberRole(token, workspaceId, userId, role);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Could not change that member’s role.' };
  }
  safeRevalidate(`/workspaces/${workspaceId}/settings`);
  return {};
}

export async function removeMemberAction(workspaceId: string, userId: string): Promise<FormState> {
  assertUuid(workspaceId, 'workspaceId');
  assertUuid(userId, 'userId');
  const token = await requireSessionToken();
  try {
    await workspacesApi.removeMember(token, workspaceId, userId);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Could not remove that member.' };
  }
  safeRevalidate(`/workspaces/${workspaceId}/settings`);
  return {};
}
