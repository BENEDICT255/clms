import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { POLifecyclePage } from '@/features/po-lifecycle/POLifecyclePage';
import { poLifecycleRepository } from '@/infrastructure/repositories/POLifecycleRepository';

// Mock AuthContext
vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-id',
      email: 'lead@heliosclms.com',
      fullName: 'Project Lead',
      supplierId: null,
      roles: ['PROJECT_LEAD'],
    },
    can: () => true,
  }),
}));

const mockTreeData = {
  summary: {
    poId: 'po-uuid-1',
    poNumber: '4500015358',
    supplierId: 'supp-uuid-1',
    supplierName: 'Prime Power Ltd',
    projectName: 'Site Improvement',
    siteCount: 16,
    authorizedValue: 123512849.94,
    certifiedValue: 42824885.49,
    certifiedPercentage: 34.67,
    invoicedValue: 13204885.49,
    invoicedPercentage: 10.69,
    paidValue: 8000000.0,
    paidPercentage: 6.48,
    paymentTermsDays: 90,
    currency: 'TZS',
    issuedDate: '02 Aug 2026',
    status: 'Active',
  },
  sites: [
    {
      id: 'site-1',
      siteIdExt: 'TZ-001-DAR',
      siteName: 'Dar Posta Core',
      region: 'Dar es Salaam',
      authorizedAmount: 7719553.12,
    },
  ],
  certificates: [
    {
      id: 'cert-1',
      certificateNumber: 'FAC-SI-26-0001',
      certType: 'FAC' as const,
      certTypeName: 'Final Acceptance Certificate',
      amount: 13204885.49,
      currency: 'TZS',
      status: 'ISSUED',
      issuedDate: '06 Sep 2026',
      siteCount: 3,
      invoices: [
        {
          id: 'inv-1',
          clmsReference: 'INV-SI-26-0001',
          supplierInvoiceNumber: 'FAC-TZ-0006',
          amount: 13204885.49,
          currency: 'TZS',
          status: 'Finance',
          submittedDate: '08 Sep 2026',
          certificateId: 'cert-1',
          payments: [
            {
              id: 'pay-1',
              referenceNumber: 'PAY-00012',
              amount: 8000000.0,
              currency: 'TZS',
              paymentDate: '12 Sep 2026',
              status: 'Partial' as const,
              invoiceId: 'inv-1',
            },
          ],
        },
      ],
    },
    {
      id: 'cert-2',
      certificateNumber: 'DPC-SI-26-0003',
      certType: 'DPC' as const,
      certTypeName: 'Defects Period Certificate',
      amount: 7120000.0,
      currency: 'TZS',
      status: 'DRAFT',
      issuedDate: '15 Sep 2026',
      siteCount: 2,
      invoices: [
        {
          id: 'placeholder-inv-cert-2',
          isPlaceholder: true,
          clmsReference: 'Awaiting Invoice',
          supplierInvoiceNumber: 'Supplier to submit invoice',
          amount: 7120000.0,
          currency: 'TZS',
          status: 'AWAITING_SUBMISSION',
          submittedDate: 'Pending',
          certificateId: 'cert-2',
          payments: [
            {
              id: 'placeholder-pay-na-cert-2',
              isPlaceholder: true,
              referenceNumber: 'Awaiting Invoice',
              amount: 0,
              currency: 'TZS',
              paymentDate: 'No payment yet',
              status: 'Pending' as const,
              invoiceId: 'placeholder-inv-cert-2',
            },
          ],
        },
      ],
    },
  ],
  documents: [
    {
      id: 'doc-1',
      documentType: 'PO_SOURCE',
      fileName: 'PO_4500015358_PrimePower.pdf',
      fileSize: 1048576,
      mimeType: 'application/pdf',
      storagePath: 'commercial/po-4500015358.pdf',
    },
  ],
};

describe('PO Lifecycle Page & Horizontal Commercial Lineage (Image 2 Fidelity)', () => {
  it('displays empty state when no PO is selected and allows searching', async () => {
    vi.spyOn(poLifecycleRepository, 'searchPOs').mockResolvedValue([
      {
        id: 'po-1',
        poNumber: '4500015358',
        supplierId: 'supp-1',
        supplierName: 'Prime Power Ltd',
        projectName: 'Site Improvement',
        authorizedAmount: 123512849.94,
        currency: 'TZS',
        siteCount: 16,
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/po-lifecycle']}>
        <Routes>
          <Route path="/po-lifecycle" element={<POLifecyclePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Select a Purchase Order')).toBeDefined();
    expect(screen.getByPlaceholderText(/Search by PO Number/)).toBeDefined();
  });

  it('renders selected PO summary, stepper, and 4-column lineage tree nodes with placeholders', async () => {
    vi.spyOn(poLifecycleRepository, 'getPOLifecycleData').mockResolvedValue(mockTreeData);

    render(
      <MemoryRouter initialEntries={['/po-lifecycle?po=4500015358']}>
        <Routes>
          <Route path="/po-lifecycle" element={<POLifecyclePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for tree data to load
    expect(await screen.findByText('PO 4500015358')).toBeDefined();

    // Verify Financial Summary
    expect(screen.getByText('Authorized Value')).toBeDefined();
    expect(screen.getByText('Certified Value')).toBeDefined();
    expect(screen.getByText('Invoiced Value')).toBeDefined();
    expect(screen.getByText('Paid Value')).toBeDefined();
    expect(screen.getByText('90 days')).toBeDefined();

    // Verify Stepper & Column Headers
    expect(screen.getAllByText('PURCHASE ORDER').length).toBe(2);
    expect(screen.getAllByText('CERTIFICATION').length).toBe(2);
    expect(screen.getAllByText('INVOICE').length).toBe(2);
    expect(screen.getAllByText('PAYMENT').length).toBe(2);

    // Verify Tree Nodes
    expect(screen.getByText('FAC-SI-26-0001')).toBeDefined();
    expect(screen.getByText('INV-SI-26-0001')).toBeDefined();
    expect(screen.getByText('PAY-00012')).toBeDefined();

    // Verify Placeholder Nodes
    expect(screen.getAllByText('Awaiting Invoice').length).toBeGreaterThan(0);
    expect(screen.getByText('Supplier to submit invoice')).toBeDefined();
  });

  it('opens details drawers on node click', async () => {
    vi.spyOn(poLifecycleRepository, 'getPOLifecycleData').mockResolvedValue(mockTreeData);

    render(
      <MemoryRouter initialEntries={['/po-lifecycle?po=4500015358']}>
        <Routes>
          <Route path="/po-lifecycle" element={<POLifecyclePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('FAC-SI-26-0001')).toBeDefined();

    // Click Certificate Node
    const certNode = screen.getByLabelText('Certificate FAC-SI-26-0001');
    fireEvent.click(certNode);

    // Verify Certificate Drawer opens
    expect(await screen.findByText('Certificate Details')).toBeDefined();

    // Close drawer
    const closeBtns = screen.getAllByRole('button', { name: /close/i });
    fireEvent.click(closeBtns[0]);

    // Click Payment Node
    const payNode = screen.getByLabelText('Payment PAY-00012');
    fireEvent.click(payNode);

    // Verify Payment Drawer opens
    expect(await screen.findByText('Payment Transaction Details')).toBeDefined();
  });
});
