import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ProjectsDashboard } from '@/features/dashboard/ProjectsDashboard';
import { SupplierDashboard } from '@/features/dashboard/SupplierDashboard';
import { SupplyChainDashboard } from '@/features/dashboard/SupplyChainDashboard';
import { FinanceDashboard } from '@/features/dashboard/FinanceDashboard';
import { projectsDashboardRepository } from '@/infrastructure/repositories/dashboard/ProjectsDashboardRepository';
import { supplierDashboardRepository } from '@/infrastructure/repositories/dashboard/SupplierDashboardRepository';
import { supplyChainDashboardRepository } from '@/infrastructure/repositories/dashboard/SupplyChainDashboardRepository';
import { financeDashboardRepository } from '@/infrastructure/repositories/dashboard/FinanceDashboardRepository';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthContext
vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user-uuid',
      email: 'engineer@heliosclms.com',
      fullName: 'Commercial Engineer',
      supplierId: 'supp-uuid-1',
      roles: ['PROJECT_ENGINEER'],
    },
    can: () => true,
  }),
}));

describe('CLMS Role Dashboards (Image 1 Fidelity & Interactivity)', () => {
  it('ProjectsDashboard renders metrics, progress bar, attention items and handles navigation', async () => {
    vi.spyOn(projectsDashboardRepository, 'getDashboardData').mockResolvedValue({
      metrics: {
        commercialPackagesCount: 12,
        sitesInScopeCount: 48,
        sitesCertifiedCount: 32,
        sitesCertifiedPercentage: 66.6,
        sitesNotYetCertifiedCount: 16,
        sitesNotYetCertifiedPercentage: 33.3,
        currency: 'TZS',
      },
      progress: {
        authorizedCommitment: 123512849.94,
        certifiedToDate: 42824885.49,
        certifiedPercentage: 34.67,
        remaining: 80687964.45,
        remainingPercentage: 65.33,
        currency: 'TZS',
      },
      attentionItems: [
        {
          id: 'lead-approvals',
          label: 'Certificates awaiting Project Lead approval',
          count: 2,
          type: 'pending_lead',
        },
      ],
      recentPackages: [
        {
          id: 'pkg-1',
          poNumber: '4500015358',
          supplierName: 'Prime Power Ltd',
          projectName: 'Site Improvement',
          siteCount: 16,
          certifiedPercentage: 35,
          updatedAt: '12 Sep 2026',
        },
      ],
    });

    render(
      <MemoryRouter>
        <ProjectsDashboard />
      </MemoryRouter>
    );

    // Verify Title & Metrics
    expect(await screen.findByText('Projects Dashboard')).toBeDefined();
    expect(screen.getByText('Commercial Packages')).toBeDefined();
    expect(screen.getByText('12')).toBeDefined();
    expect(screen.getByText('48')).toBeDefined();
    expect(screen.getByText('32')).toBeDefined();
    expect(screen.getAllByText('16').length).toBeGreaterThan(0);

    // Verify Progress
    expect(screen.getByText('Certification Progress')).toBeDefined();
    expect(screen.getByText('Authorized')).toBeDefined();
    expect(screen.getByText('Remaining')).toBeDefined();

    // Test Clicking Metric Cards
    const packagesCard = screen.getByLabelText(/Commercial Packages: 12/);
    fireEvent.click(packagesCard);
    expect(mockNavigate).toHaveBeenCalledWith('/commercial-packages');

    // Test Attention Item Click
    const attentionItem = screen.getByText('Certificates awaiting Project Lead approval');
    fireEvent.click(attentionItem);
    expect(mockNavigate).toHaveBeenCalledWith('/certificates?status=PENDING_LEAD_APPROVAL');
  });

  it('SupplierDashboard renders active POs, invoice pipeline, and ready certificates', async () => {
    vi.spyOn(supplierDashboardRepository, 'getDashboardData').mockResolvedValue({
      metrics: {
        activePOsCount: 8,
        certificatesIssuedCount: 15,
        awaitingInvoiceCount: 3,
        invoicesSubmittedCount: 12,
      },
      pipeline: [
        { id: 'draft', label: 'Draft', count: 2, statusCode: 'DRAFT', color: 'neutral' },
        { id: 'submitted', label: 'Submitted', count: 3, statusCode: 'SUBMITTED', color: 'brand' },
        { id: 'scm-review', label: 'Supply Chain Review', count: 2, statusCode: 'SC_REVIEW', color: 'brand' },
        { id: 'finance', label: 'Finance', count: 4, statusCode: 'FINANCE', color: 'brand' },
        { id: 'partial', label: 'Partially Paid', count: 1, statusCode: 'PARTIALLY_PAID', color: 'warning' },
        { id: 'settled', label: 'Settled', count: 7, statusCode: 'SETTLED', color: 'success' },
      ],
      attentionItems: [
        {
          id: 'ready-to-invoice',
          label: '3 certificates ready for invoicing',
          count: 3,
          type: 'ready_to_invoice',
        },
      ],
      readyCertificates: [
        {
          id: 'cert-1',
          certificateNumber: 'FAC-SI-26-0001',
          poNumber: '4500015358',
          certType: 'FAC',
          amount: 13204885.49,
          currency: 'TZS',
          issuedDate: '06 Sep 2026',
        },
      ],
    });

    render(
      <MemoryRouter>
        <SupplierDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText('Supplier Dashboard')).toBeDefined();
    expect(screen.getByText('Active POs')).toBeDefined();
    expect(screen.getByText('8')).toBeDefined();
    expect(screen.getByText('Certificates Issued')).toBeDefined();
    expect(screen.getByText('15')).toBeDefined();

    // Verify Pipeline
    expect(screen.getByText('Invoice Pipeline')).toBeDefined();
    expect(screen.getByText('Draft')).toBeDefined();
    expect(screen.getByText('Settled')).toBeDefined();

    // Click Pipeline Bar
    const draftBar = screen.getByLabelText(/Draft: 2/);
    fireEvent.click(draftBar);
    expect(mockNavigate).toHaveBeenCalledWith('/invoices?status=DRAFT');

    // Verify Ready Certificates Table & Action
    expect(screen.getByText('Certificates Ready to Invoice')).toBeDefined();
    expect(screen.getByText('FAC-SI-26-0001')).toBeDefined();
    const createBtn = screen.getByText('Create Invoice');
    fireEvent.click(createBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/supplier/certificates?createInvoiceFor=cert-1');
  });

  it('SupplyChainDashboard renders review queue and alert items', async () => {
    vi.spyOn(supplyChainDashboardRepository, 'getDashboardData').mockResolvedValue({
      metrics: {
        totalPOsCount: 24,
        invoicesAwaitingReviewCount: 7,
        returnedForCorrectionCount: 3,
        approvedToFinanceCount: 14,
      },
      pipeline: [
        { id: 'submitted', label: 'Submitted', count: 7, statusCode: 'SUBMITTED', color: 'brand' },
        { id: 'returned', label: 'Returned', count: 3, statusCode: 'RETURNED', color: 'danger' },
        { id: 'resubmitted', label: 'Resubmitted', count: 2, statusCode: 'RESUBMITTED', color: 'brand' },
        { id: 'approved', label: 'Approved', count: 14, statusCode: 'SC_APPROVED', color: 'success' },
      ],
      alerts: [
        {
          id: 'waiting-5-days',
          label: '2 invoices waiting > 5 days',
          count: 2,
          type: 'aging',
        },
      ],
      reviewQueue: [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-SI-26-0011',
          supplierName: 'Prime Power Ltd',
          poNumber: '4500015358',
          amount: 13204885.49,
          currency: 'TZS',
          submittedAt: '08 Sep 2026',
          waitingDays: 2,
        },
      ],
    });

    render(
      <MemoryRouter>
        <SupplyChainDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText('Supply Chain Dashboard')).toBeDefined();
    expect(screen.getByText('Invoices Awaiting Review')).toBeDefined();
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);

    // Verify Alert Item
    expect(screen.getByText('2 invoices waiting > 5 days')).toBeDefined();

    // Verify Review Queue & Click
    expect(screen.getByText('Invoices Requiring Review')).toBeDefined();
    expect(screen.getByText('INV-SI-26-0011')).toBeDefined();
    const reviewBtn = screen.getByText('Review');
    fireEvent.click(reviewBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/supply-chain?reviewInvoiceId=inv-1');
  });

  it('FinanceDashboard renders liability metrics, payment position and queue', async () => {
    vi.spyOn(financeDashboardRepository, 'getDashboardData').mockResolvedValue({
      metrics: {
        approvedLiability: 82450000.0,
        outstanding: 41200000.0,
        dueOrOverdue: 12700000.0,
        settled: 41250000.0,
        currency: 'TZS',
      },
      paymentPositions: [
        { id: 'paid', label: 'Paid', amount: 41250000, percentage: 50, color: 'success' },
        { id: 'not-yet-due', label: 'Not yet due', amount: 28500000, percentage: 35, color: 'neutral' },
        { id: 'due', label: 'Due', amount: 8200000, percentage: 10, color: 'warning' },
        { id: 'overdue', label: 'Overdue', amount: 4500000, percentage: 5, color: 'danger' },
      ],
      obligations: [
        { id: 'due-today', label: 'Due today', count: 2, amount: 4200000, type: 'today' },
      ],
      paymentQueue: [
        {
          id: 'inv-fin-1',
          invoiceNumber: 'INV-SI-26-0010',
          supplierName: 'Prime Power Ltd',
          poNumber: '4500015358',
          dueDate: '18 Sep 2026',
          outstandingAmount: 8000000,
          ageDays: 4,
          status: 'SC_APPROVED',
          currency: 'TZS',
        },
      ],
    });

    render(
      <MemoryRouter>
        <FinanceDashboard />
      </MemoryRouter>
    );

    expect(await screen.findByText('Finance Dashboard')).toBeDefined();
    expect(screen.getByText('Approved Liability')).toBeDefined();
    expect(screen.getByText('Outstanding')).toBeDefined();
    expect(screen.getByText('Due / Overdue')).toBeDefined();
    expect(screen.getByText('Settled')).toBeDefined();

    // Verify Payment Position
    expect(screen.getByText('Payment Position')).toBeDefined();
    expect(screen.getByText('Paid')).toBeDefined();

    // Verify Payment Queue & Open Action
    expect(screen.getByText('Payment Queue')).toBeDefined();
    expect(screen.getByText('INV-SI-26-0010')).toBeDefined();
    const openBtn = screen.getByText('Open');
    fireEvent.click(openBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/finance?invoiceId=inv-fin-1');
  });
});
