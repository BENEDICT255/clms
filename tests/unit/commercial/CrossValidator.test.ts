// ==============================================================================
// CLMS Commercial Ingestion Cross-Validator Unit Tests
// ==============================================================================
// Tests alignment between parsed BOQ and PO:
// - Sum of site values equals PO total
// - Currency parity
// - Tolerance threshold (exact or <= 1.00 TZS)
// - Supplier consistency

import { describe, it, expect } from 'vitest';
import { CrossValidator } from '@/domain/commercial/CrossValidator';
import { ExtractedBOQResult, ExtractedPOResult } from '@/domain/commercial/types';

describe('CrossValidator', () => {
  const sampleBOQ: ExtractedBOQResult = {
    templateVersion: 'SITE_IMPROVEMENT_V1',
    sites: [
      {
        siteIdExt: 'SITE-DAR-01',
        siteName: 'Dar Hub A',
        region: 'Dar es Salaam',
        authorizedAmount: 6_000_000,
      },
      {
        siteIdExt: 'SITE-DAR-02',
        siteName: 'Dar Hub B',
        region: 'Dar es Salaam',
        authorizedAmount: 4_000_000,
      },
    ],
    totalAmount: 10_000_000,
    currency: 'TZS',
    warnings: [],
    blockingErrors: [],
  };

  const samplePO: ExtractedPOResult = {
    poNumber: 'PO-2026-HQ-0089',
    supplierName: 'Helios Towers Tanzania Ltd',
    authorizedAmount: 10_000_000,
    currency: 'TZS',
    paymentTermsDays: 30,
    warnings: [],
    blockingErrors: [],
  };

  it('validates a fully aligned BOQ and PO as valid with zero blocking exceptions', () => {
    const result = CrossValidator.validate(sampleBOQ, samplePO);

    expect(result.isValid).toBe(true);
    expect(result.blockingExceptions.length).toBe(0);
    expect(result.boqTotal).toBe(10_000_000);
    expect(result.poTotal).toBe(10_000_000);
    expect(result.discrepancyAmount).toBe(0);
  });

  it('blocks cross-validation when BOQ sum does not match PO authorized amount', () => {
    const mismatchedPO: ExtractedPOResult = {
      ...samplePO,
      authorizedAmount: 12_000_000, // 2M mismatch
    };

    const result = CrossValidator.validate(sampleBOQ, mismatchedPO);

    expect(result.isValid).toBe(false);
    expect(result.blockingExceptions.length).toBeGreaterThan(0);
    expect(result.blockingExceptions[0]).toContain('Financial valuation discrepancy detected');
  });

  it('blocks cross-validation on currency mismatch', () => {
    const usdPO: ExtractedPOResult = {
      ...samplePO,
      currency: 'USD',
    };

    const result = CrossValidator.validate(sampleBOQ, usdPO);

    expect(result.isValid).toBe(false);
    expect(result.blockingExceptions.some((e) => e.includes('Currency mismatch'))).toBe(true);
  });

  it('warns when selected supplier differs from PO vendor', () => {
    const result = CrossValidator.validate(sampleBOQ, samplePO, {
      selectedSupplierName: 'Different Supplier Co',
    });

    expect(result.warnings.some((w) => w.includes('Supplier name mismatch'))).toBe(true);
  });
});
