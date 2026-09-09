// ==============================================================================
// CLMS Commercial Invoice Aging Domain Engine
// ==============================================================================
// Governed by PRODUCT.md Section 31:
// - Authoritative Term Sources & Due Date Derivation
// - Configurable Aging Buckets
// - Settlement Exclusion from Overdue Exposure
// ==============================================================================

export type AgingBucket =
  | 'CURRENT_NOT_DUE'
  | 'AGING_1_30'
  | 'AGING_31_60'
  | 'AGING_61_90'
  | 'AGING_OVER_90'
  | 'SETTLED'
  | 'REQUIRES_REVIEW';

export interface AgingEvaluationInput {
  baselineDate: string | Date; // SC Approved date or Invoice Date
  paymentTermsDays?: number | undefined | null; // e.g. 30, 45, 60, 90
  outstandingBalance: number;
  asOfDate?: string | Date | undefined; // Defaults to current date
}

export interface AgingEvaluationResult {
  dueDate: string | null; // YYYY-MM-DD or null if payment terms missing
  daysOverdue: number;
  agingBucket: AgingBucket;
  isOverdue: boolean;
  bucketLabel: string;
}

export class AgingEngine {
  public static evaluateAging(input: AgingEvaluationInput): AgingEvaluationResult {
    // Section 6: Missing payment terms must NOT become 30 days. No invented dates.
    if (input.paymentTermsDays === undefined || input.paymentTermsDays === null || input.paymentTermsDays <= 0) {
      return {
        dueDate: null,
        daysOverdue: 0,
        agingBucket: 'REQUIRES_REVIEW',
        isOverdue: false,
        bucketLabel: 'Requires Review (Missing Payment Terms)',
      };
    }

    const termDays = input.paymentTermsDays;
    const base = new Date(input.baselineDate);
    // Add payment terms days
    const due = new Date(base.getTime());
    due.setDate(due.getDate() + termDays);

    const asOf = input.asOfDate ? new Date(input.asOfDate) : new Date();

    // Normalize to midnight UTC for date-only comparison
    const dueMidnight = new Date(Date.UTC(due.getFullYear(), due.getMonth(), due.getDate())).getTime();
    const asOfMidnight = new Date(Date.UTC(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())).getTime();

    const diffMs = asOfMidnight - dueMidnight;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const daysOverdue = diffDays > 0 ? diffDays : 0;

    const dueDateStr = due.toISOString().split('T')[0] ?? '';

    // Settled invoices are excluded from active overdue aging
    if (input.outstandingBalance <= 0) {
      return {
        dueDate: dueDateStr,
        daysOverdue: 0,
        agingBucket: 'SETTLED',
        isOverdue: false,
        bucketLabel: 'Settled',
      };
    }

    if (daysOverdue === 0) {
      return {
        dueDate: dueDateStr,
        daysOverdue: 0,
        agingBucket: 'CURRENT_NOT_DUE',
        isOverdue: false,
        bucketLabel: 'Current / Not Due',
      };
    }

    if (daysOverdue <= 30) {
      return {
        dueDate: dueDateStr,
        daysOverdue,
        agingBucket: 'AGING_1_30',
        isOverdue: true,
        bucketLabel: '1–30 Days Overdue',
      };
    }

    if (daysOverdue <= 60) {
      return {
        dueDate: dueDateStr,
        daysOverdue,
        agingBucket: 'AGING_31_60',
        isOverdue: true,
        bucketLabel: '31–60 Days Overdue',
      };
    }

    if (daysOverdue <= 90) {
      return {
        dueDate: dueDateStr,
        daysOverdue,
        agingBucket: 'AGING_61_90',
        isOverdue: true,
        bucketLabel: '61–90 Days Overdue',
      };
    }

    return {
      dueDate: dueDateStr,
      daysOverdue,
      agingBucket: 'AGING_OVER_90',
      isOverdue: true,
      bucketLabel: '90+ Days Overdue',
    };
  }
}
