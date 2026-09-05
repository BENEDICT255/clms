// ==============================================================================
// CLMS BOQ Parser Unit Tests
// ==============================================================================
// Tests parser behavior:
// - Structural signature matching
// - Rejection of corrupted/empty files (fail loudly with PARSING_FAILED)
// - Exact site extraction and arithmetic summation without synthetic data

import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { BOQParser } from '@/domain/commercial/BOQParser';

describe('BOQParser', () => {
  it('returns PARSING_FAILED when parsing empty or corrupted file buffer', () => {
    const emptyBuffer = new ArrayBuffer(0);
    const result = BOQParser.parse(emptyBuffer);

    expect(result.blockingErrors.length).toBeGreaterThan(0);
    expect(result.blockingErrors[0]).toContain('PARSING_FAILED');
  });

  it('returns PARSING_FAILED when workbook has no recognizable BOQ table headers', () => {
    // Create an empty workbook without relevant headers
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Random Header 1', 'Random Header 2'],
      ['Value A', 'Value B'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const result = BOQParser.parse(wbout);

    expect(result.blockingErrors.length).toBeGreaterThan(0);
    expect(result.blockingErrors[0]).toContain('PARSING_FAILED');
  });

  it('parses valid BOQ schedule sheet accurately without inventing data', () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Commercial Site Scope & Valuation Schedule'],
      ['Site ID', 'Site Name', 'Region', 'Authorized Amount', 'Currency'],
      ['TZ-KIL-001', 'Moshi Urban Hub', 'Kilimanjaro', 5000000, 'TZS'],
      ['TZ-KIL-002', 'Machame Base', 'Kilimanjaro', 3500000, 'TZS'],
      ['TZ-ARU-001', 'Arusha Clocktower', 'Arusha', 6500000, 'TZS'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'BOQ_Schedule');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const result = BOQParser.parse(wbout);

    expect(result.blockingErrors.length).toBe(0);
    expect(result.sites.length).toBe(3);
    expect(result.sites[0].siteIdExt).toBe('TZ-KIL-001');
    expect(result.sites[0].siteName).toBe('Moshi Urban Hub');
    expect(result.sites[0].authorizedAmount).toBe(5000000);

    expect(result.sites[1].siteIdExt).toBe('TZ-KIL-002');
    expect(result.sites[1].authorizedAmount).toBe(3500000);

    expect(result.sites[2].siteIdExt).toBe('TZ-ARU-001');
    expect(result.sites[2].authorizedAmount).toBe(6500000);

    // Sum: 5M + 3.5M + 6.5M = 15,000,000
    expect(result.totalAmount).toBe(15000000);
    expect(result.currency).toBe('TZS');
  });
});
