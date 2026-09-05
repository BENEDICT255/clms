// ==============================================================================
// CLMS Invoicing Financial Domain Engine
// ==============================================================================
// Core Invariants per PRODUCT.md:
// - CUMULATIVE INVOICED VALUE <= VALID INVOICEABLE CERTIFIED ENTITLEMENT.
// - Default model: ONE issued certificate -> ONE commercial invoice.
// - Only ISSUED certificates are eligible for invoice creation.
// - Decimal-safe math, integer minor units / precise calculations.

export type InvoiceStatus =
  | 'DRAFT'
  | 'SUBMITTED' // AWAITING_SUPPLY_CHAIN_REVIEW
  | 'SC_APPROVED'
  | 'SC_RETURNED'
  | 'FINANCE_APPROVED'
  | 'SETTLED'
  | 'VOID';

export interface InvoiceCalculationInput {
  certifiedEntitlement: number;
  invoiceAmount: number;
  taxRatePercent?: number; // default e.g. 18% VAT if applicable
  existingInvoicedAmount?: number;
}

export interface InvoiceCalculationResult {
  isValid: boolean;
  baseAmount: number;
  taxAmount: number;
  totalPayable: number;
  remainingEntitlement: number;
  errors: string[];
  warnings: string[];
}

export class InvoiceEngine {
  public static calculateInvoice(input: InvoiceCalculationInput): InvoiceCalculationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const existingInvoiced = input.existingInvoicedAmount || 0;
    const availableEntitlement = Math.max(0, input.certifiedEntitlement - existingInvoiced);

    if (input.invoiceAmount <= 0) {
      errors.push('Invoice amount must be greater than zero.');
    }

    if (input.invoiceAmount > availableEntitlement) {
      errors.push(
        `Invoice amount (${input.invoiceAmount.toLocaleString()}) exceeds valid invoiceable certified entitlement (${availableEntitlement.toLocaleString()}).`
      );
    }

    const taxRate = input.taxRatePercent !== undefined ? input.taxRatePercent : 18;
    const baseAmount = input.invoiceAmount;
    const taxAmount = Math.round((baseAmount * taxRate) / 100);
    const totalPayable = baseAmount + taxAmount;
    const remainingEntitlement = Math.max(0, availableEntitlement - baseAmount);

    return {
      isValid: errors.length === 0,
      baseAmount,
      taxAmount,
      totalPayable,
      remainingEntitlement,
      errors,
      warnings,
    };
  }

  public static canTransition(currentStatus: InvoiceStatus, targetStatus: InvoiceStatus): boolean {
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      DRAFT: ['SUBMITTED', 'VOID'],
      SUBMITTED: ['SC_APPROVED', 'SC_RETURNED', 'VOID'],
      SC_APPROVED: ['FINANCE_APPROVED', 'SC_RETURNED', 'VOID'],
      SC_RETURNED: ['DRAFT', 'VOID'],
      FINANCE_APPROVED: ['SETTLED', 'VOID'],
      SETTLED: [],
      VOID: [],
    };

    return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
  }
}
