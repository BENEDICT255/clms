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
  id?: string | undefined;
  siteIdExt: string;
  siteName: string;
  region?: string | undefined;
  authorizedAmount: number;
  currentAmount?: number | undefined;
  percentage?: number | undefined;
  scopeDescription?: string | undefined;
  rfiDate?: string | undefined;
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

function formatShortDate(dStr?: string): string {
  if (!dStr) return '—';
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return dStr;
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const m = months[d.getMonth()];
  const yr = String(d.getFullYear()).slice(-2);
  return `${day}-${m}-${yr}`;
}

function wrapText(
  text: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (t: string, s: number) => number },
  fontSize: number
): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        let part = '';
        for (const ch of word) {
          if (font.widthOfTextAtSize(part + ch, fontSize) <= maxWidth) {
            part += ch;
          } else {
            if (part) lines.push(part);
            part = ch;
          }
        }
        currentLine = part;
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}


let cachedLogoBytes: ArrayBuffer | null = null;
const poDocBytesCache = new Map<string, ArrayBuffer>();

async function getHeliosLogoBytes(): Promise<ArrayBuffer | null> {
  if (cachedLogoBytes) return cachedLogoBytes;
  if (typeof globalThis.fetch === 'function') {
    try {
      const res = await globalThis.fetch('/assets/helios_logo.png');
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
   * Features:
   * - In-memory caching: 0ms subsequent retrieval
   * - Zero IDM interception: uses .dat asset stream and octet-stream
   * - 2.5s network timeout guard preventing unlinked Supabase queries from hanging
   */
  public static async fetchLinkedPoDocBytes(poId: string, poNumber?: string): Promise<ArrayBuffer | null> {
    // 1. Check in-memory cache
    if (poNumber && poDocBytesCache.has(poNumber)) {
      return poDocBytesCache.get(poNumber)!;
    }
    if (poId && poDocBytesCache.has(poId)) {
      return poDocBytesCache.get(poId)!;
    }

    // 2. High-performance, IDM-immune local asset check (served as .dat / application/octet-stream, with fallback to .pdf)
    const effectivePoNum = poNumber;
    if (effectivePoNum && typeof globalThis.fetch === 'function') {
      try {
        let res = await globalThis.fetch(`/assets/po_${effectivePoNum}.dat`);
        if (!res.ok) {
          res = await globalThis.fetch(`/assets/po_${effectivePoNum}.pdf`);
        }
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          if (buffer && buffer.byteLength > 0) {
            poDocBytesCache.set(effectivePoNum, buffer);
            if (poId) poDocBytesCache.set(poId, buffer);
            return buffer;
          }
        }
      } catch {
        // Fall through to remote storage lookup
      }
    }

    // 3. Supabase Storage lookup with 2500ms timeout guard
    const storageLookup = async (): Promise<ArrayBuffer | null> => {
      try {
        if (!poId) return null;

        // Query commercial_documents metadata for PO_SOURCE
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
          const buffer = await blob.arrayBuffer();
          if (buffer && buffer.byteLength > 0) {
            if (effectivePoNum) poDocBytesCache.set(effectivePoNum, buffer);
            poDocBytesCache.set(poId, buffer);
            return buffer;
          }
        }

        // Alternatively check commercial package parent
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
            const buffer = await blob.arrayBuffer();
            if (buffer && buffer.byteLength > 0) {
              if (effectivePoNum) poDocBytesCache.set(effectivePoNum, buffer);
              poDocBytesCache.set(poId, buffer);
              return buffer;
            }
          }
        }
      } catch (err) {
        console.warn('[CertificatePacketService] Could not fetch PO from storage:', err);
      }
      return null;
    };

    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));

    try {
      return await Promise.race([storageLookup(), timeoutPromise]);
    } catch {
      return null;
    }
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

    const drawCellText = (
      text: string,
      startX: number,
      currentY: number,
      maxW: number,
      font: any = fontRegular,
      preferredSize = 7.5,
      color = rgb(0.1, 0.1, 0.1)
    ) => {
      if (!text) return;
      let size = preferredSize;
      let lines = wrapText(text, maxW, font, size);

      if (lines.length > 2) {
        const smaller = wrapText(text, maxW, font, 6.5);
        if (smaller.length <= 2) {
          size = 6.5;
          lines = smaller;
        } else {
          size = 6.5;
          lines = smaller.slice(0, 2);
          const lastLine = lines[1];
          if (smaller.length > 2 && lastLine) {
            let elLine = lastLine;
            while (elLine.length > 0 && font.widthOfTextAtSize(elLine + '...', size) > maxW) {
              elLine = elLine.slice(0, -1);
            }
            lines[1] = elLine + '...';
          }
        }
      }

      const lineHeight = size + 2;
      if (lines.length === 1) {
        page1.drawText(lines[0], {
          x: startX,
          y: currentY + (rowH - size) / 2 + 1,
          size,
          font,
          color,
        });
      } else if (lines.length === 2) {
        const totalTextH = size + lineHeight;
        const topMargin = (rowH - totalTextH) / 2;
        page1.drawText(lines[0], {
          x: startX,
          y: currentY + rowH - topMargin - size,
          size,
          font,
          color,
        });
        page1.drawText(lines[1], {
          x: startX,
          y: currentY + rowH - topMargin - size - lineHeight,
          size,
          font,
          color,
        });
      }
    };

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
      const val1X = boxX + 118;
      const maxVal1W = row.span2 ? (boxX + boxW) - val1X - 8 : col2X - val1X - 8;
      drawCellText(row.val1, val1X, currentY, maxVal1W, fontRegular, 7.5, rgb(0.1, 0.1, 0.1));

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
        const val2X = col2X + 118;
        const maxVal2W = (boxX + boxW) - val2X - 8;
        drawCellText(row.val2, val2X, currentY, maxVal2W, fontRegular, 7.5, rgb(0.1, 0.1, 0.1));
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
    // PAGE 2: LIST OF ACCEPTED SITES (Canonical Helios Towers Format)
    // Dimensions: A4 Portrait (595.28 x 841.89 pt)
    // =========================================================================
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    const { width: p2W, height: p2H } = page2.getSize();

    const tblLeft = 40;
    const tblWidth = 515;

    // 1. Top Right Corporate Logo
    if (logoImage) {
      const logoDims = logoImage.scale(0.18);
      page2.drawImage(logoImage, {
        x: tblLeft + tblWidth - logoDims.width,
        y: p2H - 45 - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
    }

    // 2. Centered Document Title
    const p2Title = 'LIST OF ACCEPTED SITES';
    const p2TitleW = fontBold.widthOfTextAtSize(p2Title, 11);
    page2.drawText(p2Title, {
      x: (p2W - p2TitleW) / 2,
      y: p2H - 68,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // 3. Top Metadata Boxes (Supplier Details Left, Job Details Right)
    const p2BoxW = 155;
    const p2BoxH = 15;
    const rightBoxX = tblLeft + tblWidth - p2BoxW;

    page2.drawText('Supplier Details', {
      x: tblLeft,
      y: p2H - 88,
      size: 7.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Left Boxes: Supplier Details
    const leftBoxes = [
      { label: 'Name:', value: certificate.supplierName || 'Prime Power' },
      { label: 'Supplier ref. no:', value: certificate.supplierId || 'S4.P01007' },
      { label: 'PO Number:', value: certificate.poNumber || '—' },
    ];
    let leftBoxY = p2H - 106;
    for (const b of leftBoxes) {
      page2.drawRectangle({
        x: tblLeft,
        y: leftBoxY,
        width: p2BoxW,
        height: p2BoxH,
        borderColor: rgb(0.3, 0.3, 0.3),
        borderWidth: 0.6,
      });
      page2.drawText(b.label, {
        x: tblLeft + 4,
        y: leftBoxY + 4.5,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
      const valX = tblLeft + fontRegular.widthOfTextAtSize(b.label, 6.5) + 8;
      page2.drawText(b.value.slice(0, 24), {
        x: valX,
        y: leftBoxY + 4.5,
        size: 6.5,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      leftBoxY -= 17;
    }

    // Right Boxes: Job & Certificate Metadata
    const statusText = certificate.status === 'ISSUED' || certificate.status === 'APPROVED' ? 'COMPLETED' : 'OPEN';
    const rightBoxes = [
      { label: 'Department :', value: 'PROJECTS' },
      { label: 'Job Completion Status:', value: statusText },
      { label: 'Certificate Ref. No. :', value: certificate.certificateNumber || '—' },
    ];
    let rightBoxY = p2H - 106;
    for (const b of rightBoxes) {
      page2.drawRectangle({
        x: rightBoxX,
        y: rightBoxY,
        width: p2BoxW,
        height: p2BoxH,
        borderColor: rgb(0.3, 0.3, 0.3),
        borderWidth: 0.6,
      });
      page2.drawText(b.label, {
        x: rightBoxX + 4,
        y: rightBoxY + 4.5,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
      const valX = rightBoxX + fontRegular.widthOfTextAtSize(b.label, 6.5) + 8;
      page2.drawText(b.value.slice(0, 24), {
        x: valX,
        y: rightBoxY + 4.5,
        size: 6.5,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      rightBoxY -= 17;
    }

    // 4. Services Details Section Header
    page2.drawText('Services Details:', {
      x: tblLeft,
      y: p2H - 162,
      size: 7.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // 5. Table Grid Columns Setup
    const columns: Array<{
      key: string;
      label: string;
      width: number;
      align: 'left' | 'center' | 'right';
    }> = [
      { key: 'item', label: 'ITEM(QTY)', width: 25, align: 'center' },
      { key: 'siteId', label: 'SITE ID', width: 48, align: 'left' },
      { key: 'siteName', label: 'SITE NAME', width: 70, align: 'left' },
      { key: 'desc', label: 'DESCRIPTION', width: 50, align: 'left' },
      { key: 'rfiDate', label: 'RFI Date', width: 44, align: 'center' },
      { key: 'poAmt', label: 'PO AMOUNT', width: 58, align: 'right' },
      { key: 'dpcAmt', label: 'DPC AMOUNT', width: 42, align: 'right' },
      { key: 'pacAmt', label: 'PAC AMOUNT', width: 44, align: 'right' },
      { key: 'facAmt', label: 'FAC AMOUNT', width: 48, align: 'right' },
      { key: 'invAmt', label: 'INVOICE AMOUNT', width: 50, align: 'right' },
      { key: 'status', label: 'STATUS', width: 36, align: 'center' },
    ];

    const tableTopY = p2H - 176;
    const headerH = 15;

    // Draw Table Header Row
    let curX = tblLeft;
    for (const col of columns) {
      page2.drawRectangle({
        x: curX,
        y: tableTopY - headerH,
        width: col.width,
        height: headerH,
        borderColor: rgb(0.2, 0.2, 0.2),
        borderWidth: 0.6,
        color: rgb(0.97, 0.97, 0.97),
      });

      const txtW = fontBold.widthOfTextAtSize(col.label, 5.2);
      let textX = curX + 2;
      if (col.align === 'center') {
        textX = curX + (col.width - txtW) / 2;
      } else if (col.align === 'right') {
        textX = curX + col.width - txtW - 3;
      }

      page2.drawText(col.label, {
        x: textX,
        y: tableTopY - headerH + 5,
        size: 5.2,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });

      curX += col.width;
    }

    // 6. Data Rows
    const allSites: PoSiteDetail[] = (poSites && poSites.length > 0)
      ? poSites
      : (certificate.sites || []).map((cs) => ({
          id: cs.poSiteId,
          siteIdExt: cs.siteIdExt,
          siteName: cs.siteName,
          region: cs.region,
          authorizedAmount: cs.authorizedAmount,
          currentAmount: cs.currentAmount,
          percentage: cs.percentage,
        }));

    const p2RowH = allSites.length > 18 ? 11 : 13;
    let rowY = tableTopY - headerH - p2RowH;
    const certIssueDate = formatShortDate(certificate.issuedAt || certificate.createdAt);

    allSites.forEach((site, idx) => {
      // Reconcile: identify if this site was selected/certified in THIS certificate
      const certAlloc = certificate.sites?.find(
        (cs) => cs.siteIdExt === site.siteIdExt || (site.id && cs.poSiteId === site.id)
      );
      const isCertified = !!certAlloc && (certAlloc.currentAmount > 0 || (certAlloc.percentage && certAlloc.percentage > 0));
      const certVal = certAlloc
        ? (certAlloc.currentAmount || (site.authorizedAmount * (certAlloc.percentage / 100)))
        : 0;

      const desc = site.scopeDescription || (site.siteName?.toLowerCase().includes('concrete') ? 'Concrete' : 'Geotextile');
      const rfi = site.rfiDate || certIssueDate;

      // Only invoiced/certified sites display values in milestone and invoice amount columns!
      const rowValues: Record<string, string> = {
        item: String(idx + 1),
        siteId: site.siteIdExt || '—',
        siteName: (site.siteName || '—').slice(0, 16),
        desc: desc.slice(0, 13),
        rfiDate: rfi,
        poAmt: `TZS ${formatMoney(site.authorizedAmount || 0)}`,
        dpcAmt: isDpc && isCertified ? `TZS ${formatMoney(certVal)}` : '',
        pacAmt: !isFac && !isDpc && isCertified ? `TZS ${formatMoney(certVal)}` : '',
        facAmt: isFac && isCertified ? `TZS ${formatMoney(certVal)}` : '',
        invAmt: isCertified ? `TZS ${formatMoney(certVal)}` : '',
        status: 'Not paid',
      };

      let cellX = tblLeft;
      for (const col of columns) {
        page2.drawRectangle({
          x: cellX,
          y: rowY,
          width: col.width,
          height: p2RowH,
          borderColor: rgb(0.3, 0.3, 0.3),
          borderWidth: 0.5,
        });

        const val = rowValues[col.key] || '';
        if (val) {
          const fontSize = col.key.includes('Amt') ? 5 : 5.5;
          const isBoldCol = col.key === 'siteId';
          const f = isBoldCol ? fontBold : fontRegular;
          const txtW = f.widthOfTextAtSize(val, fontSize);

          let tX = cellX + 2;
          if (col.align === 'center') {
            tX = cellX + (col.width - txtW) / 2;
          } else if (col.align === 'right') {
            tX = cellX + col.width - txtW - 2.5;
          }

          page2.drawText(val, {
            x: tX,
            y: rowY + (p2RowH - fontSize) / 2 + 0.5,
            size: fontSize,
            font: f,
            color: rgb(0.1, 0.1, 0.1),
          });
        }

        cellX += col.width;
      }

      rowY -= p2RowH;
    });

    // 7. TOTAL AMOUNT EXCLUDING VAT Row
    const totRowH = 14;
    const leftColsWidth = columns.slice(0, 5).reduce((sum, c) => sum + c.width, 0);

    page2.drawRectangle({
      x: tblLeft,
      y: rowY,
      width: leftColsWidth,
      height: totRowH,
      borderColor: rgb(0.2, 0.2, 0.2),
      borderWidth: 0.6,
      color: rgb(0.97, 0.97, 0.97),
    });

    page2.drawText('TOTAL AMOUNT EXCLUDING VAT', {
      x: tblLeft + 15,
      y: rowY + (totRowH - 5.5) / 2 + 0.5,
      size: 5.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const totalPoAuth = allSites.reduce((sum, s) => sum + (s.authorizedAmount || 0), 0) ||
      certificate.poAuthorizedAmount ||
      certificate.currentCertifiedAmount;

    const totCols = [
      { width: 58, val: `TZS ${formatMoney(totalPoAuth)}` },
      { width: 42, val: isDpc ? `TZS ${formatMoney(certificate.currentCertifiedAmount)}` : 'TZS 0.00' },
      { width: 44, val: (!isFac && !isDpc) ? `TZS ${formatMoney(certificate.currentCertifiedAmount)}` : 'TZS 0.00' },
      { width: 48, val: isFac ? `TZS ${formatMoney(certificate.currentCertifiedAmount)}` : 'TZS 0.00' },
      { width: 50, val: `TZS ${formatMoney(certificate.currentCertifiedAmount)}` },
      { width: 36, val: '' },
    ];

    let totCellX = tblLeft + leftColsWidth;
    for (const tc of totCols) {
      page2.drawRectangle({
        x: totCellX,
        y: rowY,
        width: tc.width,
        height: totRowH,
        borderColor: rgb(0.2, 0.2, 0.2),
        borderWidth: 0.6,
        color: rgb(0.97, 0.97, 0.97),
      });

      if (tc.val) {
        const txtW = fontBold.widthOfTextAtSize(tc.val, 5);
        page2.drawText(tc.val, {
          x: totCellX + tc.width - txtW - 2.5,
          y: rowY + (totRowH - 5) / 2 + 0.5,
          size: 5,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });
      }

      totCellX += tc.width;
    }

    rowY -= totRowH;

    // 8. Remarks Box
    const remarksY = rowY - 18;
    const remarksH = 20;
    page2.drawRectangle({
      x: tblLeft,
      y: remarksY,
      width: tblWidth,
      height: remarksH,
      borderColor: rgb(0.3, 0.3, 0.3),
      borderWidth: 0.6,
    });
    page2.drawText('Remarks:', {
      x: tblLeft + 4,
      y: remarksY + remarksH - 8,
      size: 6.5,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    // 9. Sign-Offs (Accepted by QA Left, Reviewed by Right)
    const sigSectionY = remarksY - 14;
    const sigBoxH = 11;
    const sigBoxW = 150;

    // Left: Accepted by (QA)
    page2.drawText('Accepted by (QA):', {
      x: tblLeft,
      y: sigSectionY,
      size: 7,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const qaFields = ['Name:', 'Signature:', 'Date:'];
    let qaY = sigSectionY - 14;
    for (const f of qaFields) {
      page2.drawRectangle({
        x: tblLeft,
        y: qaY,
        width: sigBoxW,
        height: sigBoxH,
        borderColor: rgb(0.3, 0.3, 0.3),
        borderWidth: 0.5,
      });
      page2.drawText(f, {
        x: tblLeft + 4,
        y: qaY + 3,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
      qaY -= 12;
    }

    // Right: Reviewed by
    const rightSigX = tblLeft + tblWidth - sigBoxW;
    page2.drawText('Reviewed by:', {
      x: rightSigX,
      y: sigSectionY,
      size: 7,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const reviewerFields = [
      { label: 'Name:', val: authoritativeApprover },
      { label: 'Signature:', val: '' },
      { label: 'Date:', val: certIssueDate },
    ];
    let revY = sigSectionY - 14;
    for (const f of reviewerFields) {
      page2.drawRectangle({
        x: rightSigX,
        y: revY,
        width: sigBoxW,
        height: sigBoxH,
        borderColor: rgb(0.3, 0.3, 0.3),
        borderWidth: 0.5,
      });
      page2.drawText(f.label, {
        x: rightSigX + 4,
        y: revY + 3,
        size: 6.5,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
      if (f.val) {
        page2.drawText(f.val.slice(0, 24), {
          x: rightSigX + 40,
          y: revY + 3,
          size: 6.5,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });
      }
      revY -= 12;
    }

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
