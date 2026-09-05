import { Plus } from 'lucide-react';
import { PageHeader, DataTable, Column, FinancialValue, StatusBadge, Button } from '@/design-system';

interface CertificateItem {
  id: string;
  certificateNumber: string;
  certType: 'FAC' | 'PAC' | 'DPC';
  poNumber: string;
  siteCount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export function CertificatesPage() {
  const certificates: CertificateItem[] = [];

  const columns: Column<CertificateItem>[] = [
    { header: 'Certificate No', accessorKey: 'certificateNumber', width: '160px' },
    { header: 'Type', accessorKey: 'certType', width: '90px' },
    { header: 'Purchase Order', accessorKey: 'poNumber', width: '140px' },
    { header: 'Sites', accessorKey: 'siteCount', align: 'center', width: '90px' },
    {
      header: 'Total Value (TZS)',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.totalAmount} currency="TZS" size="sm" />,
    },
    {
      header: 'Status',
      align: 'center',
      width: '140px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    { header: 'Created At', accessorKey: 'createdAt', width: '130px' },
  ];

  return (
    <div className="clms-certificates-page">
      <PageHeader
        title="Site Acceptance Certificates"
        description="Author, review, and issue FAC, PAC, and DPC milestone certificates."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Certificates' }]}
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            onClick={() => alert('Certificate authoring workflow will be enabled in Super Prompt 3.')}
          >
            Create Certification
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={certificates}
        emptyTitle="No certificates yet"
        emptyDescription="Create a certification from an approved Purchase Order to initiate the site acceptance and signoff workflow."
      />
    </div>
  );
}
