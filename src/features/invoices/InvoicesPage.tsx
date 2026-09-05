// ==============================================================================
// CLMS Invoices Page
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, DataTable, Column, FinancialValue, StatusBadge, Button } from '@/design-system';
import {
  invoiceRepository,
  InvoiceRecord,
} from '@/infrastructure/repositories/InvoiceRepository';
import { useAuth } from '@/app/providers/AuthContext';
import { RefreshCw } from 'lucide-react';

export function InvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await invoiceRepository.listInvoices({
        supplierId: user?.supplierId ?? undefined,
      });
      setInvoices(data);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.supplierId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

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
  ];

  return (
    <div className="clms-invoices-page">
      <PageHeader
        title="Commercial Invoices"
        description="Monitor submitted supplier claims and lifecycle tracking through Supply Chain and Finance."
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

      <DataTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        emptyTitle="No invoices found"
        emptyDescription="Invoices raised against issued certificates will appear here alongside review and payment statuses."
      />
    </div>
  );
}
