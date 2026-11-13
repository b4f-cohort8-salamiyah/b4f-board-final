'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/lib/actions/notifications';
import { glyphFor, linkFor } from '@/lib/notificationDisplay';
import type { AppNotification } from '@/lib/types';

// Same local-optimistic-update pattern as NotificationBell (see its own
// comment on why this one `useEffect` is unrelated to the toast-replay bug
// fixed elsewhere in this pass) - the All/Unread filter itself lives in the
// URL (?filter=unread), matching this app's "filters live in the URL"
// convention (see board/FilterBar.tsx), not client state.
export function NotificationsPageClient({
  notifications,
  unreadOnly,
}: {
  notifications: AppNotification[];
  unreadOnly: boolean;
}) {
  const [items, setItems] = useState(notifications);
  const pathname = usePathname();

  useEffect(() => setItems(notifications), [notifications]);

  function markOneReadLocally(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    void markNotificationReadAction(id, pathname);
  }

  function markAllReadLocally() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    void markAllNotificationsReadAction(pathname);
  }

  const hasUnread = items.some((n) => !n.readAt);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-md border border-gray-200 p-0.5 dark:border-gray-800">
          <Link
            href="/notifications"
            className={`rounded px-3 py-1 text-sm ${
              !unreadOnly ? 'bg-gray-100 font-medium dark:bg-gray-800' : 'text-gray-500'
            }`}
          >
            All
          </Link>
          <Link
            href="/notifications?filter=unread"
            className={`rounded px-3 py-1 text-sm ${
              unreadOnly ? 'bg-gray-100 font-medium dark:bg-gray-800' : 'text-gray-500'
            }`}
          >
            Unread
          </Link>
        </div>
        {hasUnread && (
          <button
            type="button"
            className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            onClick={markAllReadLocally}
          >
            Mark all read
          </button>
        )}
      </div>

      <ul className="card flex flex-col divide-y divide-gray-100 p-0 dark:divide-gray-800">
        {items.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-gray-400">
            {unreadOnly ? 'No unread notifications.' : 'No notifications yet.'}
          </li>
        )}
        {items.map((n) => {
          const href = linkFor(n);
          const body = (
            <div
              className={`flex gap-3 px-4 py-3 text-sm ${
                n.readAt ? '' : 'bg-blue-50 dark:bg-blue-950/40'
              }`}
            >
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              >
                {glyphFor(n.type)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{n.title}</span>
                <span className="block text-gray-600 dark:text-gray-400">{n.message}</span>
                <span className="block text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleString()}
                  {!n.readAt && <span className="ml-2 text-blue-600 dark:text-blue-400">Unread</span>}
                </span>
              </span>
            </div>
          );
          return (
            <li key={n.id}>
              {href ? (
                <Link
                  href={href}
                  onClick={() => markOneReadLocally(n.id)}
                  className="block hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  {body}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => markOneReadLocally(n.id)}
                  className="block w-full text-left hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  {body}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
