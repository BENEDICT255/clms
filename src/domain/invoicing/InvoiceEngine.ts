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
  | 'SUBMITTED' // Awaiting Supply Chain Review
  | 'RETURNED'
  | 'RESUBMITTED'
  | 'SC_APPROVED'
  | 'SC_RETURNED'
  | 'UNDER_FINANCE_REVIEW'
  | 'APPROVED_FOR_PAYMENT'
  | 'PARTIALLY_PAID'
  | 'FINANCE_APPROVED'
  | 'SETTLED'
  | 'VOID';

export interface InvoiceCalculationInput {
  certifiedEntitlement: number;
  invoiceAmount: number;
  taxRatePercent?: number; // default e.g. 18% VAT if applicable
  existingInvoicedAmount?: number;
  isInclusiveTax?: boolean; // When true, certified entitlement is the TOTAL GROSS claim (after tax)
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

    if (input.invoiceAmount > availableEntitlement + 0.01) {
      errors.push(
        `Invoice amount (${input.invoiceAmount.toLocaleString()}) exceeds valid invoiceable certified entitlement (${availableEntitlement.toLocaleString()}).`
      );
    }

    const taxRate = input.taxRatePercent !== undefined ? input.taxRatePercent : 18;

    if (input.isInclusiveTax) {
      // Entitlement is the TOTAL GROSS after-tax value. Back-calculate Net Base and VAT.
      const totalPayable = input.invoiceAmount;
      const baseAmount = Math.round((totalPayable / (1 + taxRate / 100)) * 100) / 100;
      const taxAmount = Math.round((totalPayable - baseAmount) * 100) / 100;
      const remainingEntitlement = Math.max(0, availableEntitlement - totalPayable);

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

    // Standard tax-exclusive calculation
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

  /**
   * Back-calculates net base amount and VAT from an authoritative certified gross entitlement.
   * Total = Base + VAT, where Total === certifiedEntitlement.
   */
  public static calculateInclusiveInvoice(input: {
    certifiedEntitlement: number;
    taxRatePercent?: number;
    existingInvoicedAmount?: number;
  }): InvoiceCalculationResult {
    return this.calculateInvoice({
      certifiedEntitlement: input.certifiedEntitlement,
      invoiceAmount: input.certifiedEntitlement,
      taxRatePercent: input.taxRatePercent ?? 18,
      ...(input.existingInvoicedAmount !== undefined ? { existingInvoicedAmount: input.existingInvoicedAmount } : {}),
      isInclusiveTax: true,
    });
  }

  public static canTransition(currentStatus: InvoiceStatus, targetStatus: InvoiceStatus): boolean {
    const validTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      DRAFT: ['SUBMITTED', 'VOID'],
      SUBMITTED: ['SC_APPROVED', 'RETURNED', 'SC_RETURNED', 'VOID'],
      RETURNED: ['RESUBMITTED', 'DRAFT', 'VOID'],
      RESUBMITTED: ['SC_APPROVED', 'RETURNED', 'SC_RETURNED', 'VOID'],
      SC_APPROVED: ['UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT', 'PARTIALLY_PAID', 'FINANCE_APPROVED', 'SETTLED', 'RETURNED', 'VOID'],
      SC_RETURNED: ['RESUBMITTED', 'DRAFT', 'VOID'],
      UNDER_FINANCE_REVIEW: ['APPROVED_FOR_PAYMENT', 'PARTIALLY_PAID', 'SETTLED', 'VOID'],
      APPROVED_FOR_PAYMENT: ['PARTIALLY_PAID', 'SETTLED', 'VOID'],
      PARTIALLY_PAID: ['PARTIALLY_PAID', 'SETTLED', 'VOID'],
      FINANCE_APPROVED: ['SETTLED', 'PARTIALLY_PAID', 'VOID'],
      SETTLED: [],
      VOID: [],
    };

    return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
  }
}
