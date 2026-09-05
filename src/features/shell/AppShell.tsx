import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandSearch, Drawer, EmptyState } from '@/design-system';
import { useAuth } from '@/app/providers/AuthContext';
import { notificationRepository, NotificationRecord } from '@/infrastructure/repositories/NotificationRepository';
import './AppShell.css';

export function AppShell() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('clms_sidebar_collapsed') === 'true';
  });
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const { user } = useAuth();
  const navigate = useNavigate();

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('clms_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Global keyboard shortcut for CommandSearch (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Fetch real notifications for authenticated user
  useEffect(() => {
    if (user?.id) {
      notificationRepository.getNotificationsForUser(user.id).then((items) => {
        setNotifications(items);
        setUnreadCount(items.filter((n) => !n.isRead).length);
      });
    }
  }, [user?.id, isNotificationsOpen]);

  return (
    <div className={`clms-app-layout ${isSidebarCollapsed ? 'clms-app-layout--collapsed' : ''}`}>
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={handleToggleSidebar} />

      <div className="clms-app-main">
        <Topbar
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadNotificationsCount={unreadCount}
        />

        <main className="clms-app-content">
          <Outlet />
        </main>
      </div>

      {/* Global Command Search Overlay */}
      <CommandSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Notifications Drawer */}
      <Drawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        title="Notifications"
        subtitle="Commercial and workflow event alerts"
      >
        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="You have no commercial alerts or pending workflow notifications at this time."
          />
        ) : (
          <div className="clms-notifications-list">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`clms-notification-card ${!n.isRead ? 'clms-notification-card--unread' : ''} border-hairline`}
                onClick={() => {
                  notificationRepository.markAsRead(n.id);
                  if (n.entityType === 'INVOICE') navigate('/invoices');
                  if (n.entityType === 'CERTIFICATE') navigate('/certificates');
                  setIsNotificationsOpen(false);
                }}
              >
                <div className="clms-notification-card__header">
                  <span className="clms-notification-card__title">{n.title}</span>
                  <span className="clms-notification-card__time tabular-nums">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="clms-notification-card__message">{n.message}</p>
              </div>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
}
