import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Compass } from 'lucide-react';
import { PageHeader, FinancialSummaryStrip, EmptyState, Button } from '@/design-system';
import { useAuth } from '@/app/providers/AuthContext';

export function OverviewPage() {
  const { can } = useAuth();
  const navigate = useNavigate();

  // Baseline metric strip representing authentic empty state (ZERO fake metrics)
  const portfolioMetrics = [
    { label: 'Authorized Commitment', amount: 0, currency: 'TZS' },
    { label: 'Total Certified', amount: 0, currency: 'TZS' },
    { label: 'Invoiced Liability', amount: 0, currency: 'TZS' },
    { label: 'Settled Outflow', amount: 0, currency: 'TZS' },
    { label: 'Outstanding Balance', amount: 0, currency: 'TZS' },
  ];

  return (
    <div className="clms-overview-page">
      <PageHeader
        title="Commercial Overview"
        description="High-level commercial portfolio commitments and lifecycle summary."
        actions={
          can('package.import') ? (
            <Button
              variant="primary"
              size="md"
              icon={<FileSpreadsheet size={16} />}
              onClick={() => navigate('/commercial-packages')}
            >
              Import Package
            </Button>
          ) : undefined
        }
      />

      <FinancialSummaryStrip metrics={portfolioMetrics} className="mb-6" style={{ marginBottom: 'var(--space-6)' }} />

      <EmptyState
        icon={<Compass size={40} className="clms-empty-state__icon-default" />}
        title="No commercial packages yet"
        description="The commercial repository is currently empty. Ingest your first approved Bill of Quantities (BOQ) and Purchase Order (PO) to establish commercial commitments and unlock site certification."
        actionLabel={can('package.import') ? 'Import Commercial Package' : 'Open Commercial Explorer'}
        onAction={() => navigate(can('package.import') ? '/commercial-packages' : '/explorer')}
      />
    </div>
  );
}
