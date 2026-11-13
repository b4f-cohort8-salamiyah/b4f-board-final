import { requireSessionToken } from '@/lib/session';
import { Navbar } from '@/components/layout/Navbar';
import * as notificationsApi from '@/lib/api/notifications';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Web-adapter check only - redirects to /login if there's no session.
  // Every actual authorization decision still happens in Nest on every
  // request this layout's children go on to make.
  const token = await requireSessionToken();

  // The bell is mounted on every authenticated page via this layout, so its
  // initial data is fetched here rather than in each page - it then stays
  // fresh on every full navigation without any polling/WebSocket (see
  // NotificationBell's own comment on why that's enough for this feature).
  const [{ count: unreadCount }, notifications] = await Promise.all([
    notificationsApi.unreadNotificationCount(token),
    notificationsApi.listNotifications(token),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar initialUnreadCount={unreadCount} initialNotifications={notifications.slice(0, 8)} />
      <main className="flex min-w-0 flex-1">{children}</main>
    </div>
  );
}
