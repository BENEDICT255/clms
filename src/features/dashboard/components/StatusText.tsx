import React from 'react';
import './Dashboard.css';

export type StatusType =
  | 'in_progress'
  | 'completed'
  | 'not_started'
  | 'due'
  | 'overdue'
  | 'returned'
  | 'submitted'
  | 'draft'
  | 'approved'
  | 'settled'
  | 'partial';

export interface StatusTextProps {
  status: string;
  type?: StatusType;
  showDot?: boolean;
  className?: string;
}

export const StatusText: React.FC<StatusTextProps> = ({
  status,
  type,
  showDot = true,
  className = '',
}) => {
  // Infer type if not explicitly supplied
  const inferredType: StatusType = type || (() => {
    const s = status.toLowerCase();
    if (s.includes('overdue') || s.includes('rejected') || s.includes('danger')) return 'overdue';
    if (s.includes('return')) return 'returned';
    if (s.includes('due') || s.includes('review') || s.includes('pending') || s.includes('progress')) return 'due';
    if (s.includes('settled') || s.includes('complete') || s.includes('approved') || s.includes('issued')) return 'completed';
    if (s.includes('partial')) return 'partial';
    if (s.includes('draft')) return 'draft';
    return 'not_started';
  })();

  return (
    <span className={`clms-status-text clms-status-text--${inferredType} ${className}`}>
      {showDot && <span className="clms-status-text__dot" aria-hidden="true">●</span>}
      <span className="clms-status-text__label">{status}</span>
    </span>
  );
};
