// ==============================================================================
// CLMS Certificate Preview & Approval Modal
// Renders the authentic 9-Page PAC/FAC Document, supports PDF Download,
// Signed Certificate Upload, and atomic Issuance to Supplier.
// ==============================================================================

import { useState, useEffect, useRef } from 'react';
import { Modal, Button, StatusBadge } from '@/design-system';
import {
  CertificateRecord,
  certificateRepository,
} from '@/infrastructure/repositories/CertificateRepository';
import { CertificatePdfService, PoSiteDetail } from './CertificatePdfService';
import { CertificateDocumentView } from './CertificateDocumentView';
import { useAuth } from '@/app/providers/AuthContext';
import {
  Printer,
  Download,
  Upload,
  Send,
  FileCheck,
  ExternalLink,
  Award,
  Layers,
  FileText,
} from 'lucide-react';

interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: CertificateRecord | null;
  onUpdate?: () => void;
}

export function CertificatePreviewModal({
  isOpen,
  onClose,
  certificate,
  onUpdate,
}: CertificatePreviewModalProps) {
  const { can, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'DOCUMENT' | 'SUMMARY'>('DOCUMENT');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isUploadingSigned, setIsUploadingSigned] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [poSites, setPoSites] = useState<PoSiteDetail[]>([]);
  const [signedDoc, setSignedDoc] = useState<{
    id: string;
    fileName: string;
    fileSize: number;
    createdAt: string;
    url?: string | undefined;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load PO sites and signed document info
  useEffect(() => {
    if (!certificate) return;

    let isMounted = true;
    certificateRepository.getPoSites(certificate.poId).then((sites) => {
      if (isMounted) setPoSites(sites);
    });

    certificateRepository.getSignedCertificate(certificate.id).then((doc) => {
      if (isMounted) setSignedDoc(doc);
    });

    return () => {
      isMounted = false;
    };
  }, [certificate]);

  if (!certificate) return null;

  const isSupplier = Boolean(user?.supplierId);
  const canApproveLead =
    can('certificate.approve.lead') ||
    user?.roles?.includes('PROJECT_LEAD') ||
    user?.roles?.includes('HEAD_OF_PROJECTS') ||
    user?.roles?.includes('SYSTEM_ADMIN');
  const canApproveHop =
    can('certificate.approve.hop') ||
    user?.roles?.includes('HEAD_OF_PROJECTS') ||
    user?.roles?.includes('SYSTEM_ADMIN');
  const canIssue =
    can('certificate.issue') ||
    can('certificate.approve.lead') ||
    can('certificate.approve.hop') ||
    user?.roles?.includes('PROJECT_LEAD') ||
    user?.roles?.includes('HEAD_OF_PROJECTS') ||
    user?.roles?.includes('SYSTEM_ADMIN');

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    setErrorMsg(null);
    try {
      const pdfBytes = await CertificatePdfService.generateCertificatePdf({
        certificate,
        poSites,
        reviewerName: user?.fullName,
      });
      CertificatePdfService.triggerDownload(pdfBytes, `${certificate.certificateNumber}.pdf`);
      setSuccessMsg(`Downloaded certificate packet: ${certificate.certificateNumber}.pdf`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSignedFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSigned(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await certificateRepository.uploadSignedCertificate(
        certificate.id,
        file,
        certificate.certType,
        certificate.certificateNumber
      );

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to upload signed certificate');
        return;
      }

      setSignedDoc({
        id: res.documentId || 'doc-1',
        fileName: file.name,
        fileSize: file.size,
        createdAt: new Date().toISOString(),
        url: res.url,
      });
      setSuccessMsg(`Signed certificate "${file.name}" uploaded and verified successfully.`);
      onUpdate?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error uploading signed certificate');
    } finally {
      setIsUploadingSigned(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApprove = async (stage: 'PROJECT_LEAD' | 'HEAD_OF_PROJECTS') => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await certificateRepository.approveCertificateStage(certificate.id, stage);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to approve stage');
        return;
      }
      setSuccessMsg(`Stage ${stage} approved successfully.`);
      onUpdate?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Approval error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIssue = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await certificateRepository.issueCertificate(certificate.id);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to issue certificate');
        return;
      }
      setSuccessMsg(`Certificate ${certificate.certificateNumber} issued to supplier successfully.`);
      onUpdate?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Issuance error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Certificate: ${certificate.certificateNumber}`}
      width="940px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="primary"
              icon={<Download size={16} />}
              isLoading={isDownloadingPdf}
              onClick={handleDownloadPdf}
            >
              Download 9-Page PDF
            </Button>
            <Button variant="secondary" icon={<Printer size={16} />} onClick={handlePrint}>
              Print Document
            </Button>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>

            {!isSupplier && canApproveLead && certificate.status === 'PENDING_PROJECT_LEAD' && (
              <Button
                variant="primary"
                icon={<Award size={16} />}
                isLoading={isProcessing}
                onClick={() => handleApprove('PROJECT_LEAD')}
              >
                Approve (Project Lead)
              </Button>
            )}

            {!isSupplier && canApproveHop && certificate.status === 'PENDING_HEAD_OF_PROJECTS' && (
              <Button
                variant="primary"
                icon={<Award size={16} />}
                isLoading={isProcessing}
                onClick={() => handleApprove('HEAD_OF_PROJECTS')}
              >
                Approve (Head of Projects)
              </Button>
            )}

            {!isSupplier && canIssue && certificate.status !== 'ISSUED' && (
              <Button
                variant="primary"
                icon={<Send size={16} />}
                isLoading={isProcessing}
                onClick={handleIssue}
              >
                Issue to Supplier
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Success / Error Alerts */}
        {errorMsg && (
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-semantic-error-bg)',
              color: 'var(--color-semantic-error-text)',
              borderRadius: 'var(--radius-xs)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-semantic-success-bg)',
              color: 'var(--color-semantic-success-text)',
              borderRadius: 'var(--radius-xs)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Action & Status Header Bar */}
        <div
          className="border-hairline"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'var(--color-surface-sunken)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <StatusBadge status={certificate.status} size="md" />
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
              {certificate.certType} — {certificate.certificateNumber}
            </span>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              PO {certificate.poNumber} | {certificate.supplierName}
            </span>
          </div>

          {/* View Tab Switcher */}
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            <Button
              variant={activeTab === 'DOCUMENT' ? 'primary' : 'secondary'}
              size="sm"
              icon={<FileText size={14} />}
              onClick={() => setActiveTab('DOCUMENT')}
            >
              Authentic 9-Page View
            </Button>
            <Button
              variant={activeTab === 'SUMMARY' ? 'primary' : 'secondary'}
              size="sm"
              icon={<Layers size={14} />}
              onClick={() => setActiveTab('SUMMARY')}
            >
              Commercial Summary
            </Button>
          </div>
        </div>

        {/* Signed Document Upload & Verification Section */}
        <div
          className="border-hairline"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: signedDoc ? '#f0fdf4' : 'var(--color-surface-elevated)',
            border: signedDoc ? '1px solid #86efac' : '1px solid var(--color-border-hairline)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <FileCheck size={20} color={signedDoc ? '#16a34a' : 'var(--color-text-secondary)'} />
              <div>
                <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                  {signedDoc ? 'Signed Certificate Attached' : 'Signed Certificate Required'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  {signedDoc
                    ? `${signedDoc.fileName} (${(signedDoc.fileSize / 1024).toFixed(1)} KB) — Uploaded ${new Date(
                        signedDoc.createdAt
                      ).toLocaleDateString()}`
                    : 'Download the 9-page packet, obtain Project Manager & Head of Projects signatures, then upload the signed copy.'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              {signedDoc?.url && (
                <a
                  href={signedDoc.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-brand-primary)',
                    textDecoration: 'none',
                    fontWeight: 'var(--font-weight-medium)',
                  }}
                >
                  <ExternalLink size={14} /> View Signed Copy
                </a>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                style={{ display: 'none' }}
                onChange={handleSignedFileSelected}
              />

              <Button
                variant="secondary"
                size="sm"
                icon={<Upload size={14} />}
                isLoading={isUploadingSigned}
                onClick={() => fileInputRef.current?.click()}
              >
                {signedDoc ? 'Replace Signed Copy' : 'Upload Signed Copy'}
              </Button>
            </div>
          </div>
        </div>

        {/* Tab 1: Authentic 9-Page Document View */}
        {activeTab === 'DOCUMENT' && (
          <div
            style={{
              maxHeight: '620px',
              overflowY: 'auto',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--color-border-hairline)',
            }}
          >
            <CertificateDocumentView
              certificate={certificate}
              poSites={poSites}
              reviewerName={user?.fullName}
            />
          </div>
        )}

        {/* Tab 2: Commercial Summary Breakdown */}
        {activeTab === 'SUMMARY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Metadata Summary Grid */}
            <div
              className="border-hairline"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-xs)',
                fontSize: 'var(--font-size-xs)',
              }}
            >
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Purchase Order</span>
                <strong>{certificate.poNumber}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Contractor / Vendor</span>
                <strong>{certificate.supplierName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Project</span>
                <strong>{certificate.projectName || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Total Certified</span>
                <strong style={{ color: 'var(--color-brand-primary)' }}>
                  {certificate.currency} {certificate.currentCertifiedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {/* Sites Table */}
            <div>
              <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                Certified Site Allocations
              </h4>
              <div className="border-hairline" style={{ borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                  <thead style={{ backgroundColor: 'var(--color-surface-sunken)', borderBottom: '1px solid var(--color-border-hairline)' }}>
                    <tr>
                      <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left' }}>Site ID</th>
                      <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left' }}>Site Name</th>
                      <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left' }}>Region</th>
                      <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>Authorized Amount</th>
                      <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>Certified Amount</th>
                      <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(certificate.sites || []).map((s) => (
                      <tr key={s.poSiteId} style={{ borderBottom: '1px solid var(--color-border-hairline)' }}>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', fontWeight: 'var(--font-weight-medium)' }}>
                          {s.siteIdExt}
                        </td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)' }}>{s.siteName}</td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)' }}>{s.region}</td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {certificate.currency} {s.authorizedAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 'var(--font-weight-semibold)', fontVariantNumeric: 'tabular-nums' }}>
                          {certificate.currency} {s.currentAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                          {s.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
