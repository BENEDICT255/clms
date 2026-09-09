// ==============================================================================
// Unified Commercial Invoice PDF Engine Unit Tests
// ==============================================================================

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { UnifiedInvoicePdfService } from '@/features/invoices/UnifiedInvoicePdfService';
import { CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';
import fs from 'fs';
import path from 'path';

describe('UnifiedInvoicePdfService 3-Part Commercial Package Engine', () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    const poPath = path.resolve(process.cwd(), 'public/assets/po_4500015358.pdf');
    const logoPath = path.resolve(process.cwd(), 'public/assets/helios_logo.png');

    global.fetch = (async (input: RequestInfo | URL) => {
      const urlStr = String(input);
      if (urlStr.includes('po_4500015358.pdf')) {
        const poBytes = fs.readFileSync(poPath);
        return new Response(poBytes, { status: 200 });
      }
      if (urlStr.includes('helios_logo.png')) {
        const logoBytes = fs.readFileSync(logoPath);
        return new Response(logoBytes, { status: 200 });
      }
      return new Response(null, { status: 404 });
    }) as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  const dummyCert: CertificateRecord = {
    id: '11111111-1111-1111-1111-111111111111',
    poId: '22222222-2222-2222-2222-222222222222',
    certificateNumber: 'FAC-SI-26-0002',
    certType: 'FAC',
    poNumber: '4500015358',
    supplierId: '33333333-3333-3333-3333-333333333333',
    supplierName: 'PRIME POWER T LTD',
    projectName: 'Site Improvement (Oversite Aggregates and Concrete)',
    currency: 'TZS',
    poAuthorizedAmount: 20138187.38,
    currentCertifiedAmount: 20138187.38,
    status: 'ISSUED',
    templateVersion: 'PROVISIONAL_V1',
    createdAt: '2026-09-06T10:00:00Z',
    updatedAt: '2026-09-06T10:00:00Z',
    siteCount: 3,
    sites: [
      {
        poSiteId: 's-1',
        siteIdExt: 'TZ-01001-B',
        siteName: 'Vingunguti Terminal',
        region: 'Dar Es Salaam',
        authorizedAmount: 6712729.13,
        currentAmount: 6712729.13,
        percentage: 100,
      },
      {
        poSiteId: 's-2',
        siteIdExt: 'TZ-01002-C',
        siteName: 'Buguruni Central',
        region: 'Dar Es Salaam',
        authorizedAmount: 6712729.13,
        currentAmount: 6712729.13,
        percentage: 100,
      },
      {
        poSiteId: 's-3',
        siteIdExt: 'TZ-01003-D',
        siteName: 'Ilala Market',
        region: 'Dar Es Salaam',
        authorizedAmount: 6712729.12,
        currentAmount: 6712729.12,
        percentage: 100,
      },
    ],
  };

  async function createSamplePdf(pageCount: number, title: string): Promise<Uint8Array> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    for (let i = 0; i < pageCount; i++) {
      const page = doc.addPage([595, 842]);
      page.drawText(`${title} - Page ${i + 1}`, {
        x: 50,
        y: 750,
        size: 16,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
    }
    return await doc.save();
  }

  it('compiles unified PDF with Invoice (1 page) + Receipt (1 page) + Certificate (9 pages) = 11 pages', async () => {
    const invoicePdf = await createSamplePdf(1, 'Supplier Tax Invoice INV-2026-001');
    const receiptPdf = await createSamplePdf(1, 'TRA EFD Fiscal Receipt');

    const unifiedBytes = await UnifiedInvoicePdfService.compileUnifiedInvoicePacket({
      invoiceFile: invoicePdf,
      invoiceFileName: 'inv_001.pdf',
      receiptFile: receiptPdf,
      receiptFileName: 'tra_receipt.pdf',
      certificate: dummyCert,
      reviewerName: 'Benedict Bisama',
    });

    expect(unifiedBytes).toBeInstanceOf(Uint8Array);
    expect(unifiedBytes.byteLength).toBeGreaterThan(1000);

    const loadedDoc = await PDFDocument.load(unifiedBytes);
    // 1 invoice page + 1 receipt page + 9 certificate pages = 11 pages
    expect(loadedDoc.getPageCount()).toBe(11);
  });

  it('compiles unified PDF when receipt is omitted (Invoice + 9-page Certificate only)', async () => {
    const invoicePdf = await createSamplePdf(2, 'Supplier Invoice Multi-page');

    const unifiedBytes = await UnifiedInvoicePdfService.compileUnifiedInvoicePacket({
      invoiceFile: invoicePdf,
      invoiceFileName: 'supplier_invoice.pdf',
      receiptFile: null, // Omitted
      certificate: dummyCert,
      reviewerName: 'Benedict Bisama',
    });

    const loadedDoc = await PDFDocument.load(unifiedBytes);
    // 2 invoice pages + 0 receipt pages + 9 certificate pages = 11 pages
    expect(loadedDoc.getPageCount()).toBe(11);
  });
});
