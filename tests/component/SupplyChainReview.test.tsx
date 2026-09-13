import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SupplyChainPage } from '@/features/supply-chain/SupplyChainPage';
import { supplyChainRepository } from '@/infrastructure/repositories/SupplyChainRepository';
import { InvoiceRecord } from '@/infrastructure/repositories/InvoiceRepository';

// Mock AuthContext
vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'scm-uuid-1',
      email: 'supplychain@heliosclms.com',
      fullName: 'Helios Supply Chain Specialist',
      supplierId: null,
    },
    can: () => true,
  }),
}));

describe('SupplyChainPage Review Queue & Approved History', () => {
  it('displays tabs for All, Pending Review, Approved, and Returned, showing both pending and approved invoices', async () => {
    const mockInvoices: InvoiceRecord[] = [
      {
        id: 'inv-pending-1',
        clmsRef: 'INV-26-00002',
        clmsReference: 'INV-26-00002',
        supplierInvoiceNo: 'FAC-TZ-0007',
        supplierInvoiceNumber: 'FAC-TZ-0007',
        certificateId: 'cert-1',
        certificateNumber: 'FAC-SI-26-0002',
        poNumber: '4500015358',
        supplierId: 'supp-1',
        supplierName: 'PRIME POWER T LTD',
        projectName: 'National Grid Upgrade',
        amount: 5000000,
        taxAmount: 900000,
        totalAmount: 5900000,
        currency: 'TZS',
        status: 'SUBMITTED',
        invoiceDate: '2026-09-13',
        submittedAt: '2026-09-13T12:00:00Z',
        createdAt: '2026-09-13T12:00:00Z',
      },
      {
        id: 'inv-approved-1',
        clmsRef: 'INV-26-00001',
        clmsReference: 'INV-26-00001',
        supplierInvoiceNo: 'FAC-TZ-0006',
        supplierInvoiceNumber: 'FAC-TZ-0006',
        certificateId: 'cert-2',
        certificateNumber: 'FAC-SI-26-0001',
        poNumber: '4500015358',
        supplierId: 'supp-1',
        supplierName: 'PRIME POWER T LTD',
        projectName: 'Standard Network Rollout',
        amount: 11190580.92,
        taxAmount: 2014304.57,
        totalAmount: 13204885.49,
        currency: 'TZS',
        status: 'SC_APPROVED',
        invoiceDate: '2026-09-13',
        submittedAt: '2026-09-13T11:53:00Z',
        createdAt: '2026-09-13T11:53:00Z',
      },
    ];

    vi.spyOn(supplyChainRepository, 'getPendingReviewQueue').mockResolvedValue(mockInvoices);

    render(<SupplyChainPage />);

    // 1. Verify Tabs render with counts
    expect(await screen.findByRole('tab', { name: /all claims \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pending review \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /approved \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /returned \(0\)/i })).toBeInTheDocument();

    // 2. Both invoices are visible in "All Claims" view
    expect(screen.getByText('INV-26-00002')).toBeInTheDocument();
    expect(screen.getByText('INV-26-00001')).toBeInTheDocument();

    // Pending invoice shows "Review" action button
    expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument();

    // Approved invoice shows "Inspect" action button
    expect(screen.getByRole('button', { name: /inspect/i })).toBeInTheDocument();

    // 3. Switch to "Approved" Tab
    fireEvent.click(screen.getByRole('tab', { name: /approved \(1\)/i }));
    expect(screen.getByText('INV-26-00001')).toBeInTheDocument();
    expect(screen.queryByText('INV-26-00002')).not.toBeInTheDocument();

    // 4. Switch to "Pending Review" Tab
    fireEvent.click(screen.getByRole('tab', { name: /pending review \(1\)/i }));
    expect(screen.getByText('INV-26-00002')).toBeInTheDocument();
    expect(screen.queryByText('INV-26-00001')).not.toBeInTheDocument();
  });
});
