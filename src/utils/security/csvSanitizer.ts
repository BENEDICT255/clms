// ==============================================================================
// CLMS CSV Injection Sanitization Utility
// ==============================================================================
// Governed by Enterprise Security Discipline & Prompt 4 Section 68:
// Protects against spreadsheet formula execution vulnerabilities.
// Any textual cell starting with '=', '+', '-', '@', '\t', or '\r'
// is prepended with a single quote (') to force text evaluation in Excel/Sheets.
// ==============================================================================

const DANGEROUS_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Sanitizes a single cell value for CSV / Excel export.
 */
export function sanitizeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Check if string starts with dangerous spreadsheet formula triggers
  if (DANGEROUS_PREFIXES.some((prefix) => str.startsWith(prefix))) {
    return `'${str}`;
  }

  // If contains commas, quotes, or newlines, quote the entire field
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts an array of objects into a sanitized CSV string.
 */
export function exportToSanitizedCsv<T extends Record<string, unknown>>(
  headers: Array<{ key: keyof T; label: string }>,
  rows: T[]
): string {
  const headerLine = headers.map((h) => sanitizeCsvValue(h.label)).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => sanitizeCsvValue(row[h.key])).join(',')
  );

  return [headerLine, ...dataLines].join('\n');
}
