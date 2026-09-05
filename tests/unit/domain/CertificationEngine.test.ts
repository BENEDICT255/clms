// ==============================================================================
// CLMS Certification Engine Financial Invariant Unit Tests
// ==============================================================================
// Mandatory tests per Super Prompt 3:
// - PAC -> FAC cumulative non-overcertification (Rule 41, 42, 96)
// - Multiple PAC cumulative history (Rule 43)
// - State machine transitions (Rule 47, 49)
// - Single PO integrity

import { describe, it, expect } from 'vitest';
import { CertificationEngine } from '@/domain/certification/CertificationEngine';

describe('CertificationEngine Financial Invariants', () => {
  const sampleSite = {
    poSiteId: 'posite-uuid-1',
    siteIdExt: 'TZ-DAR-001',
    siteName: 'Dar es Salaam Central Hub',
    authorizedAmount: 10_000_000,
    previouslyCertifiedAmount: 0,
  };

  it('mandatorily blocks FAC attempt exceeding remaining balance after PAC (Rule 42, 96)', () => {
    // 1. Initial State: Authorized = 10,000,000. Prior PAC certified 7,000,000.
    const siteAfterPAC = {
      ...sampleSite,
      previouslyCertifiedAmount: 7_000_000,
      currentAmount: 10_000_000, // ILLEGAL ATTEMPT: Trying to certify 10M when only 3M remains!
    };

    const illegalResult = CertificationEngine.calculateCertification({
      certType: 'FAC',
      poId: 'po-uuid-1',
      currency: 'TZS',
      sites: [siteAfterPAC],
    });

    // Must be blocked
    expect(illegalResult.isValid).toBe(false);
    expect(illegalResult.errors.length).toBeGreaterThan(0);
    expect(illegalResult.errors[0]).toContain('over-certification violation');
    expect(illegalResult.errors[0]).toContain('exceeds remaining certifiable balance of 3000000 TZS');

    // 2. Valid FAC attempt: Certifying exact remaining 3,000,000
    const validSiteFAC = {
      ...sampleSite,
      previouslyCertifiedAmount: 7_000_000,
      currentAmount: 3_000_000,
    };

    const validResult = CertificationEngine.calculateCertification({
      certType: 'FAC',
      poId: 'po-uuid-1',
      currency: 'TZS',
      sites: [validSiteFAC],
    });

    expect(validResult.isValid).toBe(true);
    expect(validResult.totalCertifiedAmount).toBe(3_000_000);
    expect(validResult.siteItems[0].remainingBeforeCert).toBe(3_000_000);
    expect(validResult.siteItems[0].remainingAfterCert).toBe(0);
  });

  it('correctly accounts for multiple prior PACs without exceeding Authorized amount (Rule 43)', () => {
    // Authorized: 10M.
    // PAC 1 was 3M. PAC 2 was 4M. Total previously certified = 7M.
    const siteWithMultiplePACs = {
      ...sampleSite,
      previouslyCertifiedAmount: 3_000_000 + 4_000_000, // 7M
      currentAmount: 2_500_000, // 2.5M within 3M remaining
    };

    const result = CertificationEngine.calculateCertification({
      certType: 'FAC',
      poId: 'po-uuid-1',
      currency: 'TZS',
      sites: [siteWithMultiplePACs],
    });

    expect(result.isValid).toBe(true);
    expect(result.siteItems[0].remainingBeforeCert).toBe(3_000_000);
    expect(result.siteItems[0].currentCertificationAmount).toBe(2_500_000);
    expect(result.siteItems[0].remainingAfterCert).toBe(500_000);
  });

  it('synchronizes percentage and amount correctly using decimal arithmetic', () => {
    // 50% of 10,000,000 = 5,000,000
    const siteWithPct = {
      ...sampleSite,
      previouslyCertifiedAmount: 0,
      currentPercentage: 50,
    };

    const result = CertificationEngine.calculateCertification({
      certType: 'PAC',
      poId: 'po-uuid-1',
      currency: 'TZS',
      sites: [siteWithPct],
    });

    expect(result.isValid).toBe(true);
    expect(result.siteItems[0].currentCertificationAmount).toBe(5_000_000);
    expect(result.siteItems[0].remainingAfterCert).toBe(5_000_000);
  });

  it('rejects certification amount of zero or negative', () => {
    const zeroSite = {
      ...sampleSite,
      currentAmount: 0,
    };

    const result = CertificationEngine.calculateCertification({
      certType: 'PAC',
      poId: 'po-uuid-1',
      currency: 'TZS',
      sites: [zeroSite],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('must be greater than zero');
  });

  it('enforces certificate state machine transitions strictly', () => {
    // DRAFT -> PENDING_PROJECT_LEAD is allowed
    expect(CertificationEngine.canTransition('DRAFT', 'PENDING_PROJECT_LEAD')).toBe(true);

    // Direct jump DRAFT -> ISSUED is strictly forbidden
    expect(CertificationEngine.canTransition('DRAFT', 'ISSUED')).toBe(false);

    // PENDING_PROJECT_LEAD -> PENDING_HEAD_OF_PROJECTS is allowed
    expect(CertificationEngine.canTransition('PENDING_PROJECT_LEAD', 'PENDING_HEAD_OF_PROJECTS')).toBe(true);

    // APPROVED -> ISSUED is allowed
    expect(CertificationEngine.canTransition('APPROVED', 'ISSUED')).toBe(true);

    // ISSUED cannot transition back to DRAFT or APPROVED
    expect(CertificationEngine.canTransition('ISSUED', 'DRAFT')).toBe(false);
    expect(CertificationEngine.canTransition('ISSUED', 'APPROVED')).toBe(false);
  });
});
