// ==============================================================================
// CLMS Certificates Page
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { PageHeader, DataTable, Column, FinancialValue, StatusBadge, Button } from '@/design-system';
import {
  certificateRepository,
  CertificateRecord,
} from '@/infrastructure/repositories/CertificateRepository';
import { CreateCertificationWizard } from './CreateCertificationWizard';
import { CertificatePreviewModal } from './CertificatePreviewModal';
import { useAuth } from '@/app/providers/AuthContext';

export function CertificatesPage() {
  const { can, user } = useAuth();
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState<CertificateRecord | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const isSupplier = Boolean(user?.supplierId);

  const fetchCertificates = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await certificateRepository.listCertificates({
        supplierId: user?.supplierId ?? undefined,
      });
      setCertificates(data);
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.supplierId]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleRowClick = (cert: CertificateRecord) => {
    setSelectedCert(cert);
    setIsPreviewOpen(true);
  };

  const columns: Column<CertificateRecord>[] = [
    { header: 'Certificate No', accessorKey: 'certificateNumber', width: '160px' },
    { header: 'Type', accessorKey: 'certType', width: '90px' },
    { header: 'Purchase Order', accessorKey: 'poNumber', width: '140px' },
    { header: 'Supplier', accessorKey: 'supplierName' },
    { header: 'Sites', accessorKey: 'siteCount', align: 'center', width: '80px' },
    {
      header: 'Certified Value',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.currentCertifiedAmount} currency={row.currency} size="sm" />,
    },
    {
      header: 'Status',
      align: 'center',
      width: '140px',
      cell: (row) => (
        <StatusBadge
          status={row.isInvoiced ? 'INVOICED' : row.status}
          label={row.isInvoiced ? 'INVOICED' : undefined}
          size="sm"
        />
      ),
    },
    {
      header: 'Created At',
      accessorKey: 'createdAt',
      width: '120px',
      cell: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
  ];

  return (
    <div className="clms-certificates-page">
      <PageHeader
        title="Site Acceptance Certificates"
        description="Author, review, approve, and issue FAC, PAC, and DPC milestone certificates."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Certificates' }]}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              size="md"
              icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
              onClick={fetchCertificates}
            >
              Refresh
            </Button>
            {!isSupplier && can('certificate.create') && (
              <Button
                variant="primary"
                size="md"
                icon={<Plus size={16} />}
                onClick={() => setIsWizardOpen(true)}
              >
                Create Certification
              </Button>
            )}
          </div>
        }
      />

      <div style={{ cursor: 'pointer' }}>
        <DataTable
          columns={columns}
          data={certificates}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          emptyTitle="No certificates yet"
          emptyDescription="Create a certification from an approved Purchase Order to initiate the site acceptance and signoff workflow."
        />
      </div>

      {isWizardOpen && (
        <CreateCertificationWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onSuccess={async (certId) => {
            setIsWizardOpen(false);
            setIsLoading(true);
            try {
              const data = await certificateRepository.listCertificates({
                supplierId: user?.supplierId ?? undefined,
              });
              setCertificates(data);
              if (certId) {
                const created = data.find((c) => c.id === certId);
                if (created) {
                  setSelectedCert(created);
                  setIsPreviewOpen(true);
                }
              }
            } finally {
              setIsLoading(false);
            }
          }}
        />
      )}

      {isPreviewOpen && selectedCert && (
        <CertificatePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false);
            setSelectedCert(null);
          }}
          certificate={selectedCert}
          onUpdate={() => {
            fetchCertificates();
            // Refresh selected cert
            certificateRepository.getCertificateById(selectedCert.id).then((c) => {
              if (c) setSelectedCert(c);
            });
          }}
        />
      )}
    </div>
  );
}
