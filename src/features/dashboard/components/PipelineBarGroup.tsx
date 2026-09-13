import React from 'react';
import './Dashboard.css';

export interface PipelineBarItem {
  id: string;
  label: string;
  count: number;
  color?: 'brand' | 'neutral' | 'success' | 'danger' | 'warning' | undefined;
  onClick?: () => void;
  ariaLabel?: string;
}

export interface PipelineBarGroupProps {
  items: PipelineBarItem[];
  className?: string;
  maxHeight?: number;
}

export const PipelineBarGroup: React.FC<PipelineBarGroupProps> = ({
  items,
  className = '',
  maxHeight = 90,
}) => {
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className={`clms-pipeline-bar-group ${className}`} role="region" aria-label="Pipeline Stages">
      {items.map((item) => {
        const isClickable = Boolean(item.onClick);
        const heightPct = item.count === 0 ? 6 : Math.max(12, Math.round((item.count / maxCount) * 100));
        const barHeightPx = Math.round((heightPct / 100) * maxHeight);

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if ((e.key === 'Enter' || e.key === ' ') && item.onClick) {
            e.preventDefault();
            item.onClick();
          }
        };

        return (
          <div
            key={item.id}
            className={`clms-pipeline-bar-item ${isClickable ? 'clms-pipeline-bar-item--clickable' : ''}`}
            onClick={item.onClick}
            onKeyDown={isClickable ? handleKeyDown : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            aria-label={item.ariaLabel || `${item.label}: ${item.count}`}
          >
            <span className="clms-pipeline-bar-item__count tabular-nums">
              {item.count}
            </span>
            <div className="clms-pipeline-bar-item__track" style={{ height: `${maxHeight}px` }}>
              <div
                className={`clms-pipeline-bar-item__bar clms-pipeline-bar-item__bar--${item.color || 'brand'}`}
                style={{ height: `${barHeightPx}px` }}
              />
            </div>
            <span className="clms-pipeline-bar-item__label" title={item.label}>
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
