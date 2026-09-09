// ==============================================================================
// CLMS Commercial Invoices Page
// ==============================================================================
// Governed by Stabilization Sections 16, 17, 18, 20, 29, 30:
// - State-aware actions:
//     * DRAFT: Continue Draft, Preview Packet, Delete Draft
//     * RETURNED: Correct & Resubmit, Preview Previous Submission
//     * SUBMITTED: View Submitted Packet, Download
//     * SC_APPROVED / FINANCE / SETTLED: View Packet, Download
// - Single-flight IDM-independent Blob downloads via DownloadService
// - Zero hardcoded reviewer/commercial data
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, DataTable, Column, FinancialValue, StatusBadge, Button, Alert } from '@/design-system';
import {
  invoiceRepository,
  InvoiceRecord,
} from '@/infrastructure/repositories/InvoiceRepository';
import { certificateRepository, CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';
import { CertificatePacketService } from '@/application/services/CertificatePacketService';
import { downloadService } from '@/application/services/DownloadService';
import { documentStorageService } from '@/infrastructure/storage/DocumentStorageService';
import { useAuth } from '@/app/providers/AuthContext';
import { RefreshCw, RotateCcw, Download, Eye, Play, Trash2, CheckCircle2 } from 'lucide-react';
import { ResubmitInvoiceModal } from './ResubmitInvoiceModal';
import { InvoicePreviewModal } from './InvoicePreviewModal';
import { CreateInvoiceModal } from './CreateInvoiceModal';

export function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [resubmitTarget, setResubmitTarget] = useState<InvoiceRecord | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRecord | null>(null);
  const [continueDraftInvoice, setContinueDraftInvoice] = useState<InvoiceRecord | null>(null);
  const [continueCert, setContinueCert] = useState<CertificateRecord | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await invoiceRepository.listInvoices({
        supplierId: user?.supplierId ?? undefined,
      });
      setInvoices(data);
    } catch (err: unknown) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.supplierId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleOpenResubmit = (inv: InvoiceRecord) => {
    setResubmitTarget(inv);
  };

  const handleOpenPreview = (inv: InvoiceRecord) => {
    setPreviewInvoice(inv);
  };

  const handleContinueDraft = async (inv: InvoiceRecord) => {
    try {
      const cert = await certificateRepository.getCertificateById(inv.certificateId);
      if (cert) {
        setContinueCert(cert);
        setContinueDraftInvoice(inv);
      } else {
        setFeedback({ type: 'danger', text: 'Associated certificate could not be loaded.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading draft';
      setFeedback({ type: 'danger', text: msg });
    }
  };

  const handleDeleteDraft = async (inv: InvoiceRecord) => {
    if (!window.confirm(`Are you sure you want to discard draft invoice ${inv.clmsRef}? This will permanently remove attached draft documents.`)) {
      return;
    }

    setDeletingId(inv.id);
    try {
      const res = await invoiceRepository.deleteDraft(inv.id);
      if (res.success) {
        setFeedback({ type: 'success', text: `Draft invoice ${inv.clmsRef} discarded successfully.` });
        await fetchInvoices();
      } else {
        setFeedback({ type: 'danger', text: res.error || 'Failed to delete draft invoice.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting draft';
      setFeedback({ type: 'danger', text: msg });
    } finally {
      setDeletingId(null);
    }
  };

  /**
   * IDM-independent Blob download using DownloadService (Section 17 & 18).
   */
  const handleDownloadPacket = async (inv: InvoiceRecord) => {
    setDownloadingId(inv.id);
    try {
      const doc = await invoiceRepository.getUnifiedInvoiceDocument(inv.id);
      if (doc) {
        const blob = await documentStorageService.downloadBlob(doc.storagePath);
        downloadService.downloadBlob(blob, `${inv.clmsRef}_Commercial_Packet.pdf`);
        setFeedback({ type: 'success', text: `Downloaded complete commercial packet for ${inv.clmsRef}` });
      } else {
        // Dynamic compilation from linked certificate & PO
        const cert = await certificateRepository.getCertificateById(inv.certificateId);
        if (cert) {
          const poSites = await certificateRepository.getPoSites(cert.poId);
          const certResult = await CertificatePacketService.generateCertificatePacket({
            certificate: cert,
            poSites,
            approverName: user?.fullName,
          });
          const blob = new Blob([certResult.pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
          downloadService.downloadBlob(blob, `${inv.clmsRef}_Certificate_Packet.pdf`);
          setFeedback({ type: 'success', text: `Downloaded certificate packet for ${inv.clmsRef}` });
        } else {
          setFeedback({ type: 'danger', text: `Document not yet available for ${inv.clmsRef}` });
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      setFeedback({ type: 'danger', text: `Failed to download packet: ${msg}` });
    } finally {
      setDownloadingId(null);
    }
  };

  const columns: Column<InvoiceRecord>[] = [
    {
      header: 'CLMS Ref',
      accessorKey: 'clmsRef',
      width: '140px',
      cell: (row) => (
        <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-brand-primary)' }}>
          {row.clmsRef}
        </span>
      ),
    },
    { header: 'Supplier Invoice No', accessorKey: 'supplierInvoiceNo', width: '160px' },
    { header: 'Certificate', accessorKey: 'certificateNumber', width: '150px' },
    { header: 'Purchase Order', accessorKey: 'poNumber', width: '140px' },
    {
      header: 'Net Amount',
      accessorKey: 'amount',
      align: 'right',
      width: '130px',
      cell: (row) => <FinancialValue amount={row.amount} currency={row.currency} size="sm" />,
    },
    {
      header: 'Total Claim',
      accessorKey: 'totalAmount',
      align: 'right',
      width: '140px',
      cell: (row) => (
        <FinancialValue
          amount={row.totalAmount}
          currency={row.currency}
          size="sm"
          className="font-semibold text-positive"
        />
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      align: 'center',
      width: '130px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Documents',
      align: 'center',
      width: '170px',
      cell: (row) => (
        <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Eye size={13} />}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenPreview(row);
            }}
            title="View complete multi-page invoice packet on screen"
          >
            View
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={13} />}
            isLoading={downloadingId === row.id}
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadPacket(row);
            }}
            title="Download complete commercial packet (PDF)"
          >
            Download
          </Button>
        </div>
      ),
    },
    {
      header: 'Action',
      align: 'center',
      width: '150px',
      cell: (row) => {
        // DRAFT: Continue, Delete Draft
        if (row.status === 'DRAFT') {
          return (
            <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'center' }}>
              <Button
                variant="primary"
                size="sm"
                icon={<Play size={12} />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleContinueDraft(row);
                }}
                title="Continue editing draft invoice"
              >
                Continue
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                icon={<Trash2 size={12} color="var(--color-semantic-error-text)" />}
                isLoading={deletingId === row.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDraft(row);
                }}
                title="Discard unsubmitted draft invoice"
              />
            </div>
          );
        }

        // RETURNED: Correct / Resubmit
        if (row.status === 'RETURNED' || (row.status as string) === 'SC_RETURNED') {
          return (
            <Button
              variant="primary"
              size="sm"
              icon={<RotateCcw size={13} />}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenResubmit(row);
              }}
            >
              Resubmit
            </Button>
          );
        }

        // SETTLED: Settled indication
        if (row.status === 'SETTLED') {
          return (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-semantic-success-text)', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
              <CheckCircle2 size={13} /> Settled
            </span>
          );
        }

        return <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>—</span>;
      },
    },
  ];

  return (
    <div className="clms-invoices-page">
      <PageHeader
        title="Commercial Invoices"
        description="Manage supplier invoice claims, view continuous commercial packets on screen, and monitor lifecycle progression."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Invoices' }]}
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
          type={feedback.type}
          title={feedback.type === 'success' ? 'Notice' : 'Error'}
          style={{ marginBottom: 'var(--space-4)' }}
          onClose={() => setFeedback(null)}
        >
          {feedback.text}
        </Alert>
      )}

      <div style={{ cursor: 'pointer' }}>
        <DataTable
          columns={columns}
          data={invoices}
          isLoading={isLoading}
          onRowClick={handleOpenPreview}
          emptyTitle="No invoices found"
          emptyDescription="Invoices raised against issued certificates will appear here alongside review and payment statuses."
        />
      </div>

      {/* Full On-Screen Commercial Invoice Document Viewer Modal */}
      {previewInvoice && (
        <InvoicePreviewModal
          isOpen={Boolean(previewInvoice)}
          onClose={() => setPreviewInvoice(null)}
          invoice={previewInvoice}
        />
      )}

      {/* Supplier Correction & Resubmission Modal (Section 32) */}
      {resubmitTarget && (
        <ResubmitInvoiceModal
          isOpen={Boolean(resubmitTarget)}
          onClose={() => setResubmitTarget(null)}
          invoice={resubmitTarget}
          onSuccess={() => {
            setFeedback({ type: 'success', text: `Invoice ${resubmitTarget.clmsRef} resubmitted to Supply Chain review queue.` });
            fetchInvoices();
          }}
        />
      )}

      {/* Continue Draft Modal (Section 19, 20, 29) */}
      {continueDraftInvoice && continueCert && (
        <CreateInvoiceModal
          isOpen={Boolean(continueDraftInvoice)}
          onClose={() => {
            setContinueDraftInvoice(null);
            setContinueCert(null);
          }}
          certificate={continueCert}
          existingDraftId={continueDraftInvoice.id}
          onSuccess={() => {
            setFeedback({ type: 'success', text: 'Invoice submitted successfully.' });
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
}
