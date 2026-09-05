// ==============================================================================
// CLMS Payment Concurrency, Security & Sanitization Unit Tests
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { FinanceEngine } from '@/domain/finance/FinanceEngine';
import { sanitizeCsvValue, exportToSanitizedCsv } from '@/utils/security/csvSanitizer';

describe('Payment Concurrency, Security & Injection Protections', () => {
  describe('Simulated Concurrent Payment Race Condition', () => {
    it('prevents double-disbursement when two users simultaneously submit remaining balance', () => {
      const TOTAL_CLAIM = 100_000_000;
      let sharedOutstanding = 40_000_000;
      let sharedPaid = 60_000_000;

      // Simulated transaction executor mimicking PostgreSQL FOR UPDATE row locking
      function executeDisbursement(amount: number) {
        // Atomic evaluation under row lock
        const check = FinanceEngine.calculatePayment({
          totalPayable: TOTAL_CLAIM,
          existingPaid: sharedPaid,
          paymentAmount: amount,
          currency: 'TZS',
        });

        if (!check.isValid) {
          return { success: false, error: check.errors[0] };
        }

        // Commit transaction
        sharedPaid = check.newCumulativePaid;
        sharedOutstanding = check.newOutstandingBalance;
        return { success: true, outstanding: sharedOutstanding, status: check.resultingStatus };
      }

      // Finance User A attempts 40M
      const userA = executeDisbursement(40_000_000);
      expect(userA.success).toBe(true);
      expect(userA.outstanding).toBe(0);
      expect(userA.status).toBe('SETTLED');

      // Finance User B simultaneously attempts 40M against the same invoice
      const userB = executeDisbursement(40_000_000);
      expect(userB.success).toBe(false);
      expect(userB.error).toMatch(/exceeds remaining outstanding balance/i);

      // Verify that total disbursed exactly equals 100M and never 140M
      expect(sharedPaid).toBe(100_000_000);
      expect(sharedOutstanding).toBe(0);
    });
  });

  describe('CSV Formula Injection Sanitization (Section 68)', () => {
    it('sanitizes strings starting with dangerous formula triggers (=, +, -, @)', () => {
      expect(sanitizeCsvValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvValue('+CMD|/C calc!A0')).toBe("'+CMD|/C calc!A0");
      expect(sanitizeCsvValue('-1+1')).toBe("'-1+1");
      expect(sanitizeCsvValue('@SUM(1,2)')).toBe("'@SUM(1,2)");
    });

    it('handles normal benign strings, numbers, and nulls safely', () => {
      expect(sanitizeCsvValue('Standard Chartered Operating A/C')).toBe('Standard Chartered Operating A/C');
      expect(sanitizeCsvValue(12500000)).toBe('12500000');
      expect(sanitizeCsvValue(null)).toBe('');
      expect(sanitizeCsvValue(undefined)).toBe('');
    });

    it('quotes strings containing commas or internal double-quotes', () => {
      expect(sanitizeCsvValue('Helios Towers, Tanzania')).toBe('"Helios Towers, Tanzania"');
      expect(sanitizeCsvValue('Invoice "Special" Ref')).toBe('"Invoice ""Special"" Ref"');
    });

    it('exports a full sanitized CSV table correctly', () => {
      const headers = [
        { key: 'ref' as const, label: 'Reference' },
        { key: 'amount' as const, label: 'Amount' },
        { key: 'notes' as const, label: 'Notes' },
      ];

      const rows = [
        { ref: '=MALICIOUS_CMD', amount: 5000, notes: 'Normal comment' },
        { ref: 'INV-2026-001', amount: 10000, notes: 'Contains, comma' },
      ];

      const csv = exportToSanitizedCsv(headers, rows);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Reference,Amount,Notes');
      expect(lines[1]).toBe("'=MALICIOUS_CMD,5000,Normal comment");
      expect(lines[2]).toBe('INV-2026-001,10000,"Contains, comma"');
    });
  });
});
