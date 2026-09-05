// ==============================================================================
// CLMS Invoices Page (Enterprise Super Prompt 4)
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, DataTable, Column, FinancialValue, StatusBadge, Button, Alert } from '@/design-system';
import {
  invoiceRepository,
  InvoiceRecord,
} from '@/infrastructure/repositories/InvoiceRepository';
import { useAuth } from '@/app/providers/AuthContext';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { ResubmitInvoiceModal } from './ResubmitInvoiceModal';

export function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resubmitTarget, setResubmitTarget] = useState<InvoiceRecord | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

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

  const columns: Column<InvoiceRecord>[] = [
    { header: 'CLMS Ref', accessorKey: 'clmsRef', width: '140px' },
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
      header: 'Action',
      align: 'center',
      width: '150px',
      cell: (row) => {
        if (row.status === 'RETURNED' || row.status === 'SC_RETURNED') {
          return (
            <Button
              variant="primary"
              size="sm"
              icon={<RotateCcw size={13} />}
              onClick={() => handleOpenResubmit(row)}
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
        description="Monitor submitted supplier claims and lifecycle tracking through Supply Chain verification and Finance settlement."
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
        <Alert type="success" title="Success" style={{ marginBottom: 'var(--space-4)' }} onClose={() => setFeedback(null)}>
          {feedback}
        </Alert>
      )}

      <DataTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        emptyTitle="No invoices found"
        emptyDescription="Invoices raised against issued certificates will appear here alongside review and payment statuses."
      />

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
