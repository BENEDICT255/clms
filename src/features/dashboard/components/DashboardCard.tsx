import React, { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import './Dashboard.css';

export interface DashboardCardProps {
  title: string;
  actionText?: string;
  onAction?: () => void;
  children: ReactNode;
  className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  actionText,
  onAction,
  children,
  className = '',
}) => {
  return (
    <div className={`clms-dashboard-card border-hairline ${className}`}>
      <div className="clms-dashboard-card__header">
        <h3 className="clms-dashboard-card__title">{title}</h3>
        {actionText && onAction && (
          <button
            type="button"
            className="clms-dashboard-card__action"
            onClick={onAction}
          >
            <span>{actionText}</span>
            <ArrowRight size={13} className="clms-dashboard-card__action-icon" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="clms-dashboard-card__body">
        {children}
      </div>
    </div>
  );
};
