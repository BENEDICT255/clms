import { PageHeader, FinancialSummaryStrip, EmptyState } from '@/design-system';

export function ManagementPage() {
  const managementMetrics = [
    { label: 'Authorized Commitment', amount: 0, currency: 'TZS' },
    { label: 'Total Certified', amount: 0, currency: 'TZS' },
    { label: 'Invoiced Liability', amount: 0, currency: 'TZS' },
    { label: 'Cash Settled', amount: 0, currency: 'TZS' },
    { label: 'Outstanding Exposure', amount: 0, currency: 'TZS' },
    { label: 'DPC Advance Exposure', amount: 0, currency: 'TZS' },
  ];

  return (
    <div className="clms-management-page">
      <PageHeader
        title="Executive Management Visibility"
        description="Transaction-backed enterprise commercial commitment, exposure, and settlement metrics."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Executive Management' }]}
      />

      <FinancialSummaryStrip metrics={managementMetrics} style={{ marginBottom: 'var(--space-6)' }} />

      <EmptyState
        title="No commercial data is available yet"
        description="Strategic portfolio analytics, supplier exposures, and payment aging distribution will aggregate here once active commercial packages and certificates are recorded."
      />
    </div>
  );
}
