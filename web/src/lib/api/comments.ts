import 'server-only';
import type { Comment } from '../types';
import { apiFetch } from './client';

export function listComments(token: string, issueId: string) {
  return apiFetch<Comment[]>(`/issues/${issueId}/comments`, { token });
}

export function createComment(token: string, issueId: string, body: string) {
  return apiFetch<Comment>(`/issues/${issueId}/comments`, {
    method: 'POST',
    token,
    body: { body },
  });
}

export function updateComment(token: string, commentId: string, body: string) {
  return apiFetch<Comment>(`/comments/${commentId}`, {
    method: 'PATCH',
    token,
    body: { body },
  });
}

export function deleteComment(token: string, commentId: string) {
  return apiFetch<{ deleted: true }>(`/comments/${commentId}`, { method: 'DELETE', token });
}
