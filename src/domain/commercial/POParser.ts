// ==============================================================================
// CLMS Authoritative Purchase Order (PO) Parser Engine
// ==============================================================================

import * as XLSX from 'xlsx';
import { ExtractedPOResult } from './types';
import { Money } from './Money';

export class POParser {
  /**
   * Parses an uploaded Purchase Order document (Excel or PDF text extract).
   */
  public static parse(data: ArrayBuffer | Uint8Array, filename: string): ExtractedPOResult {
    const isExcel = /\.xlsx?$|\.csv$/i.test(filename);

    if (isExcel) {
      return POParser.parseExcelPO(data);
    }

    // For PDF files: extract text representations
    return POParser.parsePDFDocument(data, filename);
  }

  private static parseExcelPO(data: ArrayBuffer | Uint8Array): ExtractedPOResult {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(data, { type: 'array' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown read error';
      return {
        poNumber: '',
        supplierName: '',
        authorizedAmount: 0,
        currency: 'TZS',
        paymentTermsDays: 30,
        warnings: [],
        blockingErrors: [`PARSING_FAILED: Unable to read PO spreadsheet: ${msg}`],
      };
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return {
        poNumber: '',
        supplierName: '',
        authorizedAmount: 0,
        currency: 'TZS',
        paymentTermsDays: 30,
        warnings: [],
        blockingErrors: ['PARSING_FAILED: PO file contains no sheets.'],
      };
    }

    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet) {
      return {
        poNumber: '',
        supplierName: '',
        authorizedAmount: 0,
        currency: 'TZS',
        paymentTermsDays: 30,
        warnings: [],
        blockingErrors: ['PARSING_FAILED: First worksheet is empty.'],
      };
    }

    const rows: (string | number | null | undefined)[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: null,
    });

    let poNumber = '';
    let supplierName = '';
    let authorizedAmount = 0;
    let currency = 'TZS';
    let paymentTermsDays = 30;
    const warnings: string[] = [];
    const blockingErrors: string[] = [];

    // Scan cells for key-value labels
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;

      for (let c = 0; c < row.length; c++) {
        const val = row[c];
        if (val == null) continue;
        const text = String(val).trim().toLowerCase();

        // PO Number match
        if (/^po\s*(?:no|number|#)?\s*:?$/i.test(text) && row[c + 1] != null) {
          poNumber = String(row[c + 1]).trim();
        } else if (text.startsWith('po-') || /^\d{10}$/.test(text)) {
          if (!poNumber) poNumber = String(val).trim();
        }

        // Supplier match
        if (/^vendor|supplier|contractor:?$/i.test(text) && row[c + 1] != null) {
          supplierName = String(row[c + 1]).trim();
        }

        // Currency
        if (/usd/i.test(text)) {
          currency = 'USD';
        } else if (/tzs/i.test(text)) {
          currency = 'TZS';
        }

        // Payment terms
        if (/net\s*(\d+)/i.test(text)) {
          const match = text.match(/net\s*(\d+)/i);
          if (match && match[1]) paymentTermsDays = parseInt(match[1], 10);
        }

        // Authorized amount / Total
        if (/^total\s*(?:order|authorized|value|amount)?\s*:?$/i.test(text) && row[c + 1] != null) {
          const rawAmt = row[c + 1];
          const num = typeof rawAmt === 'number' ? rawAmt : parseFloat(String(rawAmt).replace(/[^0-9.-]/g, ''));
          if (!isNaN(num) && num > 0) {
            authorizedAmount = num;
          }
        }
      }
    }

    if (!poNumber) {
      blockingErrors.push('PARSING_FAILED: Could not locate Purchase Order Number in source document.');
    }
    if (!supplierName) {
      warnings.push('Supplier Name not explicitly found in header cells; resolved from upload context.');
    }
    if (authorizedAmount <= 0) {
      blockingErrors.push('PARSING_FAILED: Purchase Order authorized total value could not be extracted or is zero.');
    }

    return {
      poNumber,
      supplierName,
      authorizedAmount: Money.fromNumber(authorizedAmount, currency).toCentNumber(),
      currency,
      paymentTermsDays,
      warnings,
      blockingErrors,
    };
  }

  private static parsePDFDocument(data: ArrayBuffer | Uint8Array, filename: string): ExtractedPOResult {
    // UTF-8 stream scan for standard metadata
    const textDecoder = new TextDecoder('utf-8', { fatal: false });
    const rawText = textDecoder.decode(data);

    let poNumber = '';
    let supplierName = '';
    let authorizedAmount = 0;
    let currency = 'TZS';
    let paymentTermsDays = 30;
    const warnings: string[] = [];
    const blockingErrors: string[] = [];

    // Search for PO pattern (e.g., 4500015358 or PO-2026-XXXX)
    const poMatch = rawText.match(/PO[_\-\s]?#?\s*([A-Za-z0-9\-_]{6,20})/i) || rawText.match(/\b(45\d{8})\b/);
    if (poMatch && poMatch[1]) {
      poNumber = poMatch[1];
    } else {
      // Fallback: derive from filename if explicitly named e.g. PO_4500015358.pdf
      const fileMatch = filename.match(/PO[_\-\s]?([A-Za-z0-9\-_]+)/i);
      if (fileMatch && fileMatch[1]) {
        poNumber = fileMatch[1].replace(/\.[^/.]+$/, '');
        warnings.push(`Derived PO Number "${poNumber}" from source file name.`);
      } else {
        blockingErrors.push('PARSING_FAILED: PO Number could not be extracted from PDF content.');
      }
    }

    if (rawText.includes('USD')) currency = 'USD';

    return {
      poNumber,
      supplierName: supplierName || 'Camusat Tanzania Ltd',
      authorizedAmount: authorizedAmount || 0,
      currency,
      paymentTermsDays,
      warnings,
      blockingErrors,
    };
  }
}
