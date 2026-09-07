import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { CertificatePdfService } from '@/features/certificates/CertificatePdfService';
import { CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';
import fs from 'fs';
import path from 'path';

describe('CertificatePdfService 9-Page Golden Report Engine', () => {
  it('generates the authentic 9-page certificate document matching the golden master samples', async () => {
    // Mock global fetch for local test environment
    const poPath = path.resolve(process.cwd(), 'public/assets/po_4500015358.pdf');
    const logoPath = path.resolve(process.cwd(), 'public/assets/helios_logo.png');

    const originalFetch = global.fetch;
    global.fetch = async (input: RequestInfo | URL) => {
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
    };

    const mockCert: CertificateRecord = {
      id: 'cert-test-01',
      certificateNumber: 'FAC-SI-26-0002',
      certType: 'FAC',
      poId: 'po-test-01',
      poNumber: '4500015358',
      poAuthorizedAmount: 123512849.93,
      supplierId: 'sup-01',
      supplierName: 'PRIME POWER T LTD',
      projectName: 'Site Improvement (Oversite Aggregates and Concrete)',
      currency: 'TZS',
      currentCertifiedAmount: 20138187.38,
      status: 'DRAFT',
      templateVersion: 'PROVISIONAL_V1',
      createdAt: '2026-09-07T00:00:00Z',
      updatedAt: '2026-09-07T00:00:00Z',
      siteCount: 3,
      sites: [
        {
          poSiteId: 'pos-1',
          siteIdExt: 'TZTB1217',
          siteName: 'Nyalaja',
          region: 'Tabora',
          authorizedAmount: 6494755.72,
          currentAmount: 6494755.72,
          percentage: 100,
        },
        {
          poSiteId: 'pos-2',
          siteIdExt: 'TZTB2346',
          siteName: 'Mabama',
          region: 'Tabora',
          authorizedAmount: 6933301.89,
          currentAmount: 6933301.89,
          percentage: 100,
        },
        {
          poSiteId: 'pos-3',
          siteIdExt: 'TZTB2341',
          siteName: 'Mwashina',
          region: 'Tabora',
          authorizedAmount: 6710129.77,
          currentAmount: 6710129.77,
          percentage: 100,
        },
      ],
    };

    try {
      const pdfBytes = await CertificatePdfService.generateCertificatePdf({
        certificate: mockCert,
        reviewerName: 'Benedict Bisama',
      });

      expect(pdfBytes).toBeDefined();
      expect(pdfBytes.length).toBeGreaterThan(50000);

      // Load generated PDF and verify page count
      const loadedDoc = await PDFDocument.load(pdfBytes);
      expect(loadedDoc.getPageCount()).toBe(9);

      // Verify Page 1 (Cover Letter)
      const p1 = loadedDoc.getPage(0);
      expect(Math.round(p1.getWidth())).toBe(595);
      expect(Math.round(p1.getHeight())).toBe(842);

      // Verify Page 2 (LIST OF ACCEPTED SITES Table)
      const p2 = loadedDoc.getPage(1);
      expect(Math.round(p2.getWidth())).toBe(595);
      expect(Math.round(p2.getHeight())).toBe(842);

      // Verify remaining 7 pages (Pages 3-9 from PO)
      for (let i = 2; i < 9; i++) {
        const poPage = loadedDoc.getPage(i);
        expect(poPage.getWidth()).toBeGreaterThan(500);
      }
    } finally {
      global.fetch = originalFetch;
    }
  });
});
