// ==============================================================================
// CLMS Golden PO Parser Regression Test (Section 3 & 4)
// ==============================================================================
// Tests the exact golden master Purchase Order PDF from ACTULA:
// - Uses genuine pdfjs-dist text extraction
// - Verifies PO Number, Supplier, Supplier ID, PO Date, Currency
// - Asserts exact separate preservation of Subtotal Excl. Tax, Tax, and Order Total
// - Asserts exact Payment Terms of 90 days
// - Proves zero fabrication (no fallback supplier, no fallback 30-day terms)
// ==============================================================================

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { POParser } from '@/domain/commercial/POParser';

describe('Golden PO Parser Regression Test', () => {
  const filePath = path.resolve(
    process.cwd(),
    'ACTULA/PO sample.pdf'
  );

  it('verifies the golden PO PDF exists on disk', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('parses golden master PO PDF with exact document values and zero fabrication', async () => {
    const fileBuffer = fs.readFileSync(filePath);
    const result = await POParser.parse(fileBuffer, path.basename(filePath));

    // 1. Mandatory Identifiers
    expect(result.poNumber).toBe('4500015358');
    expect(result.supplierName).toBe('PRIME POWER T LTD');
    expect(result.supplierId).toBe('S4.P01007');
    expect(result.poDate).toBe('Jun 11, 2026');

    // 2. Currency
    expect(result.currency).toBe('TZS');
    expect(result.currencySource).toBeDefined();

    // 3. Payment Terms (extracted, not defaulted to 30)
    expect(result.paymentTermsDays).toBe(90);
    expect(result.paymentTermsText).toContain('90 calendar days of receipt');

    // 4. Authoritative Financial Triad (Section 3)
    expect(result.subtotalExclTax).toBe(123512849.94);
    expect(result.taxAmount).toBe(22232312.99);
    expect(result.orderTotalInclTax).toBe(145745162.93);

    // 5. Authoritative Certifiable Commitment
    // In CLMS, certifiable commitment is the Net Excl. Tax (123,512,849.94 TZS)
    expect(result.authorizedAmount).toBe(123512849.94);

    // 6. Zero Blocking Errors
    expect(result.blockingErrors).toEqual([]);
  });
});
