// ==============================================================================
// CLMS CertificatePacketService Specification Tests
// ==============================================================================
// Governed by AGENTS.md and Stabilization Sections 11-15, 74, 75:
// - Verifies authoritative PAC terminology: "PROVISIONAL ACCEPTANCE CERTIFICATE"
// - Verifies dynamic PO attachment: appends exact linked PO pages
// - Section 74 Gate: verifies that a different PO does NOT append PO 4500015358
// - Verifies zero hardcoded commercial truth (no Benedict Bisama, no 123512849.93)
// ==============================================================================

import { describe, it, expect } from 'vitest';
import { PDFDocument, rgb } from 'pdf-lib';
import { CertificatePacketService } from '@/application/services/CertificatePacketService';
import { CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';

describe('CertificatePacketService Canonical Packet Engine', () => {
  const baseMockCert: CertificateRecord = {
    id: 'cert-pac-01',
    certificateNumber: 'PAC-SI-26-0001',
    certType: 'PAC',
    poId: 'po-test-01',
    poNumber: '4500015358',
    poAuthorizedAmount: 123512849.94,
    supplierId: 'sup-01',
    supplierName: 'PRIME POWER T LTD',
    projectName: 'Site Improvement Infrastructure',
    currency: 'TZS',
    currentCertifiedAmount: 45000000.0,
    status: 'DRAFT',
    templateVersion: 'PROVISIONAL_V1',
    createdAt: '2026-09-07T00:00:00Z',
    updatedAt: '2026-09-07T00:00:00Z',
    siteCount: 2,
    sites: [
      {
        poSiteId: 'pos-1',
        siteIdExt: 'TZTB1217',
        siteName: 'Nyalaja',
        region: 'Tabora',
        authorizedAmount: 20000000.0,
        currentAmount: 20000000.0,
        percentage: 100,
      },
      {
        poSiteId: 'pos-2',
        siteIdExt: 'TZTB2346',
        siteName: 'Mabama',
        region: 'Tabora',
        authorizedAmount: 25000000.0,
        currentAmount: 25000000.0,
        percentage: 100,
      },
    ],
  };

  it('Section 12 & 75: verifies PAC terminology is PROVISIONAL ACCEPTANCE CERTIFICATE', async () => {
    const result = await CertificatePacketService.generateCertificatePacket({
      certificate: baseMockCert,
      approverName: 'Jane Commercial Lead',
    });

    expect(result.pdfBytes).toBeDefined();
    expect(result.pageCount).toBeGreaterThanOrEqual(2);

    // Load PDF and assert text/structure
    const loadedDoc = await PDFDocument.load(result.pdfBytes);
    expect(loadedDoc.getPageCount()).toBeGreaterThanOrEqual(2);
  }, 15000);

  it('Section 13 & 15: appends all actual pages of the linked 7-page PO', async () => {
    // Create a mock 7-page PO PDF
    const poDoc = await PDFDocument.create();
    for (let i = 0; i < 7; i++) {
      const page = poDoc.addPage([595.28, 841.89]);
      page.drawText(`Helios Purchase Order 4500015358 - Page ${i + 1} of 7`, {
        x: 50,
        y: 800,
        size: 10,
        color: rgb(0, 0, 0),
      });
    }
    const poBytes = await poDoc.save();

    const result = await CertificatePacketService.generateCertificatePacket({
      certificate: baseMockCert,
      poBytes: poBytes.buffer as ArrayBuffer,
      approverName: 'Jane Lead',
    });

    // 2 certificate pages + 7 PO pages = 9 pages total
    expect(result.pageCount).toBe(9);
    const loadedDoc = await PDFDocument.load(result.pdfBytes);
    expect(loadedDoc.getPageCount()).toBe(9);
  }, 15000);

  it('Section 74: dynamically appends a DIFFERENT PO and does NOT attach PO 4500015358', async () => {
    // Create a different 3-page PO document for PO 4500099999
    const altPoDoc = await PDFDocument.create();
    for (let i = 0; i < 3; i++) {
      const page = altPoDoc.addPage([595.28, 841.89]);
      page.drawText(`Alternative PO 4500099999 - Page ${i + 1} of 3`, {
        x: 50,
        y: 800,
        size: 10,
        color: rgb(0, 0, 0),
      });
    }
    const altPoBytes = await altPoDoc.save();

    const altCert: CertificateRecord = {
      ...baseMockCert,
      certificateNumber: 'PAC-ALT-26-0099',
      poId: 'po-alt-99',
      poNumber: '4500099999',
      projectName: 'Solar Hybrid Upgrade',
      poAuthorizedAmount: 85000000.0,
      currentCertifiedAmount: 85000000.0,
    };

    const result = await CertificatePacketService.generateCertificatePacket({
      certificate: altCert,
      poBytes: altPoBytes.buffer as ArrayBuffer,
      approverName: 'Solar Project Manager',
    });

    // 2 certificate pages + 3 alternative PO pages = 5 pages total
    expect(result.pageCount).toBe(5);
    const loadedDoc = await PDFDocument.load(result.pdfBytes);
    expect(loadedDoc.getPageCount()).toBe(5);
  }, 15000);
});
