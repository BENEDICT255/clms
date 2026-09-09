// ==============================================================================
// CLMS Unified Commercial Invoice PDF Engine
// ==============================================================================
// Compiles the 3-part commercial packet into one authoritative document:
//   Part 1: Attached Supplier Commercial Invoice Document (Required)
//   Part 2: Attached TRA / EFD Fiscal Receipt (Optional)
//   Part 3: Authentic 9-Page Helios Acceptance Certificate (FAC / PAC)
// ==============================================================================

import { PDFDocument } from 'pdf-lib';
import { CertificatePdfService, PoSiteDetail } from '@/features/certificates/CertificatePdfService';
import { CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';

export interface CompileUnifiedInvoiceParams {
  invoiceFile: File | Blob | Uint8Array;
  invoiceFileName?: string | undefined;
  receiptFile?: File | Blob | Uint8Array | null | undefined;
  receiptFileName?: string | undefined;
  certificate: CertificateRecord;
  poSites?: PoSiteDetail[] | undefined;
  reviewerName?: string | undefined;
  reviewerDate?: string | undefined;
}

export class UnifiedInvoicePdfService {
  /**
   * Compiles the 3-part unified PDF package according to commercial lifecycle discipline:
   * 1. Supplier Commercial Invoice
   * 2. Fiscal Receipt (if provided)
   * 3. 9-Page Official Helios Acceptance Certificate (FAC or PAC)
   */
  public static async compileUnifiedInvoicePacket(params: CompileUnifiedInvoiceParams): Promise<Uint8Array> {
    const {
      invoiceFile,
      invoiceFileName = 'invoice.pdf',
      receiptFile,
      receiptFileName = 'receipt.pdf',
      certificate,
      poSites = [],
      reviewerName,
      reviewerDate,
    } = params;

    const mergedPdf = await PDFDocument.create();

    // ---------------------------------------------------------------------------
    // Part 1: Attached Supplier Invoice Document (Required)
    // ---------------------------------------------------------------------------
    const invoiceBytes = await this.toBytes(invoiceFile);
    await this.appendDocumentPages(mergedPdf, invoiceBytes, invoiceFileName);

    // ---------------------------------------------------------------------------
    // Part 2: Attached TRA / EFD Fiscal Receipt (Optional)
    // ---------------------------------------------------------------------------
    if (receiptFile) {
      const receiptBytes = await this.toBytes(receiptFile);
      if (receiptBytes.byteLength > 0) {
        await this.appendDocumentPages(mergedPdf, receiptBytes, receiptFileName);
      }
    }

    // ---------------------------------------------------------------------------
    // Part 3: Authentic 9-Page Helios Acceptance Certificate (FAC / PAC)
    // ---------------------------------------------------------------------------
    const certGenParams: Parameters<typeof CertificatePdfService.appendCertificatePages>[1] = {
      certificate,
    };
    if (poSites && poSites.length > 0) {
      certGenParams.poSites = poSites;
    }
    if (reviewerName) {
      certGenParams.reviewerName = reviewerName;
    }
    if (reviewerDate) {
      certGenParams.reviewerDate = reviewerDate;
    }

    // Direct single-pass append avoiding duplicate PDF serialize/deserialize cycles
    await CertificatePdfService.appendCertificatePages(mergedPdf, certGenParams);

    return await mergedPdf.save();
  }

  /**
   * Appends pages of a PDF or image into the target PDFDocument.
   */
  private static async appendDocumentPages(
    targetDoc: PDFDocument,
    bytes: Uint8Array,
    fileName: string
  ): Promise<void> {
    const lowerName = fileName.toLowerCase();

    // Check for image types (PNG, JPG, JPEG)
    if (lowerName.endsWith('.png')) {
      try {
        const pngImage = await targetDoc.embedPng(bytes);
        this.addScaledImagePage(targetDoc, pngImage);
        return;
      } catch (err) {
        console.warn('Could not embed PNG directly, attempting PDF fallback:', err);
      }
    }

    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      try {
        const jpgImage = await targetDoc.embedJpg(bytes);
        this.addScaledImagePage(targetDoc, jpgImage);
        return;
      } catch (err) {
        console.warn('Could not embed JPG directly, attempting PDF fallback:', err);
      }
    }

    // Default: load as PDF document
    try {
      const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pageIndices = srcDoc.getPageIndices();
      const copiedPages = await targetDoc.copyPages(srcDoc, pageIndices);
      for (const page of copiedPages) {
        targetDoc.addPage(page);
      }
    } catch (pdfErr) {
      console.warn(`Could not parse ${fileName} as PDF document:`, pdfErr);
    }
  }

  /**
   * Adds an A4 page with the given image scaled proportionally to fit.
   */
  private static addScaledImagePage(targetDoc: PDFDocument, image: { width: number; height: number }): void {
    const a4Width = 595.28;
    const a4Height = 841.89;
    const margin = 24;
    const maxWidth = a4Width - margin * 2;
    const maxHeight = a4Height - margin * 2;

    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const renderWidth = image.width * scale;
    const renderHeight = image.height * scale;
    const x = margin + (maxWidth - renderWidth) / 2;
    const y = margin + (maxHeight - renderHeight) / 2;

    const page = targetDoc.addPage([a4Width, a4Height]);
    page.drawImage(image as any, {
      x,
      y,
      width: renderWidth,
      height: renderHeight,
    });
  }

  /**
   * Converts various file/blob/buffer types to Uint8Array safely.
   */
  private static async toBytes(file: File | Blob | Uint8Array): Promise<Uint8Array> {
    if (file instanceof Uint8Array) {
      return file;
    }
    if (typeof (file as any).arrayBuffer === 'function') {
      const buffer = await (file as any).arrayBuffer();
      return new Uint8Array(buffer);
    }
    throw new Error('Unsupported file buffer type');
  }

  /**
   * Triggers client-side browser download of the compiled PDF packet.
   * Utilizes File System Access API (showSaveFilePicker) when available to completely
   * bypass external download interceptors (such as Internet Download Manager COM hooks),
   * falling back cleanly to standard download.
   */
  public static async triggerDownload(pdfBytes: Uint8Array, fileName: string): Promise<void> {
    const cleanName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: cleanName,
          types: [
            {
              description: 'PDF Commercial Document (*.pdf)',
              accept: { 'application/pdf': ['.pdf'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (pickerErr: any) {
        if (pickerErr?.name === 'AbortError') {
          return;
        }
        console.warn('Native file picker note, using browser download:', pickerErr);
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = cleanName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
