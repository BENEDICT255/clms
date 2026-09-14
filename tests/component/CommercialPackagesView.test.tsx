import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommercialPackagesPage } from '@/features/commercial-packages/CommercialPackagesPage';
import { commercialPackageRepository } from '@/infrastructure/repositories/CommercialPackageRepository';
import { CommercialPackageRecord } from '@/domain/commercial/types';

// Mock AuthContext
vi.mock('@/app/providers/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-1',
      email: 'admin@heliosclms.com',
      fullName: 'Helios Project Lead',
    },
    can: () => true,
  }),
}));

// Mock Supabase storage
vi.mock('@/infrastructure/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        download: vi.fn().mockResolvedValue({
          data: Object.assign(new Blob(['%PDF-1.4 test']), {
            arrayBuffer: async () => new ArrayBuffer(8),
          }),
          error: null,
        }),
      })),
    },
  },
}));

describe('CommercialPackagesPage PO & BOQ Viewing', () => {
  const mockPackages: CommercialPackageRecord[] = [
    {
      id: 'pkg-uuid-001',
      projectId: 'proj-001',
      projectName: 'Site Improvement (Oversite Aggregates and Concrete)',
      packageRef: 'CP-26-0001',
      status: 'ACTIVE',
      createdAt: '2026-09-13T10:00:00Z',
      updatedAt: '2026-09-13T10:00:00Z',
      poId: 'po-uuid-001',
      poNumber: '4500015358',
      supplierName: 'PRIME POWER T LTD',
      authorizedAmount: 123512849.94,
      currency: 'TZS',
    },
  ];

  const mockDetails = {
    packageRef: 'CP-26-0001',
    projectName: 'Site Improvement (Oversite Aggregates and Concrete)',
    supplierName: 'PRIME POWER T LTD',
    poNumber: '4500015358',
    poId: 'po-uuid-001',
    authorizedAmount: 123512849.94,
    currency: 'TZS',
    status: 'ACTIVE' as const,
    createdAt: '2026-09-13T10:00:00Z',
    templateVersion: 'Site Improvement Standard',
    sites: [
      {
        id: 'site-1',
        siteIdExt: 'TZ-DAR-001',
        siteName: 'Dar Posta Tower',
        region: 'Dar es Salaam',
        authorizedAmount: 50000000,
        scopeDescription: 'Civil works and concrete slab',
      },
      {
        id: 'site-2',
        siteIdExt: 'TZ-DAR-002',
        siteName: 'Kariakoo Hub',
        region: 'Dar es Salaam',
        authorizedAmount: 73512849.94,
        scopeDescription: 'Aggregate laying and paving',
      },
    ],
    documents: [
      {
        id: 'doc-boq-1',
        documentType: 'BOQ_SOURCE',
        fileName: 'Approved_BOQ_CP-26-0001.xlsx',
        fileSize: 45200,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        storagePath: 'packages/source/boq_test.xlsx',
      },
      {
        id: 'doc-po-1',
        documentType: 'PO_SOURCE',
        fileName: 'PO_4500015358_PrimePower.pdf',
        fileSize: 128400,
        mimeType: 'application/pdf',
        storagePath: 'purchase-orders/source/po_test.pdf',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(commercialPackageRepository, 'listPackages').mockResolvedValue(mockPackages);
    vi.spyOn(commercialPackageRepository, 'getPackageDetails').mockResolvedValue(mockDetails);
  });

  it('renders clickable Package Ref and Purchase Order with View PO and View BOQ action buttons', async () => {
    render(<CommercialPackagesPage />);

    // Table rows load
    const packageRefBtn = await screen.findByRole('button', { name: /CP-26-0001/i });
    expect(packageRefBtn).toBeInTheDocument();

    const poNumberBtn = screen.getByRole('button', { name: /4500015358/i });
    expect(poNumberBtn).toBeInTheDocument();

    const viewPoBtn = screen.getByRole('button', { name: /view po/i });
    expect(viewPoBtn).toBeInTheDocument();

    const viewBoqBtn = screen.getByRole('button', { name: /view boq/i });
    expect(viewBoqBtn).toBeInTheDocument();
  });

  it('opens detail modal to BOQ schedule when View BOQ is clicked', async () => {
    render(<CommercialPackagesPage />);

    const viewBoqBtn = await screen.findByRole('button', { name: /view boq/i });
    fireEvent.click(viewBoqBtn);

    await waitFor(() => {
      expect(screen.getByText(/Authorized Site Allocations/i)).toBeInTheDocument();
      expect(screen.getByText('TZ-DAR-001')).toBeInTheDocument();
      expect(screen.getByText('Dar Posta Tower')).toBeInTheDocument();
      expect(screen.getByText('TZ-DAR-002')).toBeInTheDocument();
      expect(screen.getByText('Kariakoo Hub')).toBeInTheDocument();
    });
  });

  it('opens detail modal to Purchase Order contract when View PO is clicked', async () => {
    render(<CommercialPackagesPage />);

    const viewPoBtn = await screen.findByRole('button', { name: /view po/i });
    fireEvent.click(viewPoBtn);

    await waitFor(() => {
      expect(screen.getByText(/Purchase Order: 4500015358/i)).toBeInTheDocument();
      const downloadButtons = screen.getAllByRole('button', { name: /download po/i });
      expect(downloadButtons.length).toBeGreaterThanOrEqual(1);
    });
  });
});
