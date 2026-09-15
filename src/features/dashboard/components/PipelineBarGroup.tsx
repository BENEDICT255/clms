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
  maxHeight = 100,
}) => {
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className={`clms-pipeline-chart-container ${className}`} role="region" aria-label="Pipeline Stages">
      {/* Bars area sitting on the baseline */}
      <div className="clms-pipeline-chart-bars" style={{ height: `${maxHeight + 28}px` }}>
        {items.map((item) => {
          const isClickable = Boolean(item.onClick);
          // Calculate proportional bar height
          const barHeightPx = item.count === 0 ? 4 : Math.max(12, Math.round((item.count / maxCount) * maxHeight));

          const handleKeyDown = (e: React.KeyboardEvent) => {
            if ((e.key === 'Enter' || e.key === ' ') && item.onClick) {
              e.preventDefault();
              item.onClick();
            }
          };

          return (
            <div
              key={item.id}
              className={`clms-pipeline-col ${isClickable ? 'clms-pipeline-col--clickable' : ''}`}
              onClick={item.onClick}
              onKeyDown={isClickable ? handleKeyDown : undefined}
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              aria-label={item.ariaLabel || `${item.label}: ${item.count}`}
            >
              <span className="clms-pipeline-col__count tabular-nums">{item.count}</span>
              <div
                className="clms-pipeline-col__bar"
                style={{ height: `${barHeightPx}px` }}
              />
            </div>
          );
        })}
      </div>

      {/* Continuous horizontal baseline line */}
      <div className="clms-pipeline-chart-baseline" />

      {/* Stage labels row */}
      <div className="clms-pipeline-chart-labels">
        {items.map((item) => (
          <div key={item.id} className="clms-pipeline-col__label-box">
            <span className="clms-pipeline-col__label" title={item.label}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

