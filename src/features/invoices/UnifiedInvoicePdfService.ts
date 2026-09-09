// ==============================================================================
// CLMS Unified Commercial Invoice PDF Engine
// ==============================================================================
// Compiles the 3-part commercial packet into one authoritative document:
//   Section A: Attached Supplier Commercial Invoice Document (Required)
//   Section B: Attached TRA / EFD Fiscal Receipt & Supporting Docs (Optional)
//   Section C: Authentic Helios Acceptance Certificate Packet (FAC / PAC)
// Integrated with InvoicePacketService and DownloadService.
// ==============================================================================

import { CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';
import { PoSiteDetail } from '@/application/services/CertificatePacketService';
import {
  InvoicePacketService,
  SupportingDocumentItem,
} from '@/application/services/InvoicePacketService';
import { downloadService } from '@/application/services/DownloadService';

export interface CompileUnifiedInvoiceParams {
  invoiceFile: File | Blob | Uint8Array;
  invoiceFileName?: string | undefined;
  receiptFile?: File | Blob | Uint8Array | null | undefined;
  receiptFileName?: string | undefined;
  supportingDocs?: SupportingDocumentItem[] | undefined;
  certificate: CertificateRecord;
  poSites?: PoSiteDetail[] | undefined;
  reviewerName?: string | undefined;
  reviewerDate?: string | undefined;
}

export class UnifiedInvoicePdfService {
  /**
   * Compiles the unified PDF package according to commercial lifecycle discipline:
   * Section A: Supplier Commercial Invoice
   * Section B: Fiscal Receipt & Supporting Documents
   * Section C: Official Helios Acceptance Certificate Packet
   */
  public static async compileUnifiedInvoicePacket(params: CompileUnifiedInvoiceParams): Promise<Uint8Array> {
    const {
      invoiceFile,
      invoiceFileName = 'invoice.pdf',
      receiptFile,
      receiptFileName = 'receipt.pdf',
      supportingDocs = [],
      certificate,
      poSites = [],
      reviewerName,
    } = params;

    const invoiceBytes = await this.toBytes(invoiceFile);

    const mergedSupporting: SupportingDocumentItem[] = [...supportingDocs];
    if (receiptFile) {
      const receiptBytes = await this.toBytes(receiptFile);
      if (receiptBytes.byteLength > 0) {
        mergedSupporting.unshift({
          fileName: receiptFileName,
          bytes: receiptBytes,
          documentRole: 'TAX_RECEIPT',
        });
      }
    }

    const result = await InvoicePacketService.compileInvoicePacket({
      invoiceBytes,
      invoiceFileName,
      supportingDocs: mergedSupporting,
      certificate,
      poSites,
      approverName: reviewerName,
    });

    return result.pdfBytes;
  }

  /**
   * Triggers browser-native download using single-flight protected DownloadService.
   */
  public static triggerDownload(pdfBytes: Uint8Array, fileName: string): void {
    const cleanName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    downloadService.downloadBlob(blob, cleanName);
  }

  private static async toBytes(file: File | Blob | Uint8Array): Promise<Uint8Array> {
    if (file instanceof Uint8Array) return file;
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  }
}
