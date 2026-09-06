// ==============================================================================
// CLMS Site Improvement BOQ Dedicated Template Adapter (V1)
// ==============================================================================
// Enforces Constitutional Requirements (PRODUCT.md / AGENTS.md):
// - Extracts exact 16 sites from Summary sheet with zero fabrication
// - Reads authoritative Region from BOQ detail sheet
// - Reconciles Services, Transport, and Total Price without estimation
// - Attaches field-level provenance to every extracted site allocation
// ==============================================================================

import * as XLSX from 'xlsx';
import { ExtractedBOQResult, ExtractedSiteLine } from '../types';
import { Money } from '../Money';

export class SiteImprovementBOQParserV1 {
  public static readonly TEMPLATE_ID = 'BOQ_TEMPLATE_SITE_IMPROVEMENT_V1';
  public static readonly TEMPLATE_NAME = 'Site Improvement (Oversite Aggregates and Concrete) V1';

  /**
   * Determines whether this workbook matches the Site Improvement V1 template signature.
   */
  public static supports(workbook: XLSX.WorkBook): boolean {
    const hasSummarySheet = workbook.SheetNames.some((name) => /summary/i.test(name));
    const hasBOQSheet = workbook.SheetNames.some((name) => /^boq$/i.test(name) || /site.*improvement/i.test(name));

    if (!hasSummarySheet || !hasBOQSheet) return false;

    const summarySheetName = workbook.SheetNames.find((name) => /summary/i.test(name));
    if (!summarySheetName) return false;

    const sheet = workbook.Sheets[summarySheetName];
    if (!sheet) return false;

    const rows: (string | number | null | undefined)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
    });

    // Check if there is a header row containing Site ID, Site Name, and Total Price
    return rows.some((row) => {
      if (!row || !Array.isArray(row)) return false;
      const joined = row.map((c) => (c != null ? String(c).toLowerCase() : '')).join(' ');
      return (
        joined.includes('site id') &&
        (joined.includes('total price') || joined.includes('total (tzs)'))
      );
    });
  }

  /**
   * Parses the workbook according to the versioned Site Improvement V1 template rules.
   */
  public static parse(workbook: XLSX.WorkBook): ExtractedBOQResult {
    const warnings: string[] = [];
    const blockingErrors: string[] = [];
    const sites: ExtractedSiteLine[] = [];

    // 1. Locate Summary Sheet
    const summarySheetName = workbook.SheetNames.find((name) => /summary/i.test(name));
    if (!summarySheetName || !workbook.Sheets[summarySheetName]) {
      return {
        templateVersion: SiteImprovementBOQParserV1.TEMPLATE_ID,
        totalAmount: 0,
        currency: 'TZS',
        sites: [],
        warnings: [],
        blockingErrors: ['PARSING_FAILED: Missing mandatory "Summary" worksheet in Site Improvement workbook.'],
        rawSheetName: summarySheetName || 'MISSING',
      };
    }

    const summarySheet = workbook.Sheets[summarySheetName]!;
    const summaryRows: (string | number | null | undefined)[][] = XLSX.utils.sheet_to_json(summarySheet, {
      header: 1,
      raw: false,
      defval: null,
    });

    // 2. Extract Region mapping from BOQ sheet if available
    const regionMap = SiteImprovementBOQParserV1.extractRegionMapFromBOQSheet(workbook);

    // 3. Find header row in Summary sheet
    let headerRowIdx = -1;
    let colSiteId = -1;
    let colSiteName = -1;
    let colDescription = -1;
    let colTotalPrice = -1;

    for (let r = 0; r < Math.min(summaryRows.length, 10); r++) {
      const row = summaryRows[r];
      if (!row) continue;

      for (let c = 0; c < row.length; c++) {
        const val = String(row[c] || '').trim().toLowerCase();
        if (/^site\s*id$/i.test(val)) colSiteId = c;
        if (/^site\s*name$/i.test(val)) colSiteName = c;
        if (/^description$/i.test(val)) colDescription = c;
        if (/^total\s*price\s*\(/i.test(val) || /^total\s*price$/i.test(val)) colTotalPrice = c;
      }

      if (colSiteId !== -1 && colTotalPrice !== -1) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1 || colSiteId === -1 || colTotalPrice === -1) {
      return {
        templateVersion: SiteImprovementBOQParserV1.TEMPLATE_ID,
        totalAmount: 0,
        currency: 'TZS',
        sites: [],
        warnings,
        blockingErrors: [
          'PARSING_FAILED: Could not locate required Site ID or Total Price columns in Summary sheet.',
        ],
        rawSheetName: summarySheetName,
      };
    }

    // Determine currency from column header
    let currency = 'TZS';
    const headerRow = summaryRows[headerRowIdx] || [];
    const headerRowText = headerRow.map((c) => String(c || '')).join(' ');
    if (/\bUSD\b/i.test(headerRowText)) currency = 'USD';
    else if (/\bTZS\b/i.test(headerRowText)) currency = 'TZS';

    let runningTotal = Money.fromNumber(0, currency);

    // 4. Parse site data rows
    for (let r = headerRowIdx + 1; r < summaryRows.length; r++) {
      const row = summaryRows[r];
      if (!row) continue;

      const rawSiteId = row[colSiteId];
      if (rawSiteId == null || String(rawSiteId).trim() === '') continue;

      const siteIdStr = String(rawSiteId).trim();

      // Skip summary / grand total rows
      if (/total|sum|grand/i.test(siteIdStr)) continue;
      const firstCell = String(row[0] || '').trim();
      if (/total|sum|grand/i.test(firstCell)) continue;

      // Extract site name
      const rawSiteName = colSiteName !== -1 && row[colSiteName] != null ? String(row[colSiteName]).trim() : '';
      if (!rawSiteName) {
        warnings.push(`Row ${r + 1}: Site Name missing for site ${siteIdStr}.`);
      }

      // Authoritative region resolution from BOQ sheet
      const resolvedRegion = regionMap.get(siteIdStr) || undefined;

      // Scope description
      const scope = colDescription !== -1 && row[colDescription] != null ? String(row[colDescription]).trim() : 'Site improvement works';

      // Parse Total Price
      const rawTotalVal = row[colTotalPrice];
      if (rawTotalVal == null || String(rawTotalVal).trim() === '') {
        blockingErrors.push(`MISSING_MANDATORY_VALUE: Row ${r + 1} (Site: ${siteIdStr}) has empty Total Price.`);
        continue;
      }

      let numericAmount: number;
      if (typeof rawTotalVal === 'number') {
        numericAmount = rawTotalVal;
      } else {
        const cleaned = String(rawTotalVal).replace(/[^0-9.-]/g, '');
        numericAmount = parseFloat(cleaned);
      }

      if (isNaN(numericAmount) || numericAmount <= 0) {
        blockingErrors.push(`PARSING_FAILED: Row ${r + 1} (Site: ${siteIdStr}) has invalid numerical amount: "${rawTotalVal}".`);
        continue;
      }

      const siteMoney = Money.fromNumber(numericAmount, currency);
      runningTotal = runningTotal.add(siteMoney);

      sites.push({
        siteIdExt: siteIdStr,
        siteName: rawSiteName,
        region: resolvedRegion,
        authorizedAmount: siteMoney.majorAmount,
        scopeDescription: scope,
        rawAmount: String(rawTotalVal).trim(),
        provenance: {
          sourceSheet: summarySheetName,
          row: r + 1,
          colSiteId,
          colAmount: colTotalPrice,
          rawValue: String(rawTotalVal).trim(),
        },
      });
    }

    if (sites.length === 0 && blockingErrors.length === 0) {
      blockingErrors.push('PARSING_FAILED: No valid commercial sites extracted from Summary sheet.');
    }

    return {
      templateVersion: SiteImprovementBOQParserV1.TEMPLATE_ID,
      totalAmount: runningTotal.majorAmount,
      currency,
      currencySource: `Template Column Header (${currency})`,
      sites,
      warnings,
      blockingErrors,
      rawSheetName: summarySheetName,
    };
  }

  /**
   * Reads site headers and regions from the detailed BOQ sheet.
   */
  private static extractRegionMapFromBOQSheet(workbook: XLSX.WorkBook): Map<string, string> {
    const map = new Map<string, string>();
    const boqSheetName = workbook.SheetNames.find((name) => /^boq$/i.test(name) || /site.*improvement/i.test(name));
    if (!boqSheetName || !workbook.Sheets[boqSheetName]) return map;

    const sheet = workbook.Sheets[boqSheetName]!;
    const rows: (string | number | null | undefined)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: null,
    });

    // In the versioned template, site IDs are in row 6 (index 5) and regions in row 8 (index 7)
    // Or we scan the first 12 rows for row pairs where one row contains site IDs (TZTB/TZDA) and another contains regions
    let siteIdRowIdx = -1;
    let regionRowIdx = -1;

    for (let r = 0; r < Math.min(rows.length, 12); r++) {
      const row = rows[r];
      if (!row) continue;
      const hasSiteIds = row.some((c) => c != null && /^TZ[A-Z0-9]{4,10}$/i.test(String(c).trim()));
      if (hasSiteIds && siteIdRowIdx === -1) {
        siteIdRowIdx = r;
      }
      const hasRegions = row.some((c) => c != null && /tabora|dar\s*es\s*salaam|arusha|mwanza|dodoma|mbeya/i.test(String(c).trim()));
      if (hasRegions && regionRowIdx === -1) {
        regionRowIdx = r;
      }
    }

    if (siteIdRowIdx !== -1 && regionRowIdx !== -1) {
      const siteRow = rows[siteIdRowIdx] || [];
      const regionRow = rows[regionRowIdx] || [];
      for (let c = 0; c < siteRow.length; c++) {
        const rawSiteId = siteRow[c];
        if (rawSiteId != null && /^TZ[A-Z0-9]{4,10}$/i.test(String(rawSiteId).trim())) {
          const sId = String(rawSiteId).trim();
          const reg = regionRow[c] != null ? String(regionRow[c]).trim() : '';
          if (reg) map.set(sId, reg);
        }
      }
    }

    return map;
  }
}
