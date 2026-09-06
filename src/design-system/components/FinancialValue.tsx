import type { CSSProperties, ReactNode } from 'react';
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

export type SummaryMetric =
  | { kind: 'money'; label: string; amount: number | string; currency?: string; badge?: string }
  | { kind: 'text'; label: string; value: string; badge?: string }
  | { kind: 'count'; label: string; value: number; suffix?: string; badge?: string }
  | { kind: 'percentage'; label: string; value: number; badge?: string }
  | { kind: 'status'; label: string; value: string; variant?: string; badge?: string };

export type MetricItem =
  | SummaryMetric
  | { label: string; amount: number | string; currency?: string; badge?: string };

export interface FinancialSummaryStripProps {
  metrics: MetricItem[];
  className?: string;
  style?: CSSProperties;
}

export function FinancialSummaryStrip({ metrics, className = '', style }: FinancialSummaryStripProps) {
  return (
    <div className={`clms-summary-strip border-hairline ${className}`} style={style}>
      {metrics.map((item, index) => {
        let content: ReactNode;

        if ('kind' in item) {
          switch (item.kind) {
            case 'money':
              content = <FinancialValue amount={item.amount} currency={item.currency || 'TZS'} size="lg" />;
              break;
            case 'count':
              content = (
                <span className="clms-financial-val clms-financial-val--lg tabular-nums">
                  <span className="clms-financial-val__amount">{item.value.toLocaleString('en-US')}</span>
                  {item.suffix && (
                    <span className="clms-financial-val__currency" style={{ marginLeft: 'var(--space-1)', textTransform: 'none' }}>
                      {item.suffix}
                    </span>
                  )}
                </span>
              );
              break;
            case 'percentage':
              content = (
                <span className="clms-financial-val clms-financial-val--lg tabular-nums">
                  <span className="clms-financial-val__amount">{item.value.toFixed(1)}%</span>
                </span>
              );
              break;
            case 'text':
            case 'status':
              content = (
                <span className="clms-financial-val clms-financial-val--lg">
                  <span
                    className="clms-financial-val__amount"
                    style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)' }}
                  >
                    {item.value || '—'}
                  </span>
                </span>
              );
              break;
          }
        } else {
          content = <FinancialValue amount={item.amount} currency={item.currency || 'TZS'} size="lg" />;
        }

        return (
          <div key={index} className="clms-summary-strip__item">
            <span className="clms-summary-strip__label">{item.label}</span>
            {content}
            {item.badge && <span className="clms-summary-strip__badge">{item.badge}</span>}
          </div>
        );
      })}
    </div>
  );
}
