import { useState, useEffect } from 'react';
import { Plus, X, FileText, FileSpreadsheet } from 'lucide-react';
import { PageHeader, Button, DataTable, Column, StatusBadge, FinancialValue } from '@/design-system';
import { commercialPackageRepository } from '@/infrastructure/repositories/CommercialPackageRepository';
import { CommercialPackageRecord } from '@/domain/commercial/types';
import { ImportPackageWizard } from './ImportPackageWizard';
import { CommercialPackageDetailModal } from './CommercialPackageDetailModal';

export function CommercialPackagesPage() {
  const [packages, setPackages] = useState<CommercialPackageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [modalTab, setModalTab] = useState<'BOQ' | 'PO' | 'DOCS'>('BOQ');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

  const handleOpenDetails = (pkgId: string, tab: 'BOQ' | 'PO' | 'DOCS' = 'BOQ') => {
    setSelectedPackageId(pkgId);
    setModalTab(tab);
    setIsDetailModalOpen(true);
  };

  const columns: Column<CommercialPackageRecord>[] = [
    {
      header: 'Package Ref',
      accessorKey: 'packageRef',
      width: '150px',
      cell: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDetails(row.id, 'BOQ');
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--color-brand-primary)',
            fontWeight: 'var(--font-weight-semibold)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            textDecoration: 'none',
          }}
          title="View BOQ Schedule & Details"
        >
          <FileSpreadsheet size={14} />
          <span>{row.packageRef}</span>
        </button>
      ),
    },
    { header: 'Project', accessorKey: 'projectName' },
    {
      header: 'Purchase Order',
      accessorKey: 'poNumber',
      width: '160px',
      cell: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenDetails(row.id, 'PO');
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--color-brand-primary)',
            fontWeight: 'var(--font-weight-semibold)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
            textDecoration: 'none',
          }}
          title="View Stored Purchase Order Document"
        >
          <FileText size={14} />
          <span>{row.poNumber}</span>
        </button>
      ),
    },
    { header: 'Supplier', accessorKey: 'supplierName' },
    {
      header: 'Authorized Amount',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.authorizedAmount || 0} currency={row.currency || 'TZS'} size="sm" />,
    },
    {
      header: 'Status',
      align: 'center',
      width: '120px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Ingested Date',
      width: '120px',
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      header: 'Actions',
      align: 'center',
      width: '210px',
      cell: (row) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<FileText size={12} />}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDetails(row.id, 'PO');
            }}
            title="View Purchase Order PDF"
          >
            View PO
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<FileSpreadsheet size={12} />}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenDetails(row.id, 'BOQ');
            }}
            title="View BOQ Schedule & Sites"
          >
            View BOQ
          </Button>
        </div>
      ),
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
        onRowClick={(row) => handleOpenDetails(row.id, 'BOQ')}
        emptyTitle="No commercial packages yet"
        emptyDescription="Import your first approved Bill of Quantities (BOQ) and Purchase Order (PO) to establish digital commercial commitments."
      />

      {selectedPackageId && isDetailModalOpen && (
        <CommercialPackageDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedPackageId(null);
          }}
          packageId={selectedPackageId}
          initialTab={modalTab}
        />
      )}
    </div>
  );
}

