import { useState } from 'react';
import { Search, Bell, LogOut, User, Shield } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { IconButton, NotificationIndicator } from '@/design-system';
import './Topbar.css';

interface TopbarProps {
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  unreadNotificationsCount?: number;
}

export function Topbar({
  onOpenSearch,
  onOpenNotifications,
  unreadNotificationsCount = 0,
}: TopbarProps) {
  const { user, signOut } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <header className="clms-topbar border-hairline">
      {/* Search trigger button */}
      <div className="clms-topbar__left">
        <button
          type="button"
          className="clms-topbar__search-trigger border-hairline"
          onClick={onOpenSearch}
          aria-label="Open global search (Press Ctrl+K)"
        >
          <Search size={14} className="clms-topbar__search-icon" aria-hidden="true" />
          <span className="clms-topbar__search-placeholder">Search commercial records...</span>
          <kbd className="clms-topbar__search-kbd">Ctrl K</kbd>
        </button>
      </div>

      {/* Right Utility Actions */}
      <div className="clms-topbar__right">
        {/* Notifications Bell */}
        <div className="clms-topbar__notification-wrapper">
          <IconButton
            aria-label="Notifications"
            variant="secondary"
            size="md"
            onClick={onOpenNotifications}
          >
            <Bell size={16} />
          </IconButton>
          {unreadNotificationsCount > 0 && (
            <NotificationIndicator
              unreadCount={unreadNotificationsCount}
              className="clms-topbar__notification-badge"
            />
          )}
        </div>

        {/* User Profile Trigger & Dropdown */}
        <div className="clms-topbar__user-menu-wrapper">
          <button
            type="button"
            className="clms-topbar__user-trigger border-hairline"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            aria-expanded={isProfileMenuOpen}
            aria-haspopup="true"
          >
            <div className="clms-topbar__avatar">
              <User size={14} />
            </div>
            <span className="clms-topbar__user-name">{user?.fullName || user?.email || 'Authenticated User'}</span>
          </button>

          {isProfileMenuOpen && (
            <div
              className="clms-topbar__dropdown border-hairline"
              role="menu"
              onMouseLeave={() => setIsProfileMenuOpen(false)}
            >
              <div className="clms-topbar__dropdown-header border-hairline">
                <p className="clms-topbar__dropdown-name">{user?.fullName || 'User'}</p>
                <p className="clms-topbar__dropdown-email">{user?.email}</p>
                {user?.roles && user.roles.length > 0 && (
                  <div className="clms-topbar__dropdown-roles">
                    <Shield size={12} className="clms-topbar__role-icon" />
                    <span>{user.roles.join(', ')}</span>
                  </div>
                )}
              </div>

              <ul className="clms-topbar__dropdown-menu">
                <li>
                  <button
                    type="button"
                    className="clms-topbar__dropdown-item clms-topbar__dropdown-item--danger"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      signOut();
                    }}
                    role="menuitem"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
