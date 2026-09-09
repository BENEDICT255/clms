// ==============================================================================
// CLMS Invoice Engine Financial Invariant Unit Tests
// ==============================================================================
// Mandatory tests per Super Prompt 3:
// - Invoice value <= valid invoiceable certified entitlement (Rule 68, 106)
// - Over-invoicing blocked
// - 18% VAT calculations
// - State machine transitions (Rule 76, 120)

import { describe, it, expect } from 'vitest';
import { InvoiceEngine } from '@/domain/invoicing/InvoiceEngine';

describe('InvoiceEngine Financial Invariants', () => {
  const certifiedEntitlement = 10_000_000;

  it('allows full invoice matching exact certified entitlement', () => {
    const result = InvoiceEngine.calculateInvoice({
      certifiedEntitlement,
      invoiceAmount: 10_000_000,
      taxRatePercent: 18,
    });

    expect(result.isValid).toBe(true);
    expect(result.baseAmount).toBe(10_000_000);
    expect(result.taxAmount).toBe(1_800_000);
    expect(result.totalPayable).toBe(11_800_000);
    expect(result.remainingEntitlement).toBe(0);
  });

  it('strictly blocks invoice amount exceeding certified entitlement (Rule 68, 106)', () => {
    const result = InvoiceEngine.calculateInvoice({
      certifiedEntitlement,
      invoiceAmount: 10_000_001, // 1 TZS over entitlement
      taxRatePercent: 18,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('exceeds valid invoiceable certified entitlement');
  });

  it('accounts for existing invoiced amounts and blocks cumulative over-invoicing', () => {
    const result = InvoiceEngine.calculateInvoice({
      certifiedEntitlement,
      existingInvoicedAmount: 7_000_000,
      invoiceAmount: 4_000_000, // 7M + 4M = 11M > 10M
      taxRatePercent: 18,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('exceeds valid invoiceable certified entitlement (3,000,000)');
  });

  it('rejects zero or negative invoice amounts', () => {
    const result = InvoiceEngine.calculateInvoice({
      certifiedEntitlement,
      invoiceAmount: 0,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('must be greater than zero');
  });

  it('enforces invoice state machine transitions strictly (Rule 76)', () => {
    // DRAFT -> SUBMITTED is allowed
    expect(InvoiceEngine.canTransition('DRAFT', 'SUBMITTED')).toBe(true);

    // Direct jump DRAFT -> SETTLED is strictly forbidden
    expect(InvoiceEngine.canTransition('DRAFT', 'SETTLED')).toBe(false);

    // SUBMITTED -> SC_APPROVED is allowed
    expect(InvoiceEngine.canTransition('SUBMITTED', 'SC_APPROVED')).toBe(true);

    // SUBMITTED -> SC_RETURNED is allowed
    expect(InvoiceEngine.canTransition('SUBMITTED', 'SC_RETURNED')).toBe(true);

    // SC_RETURNED -> DRAFT is allowed for supplier correction
    expect(InvoiceEngine.canTransition('SC_RETURNED', 'DRAFT')).toBe(true);

    // SETTLED is terminal
    expect(InvoiceEngine.canTransition('SETTLED', 'DRAFT')).toBe(false);
  });

  it('correctly back-calculates net base and 18% VAT without double-taxation (calculateInclusiveInvoice)', () => {
    // Exact figure from user's commercial certificate: 15,300,898.36
    const totalEntitlement = 15_300_898.36;
    const result = InvoiceEngine.calculateInclusiveInvoice({
      certifiedEntitlement: totalEntitlement,
      taxRatePercent: 18,
    });

    expect(result.isValid).toBe(true);
    // Base amount = 15,300,898.36 / 1.18 = 12,966,863.02
    expect(result.baseAmount).toBe(12_966_863.02);
    // VAT amount = 15,300,898.36 - 12,966,863.02 = 2,334,035.34
    expect(result.taxAmount).toBe(2_334_035.34);
    // Total payable matches the exact certified entitlement without double-taxation
    expect(result.totalPayable).toBe(15_300_898.36);
    expect(result.baseAmount + result.taxAmount).toBeCloseTo(result.totalPayable, 2);
  });
});
