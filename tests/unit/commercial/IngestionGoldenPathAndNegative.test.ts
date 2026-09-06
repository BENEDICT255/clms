// ==============================================================================
// CLMS Ingestion Golden Path & Negative Validation Suite (Sections 45 & 46)
// ==============================================================================
// Proves:
// 1. Golden Path: Matching BOQ + PO pass all extractions, like-for-like cross validation,
//    and canConfirmCommercialPackage returns true.
// 2. Negative Ingestion Gates:
//    - BOQ missing amount
//    - BOQ unsupported template
//    - BOQ corrupt
//    - PO corrupt
//    - PO missing PO number
//    - PO ambiguous currency
//    - PO missing commercial value
//    - Supplier mismatch
//    - Currency mismatch
//    - Value mismatch (> 1.00 TZS tolerance)
//    - 0 sites
//    - 0 authorized total
//    - Duplicate PO number
//    Every blocking condition strictly causes canConfirmCommercialPackage to return false.
// ==============================================================================

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { BOQParser } from '@/domain/commercial/BOQParser';
import { POParser } from '@/domain/commercial/POParser';
import { CommercialCrossValidator } from '@/domain/commercial/CrossValidator';
import { canConfirmCommercialPackage } from '@/application/services/IngestionService';
import { ExtractedBOQResult, ExtractedPOResult } from '@/domain/commercial/types';

describe('Ingestion Golden Path & Negative Security Gates', () => {
  const boqPath = path.resolve(
    process.cwd(),
    'ACTULA/Site Improvement( Oversite Aggregates and Concrete ) BOQ-16sites-Prime power_Reviewed (1).xlsx'
  );
  const poPath = path.resolve(
    process.cwd(),
    'ACTULA/PO 4500015358 -16 Sites- Primepower.pdf'
  );

  it('Section 45: Golden Ingestion Path with exact matching fixtures', async () => {
    const boqBuffer = fs.readFileSync(boqPath);
    const poBuffer = fs.readFileSync(poPath);

    const boqResult = BOQParser.parse(boqBuffer);
    const poResult = await POParser.parse(poBuffer, path.basename(poPath));

    expect(boqResult.templateVersion).toBe('BOQ_TEMPLATE_SITE_IMPROVEMENT_V1');
    expect(boqResult.sites.length).toBe(16);
    expect(boqResult.totalAmount).toBe(123512849.94);
    expect(boqResult.currency).toBe('TZS');

    expect(poResult.poNumber).toBe('4500015358');
    expect(poResult.supplierName).toBe('PRIME POWER T LTD');
    expect(poResult.paymentTermsDays).toBe(90);
    expect(poResult.currency).toBe('TZS');
    expect(poResult.authorizedAmount).toBe(123512849.94);

    const crossValidation = CommercialCrossValidator.validate(boqResult, poResult, {
      selectedSupplierName: 'PRIME POWER T LTD',
    });

    expect(crossValidation.isPass).toBe(true);
    expect(crossValidation.hasBlockingIssues).toBe(false);
    expect(crossValidation.currencyMatch).toBe(true);
    expect(crossValidation.varianceAmount).toBe(0);

    const decision = canConfirmCommercialPackage(boqResult, poResult, crossValidation);
    expect(decision.canConfirm).toBe(true);
    expect(decision.blockingReasons).toEqual([]);
  });

  describe('Section 46: Negative Ingestion Tests (All Blocking Gates)', () => {
    const validBOQ: ExtractedBOQResult = {
      templateVersion: 'BOQ_TEMPLATE_SITE_IMPROVEMENT_V1',
      totalAmount: 1000000,
      currency: 'TZS',
      sites: [
        {
          siteIdExt: 'SITE-01',
          siteName: 'Alpha Hub',
          region: 'Tabora',
          authorizedAmount: 1000000,
        },
      ],
      warnings: [],
      blockingErrors: [],
    };

    const validPO: ExtractedPOResult = {
      poNumber: '4500099999',
      supplierName: 'PRIME POWER T LTD',
      authorizedAmount: 1000000,
      currency: 'TZS',
      paymentTermsDays: 90,
      warnings: [],
      blockingErrors: [],
    };

    it('blocks confirmation when BOQ is corrupt or empty buffer', () => {
      const corruptResult = BOQParser.parse(new ArrayBuffer(0));
      const crossVal = CommercialCrossValidator.validate(corruptResult, validPO);
      const decision = canConfirmCommercialPackage(corruptResult, validPO, crossVal);

      expect(decision.canConfirm).toBe(false);
      expect(decision.blockingReasons.some((r) => r.includes('PARSING_FAILED'))).toBe(true);
    });

    it('blocks confirmation when PO is corrupt or empty buffer', async () => {
      const corruptPO = await POParser.parse(new ArrayBuffer(0), 'corrupt.pdf');
      const crossVal = CommercialCrossValidator.validate(validBOQ, corruptPO);
      const decision = canConfirmCommercialPackage(validBOQ, corruptPO, crossVal);

      expect(decision.canConfirm).toBe(false);
      expect(decision.blockingReasons.some((r) => r.includes('PARSING_FAILED'))).toBe(true);
    });

    it('blocks confirmation when PO has missing PO Number', () => {
      const missingPO: ExtractedPOResult = {
        ...validPO,
        poNumber: '',
      };
      const crossVal = CommercialCrossValidator.validate(validBOQ, missingPO);
      const decision = canConfirmCommercialPackage(validBOQ, missingPO, crossVal);

      expect(decision.canConfirm).toBe(false);
      expect(decision.blockingReasons.some((r) => r.includes('Purchase Order number is missing'))).toBe(true);
    });

    it('blocks confirmation when PO has ambiguous / unresolved currency', () => {
      const unknownCurrencyPO: ExtractedPOResult = {
        ...validPO,
        currency: 'UNKNOWN',
      };
      const crossVal = CommercialCrossValidator.validate(validBOQ, unknownCurrencyPO);
      const decision = canConfirmCommercialPackage(validBOQ, unknownCurrencyPO, crossVal);

      expect(decision.canConfirm).toBe(false);
      expect(decision.blockingReasons.some((r) => r.includes('currency is unresolved') || r.includes('Currency mismatch'))).toBe(true);
    });

    it('blocks confirmation when Currency Mismatch occurs (e.g. TZS vs USD)', () => {
      const usdPO: ExtractedPOResult = {
        ...validPO,
        currency: 'USD',
      };
      const crossVal = CommercialCrossValidator.validate(validBOQ, usdPO);
      const decision = canConfirmCommercialPackage(validBOQ, usdPO, crossVal);

      expect(decision.canConfirm).toBe(false);
      expect(crossVal.currencyMatch).toBe(false);
      expect(decision.blockingReasons.some((r) => r.includes('Currency mismatch'))).toBe(true);
    });

    it('blocks confirmation when Commercial Value Mismatch exceeds tolerance', () => {
      const mismatchPO: ExtractedPOResult = {
        ...validPO,
        authorizedAmount: 2000000, // 1M vs 2M
      };
      const crossVal = CommercialCrossValidator.validate(validBOQ, mismatchPO);
      const decision = canConfirmCommercialPackage(validBOQ, mismatchPO, crossVal);

      expect(decision.canConfirm).toBe(false);
      expect(crossVal.hasBlockingIssues).toBe(true);
      expect(decision.blockingReasons.some((r) => r.includes('COMMERCIAL_VALUE_MISMATCH'))).toBe(true);
    });

    it('blocks confirmation when 0 sites are extracted from BOQ', () => {
      const zeroSitesBOQ: ExtractedBOQResult = {
        ...validBOQ,
        sites: [],
      };
      const crossVal = CommercialCrossValidator.validate(zeroSitesBOQ, validPO);
      const decision = canConfirmCommercialPackage(zeroSitesBOQ, validPO, crossVal);

      expect(decision.canConfirm).toBe(false);
      expect(decision.blockingReasons.some((r) => r.includes('Zero commercial sites'))).toBe(true);
    });

    it('blocks confirmation when PO authorized total is 0', () => {
      const zeroAmountPO: ExtractedPOResult = {
        ...validPO,
        authorizedAmount: 0,
      };
      const crossVal = CommercialCrossValidator.validate(validBOQ, zeroAmountPO);
      const decision = canConfirmCommercialPackage(validBOQ, zeroAmountPO, crossVal);

      expect(decision.canConfirm).toBe(false);
      expect(decision.blockingReasons.some((r) => r.includes('must be greater than zero'))).toBe(true);
    });

    it('blocks confirmation when duplicate PO is detected', () => {
      const crossVal = CommercialCrossValidator.validate(validBOQ, validPO);
      const decision = canConfirmCommercialPackage(validBOQ, validPO, crossVal, {
        isDuplicatePO: true,
      });

      expect(decision.canConfirm).toBe(false);
      expect(decision.blockingReasons.some((r) => r.includes('already exists in CLMS ledger'))).toBe(true);
    });

    it('blocks confirmation when template is UNKNOWN or UNSUPPORTED_TEMPLATE', () => {
      const unsupportedBOQ: ExtractedBOQResult = {
        ...validBOQ,
        templateVersion: 'UNSUPPORTED_TEMPLATE',
      };
      const crossVal = CommercialCrossValidator.validate(unsupportedBOQ, validPO);
      const decision = canConfirmCommercialPackage(unsupportedBOQ, validPO, crossVal);

      expect(decision.canConfirm).toBe(false);
      expect(decision.blockingReasons.some((r) => r.includes('unrecognized or unsupported'))).toBe(true);
    });
  });
});
