// ==============================================================================
// CLMS Commercial Explorer Page
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, RefreshCw, GitCommit } from 'lucide-react';
import { PageHeader, Input, DataTable, Column, FinancialValue, StatusBadge, Button } from '@/design-system';
import {
  commercialExplorerRepository,
  CommercialExplorerRecord,
} from '@/infrastructure/repositories/CommercialExplorerRepository';
import { SiteDrawer } from './SiteDrawer';
import { CommercialFlow } from './CommercialFlow';
import { CreateCertificationWizard } from '../certificates/CreateCertificationWizard';
import { useAuth } from '@/app/providers/AuthContext';

export function CommercialExplorerPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [records, setRecords] = useState<CommercialExplorerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<CommercialExplorerRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCertWizardOpen, setIsCertWizardOpen] = useState(false);
  const [certWizardInitialSite, setCertWizardInitialSite] = useState<CommercialExplorerRecord | null>(null);
  const [showCommercialFlow, setShowCommercialFlow] = useState(false);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await commercialExplorerRepository.searchRecords({
        query: searchQuery,
        region: selectedRegion,
        supplierId: user?.supplierId ?? undefined,
      });
      setRecords(data);
    } catch (err) {
      console.error('Failed to load commercial explorer records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedRegion, user?.supplierId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecords();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchRecords]);

  const handleRowClick = (record: CommercialExplorerRecord) => {
    setSelectedSite(record);
    setIsDrawerOpen(true);
  };

  const handleCreateCertification = (site: CommercialExplorerRecord) => {
    setIsDrawerOpen(false);
    setCertWizardInitialSite(site);
    setIsCertWizardOpen(true);
  };

  const columns: Column<CommercialExplorerRecord>[] = [
    { header: 'Site ID', accessorKey: 'siteIdExt', width: '130px' },
    { header: 'Site Name', accessorKey: 'siteName' },
    { header: 'Region', accessorKey: 'region', width: '120px' },
    { header: 'Supplier', accessorKey: 'supplierName' },
    { header: 'PO Number', accessorKey: 'poNumber', width: '140px' },
    {
      header: 'Authorized (TZS)',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.authorizedValue} currency={row.currency} size="sm" />,
    },
    {
      header: 'Certified (TZS)',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.cumulativeCertified} currency={row.currency} size="sm" />,
    },
    {
      header: 'Remaining (TZS)',
      align: 'right',
      cell: (row) => (
        <FinancialValue
          amount={row.remainingCertifiable}
          currency={row.currency}
          size="sm"
          className={row.remainingCertifiable > 0 ? 'text-positive' : ''}
        />
      ),
    },
    {
      header: 'Status',
      align: 'center',
      width: '140px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
  ];

  return (
    <div className="clms-explorer-page">
      <PageHeader
        title="Commercial Explorer"
        description="Global discovery engine across Sites, Purchase Orders, Suppliers, and lifecycle positions."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Commercial Explorer' }]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              size="md"
              icon={<GitCommit size={16} />}
              onClick={() => setShowCommercialFlow(!showCommercialFlow)}
            >
              {showCommercialFlow ? 'Hide Flow' : 'Commercial Flow'}
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
              onClick={fetchRecords}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Optional Commercial Flow Visualization */}
      {showCommercialFlow && (
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <CommercialFlow
            poNumber={records[0]?.poNumber || 'PO-2026-HQ-0089'}
            currency="TZS"
            authorizedAmount={records.reduce((sum, r) => sum + r.authorizedValue, 0)}
            certifiedAmount={records.reduce((sum, r) => sum + r.cumulativeCertified, 0)}
            invoicedAmount={0}
            paidAmount={0}
          />
        </div>
      )}

      {/* Discovery Toolbar */}
      <div
        className="border-hairline"
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          backgroundColor: 'var(--color-surface-card)',
          borderRadius: 'var(--radius-xs)',
          marginBottom: 'var(--space-4)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: '1', minWidth: '240px' }}>
          <Input
            placeholder="Search by Site ID, Site Name, PO Number, or Supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} />}
          />
        </div>
        <div style={{ width: '200px' }}>
          <Input
            placeholder="Filter by Region..."
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            leftIcon={<Filter size={14} />}
          />
        </div>
      </div>

      {/* Commercial Table with Clickable Rows */}
      <div style={{ cursor: 'pointer' }}>
        <DataTable
          columns={columns}
          data={records}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          emptyTitle="No commercial records discovered"
          emptyDescription="Search queries and commercial records will become discoverable once approved commercial packages are imported into CLMS."
        />
      </div>

      {/* Site Quick View Drawer */}
      <SiteDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        site={selectedSite}
        onCreateCertification={handleCreateCertification}
      />

      {/* Create Certification Wizard */}
      {isCertWizardOpen && (
        <CreateCertificationWizard
          isOpen={isCertWizardOpen}
          onClose={() => {
            setIsCertWizardOpen(false);
            setCertWizardInitialSite(null);
          }}
          onSuccess={() => {
            setIsCertWizardOpen(false);
            setCertWizardInitialSite(null);
            fetchRecords();
          }}
          initialSite={certWizardInitialSite}
        />
      )}
    </div>
  );
}
