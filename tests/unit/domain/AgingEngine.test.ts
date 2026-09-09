// ==============================================================================
// CLMS Commercial Aging Engine Unit Tests
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { AgingEngine } from '@/domain/finance/AgingEngine';

describe('AgingEngine — Due Date & Aging Bracket Calculations', () => {
  it('calculates exact due date based on payment terms (Net 30, Net 45)', () => {
    const baseline = '2026-01-01';

    const net30 = AgingEngine.evaluateAging({
      baselineDate: baseline,
      paymentTermsDays: 30,
      outstandingBalance: 10_000_000,
      asOfDate: '2026-01-15',
    });
    expect(net30.dueDate).toBe('2026-01-31');
    expect(net30.isOverdue).toBe(false);
    expect(net30.agingBucket).toBe('CURRENT_NOT_DUE');

    const net45 = AgingEngine.evaluateAging({
      baselineDate: baseline,
      paymentTermsDays: 45,
      outstandingBalance: 10_000_000,
      asOfDate: '2026-01-15',
    });
    expect(net45.dueDate).toBe('2026-02-15');
    expect(net45.isOverdue).toBe(false);
  });

  it('categorizes 1–30 days overdue accurately', () => {
    const res = AgingEngine.evaluateAging({
      baselineDate: '2026-01-01',
      paymentTermsDays: 30, // Due: 2026-01-31
      outstandingBalance: 5_000_000,
      asOfDate: '2026-02-10', // 10 days past due
    });

    expect(res.isOverdue).toBe(true);
    expect(res.daysOverdue).toBe(10);
    expect(res.agingBucket).toBe('AGING_1_30');
    expect(res.bucketLabel).toBe('1–30 Days Overdue');
  });

  it('categorizes 31–60 days overdue accurately', () => {
    const res = AgingEngine.evaluateAging({
      baselineDate: '2026-01-01',
      paymentTermsDays: 30, // Due: 2026-01-31
      outstandingBalance: 5_000_000,
      asOfDate: '2026-03-15', // 43 days past due
    });

    expect(res.isOverdue).toBe(true);
    expect(res.daysOverdue).toBe(43);
    expect(res.agingBucket).toBe('AGING_31_60');
  });

  it('categorizes 61–90 days overdue accurately', () => {
    const res = AgingEngine.evaluateAging({
      baselineDate: '2026-01-01',
      paymentTermsDays: 30, // Due: 2026-01-31
      outstandingBalance: 5_000_000,
      asOfDate: '2026-04-15', // 74 days past due
    });

    expect(res.isOverdue).toBe(true);
    expect(res.daysOverdue).toBe(74);
    expect(res.agingBucket).toBe('AGING_61_90');
  });

  it('categorizes 90+ days overdue accurately', () => {
    const res = AgingEngine.evaluateAging({
      baselineDate: '2026-01-01',
      paymentTermsDays: 30, // Due: 2026-01-31
      outstandingBalance: 5_000_000,
      asOfDate: '2026-06-01', // >120 days past due
    });

    expect(res.isOverdue).toBe(true);
    expect(res.daysOverdue).toBeGreaterThan(90);
    expect(res.agingBucket).toBe('AGING_OVER_90');
  });

  it('excludes settled invoices from active overdue aging', () => {
    const res = AgingEngine.evaluateAging({
      baselineDate: '2026-01-01',
      paymentTermsDays: 30,
      outstandingBalance: 0, // Fully settled
      asOfDate: '2026-06-01',
    });

    expect(res.isOverdue).toBe(false);
    expect(res.daysOverdue).toBe(0);
    expect(res.agingBucket).toBe('SETTLED');
    expect(res.bucketLabel).toBe('Settled');
  });

  it('flags missing or null payment terms as REQUIRES_REVIEW and does NOT invent 30 days', () => {
    const resUndefined = AgingEngine.evaluateAging({
      baselineDate: '2026-01-01',
      paymentTermsDays: undefined,
      outstandingBalance: 5_000_000,
    });
    expect(resUndefined.dueDate).toBeNull();
    expect(resUndefined.agingBucket).toBe('REQUIRES_REVIEW');
    expect(resUndefined.isOverdue).toBe(false);

    const resNull = AgingEngine.evaluateAging({
      baselineDate: '2026-01-01',
      paymentTermsDays: null,
      outstandingBalance: 5_000_000,
    });
    expect(resNull.dueDate).toBeNull();
    expect(resNull.agingBucket).toBe('REQUIRES_REVIEW');
  });
});
