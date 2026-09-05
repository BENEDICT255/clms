// ==============================================================================
// CLMS Supply Chain Domain Engine Unit Tests
// ==============================================================================

import { describe, it, expect } from 'vitest';
import {
  SupplyChainEngine,
  RETURN_REASON_OPTIONS,
} from '@/domain/supply-chain/SupplyChainEngine';

describe('SupplyChainEngine', () => {
  describe('State Transition Eligibility', () => {
    it('allows approval only from SUBMITTED or RESUBMITTED states', () => {
      expect(SupplyChainEngine.canApprove('SUBMITTED')).toBe(true);
      expect(SupplyChainEngine.canApprove('RESUBMITTED')).toBe(true);
      expect(SupplyChainEngine.canApprove('DRAFT')).toBe(false);
      expect(SupplyChainEngine.canApprove('SC_APPROVED')).toBe(false);
      expect(SupplyChainEngine.canApprove('SETTLED')).toBe(false);
    });

    it('allows return only from SUBMITTED or RESUBMITTED states', () => {
      expect(SupplyChainEngine.canReturn('SUBMITTED')).toBe(true);
      expect(SupplyChainEngine.canReturn('RESUBMITTED')).toBe(true);
      expect(SupplyChainEngine.canReturn('RETURNED')).toBe(false);
      expect(SupplyChainEngine.canReturn('DRAFT')).toBe(false);
    });

    it('allows resubmission only when invoice is RETURNED or SC_RETURNED', () => {
      expect(SupplyChainEngine.canResubmit('RETURNED')).toBe(true);
      expect(SupplyChainEngine.canResubmit('SC_RETURNED')).toBe(true);
      expect(SupplyChainEngine.canResubmit('SUBMITTED')).toBe(false);
      expect(SupplyChainEngine.canResubmit('SC_APPROVED')).toBe(false);
    });
  });

  describe('Structured Return Validation', () => {
    it('accepts valid return code and explanatory commentary', () => {
      const result = SupplyChainEngine.validateReturnInput({
        returnCode: 'INVOICE_NUMBER_MISMATCH',
        reason: 'Invoice number TAX-001 differs from registered supplier invoice header.',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects return input when explanation is empty or too short', () => {
      const resultEmpty = SupplyChainEngine.validateReturnInput({
        returnCode: 'OTHER',
        reason: '',
      });
      expect(resultEmpty.isValid).toBe(false);
      expect(resultEmpty.errors[0]).toMatch(/mandatory/i);

      const resultShort = SupplyChainEngine.validateReturnInput({
        returnCode: 'OTHER',
        reason: 'Bad',
      });
      expect(resultShort.isValid).toBe(false);
      expect(resultShort.errors[0]).toMatch(/at least 5 characters/i);
    });

    it('ensures all structured return options have valid labels and descriptions', () => {
      expect(RETURN_REASON_OPTIONS.length).toBeGreaterThanOrEqual(6);
      for (const opt of RETURN_REASON_OPTIONS) {
        expect(opt.code).toBeDefined();
        expect(opt.label.length).toBeGreaterThan(0);
        expect(opt.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Resubmission Validation', () => {
    it('validates corrected invoice details successfully', () => {
      const result = SupplyChainEngine.validateResubmission({
        supplierInvoiceNo: 'TAX-INV-CORRECTED-99',
        invoiceDate: '2026-09-05',
        notes: 'Attached clear copy of tax clearance certificate.',
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects resubmission if supplier invoice number is empty', () => {
      const result = SupplyChainEngine.validateResubmission({
        supplierInvoiceNo: '',
        invoiceDate: '2026-09-05',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toMatch(/Supplier Commercial Invoice Number must be provided/i);
    });

    it('rejects resubmission if invoice date is invalid', () => {
      const result = SupplyChainEngine.validateResubmission({
        supplierInvoiceNo: 'TAX-001',
        invoiceDate: 'not-a-date',
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toMatch(/invalid/i);
    });
  });
});
