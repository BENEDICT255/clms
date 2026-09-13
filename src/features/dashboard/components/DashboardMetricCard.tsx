import React from 'react';
import { ChevronRight } from 'lucide-react';
import './Dashboard.css';

export interface DashboardMetricCardProps {
  title: string;
  value: string | number;
  subvalue?: string;
  progress?: {
    percentage: number;
    color?: 'brand' | 'neutral' | 'success' | 'danger';
  };
  accent?: 'neutral' | 'brand' | 'success' | 'danger';
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
}

export const DashboardMetricCard: React.FC<DashboardMetricCardProps> = ({
  title,
  value,
  subvalue,
  progress,
  accent = 'neutral',
  onClick,
  ariaLabel,
  className = '',
}) => {
  const isClickable = Boolean(onClick);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`clms-dashboard-metric-card ${isClickable ? 'clms-dashboard-metric-card--clickable' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={ariaLabel || `${title}: ${value}${subvalue ? ` (${subvalue})` : ''}`}
    >
      <div className="clms-dashboard-metric-card__header">
        <span
          className={`clms-dashboard-metric-card__value tabular-nums ${
            accent === 'brand'
              ? 'clms-dashboard-metric-card__value--brand'
              : accent === 'danger'
              ? 'clms-dashboard-metric-card__value--danger'
              : accent === 'success'
              ? 'clms-dashboard-metric-card__value--success'
              : ''
          }`}
        >
          {value}
        </span>
        {isClickable && (
          <ChevronRight size={14} className="clms-dashboard-metric-card__chevron" aria-hidden="true" />
        )}
      </div>

      <div className="clms-dashboard-metric-card__label-row">
        <span className="clms-dashboard-metric-card__title">{title}</span>
        {subvalue && (
          <span className="clms-dashboard-metric-card__subvalue">{subvalue}</span>
        )}
      </div>

      {progress && (
        <div className="clms-dashboard-metric-card__progress-wrapper">
          <span className="clms-dashboard-metric-card__progress-pct tabular-nums">
            {Math.round(progress.percentage)}%
          </span>
          <div className="clms-dashboard-metric-card__progress-bar">
            <div
              className={`clms-dashboard-metric-card__progress-fill clms-dashboard-metric-card__progress-fill--${progress.color || 'brand'}`}
              style={{ width: `${Math.min(100, Math.max(0, progress.percentage))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
