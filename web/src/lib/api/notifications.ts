import 'server-only';
import type { AppNotification } from '../types';
import { apiFetch } from './client';

export function listNotifications(token: string, unreadOnly = false) {
  return apiFetch<AppNotification[]>('/notifications', {
    token,
    query: unreadOnly ? { unread: 'true' } : {},
  });
}

export function unreadNotificationCount(token: string) {
  return apiFetch<{ count: number }>('/notifications/unread-count', { token });
}

export function markNotificationRead(token: string, id: string) {
  return apiFetch<{ marked: true }>(`/notifications/${id}/read`, { method: 'PATCH', token });
}

export function markAllNotificationsRead(token: string) {
  return apiFetch<{ marked: number }>('/notifications/read-all', { method: 'POST', token });
}
