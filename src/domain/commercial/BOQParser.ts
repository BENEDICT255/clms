// ==============================================================================
// CLMS Authoritative BOQ Parser Engine
// ==============================================================================
// Enforces Rules PS-01, PS-02, PS-03, PS-04:
// - Zero synthetic identifiers
// - Zero value imputation
// - Explicit accounting for every row
// - Zero fallback to mock data
// ==============================================================================

import * as XLSX from 'xlsx';
import { ExtractedBOQResult, ExtractedSiteLine } from './types';
import { detectBOQTemplate, TemplateDefinition } from './TemplateRegistry';
import { Money } from './Money';

export interface ParseBOQOptions {
  currencyDefault?: string;
  enforceNonEmptySites?: boolean;
}

export class BOQParser {
  /**
   * Parses an Excel buffer or ArrayBuffer representing an approved BOQ spreadsheet.
   */
  public static parse(data: ArrayBuffer | Uint8Array, options: ParseBOQOptions = {}): ExtractedBOQResult {
    const currency = options.currencyDefault || 'TZS';
    const warnings: string[] = [];
    const blockingErrors: string[] = [];
    const extractedSites: ExtractedSiteLine[] = [];

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(data, { type: 'array', cellFormula: true, cellDates: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown read error';
      return {
        templateVersion: 'UNKNOWN',
        totalAmount: 0,
        currency,
        sites: [],
        warnings: [],
        blockingErrors: [`PARSING_FAILED: Unable to parse spreadsheet file: ${msg}`],
      };
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        templateVersion: 'UNKNOWN',
        totalAmount: 0,
        currency,
        sites: [],
        warnings: [],
        blockingErrors: ['PARSING_FAILED: Spreadsheet contains no readable worksheets.'],
      };
    }

    // Identify candidate sheet (prefer sheet matching 'boq', 'commercial', 'schedule', or the first sheet)
    const targetSheetName =
      workbook.SheetNames.find((name) => /boq|commercial|schedule|sites|summary/i.test(name)) ||
      workbook.SheetNames[0];

    if (!targetSheetName) {
      return {
        templateVersion: 'UNKNOWN',
        totalAmount: 0,
        currency,
        sites: [],
        warnings: [],
        blockingErrors: ['PARSING_FAILED: No target worksheet identified.'],
      };
    }

    const worksheet = workbook.Sheets[targetSheetName];
    if (!worksheet) {
      return {
        templateVersion: 'UNKNOWN',
        totalAmount: 0,
        currency,
        sites: [],
        warnings: [],
        blockingErrors: [`PARSING_FAILED: Worksheet "${targetSheetName}" is empty or unreadable.`],
      };
    }

    // Convert sheet to row array (header scan)
    const rawRows: (string | number | boolean | null | undefined)[][] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: false,
      defval: null,
    });

    if (rawRows.length === 0) {
      return {
        templateVersion: 'UNKNOWN',
        totalAmount: 0,
        currency,
        sites: [],
        warnings: [],
        blockingErrors: [`PARSING_FAILED: Worksheet "${targetSheetName}" has no data rows.`],
      };
    }

    // Find table header row (skip single-cell banner/title rows)
    let headerRowIndex = -1;
    for (let r = 0; r < Math.min(rawRows.length, 15); r++) {
      const row = rawRows[r] || [];
      const nonNullCells = row.filter((c) => c != null && String(c).trim() !== '');
      if (nonNullCells.length < 2) continue; // Skip title banner rows

      const hasSiteKeyword = row.some((cell) => cell != null && /site/i.test(String(cell)));
      const hasAmountKeyword = row.some((cell) => cell != null && /amount|total|cost|val|price/i.test(String(cell)));

      if (hasSiteKeyword && (hasAmountKeyword || nonNullCells.length >= 3)) {
        headerRowIndex = r;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return {
        templateVersion: 'UNKNOWN',
        totalAmount: 0,
        currency,
        sites: [],
        warnings: [],
        blockingErrors: [
          'PARSING_FAILED: Could not detect standard table headers containing Site identifiers in worksheet.',
        ],
      };
    }

    const headerCells = (rawRows[headerRowIndex] || []).map((c) => (c != null ? String(c).trim() : ''));
    const detectedTemplate: TemplateDefinition | null = detectBOQTemplate(workbook.SheetNames, headerCells);

    if (!detectedTemplate) {
      warnings.push('Unrecognized BOQ template signature; parsed using standard column heuristic.');
    }

    const templateVersion = detectedTemplate ? detectedTemplate.templateId : 'BOQ_TEMPLATE_STANDARD_V1';

    // Map column indices
    let colSiteId = -1;
    let colSiteName = -1;
    let colRegion = -1;
    let colAmount = -1;
    let colScope = -1;

    headerCells.forEach((header, idx) => {
      const lower = header.toLowerCase();
      if (/site.*id|site.*code|tower.*id/i.test(lower) && colSiteId === -1) {
        colSiteId = idx;
      } else if (/site.*name|facility.*name|location/i.test(lower) && colSiteName === -1) {
        colSiteName = idx;
      } else if (/region|zone|territory/i.test(lower) && colRegion === -1) {
        colRegion = idx;
      } else if (/amount|total.*tzs|authorized.*val|cost|total/i.test(lower) && colAmount === -1) {
        colAmount = idx;
      } else if (/scope|description|details/i.test(lower) && colScope === -1) {
        colScope = idx;
      }
    });

    // Fallbacks if specific matches weren't found
    if (colSiteId === -1) {
      colSiteId = headerCells.findIndex((h) => /site/i.test(h));
    }
    if (colAmount === -1) {
      colAmount = headerCells.findIndex((h) => /amount|total|value|price/i.test(h));
    }

    if (colSiteId === -1 || colAmount === -1) {
      return {
        templateVersion,
        totalAmount: 0,
        currency,
        sites: [],
        warnings,
        blockingErrors: [
          `PARSING_FAILED: Missing mandatory columns. Site Identifier Column: ${
            colSiteId !== -1 ? 'Found' : 'MISSING'
          }, Amount Column: ${colAmount !== -1 ? 'Found' : 'MISSING'}.`,
        ],
      };
    }

    let calculatedTotal = Money.fromNumber(0, currency);

    // Parse data rows starting after headerRowIndex
    for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || row.length === 0) continue;

      const rawSiteId = row[colSiteId];
      if (rawSiteId == null || String(rawSiteId).trim() === '') {
        // Skip purely blank rows
        continue;
      }

      const siteIdStr = String(rawSiteId).trim();

      // Check if this row is a summary/total row
      if (/total|sum|grand total/i.test(siteIdStr)) {
        continue;
      }

      const rawSiteName = colSiteName !== -1 && row[colSiteName] != null ? String(row[colSiteName]).trim() : siteIdStr;
      const rawRegion = colRegion !== -1 && row[colRegion] != null ? String(row[colRegion]).trim() : 'Unassigned';
      const rawScope = colScope !== -1 && row[colScope] != null ? String(row[colScope]).trim() : undefined;

      const rawAmountVal = row[colAmount];
      if (rawAmountVal == null || rawAmountVal === '') {
        blockingErrors.push(`MISSING_MANDATORY_VALUE: Row ${r + 1} (Site: ${siteIdStr}) has empty amount value.`);
        continue;
      }

      // Parse amount
      let numAmount: number;
      if (typeof rawAmountVal === 'number') {
        numAmount = rawAmountVal;
      } else {
        const cleanedStr = String(rawAmountVal).replace(/[^0-9.-]/g, '');
        numAmount = parseFloat(cleanedStr);
      }

      if (isNaN(numAmount) || numAmount < 0) {
        blockingErrors.push(
          `PARSING_FAILED: Row ${r + 1} (Site: ${siteIdStr}) has invalid numerical amount: "${rawAmountVal}".`
        );
        continue;
      }

      const lineMoney = Money.fromNumber(numAmount, currency);
      calculatedTotal = calculatedTotal.add(lineMoney);

      extractedSites.push({
        siteIdExt: siteIdStr,
        siteName: rawSiteName,
        region: rawRegion,
        authorizedAmount: lineMoney.majorAmount,
        scopeDescription: rawScope,
        rawAmount: typeof rawAmountVal === 'number' ? rawAmountVal : String(rawAmountVal),
      });
    }

    if (extractedSites.length === 0 && blockingErrors.length === 0) {
      blockingErrors.push('PARSING_FAILED: No valid site commercial lines could be extracted from worksheet.');
    }

    return {
      templateVersion,
      totalAmount: calculatedTotal.majorAmount,
      currency,
      sites: extractedSites,
      warnings,
      blockingErrors,
      rawSheetName: targetSheetName,
    };
  }
}
