import React from 'react';
import { FileQuestion, AlertCircle, ShieldAlert } from 'lucide-react';
import { Button } from './Button';
import './EmptyState.css';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon = <FileQuestion size={40} className="clms-empty-state__icon-default" />,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`clms-empty-state border-hairline ${className}`}>
      <div className="clms-empty-state__icon">{icon}</div>
      <h3 className="clms-empty-state__title">{title}</h3>
      <p className="clms-empty-state__description">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div className={`clms-empty-state clms-empty-state--error border-hairline ${className}`} role="alert">
      <div className="clms-empty-state__icon clms-empty-state__icon--error">
        <AlertCircle size={40} />
      </div>
      <h3 className="clms-empty-state__title">{title}</h3>
      <p className="clms-empty-state__description">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="md" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

export interface UnauthorizedStateProps {
  title?: string;
  message?: string;
  className?: string;
}

export function UnauthorizedState({
  title = 'Access Denied',
  message = 'You do not have the required commercial capability to view or perform actions on this resource.',
  className = '',
}: UnauthorizedStateProps) {
  return (
    <div className={`clms-empty-state clms-empty-state--unauthorized border-hairline ${className}`} role="alert">
      <div className="clms-empty-state__icon clms-empty-state__icon--unauthorized">
        <ShieldAlert size={40} />
      </div>
      <h3 className="clms-empty-state__title">{title}</h3>
      <p className="clms-empty-state__description">{message}</p>
    </div>
  );
}
