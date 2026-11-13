import * as notificationsApi from '@/lib/api/notifications';
import { requireSessionToken } from '@/lib/session';
import { NotificationsPageClient } from './NotificationsPageClient';

export default async function NotificationsPage(props: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const searchParams = await props.searchParams;
  const unreadOnly = searchParams.filter === 'unread';
  const token = await requireSessionToken();
  const notifications = await notificationsApi.listNotifications(token, unreadOnly);

  return (
    <div className="flex w-full flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Notifications</h1>
      <NotificationsPageClient notifications={notifications} unreadOnly={unreadOnly} />
    </div>
  );
}
