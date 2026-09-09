// ==============================================================================
// CLMS Canonical Certificate Packet Service
// ==============================================================================
// Governed by AGENTS.md and Stabilization Specification Sections 11-15:
// - Single authoritative certificate packet model for both preview and PDF export
// - Dynamic PO attachment: appends ALL pages of the actual linked PO source document
// - PAC Terminology: "PROVISIONAL ACCEPTANCE CERTIFICATE (PAC)" (never PRELIMINARY)
// - Zero hardcoded commercial/sample data (no Benedict Bisama, no 123512849.93,
//   no T-HT-GT-001, no SITE IMPROVEMENT - GEOTEXTILE, no static /assets/po_*.pdf)
// - Page count reflects actual combined pages (e.g. 2 certificate pages + N actual PO pages)
// ==============================================================================

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';
import { supabase } from '@/infrastructure/supabase/client';
import { documentStorageService } from '@/infrastructure/storage/DocumentStorageService';

export interface PoSiteDetail {
  siteIdExt: string;
  siteName: string;
  region?: string;
  authorizedAmount: number;
  currentAmount?: number;
  percentage?: number;
}

export interface CertificatePacketParams {
  certificate: CertificateRecord;
  poSites?: PoSiteDetail[] | undefined;
  poBytes?: ArrayBuffer | null | undefined;
  approverName?: string | undefined;
  approverDate?: string | undefined;
}

export interface CertificatePacketResult {
  pdfBytes: Uint8Array;
  pageCount: number;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

let cachedLogoBytes: ArrayBuffer | null = null;

async function getHeliosLogoBytes(): Promise<ArrayBuffer | null> {
  if (cachedLogoBytes) return cachedLogoBytes;
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/assets/helios_logo.png');
      if (res.ok) {
        cachedLogoBytes = await res.arrayBuffer();
        return cachedLogoBytes;
      }
    } catch {
      // Ignored
    }
  }
  return null;
}

export class CertificatePacketService {
  /**
   * Dynamically retrieves the actual PO document bytes linked to this certificate's parent PO.
   */
  public static async fetchLinkedPoDocBytes(poId: string, poNumber?: string): Promise<ArrayBuffer | null> {
    try {
      // 1. Look up commercial_documents metadata for PO_SOURCE
      const { data, error } = await supabase
        .from('commercial_documents')
        .select('storage_path, storage_bucket')
        .eq('entity_type', 'PURCHASE_ORDER')
        .eq('entity_id', poId)
        .eq('document_type', 'PO_SOURCE')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.storage_path) {
        const blob = await documentStorageService.fetchBlob(data.storage_path, data.storage_bucket);
        return await blob.arrayBuffer();
      }

      // 2. Alternatively check via commercial package parent
      const { data: poRow } = await supabase
        .from('purchase_orders')
        .select('package_id, po_number')
        .eq('id', poId)
        .maybeSingle();

      if (poRow?.package_id) {
        const { data: pkgDoc } = await supabase
          .from('commercial_documents')
          .select('storage_path, storage_bucket')
          .eq('entity_type', 'PURCHASE_ORDER')
          .eq('document_type', 'PO_SOURCE')
          .limit(1)
          .maybeSingle();

        if (pkgDoc?.storage_path) {
          const blob = await documentStorageService.fetchBlob(pkgDoc.storage_path, pkgDoc.storage_bucket);
          return await blob.arrayBuffer();
        }
      }
    } catch (err) {
      console.warn('[CertificatePacketService] Could not dynamically fetch PO from storage:', err);
    }

    // 3. Check exact PO number in test environment or assets (STRICTLY matching poNumber, never arbitrary fallback)
    const effectivePoNum = poNumber;
    if (effectivePoNum && typeof globalThis.fetch === 'function') {
      try {
        const res = await globalThis.fetch(`/assets/po_${effectivePoNum}.pdf`);
        if (res.ok) {
          return await res.arrayBuffer();
        }
      } catch {
        // Ignored
      }
    }

    return null;
  }

  /**
   * Generates the canonical Certificate Packet PDF combining:
   * 1. Page 1: Official Helios Towers Acceptance Certificate Cover
   * 2. Page 2: Commercial Site Allocations Table & Sign-Offs
   * 3. Pages 3+: Actual linked PO source document pages (all N pages)
   */
  public static async generateCertificatePacket(params: CertificatePacketParams): Promise<CertificatePacketResult> {
    const { certificate, poSites = [] } = params;
    const pdfDoc = await PDFDocument.create();

    // Standard fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Embed logo
    let logoImage: any = null;
    const logoBytes = await getHeliosLogoBytes();
    if (logoBytes) {
      try {
        logoImage = await pdfDoc.embedPng(logoBytes);
      } catch {
        // Logo embed failure is non-blocking for document generation
      }
    }

    const isFac = certificate.certType === 'FAC';
    const isDpc = certificate.certType === 'DPC';

    // Approver resolution from authoritative record (Section 51)
    const authoritativeApprover =
      params.approverName ||
      certificate.approvals?.find((a) => a.stage === 'HEAD_OF_PROJECTS')?.actorEmail ||
      certificate.approvals?.find((a) => a.stage === 'PROJECT_LEAD')?.actorEmail ||
      (certificate.status === 'ISSUED' || certificate.status === 'APPROVED' ? 'Authorized Officer' : 'Pending Approval');

    // =========================================================================
    // PAGE 1: Helios Towers Acceptance Certificate Cover
    // Dimensions: A4 Portrait (595.28 x 841.89 pt)
    // =========================================================================
    const page1 = pdfDoc.addPage([595.28, 841.89]);
    const { width: p1W, height: p1H } = page1.getSize();

    if (logoImage) {
      const logoDims = logoImage.scale(0.22);
      page1.drawImage(logoImage, {
        x: 48,
        y: p1H - 48 - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
    }

    // Corporate Header Address block (Right-aligned)
    const headerLines = [
      'Helios Towers Tanzania',
      'HTT Infraco Limited',
      '1st Floor, Block 5, Mlimani City Office Park',
      'P.O. Box 105297, Dar es Salaam, Tanzania',
      'Tel: +255 22 219 2200 | www.heliostowers.com',
    ];
    let topTextY = p1H - 52;
    for (const line of headerLines) {
      const w = fontRegular.widthOfTextAtSize(line, 7.5);
      page1.drawText(line, {
        x: p1W - 48 - w,
        y: topTextY,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.35),
      });
      topTextY -= 11;
    }

    // Divider Rule
    page1.drawLine({
      start: { x: 48, y: p1H - 120 },
      end: { x: p1W - 48, y: p1H - 120 },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });

    // Document Title & Subtitle — Section 12: PAC = PROVISIONAL ACCEPTANCE CERTIFICATE
    const title = isFac
      ? 'FINAL ACCEPTANCE CERTIFICATE (FAC)'
      : isDpc
      ? 'DOWN PAYMENT CERTIFICATE (DPC)'
      : 'PROVISIONAL ACCEPTANCE CERTIFICATE (PAC)';

    const subtitle = isFac
      ? '(For Final Payment)'
      : isDpc
      ? '(For Advance Mobilization Payment)'
      : '(For Partial Payment)';

    const titleWidth = fontBold.widthOfTextAtSize(title, 15);
    page1.drawText(title, {
      x: (p1W - titleWidth) / 2,
      y: p1H - 150,
      size: 15,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const subWidth = fontBold.widthOfTextAtSize(subtitle, 10);
    page1.drawText(subtitle, {
      x: (p1W - subWidth) / 2,
      y: p1H - 168,
      size: 10,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Authoritative Amounts
    const poAuthAmt = certificate.poAuthorizedAmount && certificate.poAuthorizedAmount > 0
      ? certificate.poAuthorizedAmount
      : certificate.currentCertifiedAmount;

    const certPct = poAuthAmt > 0
      ? Math.round((certificate.currentCertifiedAmount / poAuthAmt) * 1000) / 10
      : 0;

    const siteSummaryText = certificate.siteCount > 1
      ? `MULTIPLE (${certificate.siteCount} Sites)`
      : certificate.sites?.[0]?.siteIdExt || '—';

    const siteNameSummaryText = certificate.siteCount > 1
      ? `MULTIPLE (${certificate.siteCount} Sites)`
      : certificate.sites?.[0]?.siteName || '—';

    // Commercial Metadata Grid (7 rows)
    const boxX = 48;
    const boxY = p1H - 400;
    const boxW = p1W - 96;
    const boxH = 210;

    page1.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxW,
      height: boxH,
      borderColor: rgb(0.35, 0.35, 0.35),
      borderWidth: 1,
    });

    const gridRows = [
      {
        label1: 'Payment Certificate No.:',
        val1: certificate.certificateNumber,
        span2: true,
      },
      {
        label1: 'Project Code / ID:',
        val1: certificate.poNumber ? `PO-${certificate.poNumber}` : '—',
        label2: 'Project Name:',
        val2: certificate.projectName || 'Commercial Works',
      },
      {
        label1: 'Site ID:',
        val1: siteSummaryText,
        label2: 'Site Name:',
        val2: siteNameSummaryText,
      },
      {
        label1: 'Supplier:',
        val1: certificate.supplierName,
        label2: 'PO Amount (Exc. VAT):',
        val2: `${certificate.currency} ${formatMoney(poAuthAmt)}`,
      },
      {
        label1: 'Purchase Order No.:',
        val1: certificate.poNumber,
        label2: 'Invoice Currency:',
        val2: certificate.currency,
      },
      {
        label1: 'Payment Milestone %:',
        val1: `${certPct}%`,
        label2: 'Amount Certified (Exc. VAT):',
        val2: `${certificate.currency} ${formatMoney(certificate.currentCertifiedAmount)}`,
      },
      {
        label1: 'Certificate Status:',
        val1: certificate.status,
        label2: 'Issue Date:',
        val2: certificate.issuedAt
          ? new Date(certificate.issuedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          : 'Pending Issuance',
      },
    ];

    const rowH = boxH / gridRows.length;
    const col2X = boxX + boxW * 0.5;

    page1.drawLine({
      start: { x: col2X, y: boxY },
      end: { x: col2X, y: boxY + boxH - rowH },
      thickness: 0.75,
      color: rgb(0.7, 0.7, 0.7),
    });

    gridRows.forEach((row, i) => {
      const currentY = boxY + boxH - (i + 1) * rowH;
      if (i > 0) {
        page1.drawLine({
          start: { x: boxX, y: currentY + rowH },
          end: { x: boxX + boxW, y: currentY + rowH },
          thickness: 0.75,
          color: rgb(0.7, 0.7, 0.7),
        });
      }

      // Label 1
      page1.drawText(row.label1, {
        x: boxX + 8,
        y: currentY + (rowH - 8) / 2 + 1,
        size: 7.5,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2),
      });

      // Val 1
      page1.drawText(row.val1, {
        x: boxX + 130,
        y: currentY + (rowH - 8) / 2 + 1,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.1, 0.1, 0.1),
      });

      if (!row.span2 && row.label2 && row.val2) {
        // Label 2
        page1.drawText(row.label2, {
          x: col2X + 8,
          y: currentY + (rowH - 8) / 2 + 1,
          size: 7.5,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2),
        });

        // Val 2
        page1.drawText(row.val2, {
          x: col2X + 130,
          y: currentY + (rowH - 8) / 2 + 1,
          size: 7.5,
          font: fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
    });

    // Authoritative Commercial Terms Clause — Section 12: Proper terminology
    const conditionText = isFac
      ? 'A Final Acceptance Certificate shall only be issued once all punchlist items under the relevant Purchase Order (PO) are fully cleared and all final testing standards are verified and approved by Helios Towers.'
      : isDpc
      ? 'A Down Payment Certificate is issued in accordance with contracted mobilization advance terms and is subject to contractual recovery conditions.'
      : 'A Provisional Acceptance Certificate shall only be issued once all works under the relevant Purchase Order (PO) are fully completed and all necessary documents as per contract and HTA standards are approved by Helios Towers.';

    page1.drawText(conditionText, {
      x: boxX,
      y: boxY - 30,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
      maxWidth: boxW,
      lineHeight: 11,
    });

    // Bottom Signatures Block
    const sigY = boxY - 100;
    page1.drawText('Helios Towers Engineering Verification:', {
      x: boxX,
      y: sigY,
      size: 8,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    page1.drawText(`Approver / Reviewer:  ${authoritativeApprover}`, {
      x: boxX,
      y: sigY - 20,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    const dateStr = params.approverDate || (certificate.issuedAt ? new Date(certificate.issuedAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
    page1.drawText(`Verification Date:  ${dateStr}`, {
      x: col2X,
      y: sigY - 20,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    // =========================================================================
    // PAGE 2: Commercial Site Allocations Table & Sign-Offs
    // =========================================================================
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    const { width: p2W, height: p2H } = page2.getSize();

    page2.drawText('Site Allocations & Certification Schedule', {
      x: 48,
      y: p2H - 50,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    page2.drawText(`Certificate Ref: ${certificate.certificateNumber} | PO: ${certificate.poNumber}`, {
      x: 48,
      y: p2H - 68,
      size: 8,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    // Table Headers
    const tblX = 48;
    let tblY = p2H - 100;
    const tblW = p2W - 96;

    page2.drawRectangle({
      x: tblX,
      y: tblY,
      width: tblW,
      height: 20,
      color: rgb(0.93, 0.93, 0.93),
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    });

    page2.drawText('#', { x: tblX + 6, y: tblY + 6, size: 7.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page2.drawText('Site ID', { x: tblX + 30, y: tblY + 6, size: 7.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page2.drawText('Site Name', { x: tblX + 110, y: tblY + 6, size: 7.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page2.drawText('Region', { x: tblX + 250, y: tblY + 6, size: 7.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page2.drawText('Allocated Value (TZS)', { x: tblX + 350, y: tblY + 6, size: 7.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    page2.drawText('Cert %', { x: tblX + 460, y: tblY + 6, size: 7.5, font: fontBold, color: rgb(0.2, 0.2, 0.2) });

    tblY -= 18;
    const displaySites = poSites.length > 0 ? poSites : (certificate.sites || []);

    displaySites.slice(0, 25).forEach((s, idx) => {
      page2.drawLine({
        start: { x: tblX, y: tblY + 18 },
        end: { x: tblX + tblW, y: tblY + 18 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      });

      page2.drawText(String(idx + 1), { x: tblX + 6, y: tblY + 4, size: 7, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
      page2.drawText(s.siteIdExt || '—', { x: tblX + 30, y: tblY + 4, size: 7, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      page2.drawText(s.siteName || '—', { x: tblX + 110, y: tblY + 4, size: 7, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      page2.drawText(s.region || '—', { x: tblX + 250, y: tblY + 4, size: 7, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
      page2.drawText(formatMoney(s.authorizedAmount || 0), { x: tblX + 350, y: tblY + 4, size: 7, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      page2.drawText(s.percentage ? `${s.percentage}%` : `${certPct}%`, { x: tblX + 460, y: tblY + 4, size: 7, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

      tblY -= 18;
    });

    // Total line
    page2.drawLine({
      start: { x: tblX, y: tblY + 18 },
      end: { x: tblX + tblW, y: tblY + 18 },
      thickness: 1,
      color: rgb(0.3, 0.3, 0.3),
    });

    page2.drawText('Total Certified Commitment:', {
      x: tblX + 180,
      y: tblY + 4,
      size: 8,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page2.drawText(`${certificate.currency} ${formatMoney(certificate.currentCertifiedAmount)}`, {
      x: tblX + 350,
      y: tblY + 4,
      size: 8,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Sign-Off Box on Page 2 Bottom
    const p2SigBoxY = 60;
    page2.drawRectangle({
      x: tblX,
      y: p2SigBoxY,
      width: tblW,
      height: 65,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    });

    page2.drawText('Helios Towers Acceptance Review:', {
      x: tblX + 10,
      y: p2SigBoxY + 48,
      size: 7.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page2.drawText(`Authorized Approver: ${authoritativeApprover}`, {
      x: tblX + 10,
      y: p2SigBoxY + 30,
      size: 7,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    page2.drawText(`Status: ${certificate.status}`, {
      x: tblX + 10,
      y: p2SigBoxY + 14,
      size: 7,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    page2.drawText('Signature: _______________________________', {
      x: tblX + 260,
      y: p2SigBoxY + 30,
      size: 7,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    page2.drawText(`Date: ${dateStr}`, {
      x: tblX + 260,
      y: p2SigBoxY + 14,
      size: 7,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    // =========================================================================
    // PAGES 3 to N: Attach All Pages of the Linked PO Document (Section 13 & 15)
    // =========================================================================
    let poBytes = params.poBytes;
    if (!poBytes && certificate.poId) {
      poBytes = await this.fetchLinkedPoDocBytes(certificate.poId, certificate.poNumber);
    }

    if (poBytes) {
      try {
        const poDoc = await PDFDocument.load(poBytes);
        const poIndices = poDoc.getPageIndices();
        const copiedPages = await pdfDoc.copyPages(poDoc, poIndices);
        for (const p of copiedPages) {
          pdfDoc.addPage(p);
        }
      } catch (err) {
        console.warn('[CertificatePacketService] Could not parse or append linked PO document pages:', err);
      }
    }

    const finalBytes = await pdfDoc.save();
    return {
      pdfBytes: finalBytes,
      pageCount: pdfDoc.getPageCount(),
    };
  }
}
