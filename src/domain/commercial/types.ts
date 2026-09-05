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

export interface ExtractedSiteLine {
  siteIdExt: string;
  siteName: string;
  region: string;
  authorizedAmount: number;
  scopeDescription?: string | undefined;
  isOverridden?: boolean | undefined;
  rawAmount?: number | string | undefined;
  overrideReason?: string | undefined;
}

export interface ExtractedBOQResult {
  templateVersion: string;
  totalAmount: number;
  currency: string;
  sites: ExtractedSiteLine[];
  warnings: string[];
  blockingErrors: string[];
  rawSheetName?: string;
}

export interface ExtractedPOResult {
  poNumber: string;
  supplierName: string;
  authorizedAmount: number;
  currency: string;
  paymentTermsDays: number;
  poDate?: string;
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
  paymentTermsDays: number;
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
  poNumber?: string;
  supplierName?: string;
  authorizedAmount?: number;
  currency?: string;
  siteCount?: number;
}
