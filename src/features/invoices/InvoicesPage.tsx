// ==============================================================================
// CLMS Invoices Page
// ==============================================================================
// Lists submitted supplier claims and provides on-screen viewing and direct
// download of the 3-part unified commercial invoice packet (Invoice + Receipt + 9-Page Certificate).
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, DataTable, Column, FinancialValue, StatusBadge, Button, Alert } from '@/design-system';
import {
  invoiceRepository,
  InvoiceRecord,
} from '@/infrastructure/repositories/InvoiceRepository';
import { certificateRepository } from '@/infrastructure/repositories/CertificateRepository';
import { CertificatePdfService } from '@/features/certificates/CertificatePdfService';
import { useAuth } from '@/app/providers/AuthContext';
import { RefreshCw, RotateCcw, Download, Eye } from 'lucide-react';
import { ResubmitInvoiceModal } from './ResubmitInvoiceModal';
import { InvoicePreviewModal } from './InvoicePreviewModal';

export function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resubmitTarget, setResubmitTarget] = useState<InvoiceRecord | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRecord | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const handleDownloadPacket = async (inv: InvoiceRecord) => {
    setDownloadingId(inv.id);
    try {
      const doc = await invoiceRepository.getUnifiedInvoiceDocument(inv.id);
      if (doc?.url) {
        window.open(doc.url, '_blank');
        setFeedback(`Opening complete commercial packet: ${doc.fileName}`);
      } else {
        // Fast dynamic fallback generation if not stored in cloud vault
        const cert = await certificateRepository.getCertificateById(inv.certificateId);
        if (cert) {
          const poSites = await certificateRepository.getPoSites(cert.poId);
          const pdfBytes = await CertificatePdfService.generateCertificatePdf({
            certificate: cert,
            poSites,
            reviewerName: user?.fullName || 'Benedict Bisama',
          });
          CertificatePdfService.triggerDownload(pdfBytes, `${inv.clmsRef}_Commercial_Packet.pdf`);
          setFeedback(`Downloaded 9-page commercial certificate packet for ${inv.clmsRef}`);
        } else {
          setFeedback(`Document not yet available for ${inv.clmsRef}`);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed';
      setFeedback(`Failed to download packet: ${msg}`);
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
    { header: 'Supplier', accessorKey: 'supplierName' },
    {
      header: 'Invoice Amount',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.amount} currency={row.currency} size="sm" />,
    },
    {
      header: 'Tax (VAT)',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.taxAmount} currency={row.currency} size="sm" />,
    },
    {
      header: 'Total Payable',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.totalAmount} currency={row.currency} size="sm" className="font-semibold" />,
    },
    {
      header: 'Review Status',
      align: 'center',
      width: '140px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Submission Date',
      accessorKey: 'submittedAt',
      width: '130px',
      cell: (row) => (row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : 'Draft'),
    },
    {
      header: 'Commercial Packet',
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
            title="Download complete 3-part commercial invoice packet (PDF)"
          >
            Download
          </Button>
        </div>
      ),
    },
    {
      header: 'Action',
      align: 'center',
      width: '110px',
      cell: (row) => {
        if (row.status === 'RETURNED' || row.status === 'SC_RETURNED') {
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
        return <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-xs)' }}>—</span>;
      },
    },
  ];

  return (
    <div className="clms-invoices-page">
      <PageHeader
        title="Commercial Invoices"
        description="Monitor submitted supplier claims, view full commercial packets on screen, and download unified documents."
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
        <Alert type="success" title="Notice" style={{ marginBottom: 'var(--space-4)' }} onClose={() => setFeedback(null)}>
          {feedback}
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

      {/* Supplier Correction & Resubmission Modal */}
      {resubmitTarget && (
        <ResubmitInvoiceModal
          isOpen={Boolean(resubmitTarget)}
          onClose={() => setResubmitTarget(null)}
          invoice={resubmitTarget}
          onSuccess={() => {
            setFeedback(`Invoice ${resubmitTarget.clmsRef} resubmitted to Supply Chain review queue.`);
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
}
