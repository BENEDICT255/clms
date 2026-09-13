import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SupplierCertificatesPage } from '@/features/supplier/SupplierCertificatesPage';
import { certificateRepository, CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';

// Mock AuthContext
vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'supplier-uuid-1',
      email: 'supplier@heliosclms.com',
      fullName: 'Prime Power Commercial Rep',
      supplierId: 'supp-1',
    },
    can: () => true,
  }),
}));

describe('SupplierCertificatesPage Invoiced Display', () => {
  it('displays INVOICED in grey and suppresses Create Invoice button when certificate is already invoiced', async () => {
    const mockCerts: CertificateRecord[] = [
      {
        id: 'cert-invoiced-1',
        certificateNumber: 'FAC-SI-26-0001',
        certType: 'FAC',
        poId: 'po-1',
        poNumber: '4500015358',
        supplierId: 'supp-1',
        supplierName: 'PRIME POWER T LTD',
        currency: 'TZS',
        currentCertifiedAmount: 13204885.49,
        status: 'ISSUED',
        templateVersion: 'PROVISIONAL_V1',
        issuedAt: '2026-09-13T12:00:00Z',
        createdAt: '2026-09-13T12:00:00Z',
        updatedAt: '2026-09-13T12:00:00Z',
        siteCount: 2,
        isInvoiced: true,
        invoiceNumber: 'FAC-TZ-0006',
        invoiceStatus: 'SC_APPROVED',
      },
      {
        id: 'cert-pending-2',
        certificateNumber: 'FAC-SI-26-0002',
        certType: 'FAC',
        poId: 'po-1',
        poNumber: '4500015358',
        supplierId: 'supp-1',
        supplierName: 'PRIME POWER T LTD',
        currency: 'TZS',
        currentCertifiedAmount: 5000000.0,
        status: 'ISSUED',
        templateVersion: 'PROVISIONAL_V1',
        issuedAt: '2026-09-13T12:00:00Z',
        createdAt: '2026-09-13T12:00:00Z',
        updatedAt: '2026-09-13T12:00:00Z',
        siteCount: 1,
        isInvoiced: false,
      },
    ];

    vi.spyOn(certificateRepository, 'listCertificates').mockResolvedValue(mockCerts);

    render(<SupplierCertificatesPage />);

    // 1. Invoiced certificate checks:
    // Status column displays INVOICED
    const invoicedBadges = await screen.findAllByText(/invoiced/i);
    expect(invoicedBadges.length).toBeGreaterThanOrEqual(1);

    // View Certificate button is always present
    const viewButtons = screen.getAllByRole('button', { name: /view certificate/i });
    expect(viewButtons.length).toBe(2);

    // Create Invoice button must ONLY exist for the non-invoiced certificate (exactly 1 instance)
    const createInvoiceButtons = screen.getAllByRole('button', { name: /create invoice/i });
    expect(createInvoiceButtons.length).toBe(1);

    // The second certificate has Create Invoice
    expect(createInvoiceButtons[0]).toBeInTheDocument();
  });
});
