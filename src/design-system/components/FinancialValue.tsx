import type { CSSProperties } from 'react';
import './FinancialValue.css';

export interface FinancialValueProps {
  amount: number | string;
  currency?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  trend?: 'positive' | 'negative' | 'neutral';
  showZeroAsBlank?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function FinancialValue({
  amount,
  currency = 'TZS',
  size = 'md',
  showZeroAsBlank = false,
  className = '',
  style,
}: FinancialValueProps) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return <span className={`clms-financial-val clms-financial-val--${size} ${className}`} style={style}>—</span>;
  }

  if (numericAmount === 0 && showZeroAsBlank) {
    return <span className={`clms-financial-val clms-financial-val--${size} ${className}`} style={style}>—</span>;
  }

  // Format with standard thousands separator
  const formattedAmount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: currency === 'TZS' ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);

  return (
    <span className={`clms-financial-val clms-financial-val--${size} tabular-nums ${className}`} style={style}>
      <span className="clms-financial-val__currency">{currency}</span>
      <span className="clms-financial-val__amount">{formattedAmount}</span>
    </span>
  );
}

export interface MetricItem {
  label: string;
  amount: number | string;
  currency?: string;
  badge?: string;
}

export interface FinancialSummaryStripProps {
  metrics: MetricItem[];
  className?: string;
  style?: CSSProperties;
}

export function FinancialSummaryStrip({ metrics, className = '', style }: FinancialSummaryStripProps) {
  return (
    <div className={`clms-summary-strip border-hairline ${className}`} style={style}>
      {metrics.map((item, index) => (
        <div key={index} className="clms-summary-strip__item">
          <span className="clms-summary-strip__label">{item.label}</span>
          <FinancialValue amount={item.amount} currency={item.currency || 'TZS'} size="lg" />
          {item.badge && <span className="clms-summary-strip__badge">{item.badge}</span>}
        </div>
      ))}
    </div>
  );
}
