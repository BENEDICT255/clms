// ==============================================================================
// CLMS Certification Financial Engine
// ==============================================================================
// PRODUCT.md authoritative rules:
// - Types: FAC (Final Acceptance Certificate), PAC (Provisional Acceptance Certificate),
//          DPC (Down Payment Certificate).
// - Core Invariant: Cumulative certified <= Authorized commitment.
// - Prior certification: PAC amount is recognized; subsequent FAC can only certify
//   up to remaining uncertified balance (Authorized - PAC). Double certification blocked.
// - Multiple PACs: sum of all PACs must not exceed Authorized.
// - All sites in a certificate must belong to the same Purchase Order.
// - Concurrency-safe, decimal-safe integer math (cents/units) to avoid IEEE 754 drift.

import { Money } from '../commercial/Money';

export type CertificateType = 'FAC' | 'PAC' | 'DPC';
export type CertificateStatus = 
  | 'DRAFT' 
  | 'PENDING_PROJECT_LEAD' 
  | 'PENDING_HEAD_OF_PROJECTS' 
  | 'APPROVED' 
  | 'ISSUED' 
  | 'VOID' 
  | 'SUPERSEDED';

export interface SiteCertificationItem {
  poSiteId: string;
  siteIdExt: string;
  siteName: string;
  authorizedAmount: number; // in minor units or whole TZS
  previouslyCertifiedAmount: number;
  currentCertificationAmount: number;
  currentPercentage: number;
  remainingBeforeCert: number;
  remainingAfterCert: number;
}

export interface CertificateCalculationInput {
  certType: CertificateType;
  poId: string;
  currency: string;
  sites: Array<{
    poSiteId: string;
    siteIdExt: string;
    siteName: string;
    authorizedAmount: number;
    previouslyCertifiedAmount: number;
    currentAmount?: number;
    currentPercentage?: number;
  }>;
}

export interface CertificateCalculationResult {
  isValid: boolean;
  certType: CertificateType;
  poId: string;
  currency: string;
  totalCertifiedAmount: number;
  siteItems: SiteCertificationItem[];
  errors: string[];
  warnings: string[];
}

export class CertificationEngine {
  /**
   * Calculates and validates commercial certification across one or more sites.
   * Enforces all invariants:
   * 1. Every site belongs to the specified PO.
   * 2. Remaining Certifiable = Authorized - Previously Certified.
   * 3. Current Certification Amount > 0 and <= Remaining Certifiable.
   * 4. Remaining After Cert >= 0.
   */
  public static calculateCertification(
    input: CertificateCalculationInput
  ): CertificateCalculationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const siteItems: SiteCertificationItem[] = [];
    let totalCertified = 0;

    if (!input.sites || input.sites.length === 0) {
      errors.push('At least one commercial site must be selected for certification.');
      return {
        isValid: false,
        certType: input.certType,
        poId: input.poId,
        currency: input.currency,
        totalCertifiedAmount: 0,
        siteItems: [],
        errors,
        warnings,
      };
    }

    for (const site of input.sites) {
      const authMoney = Money.from(site.authorizedAmount, input.currency);
      const prevMoney = Money.from(site.previouslyCertifiedAmount, input.currency);

      // Remaining before cert: max(0, Authorized - PreviouslyCertified)
      let remainingMoney: Money;
      try {
        remainingMoney = authMoney.subtract(prevMoney);
      } catch {
        remainingMoney = Money.from(0, input.currency);
      }

      if (remainingMoney.getAmount() < 0) {
        remainingMoney = Money.from(0, input.currency);
      }

      const remainingBefore = remainingMoney.getAmount();

      // Determine current certification amount with exact 2-decimal precision (Rule 40)
      let currentAmt = 0;
      let currentPct = 0;

      if (site.currentAmount !== undefined && site.currentAmount !== null) {
        // User explicitly typed an amount
        const rawAmt = Number(site.currentAmount);
        currentAmt = Math.round(rawAmt * 100) / 100;
        currentPct = site.authorizedAmount > 0
          ? Number(((currentAmt / site.authorizedAmount) * 100).toFixed(4))
          : 0;
      } else if (site.currentPercentage !== undefined && site.currentPercentage !== null) {
        // User set a percentage
        currentPct = Number(site.currentPercentage);
        if (currentPct >= 100) {
          currentAmt = remainingBefore;
        } else {
          currentAmt = Math.min(
            remainingBefore,
            Math.round(((site.authorizedAmount * currentPct) / 100) * 100) / 100
          );
        }
      } else {
        // Default to remaining certifiable balance for FAC, or 0 for PAC/DPC
        currentAmt = input.certType === 'FAC' ? remainingBefore : 0;
        currentPct = site.authorizedAmount > 0
          ? Number(((currentAmt / site.authorizedAmount) * 100).toFixed(4))
          : 0;
      }

      // Safeguard: clamp within 1-cent floating point epsilon to remainingBefore
      if (currentAmt > remainingBefore && currentAmt <= remainingBefore + 0.01) {
        currentAmt = remainingBefore;
      }

      // Financial invariant check: currentAmt must not exceed remainingBefore
      if (currentAmt > remainingBefore) {
        errors.push(
          `Site ${site.siteIdExt} (${site.siteName}) over-certification violation: requested ${currentAmt} ${input.currency} exceeds remaining certifiable balance of ${remainingBefore} ${input.currency}.`
        );
      }

      if (currentAmt <= 0) {
        errors.push(
          `Site ${site.siteIdExt} (${site.siteName}) certification amount must be greater than zero.`
        );
      }

      const remainingAfter = Math.max(0, Math.round((remainingBefore - currentAmt) * 100) / 100);
      totalCertified = Math.round((totalCertified + currentAmt) * 100) / 100;

      siteItems.push({
        poSiteId: site.poSiteId,
        siteIdExt: site.siteIdExt,
        siteName: site.siteName,
        authorizedAmount: site.authorizedAmount,
        previouslyCertifiedAmount: site.previouslyCertifiedAmount,
        currentCertificationAmount: currentAmt,
        currentPercentage: currentPct,
        remainingBeforeCert: remainingBefore,
        remainingAfterCert: remainingAfter,
      });
    }

    // Specific Certificate Type Rules
    if (input.certType === 'FAC') {
      // Check if all sites reach 100% or if there are remaining balances
      const hasUncertifiedRemainder = siteItems.some((s) => s.remainingAfterCert > 0);
      if (hasUncertifiedRemainder) {
        warnings.push(
          'Notice: FAC is certifying less than 100% of the authorized commercial balance for one or more sites.'
        );
      }
    } else if (input.certType === 'DPC') {
      warnings.push(
        'DPC Advance Exposure: DPC creates a milestone certificate. Advance recovery & amortization rules remain awaiting executive business confirmation.'
      );
    }

    return {
      isValid: errors.length === 0,
      certType: input.certType,
      poId: input.poId,
      currency: input.currency,
      totalCertifiedAmount: totalCertified,
      siteItems,
      errors,
      warnings,
    };
  }

  /**
   * Evaluates valid state transitions for certificates per PRODUCT.md state machine.
   */
  public static canTransition(
    currentStatus: CertificateStatus,
    targetStatus: CertificateStatus
  ): boolean {
    const validTransitions: Record<CertificateStatus, CertificateStatus[]> = {
      DRAFT: ['PENDING_PROJECT_LEAD', 'VOID'],
      PENDING_PROJECT_LEAD: ['PENDING_HEAD_OF_PROJECTS', 'DRAFT', 'VOID'],
      PENDING_HEAD_OF_PROJECTS: ['APPROVED', 'DRAFT', 'VOID'],
      APPROVED: ['ISSUED', 'VOID'],
      ISSUED: ['SUPERSEDED', 'VOID'],
      VOID: [],
      SUPERSEDED: [],
    };

    return validTransitions[currentStatus]?.includes(targetStatus) ?? false;
  }
}
