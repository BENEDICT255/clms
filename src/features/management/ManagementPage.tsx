// ==============================================================================
// CLMS Executive Management Portfolio Visibility (Enterprise Super Prompt 4)
// ==============================================================================
// Governed by PRODUCT.md Section 33 & DESIGN.md v1.2:
// - Real Transaction-Backed Strategic Commercial Aggregations (Zero Fake Data)
// - Non-Manual Reconciliation (Authorized >= Certified >= Invoiced >= Paid)
// - Supplier Exposure Breakdown & Regional Commitments
// - Scoped to Authoritative Currency (TZS)
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  FinancialSummaryStrip,
  DataTable,
  Column,
  FinancialValue,
  Button,
  Tabs,
  TabItem,
  EmptyState,
} from '@/design-system';
import {
  managementRepository,
  ManagementPortfolioMetrics,
  SupplierExposureItem,
  RegionalCommitmentItem,
} from '@/infrastructure/repositories/ManagementRepository';
import {
  RefreshCw,
  Layers,
  Award,
  Clock,
  Briefcase,
} from 'lucide-react';

export function ManagementPage() {
  const [metrics, setMetrics] = useState<ManagementPortfolioMetrics | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierExposureItem[]>([]);
  const [regions, setRegions] = useState<RegionalCommitmentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('portfolio');

  const fetchManagementData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [metricsData, suppliersData, regionsData] = await Promise.all([
        managementRepository.getPortfolioMetrics(),
        managementRepository.getSupplierExposures(),
        managementRepository.getRegionalCommitments(),
      ]);
      setMetrics(metricsData);
      setSuppliers(suppliersData);
      setRegions(regionsData);
    } catch (err: unknown) {
      console.error('Failed to load management portfolio data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagementData();
  }, [fetchManagementData]);

  const tabs: TabItem[] = [
    { id: 'portfolio', label: 'Portfolio Overview' },
    { id: 'suppliers', label: `Supplier Exposures (${suppliers.length})` },
    { id: 'regions', label: `Regional Commitments (${regions.length})` },
  ];

  const summaryStripItems = metrics
    ? [
        { label: 'Authorized Commitment', amount: metrics.authorizedCommitment, currency: metrics.currency },
        { label: 'Total Certified', amount: metrics.totalCertified, currency: metrics.currency },
        { label: 'Invoiced Liability', amount: metrics.invoicedLiability, currency: metrics.currency },
        { label: 'Cash Settled', amount: metrics.cashSettled, currency: metrics.currency },
        { label: 'Outstanding Exposure', amount: metrics.outstandingExposure, currency: metrics.currency },
        { label: 'DPC Advance Exposure', amount: metrics.dpcAdvanceExposure, currency: metrics.currency },
      ]
    : [];

  const supplierColumns: Column<SupplierExposureItem>[] = [
    { header: 'Supplier Partner', accessorKey: 'supplierName' },
    {
      header: 'Authorized Commitment',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.authorizedAmount} currency={row.currency} size="sm" />,
    },
    {
      header: 'Certified Value',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.certifiedAmount} currency={row.currency} size="sm" />,
    },
    {
      header: 'Invoiced Claims',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.invoicedAmount} currency={row.currency} size="sm" />,
    },
    {
      header: 'Disbursed Outflow',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.paidAmount} currency={row.currency} size="sm" />,
    },
    {
      header: 'Outstanding Exposure',
      align: 'right',
      cell: (row) => (
        <FinancialValue
          amount={row.outstandingAmount}
          currency={row.currency}
          size="sm"
          className={row.outstandingAmount > 0 ? 'text-positive font-semibold' : 'text-neutral'}
        />
      ),
    },
  ];

  const regionColumns: Column<RegionalCommitmentItem>[] = [
    { header: 'Operating Region', accessorKey: 'region' },
    { header: 'Covered Tower Sites', accessorKey: 'sitesCount', align: 'center', width: '160px' },
    {
      header: 'Authorized Commitment',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.authorizedAmount} currency={row.currency} size="sm" />,
    },
    {
      header: 'Certified Value',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.certifiedAmount} currency={row.currency} size="sm" />,
    },
  ];

  const hasAnyData = metrics && metrics.authorizedCommitment > 0;

  return (
    <div className="clms-management-page">
      <PageHeader
        title="Executive Management Visibility"
        description="Transaction-backed portfolio commitment, certified capital progress, invoiced liabilities, and net settlement exposure."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Executive Management' }]}
        actions={
          <Button
            variant="secondary"
            size="md"
            icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
            onClick={fetchManagementData}
          >
            Refresh
          </Button>
        }
      />

      {/* Strategic Metric Strip */}
      {summaryStripItems.length > 0 && (
        <FinancialSummaryStrip metrics={summaryStripItems} style={{ marginBottom: 'var(--space-6)' }} />
      )}

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTabId={activeTab}
        onTabChange={setActiveTab}
        style={{ marginBottom: 'var(--space-4)' }}
      />

      {/* Tab: Portfolio Overview */}
      {activeTab === 'portfolio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          {/* Operational Backlog & Workstream Cards */}
          {metrics && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 'var(--space-4)',
              }}
            >
              <div
                className="border-hairline"
                style={{
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--color-surface-card)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--color-surface-sunken)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-brand-primary)',
                  }}
                >
                  <Layers size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Active Packages
                  </div>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                    {metrics.activePackagesCount}
                  </div>
                </div>
              </div>

              <div
                className="border-hairline"
                style={{
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--color-surface-card)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--color-surface-sunken)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-brand-primary)',
                  }}
                >
                  <Award size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Issued Certificates
                  </div>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                    {metrics.issuedCertificatesCount}
                  </div>
                </div>
              </div>

              <div
                className="border-hairline"
                style={{
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--color-surface-card)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--color-surface-sunken)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-semantic-warning-text)',
                  }}
                >
                  <Clock size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Awaiting SCM Review
                  </div>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                    {metrics.invoicesAwaitingScmCount}
                  </div>
                </div>
              </div>

              <div
                className="border-hairline"
                style={{
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--color-surface-card)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--color-surface-sunken)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-brand-primary)',
                  }}
                >
                  <Briefcase size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    Awaiting Finance Settlement
                  </div>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
                    {metrics.invoicesAwaitingFinanceCount}
                  </div>
                </div>
              </div>
            </div>
          )}

          {!hasAnyData && !isLoading && (
            <EmptyState
              title="No commercial commitments recorded"
              description="Portfolio analytics, supplier exposures, and regional breakdown will automatically compute from live database transactions once approved commercial packages and certificates are created."
            />
          )}

          {hasAnyData && (
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-5)',
                backgroundColor: 'var(--color-surface-card)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                Commercial Invariant Reconciliation Status
              </h3>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                CLMS mathematical integrity rules enforce that downstream financial values cannot exceed upstream certified authorizations.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-4)', fontSize: 'var(--font-size-xs)' }}>
                <div className="border-hairline" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-surface-sunken)' }}>
                  <div style={{ color: 'var(--color-text-secondary)' }}>Remaining Certifiable Value</div>
                  <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)' }}>
                    {metrics ? (metrics.authorizedCommitment - metrics.totalCertified).toLocaleString() : 0} TZS
                  </div>
                  <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                    Authorized &minus; Cumulative Certified
                  </div>
                </div>
                <div className="border-hairline" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-surface-sunken)' }}>
                  <div style={{ color: 'var(--color-text-secondary)' }}>Un-Invoiced Certified Value</div>
                  <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)' }}>
                    {metrics ? Math.max(0, metrics.totalCertified - metrics.invoicedLiability).toLocaleString() : 0} TZS
                  </div>
                  <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                    Total Certified &minus; Total Invoiced
                  </div>
                </div>
                <div className="border-hairline" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-surface-sunken)' }}>
                  <div style={{ color: 'var(--color-text-secondary)' }}>Total Cash Outstanding</div>
                  <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-brand-primary)' }}>
                    {metrics ? metrics.outstandingExposure.toLocaleString() : 0} TZS
                  </div>
                  <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                    Invoiced Liability &minus; Cash Settled
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Supplier Exposures */}
      {activeTab === 'suppliers' && (
        <DataTable
          columns={supplierColumns}
          data={suppliers}
          isLoading={isLoading}
          emptyTitle="No supplier records found"
          emptyDescription="Commercial commitments by supplier organization will aggregate here once active packages exist."
        />
      )}

      {/* Tab: Regional Commitments */}
      {activeTab === 'regions' && (
        <DataTable
          columns={regionColumns}
          data={regions}
          isLoading={isLoading}
          emptyTitle="No regional data available"
          emptyDescription="Site distribution across geographic regions will display here upon package ingestion."
        />
      )}
    </div>
  );
}
