// ==============================================================================
// CLMS Commercial Overview Page
// ==============================================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Compass, ArrowRight } from 'lucide-react';
import { PageHeader, FinancialSummaryStrip, EmptyState, Button } from '@/design-system';
import { useAuth } from '@/app/providers/AuthContext';
import { commercialExplorerRepository } from '@/infrastructure/repositories/CommercialExplorerRepository';
import { certificateRepository } from '@/infrastructure/repositories/CertificateRepository';
import { invoiceRepository } from '@/infrastructure/repositories/InvoiceRepository';

export function OverviewPage() {
  const { can, user } = useAuth();
  const navigate = useNavigate();

  const [authorizedTotal, setAuthorizedTotal] = useState(0);
  const [certifiedTotal, setCertifiedTotal] = useState(0);
  const [invoicedTotal, setInvoicedTotal] = useState(0);
  const [siteCount, setSiteCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      setIsLoading(true);
      try {
        const [sites, certs, invoices] = await Promise.all([
          commercialExplorerRepository.searchRecords({ supplierId: user?.supplierId ?? undefined }),
          certificateRepository.listCertificates({ supplierId: user?.supplierId ?? undefined }),
          invoiceRepository.listInvoices({ supplierId: user?.supplierId ?? undefined }),
        ]);

        const authSum = sites.reduce((acc, s) => acc + s.authorizedValue, 0);
        const certSum = certs
          .filter((c) => c.status === 'ISSUED')
          .reduce((acc, c) => acc + c.currentCertifiedAmount, 0);
        const invSum = invoices
          .filter((i) => i.status === 'SUBMITTED' || i.status === 'SC_APPROVED')
          .reduce((acc, i) => acc + i.amount, 0);

        setAuthorizedTotal(authSum);
        setCertifiedTotal(certSum);
        setInvoicedTotal(invSum);
        setSiteCount(sites.length);
      } catch (err) {
        console.error('Error loading commercial overview metrics:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMetrics();
  }, [user?.supplierId]);

  const hasData = siteCount > 0;
  const outstandingBalance = Math.max(0, authorizedTotal - certifiedTotal);

  const portfolioMetrics = [
    { label: 'Authorized Commitment', amount: authorizedTotal, currency: 'TZS' },
    { label: 'Total Certified', amount: certifiedTotal, currency: 'TZS' },
    { label: 'Invoiced Liability', amount: invoicedTotal, currency: 'TZS' },
    { label: 'Settled Outflow', amount: 0, currency: 'TZS' }, // Settled payments owned by Prompt 4
    { label: 'Remaining Uncertified', amount: outstandingBalance, currency: 'TZS' },
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

      <FinancialSummaryStrip
        metrics={portfolioMetrics}
        className="mb-6"
        style={{ marginBottom: 'var(--space-6)' }}
      />

      {!hasData && !isLoading ? (
        <EmptyState
          icon={<Compass size={40} className="clms-empty-state__icon-default" />}
          title="No commercial packages yet"
          description="The commercial repository is currently empty. Ingest your first approved Bill of Quantities (BOQ) and Purchase Order (PO) to establish commercial commitments and unlock site certification."
          actionLabel={can('package.import') ? 'Import Commercial Package' : 'Open Commercial Explorer'}
          onAction={() => navigate(can('package.import') ? '/commercial-packages' : '/explorer')}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
          <div
            className="border-hairline"
            style={{
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-surface-card)',
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/explorer')}
          >
            <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
              Commercial Explorer
            </h4>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
              Explore {siteCount} commercial sites across active projects and purchase orders.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-brand-primary)', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
              <span>Open Explorer</span>
              <ArrowRight size={14} />
            </div>
          </div>

          <div
            className="border-hairline"
            style={{
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-surface-card)',
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer',
            }}
            onClick={() => navigate(user?.supplierId ? '/supplier/certificates' : '/certificates')}
          >
            <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
              Site Acceptance Certificates
            </h4>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
              Manage FAC, PAC, and DPC milestone certifications and signoff chains.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-brand-primary)', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
              <span>View Certificates</span>
              <ArrowRight size={14} />
            </div>
          </div>

          <div
            className="border-hairline"
            style={{
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-surface-card)',
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer',
            }}
            onClick={() => navigate('/invoices')}
          >
            <h4 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
              Commercial Invoices
            </h4>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
              Track supplier claims, tax calculations, and Supply Chain review status.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--color-brand-primary)', fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
              <span>View Invoices</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
