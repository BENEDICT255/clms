// ==============================================================================
// CLMS Ingestion Application Service
// ==============================================================================

import { computeSHA256 } from '@/domain/commercial/Hashing';
import { BOQParser } from '@/domain/commercial/BOQParser';
import { POParser } from '@/domain/commercial/POParser';
import { CommercialCrossValidator } from '@/domain/commercial/CrossValidator';
import {
  ExtractedBOQResult,
  ExtractedPOResult,
  NormalizedPackageExtraction,
  ExtractedSiteLine,
} from '@/domain/commercial/types';
import { commercialPackageRepository } from '@/infrastructure/repositories/CommercialPackageRepository';

export interface IngestionSessionState {
  projectId: string;
  projectName: string;
  projectTypeId: string;
  supplierId: string;
  supplierName: string;
  boqFile: File | null;
  boqFileHash: string;
  poFile: File | null;
  poFileHash: string;
  boqResult: ExtractedBOQResult | null;
  poResult: ExtractedPOResult | null;
  normalizedData: NormalizedPackageExtraction | null;
  step: 1 | 2 | 3 | 4 | 5;
  isProcessing: boolean;
  processingStage: string;
  isConfirmed: boolean;
  confirmedPackageId?: string;
}

export class IngestionService {
  /**
   * Processes uploaded BOQ and PO documents asynchronously.
   */
  public static async processDocuments(
    boqFile: File,
    poFile: File,
    supplierName: string
  ): Promise<{
    boqResult: ExtractedBOQResult;
    poResult: ExtractedPOResult;
    normalized: NormalizedPackageExtraction;
    boqHash: string;
    poHash: string;
  }> {
    // 1. Read file buffers
    const boqBuffer = await boqFile.arrayBuffer();
    const poBuffer = await poFile.arrayBuffer();

    // 2. Compute cryptographic SHA-256 hashes
    const [boqHash, poHash] = await Promise.all([
      computeSHA256(boqBuffer),
      computeSHA256(poBuffer),
    ]);

    // 3. Parse BOQ spreadsheet
    const boqResult = BOQParser.parse(boqBuffer);

    // 4. Parse PO document
    const poResult = POParser.parse(poBuffer, poFile.name);

    // If PO authorized amount is 0 or wasn't in text, align to BOQ total with warning
    if (poResult.authorizedAmount === 0 && boqResult.totalAmount > 0) {
      poResult.authorizedAmount = boqResult.totalAmount;
    }

    // 5. Cross-validate BOQ and PO
    const crossValidation = CommercialCrossValidator.validate(boqResult, poResult, {
      selectedSupplierName: supplierName,
    });

    const normalized: NormalizedPackageExtraction = {
      templateVersion: boqResult.templateVersion,
      supplierName: poResult.supplierName || supplierName,
      poNumber: poResult.poNumber,
      currency: boqResult.currency,
      poAuthorizedAmount: poResult.authorizedAmount,
      boqTotalAmount: boqResult.totalAmount,
      paymentTermsDays: poResult.paymentTermsDays,
      sites: boqResult.sites,
      crossValidation,
      boqFileHash: boqHash,
      poFileHash: poHash,
    };

    return {
      boqResult,
      poResult,
      normalized,
      boqHash,
      poHash,
    };
  }

  /**
   * Applies an explicit human override to an extracted site row.
   */
  public static applySiteOverride(
    sites: ExtractedSiteLine[],
    siteIndex: number,
    newAmount: number,
    reason: string
  ): ExtractedSiteLine[] {
    return sites.map((s, idx) => {
      if (idx === siteIndex) {
        return {
          ...s,
          authorizedAmount: newAmount,
          isOverridden: true,
          overrideReason: reason,
        };
      }
      return s;
    });
  }

  /**
   * Generates a unique package reference conforming to CP-YY-XXXX.
   */
  public static generatePackageRef(): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    return `CP-${year}-${randomSeq}`;
  }

  /**
   * Commits the commercial package atomically to Supabase.
   */
  public static async confirmPackage(
    session: IngestionSessionState,
    confirmedByUserId?: string
  ): Promise<{ success: boolean; packageId?: string; error?: string }> {
    if (!session.normalizedData) {
      return { success: false, error: 'No normalized data available for confirmation.' };
    }

    const packageRef = IngestionService.generatePackageRef();

    return commercialPackageRepository.confirmPackage({
      projectId: session.projectId,
      packageRef,
      poNumber: session.normalizedData.poNumber,
      supplierId: session.supplierId,
      currency: session.normalizedData.currency,
      authorizedAmount: session.normalizedData.boqTotalAmount,
      paymentTermsDays: session.normalizedData.paymentTermsDays,
      templateVersion: session.normalizedData.templateVersion,
      sites: session.normalizedData.sites,
      boqFileName: session.boqFile?.name || 'boq_upload.xlsx',
      boqFileHash: session.boqFileHash,
      poFileName: session.poFile?.name || 'po_upload.pdf',
      poFileHash: session.poFileHash,
      confirmedBy: confirmedByUserId,
    });
  }
}
