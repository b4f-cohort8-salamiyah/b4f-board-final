'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/lib/actions/notifications';
import { glyphFor, linkFor } from '@/lib/notificationDisplay';
import type { AppNotification } from '@/lib/types';

// Server-fetched initial data (see app/(app)/layout.tsx) refreshed on every
// full navigation - there is deliberately no polling/WebSocket here (see
// the task this was built for: no real-time requirement). Mark-read/
// mark-all-read update local state immediately (so the badge/dropdown never
// look stale while the request is in flight) and fire the matching Server
// Action in the background, which revalidates whatever page the bell
// happens to be open on - see lib/actions/notifications.ts.
export function NotificationBell({
  initialUnreadCount,
  initialNotifications,
}: {
  initialUnreadCount: number;
  initialNotifications: AppNotification[];
}) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [items, setItems] = useState(initialNotifications);
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Resync from fresh server data on every render this component's props
  // change (a real navigation, or this same page's layout re-rendering
  // after a Server Action's revalidatePath) - same pattern as DndBoard's
  // `useEffect(() => setIssues(serverIssues), [serverIssues])`. This has
  // nothing to do with the earlier toast-replay bug: there is no toast
  // here, just state kept in sync with its server-provided source of truth.
  useEffect(() => {
    setUnreadCount(initialUnreadCount);
    setItems(initialNotifications);
  }, [initialUnreadCount, initialNotifications]);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  function markOneReadLocally(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id && !n.readAt ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    void markNotificationReadAction(id, pathname);
  }

  function markAllReadLocally() {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
    setUnreadCount(0);
    void markAllNotificationsReadAction(pathname);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative rounded-md p-2 text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-gray-300 dark:hover:bg-gray-800"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="card absolute right-0 z-20 mt-1 w-80 overflow-hidden p-0 shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-800">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                onClick={markAllReadLocally}
              >
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-gray-400">
                No notifications yet.
              </li>
            )}
            {items.map((n) => {
              const href = linkFor(n);
              const body = (
                <div
                  className={`flex gap-2 px-3 py-2 text-sm ${
                    n.readAt ? '' : 'bg-blue-50 dark:bg-blue-950/40'
                  }`}
                >
                  <span aria-hidden="true" className="mt-0.5 text-gray-400">
                    {glyphFor(n.type)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{n.title}</span>
                    <span className="block truncate text-gray-500 dark:text-gray-400">
                      {n.message}
                    </span>
                    <span className="block text-xs text-gray-400">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </span>
                </div>
              );
              return (
                <li key={n.id} role="menuitem">
                  {href ? (
                    <Link
                      href={href}
                      onClick={() => {
                        markOneReadLocally(n.id);
                        setOpen(false);
                      }}
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

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-gray-100 px-3 py-2 text-center text-sm text-blue-600 hover:underline dark:border-gray-800 dark:text-blue-400"
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}
