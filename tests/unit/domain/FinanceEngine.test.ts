// ==============================================================================
// CLMS Finance Engine & Non-Overpayment Invariant Unit Tests
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { FinanceEngine } from '@/domain/finance/FinanceEngine';

describe('FinanceEngine — Non-Overpayment & Settlement Invariants', () => {
  const TOTAL_INVOICE_CLAIM = 100_000_000; // 100M TZS

  it('correctly calculates initial partial payment (e.g. 60M of 100M)', () => {
    const res = FinanceEngine.calculatePayment({
      totalPayable: TOTAL_INVOICE_CLAIM,
      existingPaid: 0,
      paymentAmount: 60_000_000,
      currency: 'TZS',
    });

    expect(res.isValid).toBe(true);
    expect(res.newCumulativePaid).toBe(60_000_000);
    expect(res.newOutstandingBalance).toBe(40_000_000);
    expect(res.resultingStatus).toBe('PARTIALLY_PAID');
    expect(res.errors).toHaveLength(0);
  });

  it('blocks overpayment attempt (e.g. Attempting 50M when outstanding is 40M)', () => {
    const res = FinanceEngine.calculatePayment({
      totalPayable: TOTAL_INVOICE_CLAIM,
      existingPaid: 60_000_000,
      paymentAmount: 50_000_000,
      currency: 'TZS',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors).toHaveLength(1);
    expect(res.errors[0]).toMatch(/exceeds remaining outstanding balance/i);
  });

  it('reaches terminal SETTLED status on exact remaining disbursement (e.g. 40M)', () => {
    const res = FinanceEngine.calculatePayment({
      totalPayable: TOTAL_INVOICE_CLAIM,
      existingPaid: 60_000_000,
      paymentAmount: 40_000_000,
      currency: 'TZS',
    });

    expect(res.isValid).toBe(true);
    expect(res.newCumulativePaid).toBe(100_000_000);
    expect(res.newOutstandingBalance).toBe(0);
    expect(res.resultingStatus).toBe('SETTLED');
  });

  it('rejects zero or negative disbursement amounts', () => {
    const zeroRes = FinanceEngine.calculatePayment({
      totalPayable: TOTAL_INVOICE_CLAIM,
      existingPaid: 0,
      paymentAmount: 0,
      currency: 'TZS',
    });
    expect(zeroRes.isValid).toBe(false);
    expect(zeroRes.errors[0]).toMatch(/greater than zero/i);

    const negRes = FinanceEngine.calculatePayment({
      totalPayable: TOTAL_INVOICE_CLAIM,
      existingPaid: 0,
      paymentAmount: -5_000_000,
      currency: 'TZS',
    });
    expect(negRes.isValid).toBe(false);
    expect(negRes.errors[0]).toMatch(/greater than zero/i);
  });

  it('validates payment eligibility statuses', () => {
    expect(FinanceEngine.isEligibleForPayment('SC_APPROVED')).toBe(true);
    expect(FinanceEngine.isEligibleForPayment('APPROVED_FOR_PAYMENT')).toBe(true);
    expect(FinanceEngine.isEligibleForPayment('PARTIALLY_PAID')).toBe(true);
    expect(FinanceEngine.isEligibleForPayment('SUBMITTED')).toBe(false);
    expect(FinanceEngine.isEligibleForPayment('RETURNED')).toBe(false);
    expect(FinanceEngine.isEligibleForPayment('SETTLED')).toBe(false);
  });
});
