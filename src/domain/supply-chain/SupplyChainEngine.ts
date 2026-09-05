// ==============================================================================
// CLMS Supply Chain Domain Engine
// ==============================================================================
// Governed by PRODUCT.md Section 27 & 28:
// - SCM Review Gatekeeping
// - Structured Return Reason Codes & Explanations
// - Resubmission and Approval Invariant Verification
// ==============================================================================

export type ReturnReasonCode =
  | 'INVOICE_NUMBER_MISMATCH'
  | 'TAX_AMOUNT_MISCALCULATION'
  | 'MISSING_SUPPORTING_DOC'
  | 'ILLEGIBLE_ATTACHMENT'
  | 'INCORRECT_DATE'
  | 'COMMERCIAL_TERMS_DISCREPANCY'
  | 'OTHER';

export interface ReturnReasonOption {
  code: ReturnReasonCode;
  label: string;
  description: string;
}

export const RETURN_REASON_OPTIONS: ReturnReasonOption[] = [
  {
    code: 'INVOICE_NUMBER_MISMATCH',
    label: 'Invoice Number Discrepancy',
    description: 'Supplier commercial tax invoice number does not match submitted tax invoice header.',
  },
  {
    code: 'TAX_AMOUNT_MISCALCULATION',
    label: 'VAT / Tax Calculation Error',
    description: 'Computed tax or VAT amount deviates from statutory or contractual rates.',
  },
  {
    code: 'MISSING_SUPPORTING_DOC',
    label: 'Missing Mandatory Document',
    description: 'Required supporting documentation (e.g., test signoff, delivery note, tax receipt) is missing.',
  },
  {
    code: 'ILLEGIBLE_ATTACHMENT',
    label: 'Illegible / Corrupt Attachment',
    description: 'One or more uploaded document files cannot be read, verified, or opened.',
  },
  {
    code: 'INCORRECT_DATE',
    label: 'Invoice Date Outside Valid Range',
    description: 'Supplier invoice date predates certificate issuance or exceeds allowable submission window.',
  },
  {
    code: 'COMMERCIAL_TERMS_DISCREPANCY',
    label: 'Commercial Terms Inconsistency',
    description: 'Payment terms, bank details, or vendor legal entity do not match purchase order master data.',
  },
  {
    code: 'OTHER',
    label: 'Other Commercial Exception',
    description: 'Requires explicit detailed explanatory commentary.',
  },
];

export interface ValidateReturnInput {
  returnCode: ReturnReasonCode;
  reason: string;
}

export interface ValidateResubmitInput {
  supplierInvoiceNo: string;
  invoiceDate: string;
  notes?: string | undefined;
}

export class SupplyChainEngine {
  public static validateReturnInput(input: ValidateReturnInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.returnCode) {
      errors.push('A structured return reason category must be selected.');
    }

    if (!input.reason || input.reason.trim().length < 5) {
      errors.push('A detailed explanatory reason of at least 5 characters is mandatory when returning an invoice.');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  public static canApprove(currentStatus: string): boolean {
    return currentStatus === 'SUBMITTED' || currentStatus === 'RESUBMITTED';
  }

  public static canReturn(currentStatus: string): boolean {
    return currentStatus === 'SUBMITTED' || currentStatus === 'RESUBMITTED';
  }

  public static canResubmit(currentStatus: string): boolean {
    return currentStatus === 'RETURNED' || currentStatus === 'SC_RETURNED';
  }

  public static validateResubmission(input: ValidateResubmitInput): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!input.supplierInvoiceNo || input.supplierInvoiceNo.trim().length < 2) {
      errors.push('Supplier Commercial Invoice Number must be provided.');
    }

    if (!input.invoiceDate) {
      errors.push('Supplier Invoice Date is mandatory.');
    } else {
      const parsedDate = new Date(input.invoiceDate);
      if (isNaN(parsedDate.getTime())) {
        errors.push('Supplier Invoice Date is invalid.');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
