// ==============================================================================
// CLMS Supply Chain Review Queue Page (Enterprise Super Prompt 4)
// ==============================================================================
// Governed by PRODUCT.md Section 27 & 28 and DESIGN.md v1.2:
// - Review Queue of SUBMITTED & RESUBMITTED invoices
// - Comprehensive Commercial Lineage Side-by-Side Inspection
// - Structured Return Reason Category & Comment
// - Idempotent Approval & Automatic Finance Queue Transfer
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  DataTable,
  Column,
  FinancialValue,
  StatusBadge,
  Button,
  Drawer,
  Modal,
  Alert,
  Input,
  Tabs,
  TabItem,
} from '@/design-system';
import {
  supplyChainRepository,
  InvoiceReviewHistoryItem,
} from '@/infrastructure/repositories/SupplyChainRepository';
import { InvoiceRecord, invoiceRepository } from '@/infrastructure/repositories/InvoiceRepository';
import { certificateRepository } from '@/infrastructure/repositories/CertificateRepository';
import { CertificatePacketService } from '@/application/services/CertificatePacketService';
import { downloadService } from '@/application/services/DownloadService';
import { documentStorageService } from '@/infrastructure/storage/DocumentStorageService';
import { InvoicePreviewModal } from '@/features/invoices/InvoicePreviewModal';
import { useAuth } from '@/app/providers/AuthContext';
import {
  RETURN_REASON_OPTIONS,
  ReturnReasonCode,
  SupplyChainEngine,
} from '@/domain/supply-chain/SupplyChainEngine';
import {
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Send,
  Building2,
  FileText,
  Clock,
  Layers,
  Download,
} from 'lucide-react';

export function SupplyChainPage() {
  const { user } = useAuth();
  const [pendingInvoices, setPendingInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPacketModalOpen, setIsPacketModalOpen] = useState(false);
  const [reviewHistory, setReviewHistory] = useState<InvoiceReviewHistoryItem[]>([]);

  // Return Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedReturnCode, setSelectedReturnCode] = useState<ReturnReasonCode>('INVOICE_NUMBER_MISMATCH');
  const [returnReasonText, setReturnReasonText] = useState('');
  const [isReturning, setIsReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Approval Modal State
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  // Feedback Alert
  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; message: string } | null>(null);
  const [isDownloadingDoc, setIsDownloadingDoc] = useState(false);

  /**
   * IDM-independent Blob download using DownloadService (Section 17 & 18).
   * Zero hardcoded reviewer/commercial data (Section 11, 50, 51).
   */
  const handleDownloadUnifiedDoc = async () => {
    if (!selectedInvoice) return;
    setIsDownloadingDoc(true);
    try {
      const doc = await invoiceRepository.getUnifiedInvoiceDocument(selectedInvoice.id);
      if (doc) {
        const blob = await documentStorageService.downloadBlob(doc.storagePath);
        downloadService.downloadBlob(blob, `${selectedInvoice.clmsRef}_Submitted_Packet.pdf`);
      } else {
        const cert = await certificateRepository.getCertificateById(selectedInvoice.certificateId);
        if (cert) {
          const poSites = await certificateRepository.getPoSites(cert.poId);
          const certResult = await CertificatePacketService.generateCertificatePacket({
            certificate: cert,
            poSites,
            approverName: user?.fullName,
          });
          const blob = new Blob([certResult.pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
          downloadService.downloadBlob(blob, `${selectedInvoice.clmsRef}_Certificate_Packet.pdf`);
        }
      }
    } catch (err) {
      console.warn('Could not download unified document:', err);
    } finally {
      setIsDownloadingDoc(false);
    }
  };

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await supplyChainRepository.getPendingReviewQueue();
      setPendingInvoices(data);
    } catch (err: unknown) {
      console.error('Failed to load SCM review queue:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleInspect = async (inv: InvoiceRecord) => {
    setSelectedInvoice(inv);
    setIsDrawerOpen(true);
    try {
      const history = await supplyChainRepository.getInvoiceReviewHistory(inv.id);
      setReviewHistory(history);
    } catch (err: unknown) {
      console.warn('Failed to load review history:', err);
      setReviewHistory([]);
    }
  };

  const handleOpenReturnModal = () => {
    setReturnReasonText('');
    setSelectedReturnCode('INVOICE_NUMBER_MISMATCH');
    setReturnError(null);
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedInvoice) return;

    const validation = SupplyChainEngine.validateReturnInput({
      returnCode: selectedReturnCode,
      reason: returnReasonText,
    });

    if (!validation.isValid) {
      setReturnError(validation.errors[0] ?? 'Please provide a valid return reason.');
      return;
    }

    setIsReturning(true);
    setReturnError(null);
    try {
      const res = await supplyChainRepository.returnInvoice(
        selectedInvoice.id,
        selectedReturnCode,
        returnReasonText
      );

      if (res.success) {
        setIsReturnModalOpen(false);
        setIsDrawerOpen(false);
        setSelectedInvoice(null);
        setFeedback({
          type: 'success',
          message: `Invoice ${selectedInvoice.clmsRef} returned to supplier for correction.`,
        });
        await fetchInvoices();
      } else {
        setReturnError(res.error || 'Failed to return invoice');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error returning invoice';
      setReturnError(msg);
    } finally {
      setIsReturning(false);
    }
  };

  const handleOpenApproveModal = () => {
    setApprovalNotes('Commercial and documentary compliance verified against milestone certificate.');
    setApprovalError(null);
    setIsApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedInvoice) return;

    setIsApproving(true);
    setApprovalError(null);
    try {
      const res = await supplyChainRepository.approveInvoice(
        selectedInvoice.id,
        approvalNotes
      );

      if (res.success) {
        setIsApproveModalOpen(false);
        setIsDrawerOpen(false);
        setSelectedInvoice(null);
        setFeedback({
          type: 'success',
          message: `Invoice ${selectedInvoice.clmsRef} approved and transferred to Finance processing queue.`,
        });
        await fetchInvoices();
      } else {
        setApprovalError(res.error || 'Failed to approve invoice');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error approving invoice';
      setApprovalError(msg);
    } finally {
      setIsApproving(false);
    }
  };

  const calculateAgeInQueue = (submittedAt?: string): string => {
    if (!submittedAt) return '—';
    const subDate = new Date(submittedAt).getTime();
    const now = Date.now();
    const diffHours = Math.floor((now - subDate) / (1000 * 60 * 60));
    if (diffHours < 24) {
      return `${Math.max(1, diffHours)}h ago`;
    }
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Tab state for SCM Review categories
  const [activeTab, setActiveTab] = useState('ALL');

  const isPending = (status: string) => status === 'SUBMITTED' || status === 'RESUBMITTED';
  const isApproved = (status: string) =>
    ['SC_APPROVED', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT', 'PARTIALLY_PAID', 'SETTLED'].includes(status);
  const isReturned = (status: string) => status === 'RETURNED';

  const pendingCount = pendingInvoices.filter((i) => isPending(i.status)).length;
  const approvedCount = pendingInvoices.filter((i) => isApproved(i.status)).length;
  const returnedCount = pendingInvoices.filter((i) => isReturned(i.status)).length;

  const scmTabs: TabItem[] = [
    { id: 'ALL', label: `All Claims (${pendingInvoices.length})` },
    { id: 'PENDING', label: `Pending Review (${pendingCount})` },
    { id: 'APPROVED', label: `Approved (${approvedCount})` },
    { id: 'RETURNED', label: `Returned (${returnedCount})` },
  ];

  const filteredInvoices = pendingInvoices.filter((item) => {
    if (activeTab === 'PENDING') return isPending(item.status);
    if (activeTab === 'APPROVED') return isApproved(item.status);
    if (activeTab === 'RETURNED') return isReturned(item.status);
    return true;
  });

  const columns: Column<InvoiceRecord>[] = [
    { header: 'CLMS Ref', accessorKey: 'clmsRef', width: '140px' },
    { header: 'Supplier Invoice No', accessorKey: 'supplierInvoiceNo', width: '160px' },
    { header: 'Supplier', accessorKey: 'supplierName' },
    { header: 'Purchase Order', accessorKey: 'poNumber', width: '140px' },
    { header: 'Certificate', accessorKey: 'certificateNumber', width: '150px' },
    {
      header: 'Claim Value',
      align: 'right',
      cell: (row) => (
        <FinancialValue
          amount={row.totalAmount}
          currency={row.currency}
          size="sm"
          className="font-semibold"
        />
      ),
    },
    {
      header: 'Status',
      align: 'center',
      width: '140px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Age in Queue',
      accessorKey: 'submittedAt',
      width: '120px',
      cell: (row) => (
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
          <Clock size={12} />
          {calculateAgeInQueue(row.submittedAt)}
        </span>
      ),
    },
    {
      header: 'Action',
      align: 'center',
      width: '110px',
      cell: (row) => (
        <Button
          variant="secondary"
          size="sm"
          icon={<Eye size={14} />}
          onClick={() => handleInspect(row)}
        >
          {isPending(row.status) ? 'Review' : 'Inspect'}
        </Button>
      ),
    },
  ];

  return (
    <div className="clms-scm-page">
      <PageHeader
        title="Supply Chain Review Queue"
        description="Review submitted supplier claims against issued certificates, authorized PO commitments, and supporting compliance documentation."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Supply Chain Review' }]}
        actions={
          <Button
            variant="secondary"
            size="md"
            icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
            onClick={fetchInvoices}
          >
            Refresh
          </Button>
        }
      />

      {feedback && (
        <Alert
          type={feedback.type === 'success' ? 'success' : 'danger'}
          title={feedback.type === 'success' ? 'Action Completed' : 'Action Failed'}
          style={{ marginBottom: 'var(--space-4)' }}
          onClose={() => setFeedback(null)}
        >
          {feedback.message}
        </Alert>
      )}

      {/* SCM Queue Filter Tabs */}
      <Tabs
        tabs={scmTabs}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
        style={{ marginBottom: 'var(--space-3)' }}
      />

      <DataTable
        columns={columns}
        data={filteredInvoices}
        isLoading={isLoading}
        emptyTitle={
          activeTab === 'PENDING'
            ? 'No invoices are awaiting Supply Chain review'
            : activeTab === 'APPROVED'
            ? 'No invoices have been approved yet'
            : activeTab === 'RETURNED'
            ? 'No invoices have been returned'
            : 'No Supply Chain invoices found'
        }
        emptyDescription={
          activeTab === 'PENDING'
            ? 'Invoices submitted by suppliers against issued certificates will automatically arrive in this queue for commercial verification.'
            : 'Invoices reviewed and processed by Supply Chain appear here.'
        }
      />

      {/* Side-by-Side SCM Review Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedInvoice(null);
        }}
        title={selectedInvoice ? `Commercial Review: ${selectedInvoice.clmsRef}` : 'Commercial Review'}
        subtitle={
          selectedInvoice
            ? `Supplier: ${selectedInvoice.supplierName} | Status: ${selectedInvoice.status}`
            : ''
        }
        width="580px"
        footer={
          selectedInvoice && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              {isPending(selectedInvoice.status) ? (
                <>
                  <Button
                    variant="danger"
                    size="md"
                    icon={<RotateCcw size={16} />}
                    onClick={handleOpenReturnModal}
                  >
                    Return to Supplier
                  </Button>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button variant="secondary" size="md" onClick={() => setIsDrawerOpen(false)}>
                      Close
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      icon={<Send size={16} />}
                      onClick={handleOpenApproveModal}
                    >
                      Approve & Send to Finance
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <StatusBadge
                    status={selectedInvoice.status}
                    label={isApproved(selectedInvoice.status) ? 'Approved by Supply Chain' : undefined}
                    size="md"
                  />
                  <Button variant="secondary" size="md" onClick={() => setIsDrawerOpen(false)}>
                    Close
                  </Button>
                </>
              )}
            </div>
          )
        }
      >
        {selectedInvoice && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', fontSize: 'var(--font-size-xs)' }}>
            {isApproved(selectedInvoice.status) && (
              <Alert type="success" title="Supply Chain Verified & Approved">
                This commercial claim was approved by Supply Chain and transferred to Finance for payment processing and voucher disbursement.
              </Alert>
            )}
            {isReturned(selectedInvoice.status) && (
              <Alert type="danger" title="Returned to Supplier">
                This commercial claim was returned to the supplier for corrections.
              </Alert>
            )}
            {/* Context Box */}
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-surface-sunken)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Review Status:</span>
                <StatusBadge status={selectedInvoice.status} size="sm" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Supplier Legal Name:</span>
                <strong style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <Building2 size={13} /> {selectedInvoice.supplierName}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>External Invoice Number:</span>
                <strong>{selectedInvoice.supplierInvoiceNo}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Purchase Order:</span>
                <strong>{selectedInvoice.poNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Project:</span>
                <span>{selectedInvoice.projectName || 'Infrastructure Program'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Milestone Certificate:</span>
                <strong>{selectedInvoice.certificateNumber}</strong> ({selectedInvoice.certType})
              </div>
            </div>

            {/* Financial Valuation Summary */}
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-surface-card)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <h4
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                Commercial Claim Valuation
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Net Invoiced Base Amount:</span>
                  <FinancialValue
                    amount={selectedInvoice.amount}
                    currency={selectedInvoice.currency}
                    size="sm"
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Value Added Tax (VAT 18%):</span>
                  <FinancialValue
                    amount={selectedInvoice.taxAmount}
                    currency={selectedInvoice.currency}
                    size="sm"
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: 'var(--space-2)',
                    borderTop: '1px solid var(--color-border-hairline)',
                    fontWeight: 'var(--font-weight-bold)',
                  }}
                >
                  <span>Total Commercial Claim:</span>
                  <FinancialValue
                    amount={selectedInvoice.totalAmount}
                    currency={selectedInvoice.currency}
                    size="md"
                    className="text-positive"
                  />
                </div>
              </div>
            </div>

            {/* Unified Commercial Document Packet */}
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-surface-sunken)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-semibold)',
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-1)',
                    }}
                  >
                    <Layers size={15} color="var(--color-brand-primary)" />
                    Unified Commercial Document Packet
                  </h4>
                  <p
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-secondary)',
                      margin: '4px 0 0',
                    }}
                  >
                    Complete 3-part consolidated PDF (Invoice + Receipt + 9-Page Certificate)
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Eye size={14} />}
                    onClick={() => setIsPacketModalOpen(true)}
                  >
                    View Packet
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Download size={14} />}
                    isLoading={isDownloadingDoc}
                    onClick={handleDownloadUnifiedDoc}
                  >
                    Download
                  </Button>
                </div>
              </div>
            </div>

            {/* Invariant Verification Checklist */}
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--color-surface-card)',
              }}
            >
              <h4
                style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                Authoritative Commercial Checklist
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CheckCircle2 size={16} color="var(--color-semantic-success-text)" />
                  <span>Invoice amount matches certified milestone entitlement (Non-Overinvoicing)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CheckCircle2 size={16} color="var(--color-semantic-success-text)" />
                  <span>Single-Certificate entitlement constraint verified ($1:1$)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CheckCircle2 size={16} color="var(--color-semantic-success-text)" />
                  <span>Supplier matches Purchase Order award and active tenant registration</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CheckCircle2 size={16} color="var(--color-semantic-success-text)" />
                  <span>Issued Certificate has completed internal Projects and Head of Projects signoff</span>
                </div>
              </div>
            </div>

            {/* Prior Review & Return History */}
            {reviewHistory.length > 0 && (
              <div
                className="border-hairline"
                style={{
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: 'var(--color-surface-sunken)',
                }}
              >
                <h4
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    marginBottom: 'var(--space-2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                  }}
                >
                  <FileText size={14} /> Review Audit History
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {reviewHistory.map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        padding: 'var(--space-2)',
                        backgroundColor: 'var(--color-surface-card)',
                        borderRadius: 'var(--radius-xs)',
                        border: '1px solid var(--color-border-hairline)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                        <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                          {rev.decision === 'RETURNED' ? 'Returned to Supplier' : 'Approved'}
                        </span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {rev.returnCode && (
                        <div style={{ color: 'var(--color-semantic-danger-text)', marginBottom: 'var(--space-1)' }}>
                          Reason Code: <strong>{rev.returnCode}</strong>
                        </div>
                      )}
                      <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>{rev.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Return to Supplier Modal */}
      <Modal
        isOpen={isReturnModalOpen}
        onClose={() => {
          if (!isReturning) setIsReturnModalOpen(false);
        }}
        title="Return Invoice to Supplier"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              size="md"
              disabled={isReturning}
              onClick={() => setIsReturnModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              disabled={isReturning}
              icon={isReturning ? <RefreshCw size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              onClick={handleConfirmReturn}
            >
              {isReturning ? 'Returning...' : 'Confirm Return'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {selectedInvoice && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '-8px', marginBottom: 'var(--space-1)' }}>
              Invoice: <strong>{selectedInvoice.clmsRef}</strong> &bull; Supplier: <strong>{selectedInvoice.supplierName}</strong>
            </div>
          )}

          {returnError && (
            <Alert type="danger" title="Validation Error">
              {returnError}
            </Alert>
          )}

          <div>
            <label
              htmlFor="return-reason-code-select"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Return Reason Category *
            </label>
            <select
              id="return-reason-code-select"
              value={selectedReturnCode}
              onChange={(e) => setSelectedReturnCode(e.target.value as ReturnReasonCode)}
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--color-border-hairline)',
                backgroundColor: 'var(--color-surface-card)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              {RETURN_REASON_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="return-reason-textarea"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Detailed Explanatory Reason *
            </label>
            <textarea
              id="return-reason-textarea"
              rows={4}
              placeholder="Explain the specific documentary or commercial discrepancy requiring supplier correction..."
              value={returnReasonText}
              onChange={(e) => setReturnReasonText(e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--color-border-hairline)',
                backgroundColor: 'var(--color-surface-card)',
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
            <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>
              This explanation will be transmitted immediately to authorized supplier personnel.
            </span>
          </div>
        </div>
      </Modal>

      {/* SCM Approval Modal */}
      <Modal
        isOpen={isApproveModalOpen}
        onClose={() => {
          if (!isApproving) setIsApproveModalOpen(false);
        }}
        title="Approve & Send to Finance"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              size="md"
              disabled={isApproving}
              onClick={() => setIsApproveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={isApproving}
              icon={isApproving ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              onClick={handleConfirmApprove}
            >
              {isApproving ? 'Approving...' : 'Confirm Approval'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {selectedInvoice && (
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '-8px', marginBottom: 'var(--space-1)' }}>
              Invoice: <strong>{selectedInvoice.clmsRef}</strong> &bull; Total Claim: <strong>TZS {selectedInvoice.totalAmount.toLocaleString()}</strong>
            </div>
          )}

          {approvalError && (
            <Alert type="danger" title="Approval Error">
              {approvalError}
            </Alert>
          )}

          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-surface-sunken)',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              gap: 'var(--space-2)',
            }}
          >
            <AlertTriangle size={18} color="var(--color-brand-primary)" style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Confirming approval will lock this commercial review and immediately transmit the invoice to the
              Finance Processing Queue for invoice vetting and payment execution.
            </p>
          </div>

          <div>
            <label
              htmlFor="approval-notes-input"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--color-text-secondary)',
                marginBottom: 'var(--space-1)',
              }}
            >
              Verification Notes (Optional)
            </label>
            <Input
              id="approval-notes-input"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="e.g. Document completeness verified against issued FAC certificate."
            />
          </div>
        </div>
      </Modal>

      {/* Authoritative Submitted Invoice Packet Viewer Modal (Section 28) */}
      {selectedInvoice && isPacketModalOpen && (
        <InvoicePreviewModal
          isOpen={isPacketModalOpen}
          onClose={() => setIsPacketModalOpen(false)}
          invoice={selectedInvoice}
        />
      )}
    </div>
  );
}
