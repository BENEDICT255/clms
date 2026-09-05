// ==============================================================================
// CLMS BOQ Template Registry & Versioned Signatures
// ==============================================================================

export interface TemplateDefinition {
  templateId: string;
  name: string;
  version: string;
  projectTypeCode: string;
  requiredSheetPatterns: RegExp[];
  headerKeywords: string[];
  columnAliases: {
    siteId: string[];
    siteName: string[];
    region: string[];
    amount: string[];
    scope?: string[];
  };
}

export const REGISTERED_BOQ_TEMPLATES: TemplateDefinition[] = [
  {
    templateId: 'BOQ_TEMPLATE_SITE_IMPROVEMENT_V1',
    name: 'Site Improvement Master BOQ',
    version: '1.0',
    projectTypeCode: 'SITE_IMPROVEMENT',
    requiredSheetPatterns: [/boq/i, /site.*improvement/i, /commercial.*schedule/i, /summary/i, /sheet1/i],
    headerKeywords: ['site id', 'site name', 'region', 'amount'],
    columnAliases: {
      siteId: ['site id', 'site_id', 'site code', 'site identifier', 'tower id'],
      siteName: ['site name', 'site_name', 'facility name', 'location name'],
      region: ['region', 'zone', 'province', 'territory', 'geography'],
      amount: ['total (tzs)', 'total amount', 'amount', 'authorized value', 'total cost', 'rate total'],
      scope: ['scope', 'description', 'work scope', 'scope of work'],
    },
  },
  {
    templateId: 'BOQ_TEMPLATE_POWER_MODERNIZATION_V1',
    name: 'Power Modernization BOQ Template',
    version: '1.0',
    projectTypeCode: 'POWER_MODERNIZATION',
    requiredSheetPatterns: [/power/i, /modernization/i, /boq/i, /solar/i],
    headerKeywords: ['site id', 'site name', 'region', 'power scope', 'total'],
    columnAliases: {
      siteId: ['site id', 'site_id', 'site code'],
      siteName: ['site name', 'site_name'],
      region: ['region', 'zone'],
      amount: ['total (tzs)', 'power total', 'amount', 'authorized sum'],
      scope: ['system type', 'scope', 'modernization scope'],
    },
  },
  {
    templateId: 'BOQ_TEMPLATE_STANDARD_V1',
    name: 'Standard Commercial Infrastructure BOQ',
    version: '1.0',
    projectTypeCode: 'STANDARD',
    requiredSheetPatterns: [/boq/i, /sheet/i, /data/i, /sites/i],
    headerKeywords: ['site', 'amount'],
    columnAliases: {
      siteId: ['site id', 'site', 'id', 'site_id'],
      siteName: ['site name', 'name', 'location'],
      region: ['region', 'area', 'zone'],
      amount: ['amount', 'total', 'price', 'value', 'total tzs'],
      scope: ['description', 'scope', 'details'],
    },
  },
];

export function detectBOQTemplate(sheetNames: string[], headerRowStrings: string[]): TemplateDefinition | null {
  const normalizedHeaders = headerRowStrings.map((h) => h.toLowerCase().trim());

  for (const template of REGISTERED_BOQ_TEMPLATES) {
    // 1. Check sheet name match
    const hasMatchingSheet = sheetNames.some((name) =>
      template.requiredSheetPatterns.some((pattern) => pattern.test(name))
    );

    // 2. Check keyword count in headers
    const matchedKeywords = template.headerKeywords.filter((kw) =>
      normalizedHeaders.some((header) => header.includes(kw))
    );

    const matchRatio = matchedKeywords.length / template.headerKeywords.length;

    if (hasMatchingSheet && matchRatio >= 0.75) {
      return template;
    }
  }

  // Fallback to standard if basic site and amount keywords are present
  const hasSiteHeader = normalizedHeaders.some((h) => h.includes('site'));
  const hasAmountHeader = normalizedHeaders.some((h) => h.includes('amount') || h.includes('total') || h.includes('value'));

  if (hasSiteHeader && hasAmountHeader) {
    return REGISTERED_BOQ_TEMPLATES[2] || null;
  }

  return null;
}
