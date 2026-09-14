// ==============================================================================
// CLMS Pre-Submission Certificate Preview Modal
// ==============================================================================
// Renders the authentic 9-page PAC/FAC/DPC Certificate document on-screen before
// the Projects author commits and submits for multi-stage approval.
// Governed by DESIGN.md, PRODUCT.md, and AGENTS.md:
// - Uses canonical DocumentViewer with full interactive expand/zoom controls
// - Renders genuine certificate pages and linked PO contractual pages
// - Supports PDF download and direct "Submit for Approval"
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Modal, Button, FinancialValue } from '@/design-system';
import { CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';
import { CertificateType } from '@/domain/certification/CertificationEngine';
import { CertificatePacketService, PoSiteDetail } from '@/application/services/CertificatePacketService';
import { CertificatePdfService } from './CertificatePdfService';
import { DocumentViewer } from '@/design-system';
import { Download, Award, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';

interface PreSubmitCertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  certType: CertificateType;
  poId: string;
  poNumber: string;
  poAuthorizedAmount: number;
  supplierId: string;
  supplierName: string;
  projectName: string;
  currency: string;
  totalCertifiedAmount: number;
  siteItems: Array<{
    poSiteId: string;
    siteIdExt: string;
    siteName: string;
    region?: string;
    authorizedAmount: number;
    currentCertificationAmount: number;
    currentPercentage: number;
    previousCumulativeAmount?: number;
    newCumulativeAmount?: number;
    scopeDescription?: string;
  }>;
  notes?: string;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const PreSubmitCertificatePreviewModal: React.FC<PreSubmitCertificatePreviewModalProps> = ({
  isOpen,
  onClose,
  certType,
  poId,
  poNumber,
  poAuthorizedAmount,
  supplierId,
  supplierName,
  projectName,
  currency,
  totalCertifiedAmount,
  siteItems,
  notes,
  isSubmitting,
  onSubmit,
}) => {
  const { user } = useAuth();
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const certNumberDraft = `${certType}-${poNumber.slice(-4)}-DRAFT`;

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    async function compilePreview() {
      try {
        const draftCert: CertificateRecord = {
          id: 'draft-presubmit-preview',
          certificateNumber: certNumberDraft,
          certType,
          poId,
          poNumber,
          poAuthorizedAmount,
          supplierId,
          supplierName,
          projectName,
          currency,
          currentCertifiedAmount: totalCertifiedAmount,
          status: 'DRAFT',
          templateVersion: 'PROVISIONAL_V1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          siteCount: siteItems.length,
          sites: siteItems.map((s) => ({
            poSiteId: s.poSiteId,
            siteIdExt: s.siteIdExt,
            siteName: s.siteName,
            region: s.region || '—',
            authorizedAmount: s.authorizedAmount,
            currentAmount: s.currentCertificationAmount,
            percentage: s.currentPercentage,
          })),
        };

        const draftPoSites: PoSiteDetail[] = siteItems.map((s) => ({
          id: s.poSiteId,
          siteIdExt: s.siteIdExt,
          siteName: s.siteName,
          region: s.region || '—',
          authorizedAmount: s.authorizedAmount,
          currentAmount: s.currentCertificationAmount,
          percentage: s.currentPercentage,
          scopeDescription: s.scopeDescription,
        }));

        const result = await CertificatePacketService.generateCertificatePacket({
          certificate: draftCert,
          poSites: draftPoSites,
          approverName: user?.fullName || 'Project Engineer',
        });

        if (isMounted) {
          setPdfBytes(result.pdfBytes);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to generate certificate preview';
          console.error('[PreSubmitCertificatePreviewModal] Compilation error:', err);
          setError(msg);
          setIsLoading(false);
        }
      }
    }

    compilePreview();

    return () => {
      isMounted = false;
    };
  }, [
    isOpen,
    certType,
    poId,
    poNumber,
    poAuthorizedAmount,
    supplierId,
    supplierName,
    projectName,
    currency,
    totalCertifiedAmount,
    siteItems,
    notes,
    user?.fullName,
  ]);

  const handleDownload = () => {
    if (!pdfBytes) return;
    setIsDownloading(true);
    try {
      CertificatePdfService.triggerDownload(pdfBytes, `${certNumberDraft}.pdf`);
    } catch (err: unknown) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Preview Authentic Certificate: ${certType} — ${poNumber}`}
      width="1080px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              icon={<Download size={15} />}
              disabled={!pdfBytes || isLoading}
              isLoading={isDownloading}
              onClick={handleDownload}
            >
              Download PDF
            </Button>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
            <Button variant="secondary" icon={<ArrowLeft size={15} />} onClick={onClose} disabled={isSubmitting}>
              Back to Edit
            </Button>
            <Button
              variant="primary"
              icon={<Award size={15} />}
              isLoading={isSubmitting}
              disabled={isLoading || Boolean(error)}
              onClick={onSubmit}
            >
              Submit for Approval
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Certificate Pre-submission Summary Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-hairline)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Type & PO</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>
                {certType} &bull; {poNumber}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Vendor</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{supplierName}</span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Sites Included</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{siteItems.length} Sites</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Valuation (excl. VAT)</span>
            <FinancialValue
              amount={totalCertifiedAmount}
              currency={currency}
              size="md"
            />
          </div>
        </div>

        {/* Error Alert if any */}
        {error && (
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-semantic-error-bg)',
              color: 'var(--color-semantic-error-text)',
              border: '1px solid var(--color-semantic-error-border)',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Document Viewer */}
        <div
          style={{
            minHeight: '620px',
            backgroundColor: 'var(--color-bg-tertiary)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border-hairline)',
            overflow: 'hidden',
          }}
        >
          <DocumentViewer
            source={pdfBytes}
            isLoading={isLoading}
            fileName={`${certNumberDraft}.pdf`}
            initialScale={1.1}
          />
        </div>
      </div>
    </Modal>
  );
};
