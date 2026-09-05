import './StatusBadge.css';

export type StatusType =
  | 'DRAFT'
  | 'UPLOADED'
  | 'PARSED'
  | 'PENDING_LEAD_APPROVAL'
  | 'PENDING_HOP_APPROVAL'
  | 'SUBMITTED'
  | 'RESUBMITTED'
  | 'UNDER_FINANCE_REVIEW'
  | 'APPROVED'
  | 'ISSUED'
  | 'SC_APPROVED'
  | 'APPROVED_FOR_PAYMENT'
  | 'PARTIALLY_PAID'
  | 'SETTLED'
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'RETURNED'
  | 'REJECTED'
  | 'VOIDED';

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, label, size = 'md', className = '' }: StatusBadgeProps) {
  const normalized = status.toUpperCase();

  let tone: 'neutral' | 'pending' | 'success' | 'danger' | 'info' = 'neutral';

  if (['SUBMITTED', 'RESUBMITTED', 'PENDING_LEAD_APPROVAL', 'PENDING_HOP_APPROVAL', 'UNDER_FINANCE_REVIEW', 'DIAGNOSTIC_REVIEW'].includes(normalized)) {
    tone = 'pending';
  } else if (['APPROVED', 'ISSUED', 'SC_APPROVED', 'APPROVED_FOR_PAYMENT', 'SETTLED', 'ACTIVE'].includes(normalized)) {
    tone = 'success';
  } else if (['RETURNED', 'REJECTED', 'VOIDED'].includes(normalized)) {
    tone = 'danger';
  } else if (['PARTIALLY_PAID'].includes(normalized)) {
    tone = 'info';
  }

  const displayLabel = label || normalized.replace(/_/g, ' ');

  return (
    <span className={`clms-badge clms-badge--${tone} clms-badge--${size} ${className}`}>
      <span className="clms-badge__dot" aria-hidden="true" />
      <span className="clms-badge__label">{displayLabel}</span>
    </span>
  );
}
