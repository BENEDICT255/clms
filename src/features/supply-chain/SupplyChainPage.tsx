import { PageHeader, DataTable, Column, FinancialValue, StatusBadge, Button } from '@/design-system';

interface SCMReviewItem {
  id: string;
  clmsRef: string;
  supplierName: string;
  poNumber: string;
  amount: number;
  status: string;
  submittedAt: string;
}

export function SupplyChainPage() {
  const pendingInvoices: SCMReviewItem[] = [];

  const columns: Column<SCMReviewItem>[] = [
    { header: 'CLMS Ref', accessorKey: 'clmsRef', width: '140px' },
    { header: 'Supplier', accessorKey: 'supplierName' },
    { header: 'Purchase Order', accessorKey: 'poNumber', width: '150px' },
    {
      header: 'Claim Value (TZS)',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.amount} currency="TZS" size="sm" />,
    },
    {
      header: 'Status',
      align: 'center',
      width: '130px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    { header: 'Submitted At', accessorKey: 'submittedAt', width: '130px' },
    {
      header: 'Review',
      align: 'center',
      width: '100px',
      cell: () => (
        <Button variant="secondary" size="sm" onClick={() => alert('SCM review workflow will be enabled in Super Prompt 4.')}>
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div className="clms-scm-page">
      <PageHeader
        title="Supply Chain Review Queue"
        description="Verify supplier invoices against certificates, PO commitments, and supporting documentation."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Supply Chain Review' }]}
      />

      <DataTable
        columns={columns}
        data={pendingInvoices}
        emptyTitle="No invoices are awaiting review"
        emptyDescription="Invoices submitted by suppliers will appear in this queue for commercial verification and approval."
      />
    </div>
  );
}
