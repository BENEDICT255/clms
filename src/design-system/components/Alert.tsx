import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import './Alert.css';

export interface AlertProps {
  type?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function Alert({
  type = 'info',
  title,
  children,
  onClose,
  className = '',
}: AlertProps) {
  const iconMap = {
    info: <Info size={16} aria-hidden="true" />,
    warning: <AlertTriangle size={16} aria-hidden="true" />,
    danger: <AlertCircle size={16} aria-hidden="true" />,
    success: <CheckCircle2 size={16} aria-hidden="true" />,
  };

  return (
    <div className={`clms-alert clms-alert--${type} ${className}`} role="alert">
      <div className="clms-alert__icon">{iconMap[type]}</div>
      <div className="clms-alert__content">
        {title && <div className="clms-alert__title">{title}</div>}
        <div className="clms-alert__description">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="clms-alert__close"
          aria-label="Dismiss alert"
        >
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
