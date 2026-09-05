import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { PageHeader, Button, DataTable, Column, StatusBadge, FinancialValue } from '@/design-system';
import { commercialPackageRepository } from '@/infrastructure/repositories/CommercialPackageRepository';
import { CommercialPackageRecord } from '@/domain/commercial/types';
import { ImportPackageWizard } from './ImportPackageWizard';

export function CommercialPackagesPage() {
  const [packages, setPackages] = useState<CommercialPackageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const loadPackages = async () => {
    setIsLoading(true);
    try {
      const items = await commercialPackageRepository.listPackages();
      setPackages(items);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const columns: Column<CommercialPackageRecord>[] = [
    { header: 'Package Ref', accessorKey: 'packageRef', width: '140px' },
    { header: 'Project', accessorKey: 'projectName' },
    { header: 'Purchase Order', accessorKey: 'poNumber', width: '150px' },
    { header: 'Supplier', accessorKey: 'supplierName' },
    {
      header: 'Authorized Amount',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.authorizedAmount || 0} currency={row.currency || 'TZS'} size="sm" />,
    },
    {
      header: 'Status',
      align: 'center',
      width: '130px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Ingested Date',
      width: '130px',
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="clms-packages-page">
      <PageHeader
        title="Commercial Packages"
        description="Ingestion and management of paired approved BOQ spreadsheets and Purchase Orders."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Commercial Packages' }]}
        actions={
          <Button
            variant={isWizardOpen ? 'secondary' : 'primary'}
            size="md"
            icon={isWizardOpen ? <X size={16} /> : <Plus size={16} />}
            onClick={() => setIsWizardOpen(!isWizardOpen)}
          >
            {isWizardOpen ? 'Close Ingestion' : 'Import Commercial Package'}
          </Button>
        }
      />

      {isWizardOpen && (
        <ImportPackageWizard
          onSuccess={(_id) => {
            setIsWizardOpen(false);
            loadPackages();
          }}
          onCancel={() => setIsWizardOpen(false)}
        />
      )}

      <DataTable
        columns={columns}
        data={packages}
        isLoading={isLoading}
        emptyTitle="No commercial packages yet"
        emptyDescription="Import your first approved Bill of Quantities (BOQ) and Purchase Order (PO) to establish digital commercial commitments."
      />
    </div>
  );
}

