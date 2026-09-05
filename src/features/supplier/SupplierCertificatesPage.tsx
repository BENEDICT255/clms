import { PageHeader, DataTable, Column, FinancialValue, Button } from '@/design-system';

interface SupplierCertRecord {
  id: string;
  certificateNumber: string;
  certType: string;
  poNumber: string;
  totalAmount: number;
  issuedDate: string;
}

export function SupplierCertificatesPage() {
  const certificates: SupplierCertRecord[] = [];

  const columns: Column<SupplierCertRecord>[] = [
    { header: 'Certificate No', accessorKey: 'certificateNumber', width: '160px' },
    { header: 'Type', accessorKey: 'certType', width: '90px' },
    { header: 'PO Reference', accessorKey: 'poNumber', width: '140px' },
    {
      header: 'Entitlement (TZS)',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.totalAmount} currency="TZS" size="sm" />,
    },
    { header: 'Issued Date', accessorKey: 'issuedDate', width: '130px' },
    {
      header: 'Action',
      align: 'center',
      width: '130px',
      cell: () => (
        <Button variant="secondary" size="sm" onClick={() => alert('Invoice creation will be enabled in Super Prompt 3.')}>
          Create Invoice
        </Button>
      ),
    },
  ];

  return (
    <div className="clms-supplier-certs-page">
      <PageHeader
        title="My Issued Certificates"
        description="Issued commercial certificates ready for supplier invoicing."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'My Certificates' }]}
      />

      <DataTable
        columns={columns}
        data={certificates}
        emptyTitle="No certificates are currently available"
        emptyDescription="Issued acceptance certificates published by the Projects team will appear here for invoice creation."
      />
    </div>
  );
}
