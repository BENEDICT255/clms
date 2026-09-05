import { PageHeader, DataTable, Column, FinancialValue, StatusBadge } from '@/design-system';

interface InvoiceRecord {
  id: string;
  clmsRef: string;
  supplierInvoiceNo: string;
  certificateRef: string;
  amount: number;
  status: string;
  submittedDate: string;
}

export function InvoicesPage() {
  const invoices: InvoiceRecord[] = [];

  const columns: Column<InvoiceRecord>[] = [
    { header: 'CLMS Ref', accessorKey: 'clmsRef', width: '140px' },
    { header: 'Supplier Invoice No', accessorKey: 'supplierInvoiceNo', width: '160px' },
    { header: 'Certificate', accessorKey: 'certificateRef', width: '150px' },
    {
      header: 'Invoice Amount (TZS)',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.amount} currency="TZS" size="sm" />,
    },
    {
      header: 'Review Status',
      align: 'center',
      width: '140px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    { header: 'Submission Date', accessorKey: 'submittedDate', width: '130px' },
  ];

  return (
    <div className="clms-invoices-page">
      <PageHeader
        title="Commercial Invoices"
        description="Monitor submitted supplier claims and tracking through Supply Chain and Finance."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Invoices' }]}
      />

      <DataTable
        columns={columns}
        data={invoices}
        emptyTitle="No invoices found"
        emptyDescription="Invoices raised against issued certificates will appear here alongside review and payment statuses."
      />
    </div>
  );
}
