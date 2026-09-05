import { useEffect, useState } from 'react';
import { PageHeader, DataTable, Column, EmptyState } from '@/design-system';
import { useAuth } from '@/app/providers/AuthContext';
import { notificationRepository, NotificationRecord } from '@/infrastructure/repositories/NotificationRepository';

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      notificationRepository
        .getNotificationsForUser(user.id)
        .then((items) => {
          setNotifications(items);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [user?.id]);

  const columns: Column<NotificationRecord>[] = [
    { header: 'Title', accessorKey: 'title', width: '220px' },
    { header: 'Message', accessorKey: 'message' },
    {
      header: 'Status',
      width: '100px',
      cell: (row) => (
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 'var(--font-weight-medium)',
            color: row.isRead ? 'var(--color-text-tertiary)' : 'var(--color-brand-primary)',
          }}
        >
          {row.isRead ? 'Read' : 'New'}
        </span>
      ),
    },
    {
      header: 'Received At',
      accessorKey: 'createdAt',
      width: '160px',
      cell: (row) => new Date(row.createdAt).toLocaleString(),
    },
  ];

  return (
    <div className="clms-notifications-page">
      <PageHeader
        title="Notifications Inbox"
        description="Comprehensive chronological log of workflow updates and commercial alerts."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Notifications' }]}
      />

      {notifications.length === 0 ? (
        <EmptyState
          title="No notifications in your inbox"
          description="You will receive real-time notifications here when commercial packages are confirmed, certificates are issued, or invoices are returned/approved."
        />
      ) : (
        <DataTable columns={columns} data={notifications} isLoading={isLoading} />
      )}
    </div>
  );
}
