import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { PageHeader, Input, DataTable, Column, FinancialValue, StatusBadge } from '@/design-system';

interface CommercialExplorerRecord {
  id: string;
  siteId: string;
  siteName: string;
  region: string;
  supplierName: string;
  poNumber: string;
  authorizedValue: number;
  cumulativeCertified: number;
  invoicedAmount: number;
  status: string;
}

export function CommercialExplorerPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  // Authentic operational data starts empty
  const records: CommercialExplorerRecord[] = [];

  const columns: Column<CommercialExplorerRecord>[] = [
    { header: 'Site ID', accessorKey: 'siteId', width: '130px' },
    { header: 'Site Name', accessorKey: 'siteName' },
    { header: 'Region', accessorKey: 'region', width: '120px' },
    { header: 'Supplier', accessorKey: 'supplierName' },
    { header: 'PO Number', accessorKey: 'poNumber', width: '140px' },
    {
      header: 'Authorized (TZS)',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.authorizedValue} currency="TZS" size="sm" />,
    },
    {
      header: 'Certified (TZS)',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.cumulativeCertified} currency="TZS" size="sm" />,
    },
    {
      header: 'Invoiced (TZS)',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.invoicedAmount} currency="TZS" size="sm" />,
    },
    {
      header: 'Status',
      align: 'center',
      width: '120px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
  ];

  return (
    <div className="clms-explorer-page">
      <PageHeader
        title="Commercial Explorer"
        description="Global discovery engine across Sites, Purchase Orders, Suppliers, and lifecycle positions."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Commercial Explorer' }]}
      />

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
        <div style={{ width: '180px' }}>
          <Input
            placeholder="Filter by Region..."
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            leftIcon={<Filter size={14} />}
          />
        </div>
      </div>

      {/* Commercial Table Shell */}
      <DataTable
        columns={columns}
        data={records}
        emptyTitle="No commercial records discovered"
        emptyDescription="Search queries and commercial records will become discoverable once approved commercial packages are imported into CLMS."
      />
    </div>
  );
}
