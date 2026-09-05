import { PageHeader, DataTable, Column, FinancialValue, StatusBadge, Button } from '@/design-system';

interface FinanceQueueItem {
  id: string;
  clmsRef: string;
  supplierName: string;
  poNumber: string;
  payableAmount: number;
  outstandingBalance: number;
  dueDate: string;
  status: string;
}

export function FinancePage() {
  const financeQueue: FinanceQueueItem[] = [];

  const columns: Column<FinanceQueueItem>[] = [
    { header: 'CLMS Ref', accessorKey: 'clmsRef', width: '140px' },
    { header: 'Supplier', accessorKey: 'supplierName' },
    { header: 'PO Number', accessorKey: 'poNumber', width: '150px' },
    {
      header: 'Payable (TZS)',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.payableAmount} currency="TZS" size="sm" />,
    },
    {
      header: 'Outstanding (TZS)',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.outstandingBalance} currency="TZS" size="sm" />,
    },
    { header: 'Due Date', accessorKey: 'dueDate', width: '120px' },
    {
      header: 'Status',
      align: 'center',
      width: '140px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Payment',
      align: 'center',
      width: '120px',
      cell: () => (
        <Button variant="secondary" size="sm" onClick={() => alert('Payment posting ledger will be enabled in Super Prompt 4.')}>
          Post Payment
        </Button>
      ),
    },
  ];

  return (
    <div className="clms-finance-page">
      <PageHeader
        title="Finance & Payment Processing"
        description="Process Supply Chain-approved invoices, post payment transactions, and monitor aging."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Finance & Payments' }]}
      />

      <DataTable
        columns={columns}
        data={financeQueue}
        emptyTitle="No invoices are awaiting Finance processing"
        emptyDescription="Invoices approved by the Supply Chain team will automatically arrive here for accounting verification and settlement."
      />
    </div>
  );
}
