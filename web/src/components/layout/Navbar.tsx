'use client';

import Link from 'next/link';
import { logoutAction } from '@/lib/actions/auth';
import { useAppSelector } from '@/store/hooks';
import type { AppNotification } from '@/lib/types';
import { Avatar } from '../ui/Avatar';
import { NotificationBell } from './NotificationBell';
import { ThemeToggle } from './ThemeToggle';

export function Navbar({
  initialUnreadCount,
  initialNotifications,
}: {
  initialUnreadCount: number;
  initialNotifications: AppNotification[];
}) {
  const user = useAppSelector((s) => s.currentUser.user);

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-950">
      <Link href="/dashboard" className="font-semibold">
        B4F Board
      </Link>
      <div className="flex items-center gap-3">
        {user && (
          <NotificationBell
            initialUnreadCount={initialUnreadCount}
            initialNotifications={initialNotifications}
          />
        )}
        <ThemeToggle />
        {user && (
          <>
            <Link href="/profile" className="flex items-center gap-2 text-sm">
              <Avatar name={user.name} />
              <span className="hidden sm:inline">{user.name}</span>
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary">
                Log out
              </button>
            </form>
          </>
        )}
      </div>
    </header>
  );
}
