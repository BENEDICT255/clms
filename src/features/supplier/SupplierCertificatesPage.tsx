// ==============================================================================
// CLMS Supplier Certificates Page
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, DataTable, Column, FinancialValue, Button, StatusBadge } from '@/design-system';
import {
  certificateRepository,
  CertificateRecord,
} from '@/infrastructure/repositories/CertificateRepository';
import { CreateInvoiceModal } from '../invoices/CreateInvoiceModal';
import { CertificatePreviewModal } from '../certificates/CertificatePreviewModal';
import { useAuth } from '@/app/providers/AuthContext';
import { RefreshCw, Eye } from 'lucide-react';

export function SupplierCertificatesPage() {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<CertificateRecord | null>(null);
  const [previewCert, setPreviewCert] = useState<CertificateRecord | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const fetchCertificates = useCallback(async () => {
    setIsLoading(true);
    try {
      // In production, queries are strictly scoped to user's supplierId
      const data = await certificateRepository.listCertificates({
        supplierId: user?.supplierId ?? undefined,
        status: 'ISSUED',
      });
      setCertificates(data);
    } catch (err) {
      console.error('Failed to load supplier certificates:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.supplierId]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleOpenCreateInvoice = (cert: CertificateRecord) => {
    setSelectedCert(cert);
    setIsInvoiceModalOpen(true);
  };

  const handleOpenPreview = (cert: CertificateRecord) => {
    setPreviewCert(cert);
    setIsPreviewModalOpen(true);
  };

  const columns: Column<CertificateRecord>[] = [
    {
      header: 'Certificate No',
      width: '160px',
      cell: (row) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenPreview(row);
          }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--color-brand-primary)',
            fontWeight: 'var(--font-weight-semibold)',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: 'inherit',
            fontFamily: 'inherit',
          }}
        >
          {row.certificateNumber}
        </button>
      ),
    },
    { header: 'Type', accessorKey: 'certType', width: '90px' },
    { header: 'PO Reference', accessorKey: 'poNumber', width: '140px' },
    { header: 'Sites', accessorKey: 'siteCount', align: 'center', width: '80px' },
    {
      header: 'Entitlement',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.currentCertifiedAmount} currency={row.currency} size="sm" />,
    },
    {
      header: 'Status',
      align: 'center',
      width: '120px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Issued Date',
      accessorKey: 'issuedAt',
      width: '130px',
      cell: (row) => (row.issuedAt ? new Date(row.issuedAt).toLocaleDateString() : '—'),
    },
    {
      header: 'Action',
      align: 'center',
      width: '240px',
      cell: (row) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Eye size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenPreview(row);
            }}
          >
            View Certificate
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCreateInvoice(row);
            }}
          >
            Create Invoice
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="clms-supplier-certs-page">
      <PageHeader
        title="My Issued Certificates"
        description="Authoritative commercial milestone certificates ready for supplier invoicing."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'My Certificates' }]}
        actions={
          <Button
            variant="secondary"
            size="md"
            icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
            onClick={fetchCertificates}
          >
            Refresh
          </Button>
        }
      />

      <div style={{ cursor: 'pointer' }}>
        <DataTable
          columns={columns}
          data={certificates}
          isLoading={isLoading}
          onRowClick={handleOpenPreview}
          emptyTitle="No certificates are currently available"
          emptyDescription="Issued acceptance certificates published by the Projects team will appear here for invoice creation."
        />
      </div>

      {isPreviewModalOpen && previewCert && (
        <CertificatePreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false);
            setPreviewCert(null);
          }}
          certificate={previewCert}
          onUpdate={() => {
            fetchCertificates();
            certificateRepository.getCertificateById(previewCert.id).then((c) => {
              if (c) setPreviewCert(c);
            });
          }}
        />
      )}

      {isInvoiceModalOpen && selectedCert && (
        <CreateInvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedCert(null);
          }}
          certificate={selectedCert}
          onSuccess={() => {
            setIsInvoiceModalOpen(false);
            setSelectedCert(null);
            fetchCertificates();
          }}
        />
      )}
    </div>
  );
}
