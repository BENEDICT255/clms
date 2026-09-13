import React from 'react';
import './Dashboard.css';

export interface ClickableProgressRowProps {
  label: string;
  amount: number;
  currency?: string;
  percentage?: number;
  color?: 'brand' | 'neutral' | 'success' | 'danger' | 'warning';
  onClick?: () => void;
  ariaLabel?: string;
  className?: string;
  showBar?: boolean;
}

export const ClickableProgressRow: React.FC<ClickableProgressRowProps> = ({
  label,
  amount,
  currency = 'TZS',
  percentage,
  color = 'brand',
  onClick,
  ariaLabel,
  className = '',
  showBar = true,
}) => {
  const isClickable = Boolean(onClick);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return (
    <div
      className={`clms-clickable-progress-row ${isClickable ? 'clms-clickable-progress-row--clickable' : ''} ${className}`}
      onClick={onClick}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={
        ariaLabel ||
        `${label}: ${currency} ${formattedAmount}${
          percentage !== undefined ? ` (${Math.round(percentage)}%)` : ''
        }`
      }
    >
      <div className="clms-clickable-progress-row__label-group">
        <span className="clms-clickable-progress-row__label">{label}</span>
      </div>

      {showBar && percentage !== undefined && (
        <div className="clms-clickable-progress-row__bar-track">
          <div
            className={`clms-clickable-progress-row__bar-fill clms-clickable-progress-row__bar-fill--${color}`}
            style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
          />
        </div>
      )}

      <div className="clms-clickable-progress-row__values">
        {percentage !== undefined && (
          <span className="clms-clickable-progress-row__percentage tabular-nums">
            {Math.round(percentage)}%
          </span>
        )}
        <span className="clms-clickable-progress-row__amount tabular-nums">
          {formattedAmount}
        </span>
      </div>
    </div>
  );
};
