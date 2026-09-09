// ==============================================================================
// CLMS Certificate PDF Service
// ==============================================================================
// Governed by AGENTS.md and Stabilization Specification Sections 11-15:
// - Delegates canonical PDF compilation to CertificatePacketService
// - Single source of truth for both on-screen viewing and PDF generation
// - Zero hardcoded values, real linked PO attachment, and correct PAC terminology
// - Integrated with centralized DownloadService
// ==============================================================================

import { PDFDocument } from 'pdf-lib';
import { CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';
import {
  CertificatePacketService,
  PoSiteDetail,
  CertificatePacketParams,
} from '@/application/services/CertificatePacketService';
import { downloadService } from '@/application/services/DownloadService';

export type { PoSiteDetail, CertificatePacketParams };

export class CertificatePdfService {
  /**
   * Generates the authentic multi-page certificate PDF matching corporate standards.
   * Returns Uint8Array of the final merged document.
   */
  public static async generateCertificatePdf(params: {
    certificate: CertificateRecord;
    poSites?: PoSiteDetail[] | undefined;
    poBytes?: ArrayBuffer | null | undefined;
    reviewerName?: string | undefined;
    reviewerDate?: string | undefined;
  }): Promise<Uint8Array> {
    const result = await CertificatePacketService.generateCertificatePacket({
      certificate: params.certificate,
      poSites: params.poSites,
      poBytes: params.poBytes,
      approverName: params.reviewerName,
      approverDate: params.reviewerDate,
    });
    return result.pdfBytes;
  }

  /**
   * Appends the certificate pages directly to an existing PDFDocument without re-encoding.
   */
  public static async appendCertificatePages(
    pdfDoc: PDFDocument,
    params: {
      certificate: CertificateRecord;
      poSites?: PoSiteDetail[] | undefined;
      poBytes?: ArrayBuffer | null | undefined;
      reviewerName?: string | undefined;
      reviewerDate?: string | undefined;
    }
  ): Promise<void> {
    const result = await CertificatePacketService.generateCertificatePacket({
      certificate: params.certificate,
      poSites: params.poSites,
      poBytes: params.poBytes,
      approverName: params.reviewerName,
      approverDate: params.reviewerDate,
    });

    const loadedDoc = await PDFDocument.load(result.pdfBytes);
    const indices = loadedDoc.getPageIndices();
    const copiedPages = await pdfDoc.copyPages(loadedDoc, indices);
    for (const page of copiedPages) {
      pdfDoc.addPage(page);
    }
  }

  /**
   * Triggers single-flight protected browser download using DownloadService.
   */
  public static async triggerDownload(pdfBytes: Uint8Array, fileName: string): Promise<void> {
    const cleanName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    downloadService.downloadBlob(blob, cleanName);
  }
}
