// ==============================================================================
// CLMS Commercial Ingestion & Domain Types
// ==============================================================================

export type PackageStatus =
  | 'UPLOADED'
  | 'PARSED'
  | 'DIAGNOSTIC_REVIEW'
  | 'READY_FOR_CONFIRM'
  | 'ACTIVE'
  | 'SUPERSEDED';

export interface SiteLineProvenance {
  sourceSheet: string;
  row: number;
  colSiteId?: number | undefined;
  colAmount?: number | undefined;
  rawValue?: string | undefined;
}

export interface ExtractedSiteLine {
  siteIdExt: string;
  siteName: string;
  region?: string | undefined;
  authorizedAmount: number;
  scopeDescription?: string | undefined;
  isOverridden?: boolean | undefined;
  rawAmount?: number | string | undefined;
  overrideReason?: string | undefined;
  provenance?: SiteLineProvenance | undefined;
}

export interface ExtractedBOQResult {
  templateVersion: string;
  totalAmount: number;
  currency: string;
  currencySource?: string | undefined;
  sites: ExtractedSiteLine[];
  warnings: string[];
  blockingErrors: string[];
  rawSheetName?: string | undefined;
}

export interface ExtractedPOResult {
  poNumber: string;
  supplierName: string;
  supplierId?: string | undefined;
  authorizedAmount: number;
  subtotalExclTax?: number | undefined;
  taxAmount?: number | undefined;
  orderTotalInclTax?: number | undefined;
  currency: string;
  currencySource?: string | undefined;
  paymentTermsDays: number | null;
  paymentTermsText?: string | undefined;
  scopeDescription?: string | undefined;
  poDate?: string | undefined;
  warnings: string[];
  blockingErrors: string[];
}

export interface CommercialCrossValidationResult {
  isPass: boolean;
  hasWarnings: boolean;
  hasBlockingIssues: boolean;
  boqTotal: number;
  poTotal: number;
  varianceAmount: number;
  currencyMatch: boolean;
  supplierMatch: boolean;
  toleranceApplied: boolean;
  blockingReasons: string[];
  warningMessages: string[];
}

export interface NormalizedPackageExtraction {
  templateVersion: string;
  supplierName: string;
  poNumber: string;
  currency: string;
  poAuthorizedAmount: number;
  boqTotalAmount: number;
  paymentTermsDays: number | null;
  paymentTermsText?: string | undefined;
  subtotalExclTax?: number | undefined;
  taxAmount?: number | undefined;
  orderTotalInclTax?: number | undefined;
  sites: ExtractedSiteLine[];
  crossValidation: CommercialCrossValidationResult;
  boqFileHash: string;
  poFileHash: string;
}

export interface CommercialPackageRecord {
  id: string;
  projectId: string;
  projectName?: string;
  packageRef: string;
  status: PackageStatus;
  confirmedBy?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  poId?: string;
  poNumber?: string;
  supplierName?: string;
  authorizedAmount?: number;
  currency?: string;
  siteCount?: number;
}
