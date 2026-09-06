// ==============================================================================
// CLMS BOQ Template Registry & Versioned Parser Adapters
// ==============================================================================
// Governed by PRODUCT.md / ARCHITECTURE.md:
// Project Type -> BOQ Template Version -> Template Signature -> Dedicated Parser Adapter -> Normalized Commercial Model
// ==============================================================================

import * as XLSX from 'xlsx';
import { ExtractedBOQResult } from './types';
import { SiteImprovementBOQParserV1 } from './templates/SiteImprovementBOQParserV1';

export interface CommercialDocumentParser {
  readonly templateId: string;
  readonly templateName: string;
  supports(workbook: XLSX.WorkBook): boolean;
  parse(workbook: XLSX.WorkBook): ExtractedBOQResult;
}

export interface TemplateDefinition {
  templateId: string;
  name: string;
  version: string;
  projectTypeCode: string;
  requiredSheetPatterns: RegExp[];
  headerKeywords: string[];
}

export const REGISTERED_BOQ_TEMPLATES: TemplateDefinition[] = [
  {
    templateId: 'BOQ_TEMPLATE_SITE_IMPROVEMENT_V1',
    name: 'Site Improvement Master BOQ (V1)',
    version: '1.0',
    projectTypeCode: 'SITE_IMPROVEMENT',
    requiredSheetPatterns: [/summary/i, /boq/i, /site.*improvement/i],
    headerKeywords: ['site id', 'site name', 'services', 'transportation', 'total price'],
  },
  {
    templateId: 'BOQ_TEMPLATE_POWER_MODERNIZATION_V1',
    name: 'Power Modernization BOQ Template',
    version: '1.0',
    projectTypeCode: 'POWER_MODERNIZATION',
    requiredSheetPatterns: [/power/i, /modernization/i, /boq/i, /solar/i],
    headerKeywords: ['site id', 'site name', 'region', 'power scope', 'total'],
  },
  {
    templateId: 'BOQ_TEMPLATE_STANDARD_V1',
    name: 'Standard Commercial Infrastructure BOQ',
    version: '1.0',
    projectTypeCode: 'STANDARD',
    requiredSheetPatterns: [/boq/i, /sheet/i, /data/i, /sites/i, /schedule/i],
    headerKeywords: ['site id', 'amount'],
  },
];

export const REGISTERED_PARSER_ADAPTERS: CommercialDocumentParser[] = [
  {
    templateId: SiteImprovementBOQParserV1.TEMPLATE_ID,
    templateName: SiteImprovementBOQParserV1.TEMPLATE_NAME,
    supports: (wb) => SiteImprovementBOQParserV1.supports(wb),
    parse: (wb) => SiteImprovementBOQParserV1.parse(wb),
  },
];

/**
 * Resolves the authoritative dedicated template adapter for a given Excel workbook.
 */
export function findMatchingParserAdapter(workbook: XLSX.WorkBook): CommercialDocumentParser | null {
  for (const adapter of REGISTERED_PARSER_ADAPTERS) {
    if (adapter.supports(workbook)) {
      return adapter;
    }
  }
  return null;
}

/**
 * Detects template definition metadata from sheet names and header row strings.
 */
export function detectBOQTemplate(sheetNames: string[], headerRowStrings: string[]): TemplateDefinition | null {
  const normalizedHeaders = headerRowStrings.map((h) => h.toLowerCase().trim());

  for (const template of REGISTERED_BOQ_TEMPLATES) {
    const hasMatchingSheet = sheetNames.some((name) =>
      template.requiredSheetPatterns.some((pattern) => pattern.test(name))
    );

    const matchedKeywords = template.headerKeywords.filter((kw) =>
      normalizedHeaders.some((header) => header.includes(kw))
    );

    const matchRatio = matchedKeywords.length / template.headerKeywords.length;

    if (hasMatchingSheet && matchRatio >= 0.6) {
      return template;
    }
  }

  return null;
}
