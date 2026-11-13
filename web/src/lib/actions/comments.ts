'use server';

import * as commentsApi from '../api/comments';
import { ApiError } from '../api/client';
import { requireSessionToken } from '../session';
import { assertUuid, safeRevalidate } from './validation';

export interface FormState {
  error?: string;
}

export async function createCommentAction(
  issueId: string,
  revalidateBasePath: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  assertUuid(issueId, 'issueId');
  const token = await requireSessionToken();
  const body = String(formData.get('body') ?? '').trim();
  if (!body) return { error: 'Comment cannot be empty.' };

  try {
    await commentsApi.createComment(token, issueId, body);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Could not post the comment.' };
  }

  safeRevalidate(revalidateBasePath);
  return {};
}

export async function deleteCommentAction(
  commentId: string,
  revalidateBasePath: string,
): Promise<FormState> {
  assertUuid(commentId, 'commentId');
  const token = await requireSessionToken();
  try {
    await commentsApi.deleteComment(token, commentId);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Could not delete the comment.' };
  }
  safeRevalidate(revalidateBasePath);
  return {};
}
