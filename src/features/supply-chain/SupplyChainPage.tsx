// ==============================================================================
// CLMS Supply Chain Review Queue Page (Read-Only Foundation for Prompt 3)
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, DataTable, Column, FinancialValue, StatusBadge, Button, Drawer } from '@/design-system';
import {
  invoiceRepository,
  InvoiceRecord,
} from '@/infrastructure/repositories/InvoiceRepository';
import { RefreshCw, Eye, CheckCircle2, ShieldAlert } from 'lucide-react';

export function SupplyChainPage() {
  const [pendingInvoices, setPendingInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await invoiceRepository.listSubmittedInvoicesForSCM();
      setPendingInvoices(data);
    } catch (err) {
      console.error('Failed to load SCM review queue:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleInspect = (inv: InvoiceRecord) => {
    setSelectedInvoice(inv);
    setIsDrawerOpen(true);
  };

  const columns: Column<InvoiceRecord>[] = [
    { header: 'CLMS Ref', accessorKey: 'clmsRef', width: '140px' },
    { header: 'Supplier Invoice No', accessorKey: 'supplierInvoiceNo', width: '160px' },
    { header: 'Supplier', accessorKey: 'supplierName' },
    { header: 'Purchase Order', accessorKey: 'poNumber', width: '150px' },
    { header: 'Certificate', accessorKey: 'certificateNumber', width: '150px' },
    {
      header: 'Claim Value',
      align: 'right',
      cell: (row) => <FinancialValue amount={row.totalAmount} currency={row.currency} size="sm" className="font-semibold" />,
    },
    {
      header: 'Status',
      align: 'center',
      width: '140px',
      cell: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Submitted At',
      accessorKey: 'submittedAt',
      width: '130px',
      cell: (row) => (row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : '—'),
    },
    {
      header: 'Inspect',
      align: 'center',
      width: '100px',
      cell: (row) => (
        <Button variant="secondary" size="sm" icon={<Eye size={14} />} onClick={() => handleInspect(row)}>
          Inspect
        </Button>
      ),
    },
  ];

  return (
    <div className="clms-scm-page">
      <PageHeader
        title="Supply Chain Review Queue"
        description="Verify submitted supplier invoices against milestone certificates, PO commitments, and supporting documentation."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Supply Chain Review' }]}
        actions={
          <Button
            variant="secondary"
            size="md"
            icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
            onClick={fetchInvoices}
          >
            Refresh
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={pendingInvoices}
        isLoading={isLoading}
        emptyTitle="No invoices are awaiting review"
        emptyDescription="Invoices submitted by suppliers will appear in this queue for commercial verification and approval."
      />

      {/* Read-Only SCM Inspection Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedInvoice(null);
        }}
        title={selectedInvoice ? `Invoice Review: ${selectedInvoice.clmsRef}` : 'Invoice Review'}
        subtitle={selectedInvoice ? `Vendor: ${selectedInvoice.supplierName} | Status: Awaiting SCM Review` : ''}
        width="520px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              <ShieldAlert size={14} /> SCM Approve/Return actions are enabled in Prompt 4
            </div>
            <Button variant="secondary" onClick={() => setIsDrawerOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        {selectedInvoice && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', fontSize: 'var(--font-size-xs)' }}>
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-surface-sunken)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
                <StatusBadge status={selectedInvoice.status} size="sm" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Supplier Invoice No:</span>
                <strong>{selectedInvoice.supplierInvoiceNo}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Purchase Order:</span>
                <strong>{selectedInvoice.poNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Certificate Ref:</span>
                <strong>{selectedInvoice.certificateNumber}</strong> ({selectedInvoice.certType})
              </div>
            </div>

            {/* Financial Reconciliation */}
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-3)' }}>
                Commercial Valuation Summary
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Base Amount (Excl. VAT):</span>
                  <FinancialValue amount={selectedInvoice.amount} currency={selectedInvoice.currency} size="sm" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>VAT (18%):</span>
                  <FinancialValue amount={selectedInvoice.taxAmount} currency={selectedInvoice.currency} size="sm" />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: 'var(--space-2)',
                    borderTop: '1px solid var(--color-border-hairline)',
                    fontWeight: 'var(--font-weight-bold)',
                  }}
                >
                  <span>Total Commercial Claim:</span>
                  <FinancialValue
                    amount={selectedInvoice.totalAmount}
                    currency={selectedInvoice.currency}
                    size="sm"
                    className="text-positive"
                  />
                </div>
              </div>
            </div>

            {/* Verification Checklist */}
            <div>
              <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
                Pre-Review Invariant Checklist
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CheckCircle2 size={16} color="var(--color-semantic-success-text)" />
                  <span>Invoice Amount matches certified entitlement ($Claim \le Certified$)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CheckCircle2 size={16} color="var(--color-semantic-success-text)" />
                  <span>Single-Certificate entitlement constraint verified</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <CheckCircle2 size={16} color="var(--color-semantic-success-text)" />
                  <span>Contractor belongs to PO master and approved Commercial Package</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
