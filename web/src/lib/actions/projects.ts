'use server';

import { redirect } from 'next/navigation';
import * as projectsApi from '../api/projects';
import { ApiError } from '../api/client';
import { requireSessionToken } from '../session';
import { assertUuid, safeRevalidate } from './validation';

export interface FormState {
  error?: string;
}

export async function createProjectAction(
  workspaceId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  assertUuid(workspaceId, 'workspaceId');
  const token = await requireSessionToken();
  const name = String(formData.get('name') ?? '').trim();
  const key = String(formData.get('key') ?? '')
    .trim()
    .toUpperCase();
  const description = String(formData.get('description') ?? '').trim() || undefined;

  if (!name || !key) {
    return { error: 'Name and key are required.' };
  }

  let project;
  try {
    project = await projectsApi.createProject(token, workspaceId, { name, key, description });
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.message };
    }
    return { error: 'Could not create the project.' };
  }

  safeRevalidate(`/workspaces/${workspaceId}`);
  redirect(`/workspaces/${workspaceId}/projects/${project.id}`);
}
