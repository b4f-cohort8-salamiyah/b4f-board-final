'use server';

import * as notificationsApi from '../api/notifications';
import { ApiError } from '../api/client';
import { requireSessionToken } from '../session';
import { assertUuid, safeRevalidate } from './validation';

export interface NotificationActionState {
  error?: string;
}

// The bell/dropdown/page are mounted on every authenticated route, not just
// one - revalidateBasePath is whatever page the caller happened to be on
// when they clicked (see NotificationBell/NotificationsPageClient, which
// both pass usePathname()). safeRevalidate() already no-ops safely on
// anything outside the known route whitelist, so an unrecognized path here
// just means "the next navigation shows fresh data anyway", never an error.
export async function markNotificationReadAction(
  notificationId: string,
  revalidateBasePath: string,
): Promise<NotificationActionState> {
  assertUuid(notificationId, 'notificationId');
  const token = await requireSessionToken();
  try {
    await notificationsApi.markNotificationRead(token, notificationId);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Could not mark that notification as read.' };
  }
  safeRevalidate(revalidateBasePath);
  return {};
}

export async function markAllNotificationsReadAction(
  revalidateBasePath: string,
): Promise<NotificationActionState> {
  const token = await requireSessionToken();
  try {
    await notificationsApi.markAllNotificationsRead(token);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    return { error: 'Could not mark all notifications as read.' };
  }
  safeRevalidate(revalidateBasePath);
  return {};
}
