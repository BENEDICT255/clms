import React from 'react';
import { FileText, ChevronRight, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import './Dashboard.css';

export interface AttentionItemData {
  id: string;
  label: string;
  count?: number;
  iconType?: 'file' | 'alert' | 'clock' | 'check';
  badgeColor?: 'brand' | 'danger' | 'warning' | 'neutral';
  onClick?: () => void;
  ariaLabel?: string;
}

export interface AttentionListProps {
  items: AttentionItemData[];
  emptyMessage?: string;
  className?: string;
}

export const AttentionList: React.FC<AttentionListProps> = ({
  items,
  emptyMessage = 'No items require attention at this time.',
  className = '',
}) => {
  if (items.length === 0) {
    return (
      <div className={`clms-attention-list__empty ${className}`}>
        <CheckCircle2 size={16} className="clms-attention-list__empty-icon" />
        <span>{emptyMessage}</span>
      </div>
    );
  }

  return (
    <div className={`clms-attention-list ${className}`} role="list">
      {items.map((item) => {
        const isClickable = Boolean(item.onClick);

        const handleKeyDown = (e: React.KeyboardEvent) => {
          if ((e.key === 'Enter' || e.key === ' ') && item.onClick) {
            e.preventDefault();
            item.onClick();
          }
        };

        const renderIcon = () => {
          switch (item.iconType) {
            case 'alert':
              return <AlertCircle size={14} className="clms-attention-item__icon clms-attention-item__icon--danger" />;
            case 'clock':
              return <Clock size={14} className="clms-attention-item__icon clms-attention-item__icon--warning" />;
            case 'check':
              return <CheckCircle2 size={14} className="clms-attention-item__icon clms-attention-item__icon--success" />;
            case 'file':
            default:
              return <FileText size={14} className="clms-attention-item__icon clms-attention-item__icon--brand" />;
          }
        };

        return (
          <div
            key={item.id}
            className={`clms-attention-item ${isClickable ? 'clms-attention-item--clickable' : ''}`}
            onClick={item.onClick}
            onKeyDown={isClickable ? handleKeyDown : undefined}
            role={isClickable ? 'button' : 'listitem'}
            tabIndex={isClickable ? 0 : undefined}
            aria-label={item.ariaLabel || item.label}
          >
            <div className="clms-attention-item__left">
              {renderIcon()}
              <span className="clms-attention-item__label">{item.label}</span>
            </div>

            <div className="clms-attention-item__right">
              {item.count !== undefined && (
                <span className="clms-attention-item__count tabular-nums">{item.count}</span>
              )}
              {isClickable && (
                <ChevronRight size={14} className="clms-attention-item__chevron" aria-hidden="true" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
