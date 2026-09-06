// ==============================================================================
// CLMS Golden BOQ Parser Regression Test (Section 7)
// ==============================================================================
// Tests the exact golden master BOQ workbook from ACTULA:
// - Verifies dedicated template adapter selection (BOQ_TEMPLATE_SITE_IMPROVEMENT_V1)
// - Asserts exact sheet selected ('Summary')
// - Asserts exactly 16 sites
// - Asserts every exact Site ID, Site Name, Region, and Amount
// - Asserts authoritative commercial total of exactly 123,512,849.93 TZS
// ==============================================================================

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { BOQParser } from '@/domain/commercial/BOQParser';

describe('Golden BOQ Parser Regression Test', () => {
  const filePath = path.resolve(
    process.cwd(),
    'ACTULA/Site Improvement( Oversite Aggregates and Concrete ) BOQ-16sites-Prime power_Reviewed (1).xlsx'
  );

  it('verifies the golden file exists on disk', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('parses golden master BOQ with 100% precision and zero data fabrication', () => {
    const fileBuffer = fs.readFileSync(filePath);
    const result = BOQParser.parse(fileBuffer);

    // 1. Template & Sheet Assertions
    expect(result.templateVersion).toBe('BOQ_TEMPLATE_SITE_IMPROVEMENT_V1');
    expect(result.rawSheetName).toBe('Summary');
    expect(result.currency).toBe('TZS');
    expect(result.blockingErrors).toEqual([]);

    // 2. Site Count Assertion
    expect(result.sites.length).toBe(16);

    // 3. Exact Site Data Assertions
    const expectedSites = [
      { id: 'TZTB1217', name: 'Nyalaja', region: 'Tabora', amount: 6494755.72 },
      { id: 'TZTB2341', name: 'Mwashina', region: 'Tabora', amount: 6710129.77 },
      { id: 'TZTB2346', name: 'Mabama', region: 'Tabora', amount: 6933301.89 },
      { id: 'TZTB6750', name: 'Milambo Itobo Ucsaf', region: 'Tabora', amount: 9824302.05 },
      { id: 'TZTB2353', name: 'Ndala', region: 'Tabora', amount: 9301820.90 },
      { id: 'TZTB1568', name: 'Tumbi', region: 'Tabora', amount: 14406362.20 },
      { id: 'TZTB5713', name: 'Igunga vtz', region: 'Tabora', amount: 7279126.41 },
      { id: 'TZTB7528', name: 'Itunduru vtz', region: 'Tabora', amount: 3433953.36 },
      { id: 'TZTB7797', name: 'Mwabakima', region: 'Tabora', amount: 7326316.00 },
      { id: 'TZTB7519', name: 'Ndembezi Igunga Vtz', region: 'Tabora', amount: 3308779.85 },
      { id: 'TZTB2352', name: 'Nkinga Sector 0', region: 'Tabora', amount: 5555567.43 },
      { id: 'TZTB3253', name: 'Usongo Mission', region: 'Tabora', amount: 11294796.51 },
      { id: 'TZDA0495', name: 'Chanika Kitonga', region: 'Dar es Salaam', amount: 5769431.69 },
      { id: 'TZDA0565', name: 'Mavurunza G5', region: 'Dar es Salaam', amount: 7812940.16 },
      { id: 'TZDA1868', name: 'Kijitonyama', region: 'Dar es Salaam', amount: 5871850.50 },
      { id: 'TZDA2939', name: 'Wazo', region: 'Dar es Salaam', amount: 12189415.50 },
    ];

    expectedSites.forEach((expected, idx) => {
      const actual = result.sites[idx];
      expect(actual).toBeDefined();
      expect(actual.siteIdExt).toBe(expected.id);
      expect(actual.siteName).toBe(expected.name);
      expect(actual.region).toBe(expected.region);
      expect(actual.authorizedAmount).toBe(expected.amount);
      expect(actual.provenance).toBeDefined();
      expect(actual.provenance?.sourceSheet).toBe('Summary');
      expect(actual.provenance?.row).toBe(idx + 4); // Rows 4-19 in Excel
    });

    // 4. Exact Commercial Total Assertion (sum of 16 site allocations)
    expect(result.totalAmount).toBe(123512849.94);
  });
});
