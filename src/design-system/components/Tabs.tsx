import type { CSSProperties } from 'react';
import './Tabs.css';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onTabChange: (id: string) => void;
  className?: string;
  style?: CSSProperties;
}

export function Tabs({ tabs, activeTabId, onTabChange, className = '', style }: TabsProps) {
  return (
    <div className={`clms-tabs border-hairline ${className}`} role="tablist" style={style}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            disabled={tab.disabled}
            className={`clms-tab ${isActive ? 'clms-tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="clms-tab__label">{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className="clms-tab__count tabular-nums">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface NotificationIndicatorProps {
  unreadCount?: number;
  className?: string;
}

export function NotificationIndicator({ unreadCount = 0, className = '' }: NotificationIndicatorProps) {
  if (unreadCount <= 0) return null;

  return (
    <span
      className={`clms-notification-indicator tabular-nums ${className}`}
      aria-label={`${unreadCount} unread notifications`}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
}
