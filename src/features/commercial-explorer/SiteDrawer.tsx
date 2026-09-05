// ==============================================================================
// CLMS Site Commercial Quick View Drawer
// ==============================================================================

import { Drawer, FinancialValue, Button, StatusBadge } from '@/design-system';
import { CommercialExplorerRecord } from '@/infrastructure/repositories/CommercialExplorerRepository';
import { Award, FileText, CheckCircle } from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';

interface SiteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  site: CommercialExplorerRecord | null;
  onCreateCertification?: (site: CommercialExplorerRecord) => void;
}

export function SiteDrawer({
  isOpen,
  onClose,
  site,
  onCreateCertification,
}: SiteDrawerProps) {
  const { can, user } = useAuth();
  if (!site) return null;

  const isSupplier = Boolean(user?.supplierId);
  const isEligibleForCert = site.remainingCertifiable > 0;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`${site.siteName} (${site.siteIdExt})`}
      subtitle={`Commercial Position — Region: ${site.region}`}
      width="540px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', width: '100%' }}>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          {!isSupplier && can('certificate.create') && (
            <Button
              variant="primary"
              icon={<Award size={16} />}
              disabled={!isEligibleForCert}
              onClick={() => {
                onClose();
                onCreateCertification?.(site);
              }}
            >
              {isEligibleForCert ? 'Create Certification' : 'Fully Certified'}
            </Button>
          )}
        </div>
      }
    >
      <div className="clms-site-drawer-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {/* Status Badge */}
        <div>
          <StatusBadge status={site.status} size="md" />
        </div>

        {/* Commercial Balance Card */}
        <div
          className="border-hairline"
          style={{
            backgroundColor: 'var(--color-surface-sunken)',
            padding: 'var(--space-4) var(--space-5)',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Authorized Commitment
            </span>
            <FinancialValue amount={site.authorizedValue} currency={site.currency} size="md" />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Cumulative Certified
            </span>
            <FinancialValue amount={site.cumulativeCertified} currency={site.currency} size="md" />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: 'var(--space-3)',
              borderTop: '1px solid var(--color-border-hairline)',
            }}
          >
            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
              Remaining Certifiable Balance
            </span>
            <FinancialValue
              amount={site.remainingCertifiable}
              currency={site.currency}
              size="lg"
              className={site.remainingCertifiable > 0 ? 'text-positive' : ''}
            />
          </div>
        </div>

        {/* Contractual Alignment */}
        <div>
          <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-3)' }}>
            Commercial Commitment Details
          </h4>
          <div
            className="border-hairline"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-xs)',
              fontSize: 'var(--font-size-xs)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Purchase Order:</span>
              <strong>{site.poNumber}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Assigned Vendor:</span>
              <strong>{site.supplierName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Project:</span>
              <strong>{site.projectName}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>Operating Currency:</span>
              <strong>{site.currency}</strong>
            </div>
          </div>
        </div>

        {/* Linked Source Documents */}
        <div>
          <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-3)' }}>
            Associated Commercial Documents
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div
              className="border-hairline"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <FileText size={16} color="var(--color-brand-primary)" />
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                  Approved BOQ Schedule (Master Ingested)
                </span>
              </div>
              <CheckCircle size={14} color="var(--color-semantic-success-text)" />
            </div>

            <div
              className="border-hairline"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <FileText size={16} color="var(--color-brand-primary)" />
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                  Purchase Order Document ({site.poNumber})
                </span>
              </div>
              <CheckCircle size={14} color="var(--color-semantic-success-text)" />
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
