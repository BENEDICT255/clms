// ==============================================================================
// CLMS Finance & Payment Ledger Domain Engine
// ==============================================================================
// Governed by PRODUCT.md Section 29 & 30:
// - Non-Overpayment Invariant: Cumulative Paid <= Invoiced Total
// - Partial Disbursement & Terminal Settlement
// - Currency Safety & Precise Numeric Arithmetic
// ==============================================================================

export interface PaymentCalculationInput {
  totalPayable: number;
  existingPaid: number;
  paymentAmount: number;
  currency: string;
}

export interface PaymentCalculationResult {
  isValid: boolean;
  paymentAmount: number;
  newCumulativePaid: number;
  newOutstandingBalance: number;
  resultingStatus: 'PARTIALLY_PAID' | 'SETTLED';
  errors: string[];
}

export class FinanceEngine {
  /**
   * Evaluates a proposed disbursement against the non-overpayment invariant:
   * Cumulative Payments <= Invoiced Total.
   */
  public static calculatePayment(input: PaymentCalculationInput): PaymentCalculationResult {
    const errors: string[] = [];

    const existingPaid = Math.max(0, input.existingPaid);
    const outstanding = Math.max(0, input.totalPayable - existingPaid);

    if (input.paymentAmount <= 0) {
      errors.push('Payment disbursement amount must be greater than zero.');
    }

    if (input.paymentAmount > outstanding) {
      errors.push(
        `Disbursement amount (${input.paymentAmount.toLocaleString()} ${input.currency}) exceeds remaining outstanding balance (${outstanding.toLocaleString()} ${input.currency}).`
      );
    }

    const newCumulativePaid = existingPaid + (errors.length === 0 ? input.paymentAmount : 0);
    const newOutstandingBalance = Math.max(0, input.totalPayable - newCumulativePaid);

    const resultingStatus: 'PARTIALLY_PAID' | 'SETTLED' =
      newOutstandingBalance <= 0 ? 'SETTLED' : 'PARTIALLY_PAID';

    return {
      isValid: errors.length === 0,
      paymentAmount: input.paymentAmount,
      newCumulativePaid,
      newOutstandingBalance,
      resultingStatus,
      errors,
    };
  }

  /**
   * Determines if an invoice is in a valid status to receive payment disbursements.
   */
  public static isEligibleForPayment(status: string): boolean {
    const eligibleStatuses = [
      'SC_APPROVED',
      'UNDER_FINANCE_REVIEW',
      'APPROVED_FOR_PAYMENT',
      'PARTIALLY_PAID',
    ];
    return eligibleStatuses.includes(status);
  }
}
