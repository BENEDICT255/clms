import { Plus } from 'lucide-react';
import { PageHeader, Button, DataTable, Column, StatusBadge } from '@/design-system';

interface CommercialPackageItem {
  id: string;
  packageRef: string;
  projectName: string;
  poNumber: string;
  supplierName: string;
  status: string;
  createdAt: string;
}

export function CommercialPackagesPage() {
  const packages: CommercialPackageItem[] = [];

  const columns: Column<CommercialPackageItem>[] = [
    { header: 'Package Ref', accessorKey: 'packageRef', width: '140px' },
    { header: 'Project', accessorKey: 'projectName' },
    { header: 'PO Number', accessorKey: 'poNumber', width: '150px' },
    { header: 'Supplier', accessorKey: 'supplierName' },
    {
      header: 'Status',
      align: 'center',
      width: '130px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    { header: 'Ingested Date', accessorKey: 'createdAt', width: '130px' },
  ];

  return (
    <div className="clms-packages-page">
      <PageHeader
        title="Commercial Packages"
        description="Ingestion and management of paired approved BOQ spreadsheets and Purchase Orders."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Commercial Packages' }]}
        actions={
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            onClick={() => alert('Commercial Package Ingestion workflow will be enabled in Super Prompt 3.')}
          >
            Import Commercial Package
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={packages}
        emptyTitle="No commercial packages yet"
        emptyDescription="Import your first approved Bill of Quantities (BOQ) and Purchase Order (PO) to establish digital commercial commitments."
      />
    </div>
  );
}
