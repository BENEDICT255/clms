// ==============================================================================
// CLMS Commercial Package Cross-Validation Engine
// ==============================================================================
// Governed by PRODUCT.md Section 14:
// - Commercial Value Alignment (sum of site totals == PO net authorized total, tolerance <= 1.00 TZS)
// - Currency Parity
// - Supplier Consistency
// - Categorizes results: PASS, WARNING, BLOCKING, REVIEW_REQUIRED
// - Zero fabrication: failed PO amount extraction is NEVER repaired by copying BOQ amount
// ==============================================================================

import { ExtractedBOQResult, ExtractedPOResult, CommercialCrossValidationResult } from './types';
import { Money } from './Money';

export interface CrossValidationOptions {
  toleranceAmount?: number; // Standard default <= 1.00 TZS
  selectedSupplierName?: string;
}

export class CommercialCrossValidator {
  public static validate(
    boq: ExtractedBOQResult,
    po: ExtractedPOResult,
    options: CrossValidationOptions = {}
  ): CommercialCrossValidationResult & {
    isValid: boolean;
    blockingExceptions: string[];
    warnings: string[];
    discrepancyAmount: number;
  } {
    const tolerance = options.toleranceAmount ?? 1.0;
    const blockingReasons: string[] = [];
    const warningMessages: string[] = [];

    // 1. Currency Parity Check
    const boqCurrency = (boq.currency || 'UNKNOWN').toUpperCase();
    const poCurrency = (po.currency || 'UNKNOWN').toUpperCase();

    const currencyMatch = boqCurrency !== 'UNKNOWN' && poCurrency !== 'UNKNOWN' && boqCurrency === poCurrency;
    if (!currencyMatch) {
      blockingReasons.push(
        `CURRENCY_MISMATCH: Currency mismatch — BOQ currency (${boq.currency}) does not match PO currency (${po.currency}).`
      );
    }

    // 2. Commercial Value Alignment Check (Like-for-Like: BOQ Total vs PO Net Excl. Tax)
    let varianceAmount = 0;
    let toleranceApplied = false;

    if (po.authorizedAmount > 0 && boq.totalAmount > 0 && currencyMatch) {
      const boqMoney = Money.fromNumber(boq.totalAmount, boq.currency);
      const poMoney = Money.fromNumber(po.authorizedAmount, po.currency);

      const boqVal = boqMoney.majorAmount;
      const poVal = poMoney.majorAmount;
      varianceAmount = Math.abs(boqVal - poVal);

      if (varianceAmount > 0) {
        if (varianceAmount <= tolerance) {
          toleranceApplied = true;
          warningMessages.push(
            `Minor rounding variance detected between BOQ sum (${boqMoney.toString()}) and PO total (${poMoney.toString()}) within permitted tolerance (${tolerance} ${boq.currency}). Variance: ${varianceAmount.toFixed(2)} ${boq.currency}.`
          );
        } else {
          blockingReasons.push(
            `COMMERCIAL_VALUE_MISMATCH: Financial valuation discrepancy detected. Sum of BOQ site allocations (${boqMoney.toString()}) differs from PO authorized commitment (${poMoney.toString()}) by ${varianceAmount.toFixed(
              2
            )} ${boq.currency}. Discrepancy exceeds tolerance limit.`
          );
        }
      }
    } else {
      if (po.authorizedAmount <= 0) {
        blockingReasons.push(
          'PO_AMOUNT_NOT_EXTRACTED: Authoritative commercial commitment value was not extracted from Purchase Order.'
        );
      }
      if (boq.totalAmount <= 0) {
        blockingReasons.push(
          'BOQ_TOTAL_INVALID: BOQ total authorized value must be greater than zero.'
        );
      }
    }

    // 3. Site Count Validation
    if (!boq.sites || boq.sites.length === 0) {
      blockingReasons.push('NO_SITES_EXTRACTED: At least one valid commercial site record must be extracted from the BOQ.');
    }

    // 4. Supplier Consistency Check
    let supplierMatch = true;
    const boqSupplier = (boq as { supplierName?: string }).supplierName;
    const compareSupplier = options.selectedSupplierName || boqSupplier;

    if (compareSupplier && po.supplierName) {
      const normSelected = compareSupplier.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normPO = po.supplierName.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (!normSelected.includes(normPO) && !normPO.includes(normSelected)) {
        supplierMatch = false;
        warningMessages.push(
          `Supplier name mismatch: Selected supplier "${compareSupplier}" differs from PO vendor "${po.supplierName}".`
        );
      }
    }

    // Combine parser-level blocking errors
    if (boq.blockingErrors && boq.blockingErrors.length > 0) {
      blockingReasons.push(...boq.blockingErrors);
    }
    if (po.blockingErrors && po.blockingErrors.length > 0) {
      blockingReasons.push(...po.blockingErrors);
    }

    // Combine warnings
    if (boq.warnings && boq.warnings.length > 0) {
      warningMessages.push(...boq.warnings);
    }
    if (po.warnings && po.warnings.length > 0) {
      warningMessages.push(...po.warnings);
    }

    const hasBlockingIssues = blockingReasons.length > 0;
    const hasWarnings = warningMessages.length > 0;
    const isPass = !hasBlockingIssues;

    return {
      isPass,
      isValid: isPass,
      hasWarnings,
      hasBlockingIssues,
      boqTotal: boq.totalAmount,
      poTotal: po.authorizedAmount,
      varianceAmount,
      discrepancyAmount: varianceAmount,
      currencyMatch,
      supplierMatch,
      toleranceApplied,
      blockingReasons,
      blockingExceptions: blockingReasons,
      warningMessages,
      warnings: warningMessages,
    };
  }
}

export const CrossValidator = CommercialCrossValidator;
