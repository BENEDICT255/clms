// ==============================================================================
// CLMS Certificate Preview & Approval Modal
// ==============================================================================

import { useState } from 'react';
import { Modal, Button, FinancialValue, StatusBadge } from '@/design-system';
import {
  CertificateRecord,
  certificateRepository,
} from '@/infrastructure/repositories/CertificateRepository';
import { useAuth } from '@/app/providers/AuthContext';
import { Printer, CheckCircle, Send, Award, FileText } from 'lucide-react';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!certificate) return null;

  const isSupplier = Boolean(user?.supplierId);
  const canApproveLead = can('certificate.approve.lead');
  const canApproveHop = can('certificate.approve.hop');
  const canIssue = can('certificate.issue');

  const handleApprove = async (stage: 'PROJECT_LEAD' | 'HEAD_OF_PROJECTS') => {
    setIsProcessing(true);
    setErrorMsg(null);
    try {
      const res = await certificateRepository.approveCertificateStage(certificate.id, stage);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to approve stage');
        return;
      }
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
      onUpdate?.();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Issuance error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Certificate: ${certificate.certificateNumber}`}
      width="760px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button variant="secondary" icon={<Printer size={16} />} onClick={handlePrint}>
            Print / Export Document
          </Button>

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

            {!isSupplier && canIssue && (certificate.status === 'APPROVED' || certificate.status === 'DRAFT') && (
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
      <div className="clms-cert-document" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
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

        {/* Certificate Formal Header Card */}
        <div
          className="border-hairline"
          style={{
            padding: 'var(--space-5)',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'var(--color-surface-sunken)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
              <FileText size={20} color="var(--color-brand-primary)" />
              <h3 style={{ margin: 0, fontSize: 'var(--font-size-lg)' }}>
                {certificate.certType} — Site Acceptance Certificate
              </h3>
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Provisional Document Template — {certificate.templateVersion}
            </div>
            <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
              Reference Number: <strong>{certificate.certificateNumber}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <StatusBadge status={certificate.status} size="md" />
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-2)' }}>
              Date: {new Date(certificate.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Commercial Metadata Grid */}
        <div
          className="border-hairline"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
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
            <strong>{certificate.projectName}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Total Certified</span>
            <FinancialValue
              amount={certificate.currentCertifiedAmount}
              currency={certificate.currency}
              size="sm"
              className="font-bold text-positive"
            />
          </div>
        </div>

        {/* Certified Sites Table */}
        <div>
          <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
            Included Commercial Scope & Site Allocations
          </h4>
          <div
            className="border-hairline"
            style={{ borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
              <thead style={{ backgroundColor: 'var(--color-surface-sunken)', borderBottom: '1px solid var(--color-border-hairline)' }}>
                <tr>
                  <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left' }}>Site ID</th>
                  <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left' }}>Site Name</th>
                  <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left' }}>Region</th>
                  <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>Authorized</th>
                  <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>Certified Val</th>
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
                    <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>
                      <FinancialValue amount={s.authorizedAmount} currency={certificate.currency} size="sm" />
                    </td>
                    <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 'var(--font-weight-semibold)' }}>
                      <FinancialValue amount={s.currentAmount} currency={certificate.currency} size="sm" />
                    </td>
                    <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>
                      {s.percentage}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Approval & Signature Blocks */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-4)',
            marginTop: 'var(--space-2)',
          }}
        >
          <div
            className="border-hairline"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-xs)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
              Project Lead Endorsement
            </div>
            {certificate.status !== 'DRAFT' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-semantic-success-text)' }}>
                <CheckCircle size={16} />
                <span>Endorsed & Signed</span>
              </div>
            ) : (
              <div style={{ color: 'var(--color-text-secondary)' }}>Pending author submission</div>
            )}
          </div>

          <div
            className="border-hairline"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-xs)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
              Head of Projects Authorization
            </div>
            {certificate.status === 'APPROVED' || certificate.status === 'ISSUED' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-semantic-success-text)' }}>
                <CheckCircle size={16} />
                <span>Authorized for Supplier Release</span>
              </div>
            ) : (
              <div style={{ color: 'var(--color-text-secondary)' }}>Pending HOP review</div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
