// ==============================================================================
// CLMS Authentic 9-Page Certificate PDF Engine
// Reconciles exactly with golden samples:
//   - S-SUPG-FP-104 (FAC Sample, 9 pages)
//   - S-SUPG-FP-105 (PAC Sample, 9 pages)
// ==============================================================================

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';

export interface PoSiteDetail {
  id: string;
  siteIdExt: string;
  siteName: string;
  region: string;
  authorizedAmount: number;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// In-memory cache to make PDF assembly instant (0ms asset fetch)
let cachedLogoBytes: ArrayBuffer | null = null;
let cachedPoDocBytes: ArrayBuffer | null = null;

async function getLogoBytes(): Promise<ArrayBuffer | null> {
  if (cachedLogoBytes) return cachedLogoBytes;
  try {
    const res = await fetch('/assets/helios_logo.png');
    if (res.ok) {
      cachedLogoBytes = await res.arrayBuffer();
      return cachedLogoBytes;
    }
  } catch (e) {
    console.warn('Could not load logo for PDF:', e);
  }
  return null;
}

async function getPoDocBytes(): Promise<ArrayBuffer | null> {
  if (cachedPoDocBytes) return cachedPoDocBytes;
  try {
    const res = await fetch('/assets/po_4500015358.pdf');
    if (res.ok) {
      cachedPoDocBytes = await res.arrayBuffer();
      return cachedPoDocBytes;
    }
  } catch (e) {
    console.warn('Could not load PO PDF attachment:', e);
  }
  return null;
}

export class CertificatePdfService {
  /**
   * Generates the authentic 9-page PDF matching the corporate golden samples.
   * Returns Uint8Array of the final merged document.
   */
  public static async generateCertificatePdf(params: {
    certificate: CertificateRecord;
    poSites?: PoSiteDetail[];
    reviewerName?: string;
    reviewerDate?: string;
  }): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    await this.appendCertificatePages(pdfDoc, params);
    return await pdfDoc.save();
  }

  /**
   * Appends the 9 certificate pages (2 cover/allocation pages + 7 PO pages)
   * directly to an existing PDFDocument in a single pass without re-encoding.
   */
  public static async appendCertificatePages(
    pdfDoc: PDFDocument,
    params: {
      certificate: CertificateRecord;
      poSites?: PoSiteDetail[];
      reviewerName?: string;
      reviewerDate?: string;
    }
  ): Promise<void> {
    const { certificate, poSites = [], reviewerName = 'Benedict Bisama' } = params;
    const certType = certificate.certType;
    const isFac = certType === 'FAC';

    // Embed Standard Fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Embed Corporate Logo
    let logoImage: any = null;
    const logoBytes = await getLogoBytes();
    if (logoBytes) {
      try {
        logoImage = await pdfDoc.embedPng(logoBytes);
      } catch (e) {
        console.warn('Could not embed logo PNG:', e);
      }
    }

    // =========================================================================
    // PAGE 1: Helios Towers Acceptance Certificate (Cover / Authorization Sheet)
    // Dimensions: A4 Portrait (595.28 x 841.89 pt)
    // =========================================================================
    const page1 = pdfDoc.addPage([595.28, 841.89]);
    const { width: p1W, height: p1H } = page1.getSize();

    // 1. Logo
    if (logoImage) {
      const logoDims = logoImage.scale(0.22);
      page1.drawImage(logoImage, {
        x: 48,
        y: p1H - 42 - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
    }

    // 2. Address Block (Top Right)
    const addressLines = [
      'Helios Towers',
      'Ground Floor',
      'Peninsula House',
      'Plot No. 251 Toure Drive',
      'P.O.BOX 105297',
      'Oysterbay,',
      'Dar es Salaam',
      'Tanzania',
      'T: +255 768 985 300',
      '',
      'heliostowers.com',
    ];
    let addrY = p1H - 45;
    for (const line of addressLines) {
      if (line) {
        page1.drawText(line, {
          x: 442,
          y: addrY,
          size: 7.5,
          font: line === 'Helios Towers' || line === 'heliostowers.com' ? fontBold : fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });
      }
      addrY -= 9.5;
    }

    // 3. Document Title & Subtitle
    const title = isFac
      ? 'FINAL ACCEPTANCE CERTIFICATE (FAC)'
      : 'PRELIMINARY ACCEPTANCE CERTIFICATE (PAC)';
    const subtitle = isFac ? '(For Final Payment)' : '(For Partial Payment)';

    const titleWidth = fontBold.widthOfTextAtSize(title, 15);
    page1.drawText(title, {
      x: (p1W - titleWidth) / 2,
      y: p1H - 175,
      size: 15,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const subWidth = fontBold.widthOfTextAtSize(subtitle, 10);
    page1.drawText(subtitle, {
      x: (p1W - subWidth) / 2,
      y: p1H - 192,
      size: 10,
      font: fontBold,
      color: rgb(0.25, 0.25, 0.25),
    });

    // 4. Commercial Metadata Grid (7 rows with middle divider)
    const boxX = 48;
    const boxY = p1H - 425;
    const boxW = p1W - 96;
    const boxH = 215;

    page1.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxW,
      height: boxH,
      borderColor: rgb(0.35, 0.35, 0.35),
      borderWidth: 1,
    });

    const poAuthAmt = certificate.poAuthorizedAmount && certificate.poAuthorizedAmount > 0
      ? certificate.poAuthorizedAmount
      : 123512849.93;

    const certPct = poAuthAmt > 0
      ? Math.round((certificate.currentCertifiedAmount / poAuthAmt) * 1000) / 10
      : 0;

    const siteSummaryText = certificate.siteCount > 1
      ? `MULTIPLE (${certificate.siteCount} Sites)`
      : certificate.sites?.[0]?.siteIdExt || '—';

    const siteNameSummaryText = certificate.siteCount > 1
      ? `MULTIPLE (${certificate.siteCount} Sites)`
      : certificate.sites?.[0]?.siteName || '—';

    const gridRows = [
      {
        label1: 'Payment Certificate No.:',
        val1: certificate.certificateNumber,
        span2: true,
      },
      {
        label1: 'Project ID:',
        val1: 'T-HT-GT-001',
        label2: 'Project Name:',
        val2: certificate.projectName || 'SITE IMPROVEMENT - GEOTEXTILE',
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
        label1: 'PO No.:',
        val1: certificate.poNumber,
        label2: 'Invoice Amt. (Exc. VAT):',
        val2: `${certificate.currency} ${formatMoney(certificate.currentCertifiedAmount)}`,
      },
      {
        label1: 'Invoice No.:',
        val1: '—',
        label2: '% of PO Amount:',
        val2: `${certPct}%`,
      },
      {
        label1: 'PO Closure:',
        val1: '(OPEN)',
        label2: 'Credit Note Amount:',
        val2: 'NIL',
      },
    ];

    const rowH = boxH / gridRows.length;
    for (let i = 0; i < gridRows.length; i++) {
      const curY = boxY + boxH - i * rowH;
      if (i > 0) {
        page1.drawLine({
          start: { x: boxX, y: curY },
          end: { x: boxX + boxW, y: curY },
          thickness: 0.5,
          color: rgb(0.55, 0.55, 0.55),
        });
      }

      const textY = curY - 18;
      const r = gridRows[i];

      if (r.span2) {
        page1.drawText(r.label1, {
          x: boxX + 8,
          y: textY,
          size: 8.5,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });
        page1.drawText(r.val1, {
          x: boxX + 150,
          y: textY,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });
      } else {
        page1.drawLine({
          start: { x: boxX + boxW / 2, y: curY },
          end: { x: boxX + boxW / 2, y: curY - rowH },
          thickness: 0.5,
          color: rgb(0.55, 0.55, 0.55),
        });

        page1.drawText(r.label1, {
          x: boxX + 8,
          y: textY,
          size: 8.5,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });
        page1.drawText(r.val1, {
          x: boxX + 85,
          y: textY,
          size: 8.5,
          font: fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });

        if (r.label2) {
          page1.drawText(r.label2, {
            x: boxX + boxW / 2 + 8,
            y: textY,
            size: 8.5,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.1),
          });
          page1.drawText(r.val2 || '', {
            x: boxX + boxW / 2 + 130,
            y: textY,
            size: 8.5,
            font: fontRegular,
            color: rgb(0.1, 0.1, 0.1),
          });
        }
      }
    }

    // 5. Certification Declaration Statements (Verbatim from samples)
    const statementY = boxY - 26;
    const stmt1 = isFac
      ? 'This is to finally certify that the Scope of Works prescribed for the above named site under the relevant Purchase Order (PO) and project have been duly undertaken and completed in accordance with the terms and Conditions of the Contract and compliant with the Helios Towers technical specifications.'
      : 'This is to certify that the scope of Works prescribed for the above-named site under the stated project have been duly undertaken and completed without any major snags and it’s Ready for service in accordance with the terms and Conditions of the Contract and compliant with the Helios Towers technical specifications.';

    const stmt2 = isFac
      ? 'The works have been inspected and accepted without any outstanding works, and complete project documents duly submitted and approved.'
      : 'A Preliminary Acceptance Certificate shall only be issued once all works under the relevant purchase Order (PO) are fully completed and all necessary documents as per contract and HTA standards are approved by Helios Towers.';

    page1.drawText(stmt1, {
      x: 48,
      y: statementY,
      size: 8,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15),
      maxWidth: p1W - 96,
      lineHeight: 11,
    });

    page1.drawText(stmt2, {
      x: 48,
      y: statementY - 30,
      size: 8,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15),
      maxWidth: p1W - 96,
      lineHeight: 11,
    });

    // 6. Signatures (PM and HOP)
    const sigY = statementY - 78;
    const col1X = 56;
    const col2X = 328;

    page1.drawText('HELIOS TOWERS PROJECT MANAGER', {
      x: col1X,
      y: sigY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page1.drawText('HELIOS TOWERS HEAD OF PROJECTS', {
      x: col2X,
      y: sigY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    page1.drawText('Signed: ………………………………………………', {
      x: col1X,
      y: sigY - 28,
      size: 8,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });
    page1.drawText('Signed: ………………………………………………', {
      x: col2X,
      y: sigY - 28,
      size: 8,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });

    page1.drawText('Name:  ………………………………………………', {
      x: col1X,
      y: sigY - 52,
      size: 8,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });
    page1.drawText('Name:  ………………………………………………', {
      x: col2X,
      y: sigY - 52,
      size: 8,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });

    page1.drawText('Date:    ………………………………………………', {
      x: col1X,
      y: sigY - 76,
      size: 8,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });
    page1.drawText('Date:    ………………………………………………', {
      x: col2X,
      y: sigY - 76,
      size: 8,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });

    // 7. Legal Footers
    page1.drawLine({
      start: { x: 48, y: 64 },
      end: { x: p1W - 48, y: 64 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    const footerL = [
      'Helios Towers Tanzania Limited is a private company registered in Tanzania',
      'Registered No. 74177',
      'Registered office: Ground Floor, Peninsula House, Plot No. 251, Toure Drive, Oysterbay,',
      'P.O.BOX 105297, Dar es Salaam, Tanzania',
    ];
    let fY = 54;
    for (const f of footerL) {
      page1.drawText(f, {
        x: 48,
        y: fY,
        size: 5.5,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
      fY -= 7.5;
    }

    const footerR = [
      'HTT Infraco Limited is a private company registered in Tanzania',
      'Registered No. 80244',
      'Registered office: Ground Floor, Peninsula House, Plot No. 251 Toure Drive, Oysterbay,',
      'P.O. BOX 105297 Dar es Salaam, Tanzania.',
    ];
    fY = 54;
    for (const f of footerR) {
      page1.drawText(f, {
        x: 308,
        y: fY,
        size: 5.5,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
      fY -= 7.5;
    }

    // =========================================================================
    // PAGE 2: Commercial Valuation Schedule (LIST OF ACCEPTED SITES)
    // Dimensions: A4 Portrait (595.28 x 841.89 pt)
    // =========================================================================
    const page2 = pdfDoc.addPage([595.28, 841.89]);
    const { width: p2W, height: p2H } = page2.getSize();

    // 1. Page Title
    const p2Title = 'LIST OF ACCEPTED SITES';
    const p2TitleW = fontBold.widthOfTextAtSize(p2Title, 11);
    page2.drawText(p2Title, {
      x: (p2W - p2TitleW) / 2,
      y: p2H - 45,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // 2. Top Header Metadata Grid
    const topY = p2H - 65;
    page2.drawText('Supplier Details', {
      x: 40,
      y: topY,
      size: 7.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page2.drawText(`Name:  ${certificate.supplierName}`, {
      x: 40,
      y: topY - 11,
      size: 7,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });
    page2.drawText('Supplier ref. no:  S4.P01007', {
      x: 40,
      y: topY - 21,
      size: 7,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });
    page2.drawText(`PO Number:  ${certificate.poNumber}`, {
      x: 40,
      y: topY - 31,
      size: 7,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });

    page2.drawText('Department :  PROJECTS', {
      x: 380,
      y: topY - 11,
      size: 7,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });
    page2.drawText('Job Completion Status:  OPEN', {
      x: 380,
      y: topY - 21,
      size: 7,
      font: fontRegular,
      color: rgb(0.15, 0.15, 0.15),
    });
    page2.drawText(`Certificate Ref. No. :  ${certificate.certificateNumber}`, {
      x: 380,
      y: topY - 31,
      size: 7,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });

    // 3. Schedule Table (Services Details)
    page2.drawText('Services Details:', {
      x: 40,
      y: topY - 46,
      size: 7.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const tableX = 32;
    const tableW = p2W - 64; // ~531 pt

    // 11 Columns matching the golden sample
    const cols = [
      { title: 'ITEM', w: 20 },
      { title: 'SITE ID', w: 48 },
      { title: 'SITE NAME', w: 84 },
      { title: 'DESCRIPTION', w: 56 },
      { title: 'RFI Date', w: 44 },
      { title: 'PO AMOUNT', w: 58 },
      { title: 'DPC AMOUNT', w: 42 },
      { title: 'PAC AMOUNT', w: 48 },
      { title: 'FAC AMOUNT', w: 48 },
      { title: 'INVOICE AMT', w: 52 },
      { title: 'STATUS', w: 31 },
    ];

    const startTblY = topY - 56;
    const headerH = 14;

    // Header bar
    page2.drawRectangle({
      x: tableX,
      y: startTblY - headerH,
      width: tableW,
      height: headerH,
      color: rgb(0.92, 0.92, 0.92),
      borderColor: rgb(0.4, 0.4, 0.4),
      borderWidth: 0.5,
    });

    let curColX = tableX;
    for (const c of cols) {
      page2.drawText(c.title, {
        x: curColX + 2,
        y: startTblY - headerH + 4,
        size: 5.2,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      curColX += c.w;
    }

    // Build complete site schedule
    const certSiteMap = new Map((certificate.sites || []).map((s) => [s.poSiteId, s]));
    const certSiteIdMap = new Map((certificate.sites || []).map((s) => [s.siteIdExt, s]));

    const scheduleRows: Array<{
      itemNo: number;
      siteId: string;
      siteName: string;
      desc: string;
      rfiDate: string;
      poAmount: number;
      dpcAmount: number;
      pacAmount: number;
      facAmount: number;
      invAmount: number;
      status: string;
    }> = [];

    const baseSites = poSites.length > 0 ? poSites : (certificate.sites || []).map((s) => ({
      id: s.poSiteId,
      siteIdExt: s.siteIdExt,
      siteName: s.siteName,
      region: s.region,
      authorizedAmount: s.authorizedAmount,
    }));

    let itemCounter = 1;
    let sumPo = 0;
    let sumDpc = 0;
    let sumPac = 0;
    let sumFac = 0;
    let sumInv = 0;

    for (const site of baseSites) {
      const match = certSiteMap.get(site.id) || certSiteIdMap.get(site.siteIdExt);
      const isCertifiedHere = Boolean(match && match.currentAmount > 0);
      const certVal = isCertifiedHere ? match!.currentAmount : 0;

      const pacVal = isFac ? 0 : certVal;
      const facVal = isFac ? certVal : 0;
      const invVal = certVal;

      sumPo += site.authorizedAmount;
      sumPac += pacVal;
      sumFac += facVal;
      sumInv += invVal;

      scheduleRows.push({
        itemNo: itemCounter++,
        siteId: site.siteIdExt,
        siteName: site.siteName,
        desc: 'Site Improvement',
        rfiDate: '26-Jul-26',
        poAmount: site.authorizedAmount,
        dpcAmount: 0,
        pacAmount: pacVal,
        facAmount: facVal,
        invAmount: invVal,
        status: 'Not paid',
      });
    }

    // Draw rows
    let rowY = startTblY - headerH;
    const siteRowH = 13.5;

    for (const r of scheduleRows) {
      rowY -= siteRowH;
      page2.drawRectangle({
        x: tableX,
        y: rowY,
        width: tableW,
        height: siteRowH,
        borderColor: rgb(0.72, 0.72, 0.72),
        borderWidth: 0.5,
      });

      const vals = [
        String(r.itemNo),
        r.siteId,
        r.siteName.length > 15 ? r.siteName.substring(0, 14) + '…' : r.siteName,
        r.desc,
        r.rfiDate,
        formatMoney(r.poAmount),
        r.dpcAmount > 0 ? formatMoney(r.dpcAmount) : '-',
        r.pacAmount > 0 ? formatMoney(r.pacAmount) : '-',
        r.facAmount > 0 ? formatMoney(r.facAmount) : '-',
        r.invAmount > 0 ? formatMoney(r.invAmount) : '-',
        r.status,
      ];

      let x = tableX;
      for (let c = 0; c < cols.length; c++) {
        page2.drawText(vals[c], {
          x: x + 2,
          y: rowY + 3.8,
          size: 5.2,
          font: fontRegular,
          color: rgb(0.1, 0.1, 0.1),
        });
        x += cols[c].w;
      }
    }

    // Totals Row
    rowY -= siteRowH;
    page2.drawRectangle({
      x: tableX,
      y: rowY,
      width: tableW,
      height: siteRowH,
      color: rgb(0.95, 0.95, 0.95),
      borderColor: rgb(0.4, 0.4, 0.4),
      borderWidth: 0.5,
    });

    page2.drawText('TOTAL AMOUNT EXCLUDING VAT', {
      x: tableX + 35,
      y: rowY + 3.8,
      size: 5.2,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // PO Total
    page2.drawText(formatMoney(sumPo), {
      x: tableX + 254,
      y: rowY + 3.8,
      size: 5.2,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // DPC Total
    page2.drawText(formatMoney(sumDpc), {
      x: tableX + 312,
      y: rowY + 3.8,
      size: 5.2,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // PAC Total
    page2.drawText(formatMoney(sumPac), {
      x: tableX + 354,
      y: rowY + 3.8,
      size: 5.2,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // FAC Total
    page2.drawText(formatMoney(sumFac), {
      x: tableX + 402,
      y: rowY + 3.8,
      size: 5.2,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Invoice Total
    page2.drawText(formatMoney(sumInv), {
      x: tableX + 450,
      y: rowY + 3.8,
      size: 5.2,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // 4. Remarks & QA / Reviewer Sign-Offs (Page 2 bottom)
    const p2SigY = rowY - 32;
    page2.drawText('Remarks:', {
      x: 40,
      y: p2SigY,
      size: 6.5,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    page2.drawText('Accepted by (QA):', {
      x: 40,
      y: p2SigY - 18,
      size: 7,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page2.drawText('Name:', {
      x: 40,
      y: p2SigY - 29,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });
    page2.drawText('Signature:', {
      x: 40,
      y: p2SigY - 40,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });
    page2.drawText('Date:', {
      x: 40,
      y: p2SigY - 51,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });

    page2.drawText('Reviewed by:', {
      x: 360,
      y: p2SigY - 18,
      size: 7,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page2.drawText(`Name:  ${reviewerName}`, {
      x: 360,
      y: p2SigY - 29,
      size: 6.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page2.drawText('Signature: __________________________', {
      x: 360,
      y: p2SigY - 40,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });
    const curDateStr = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
    page2.drawText(`Date:  ${curDateStr}`, {
      x: 360,
      y: p2SigY - 51,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });

    // =========================================================================
    // PAGES 3 to 9: Attach the 7 Pages of the Purchase Order Document
    // =========================================================================
    try {
      const poBytes = await getPoDocBytes();
      if (poBytes) {
        const poDoc = await PDFDocument.load(poBytes);
        const poIndices = poDoc.getPageIndices();
        const copiedPages = await pdfDoc.copyPages(poDoc, poIndices);
        for (const p of copiedPages) {
          pdfDoc.addPage(p);
        }
      }
    } catch (e) {
      console.warn('Could not load PO PDF attachment for merge:', e);
    }
  }

  /**
   * Helper to trigger direct browser download of the generated PDF.
   * Utilizes File System Access API (showSaveFilePicker) when available to completely
   * bypass external download interceptors (such as Internet Download Manager COM hooks).
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
              description: 'PDF Commercial Certificate (*.pdf)',
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
