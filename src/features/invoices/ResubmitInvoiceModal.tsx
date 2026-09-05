// ==============================================================================
// CLMS Resubmit Corrected Invoice Modal
// ==============================================================================
// Governed by PRODUCT.md Section 27.2:
// - Corrects documentary/clerical defects on returned invoices
// - Certificate commercial entitlement remains strictly immutable
// - Transitions status from RETURNED to RESUBMITTED
// ==============================================================================

import { useState } from 'react';
import { Modal, Button, Input, Alert, FinancialValue } from '@/design-system';
import { InvoiceRecord, invoiceRepository } from '@/infrastructure/repositories/InvoiceRepository';
import { SupplyChainEngine } from '@/domain/supply-chain/SupplyChainEngine';
import { RefreshCw, Send, Lock, AlertCircle } from 'lucide-react';

interface ResubmitInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceRecord | null;
  onSuccess: () => void;
}

export function ResubmitInvoiceModal({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}: ResubmitInvoiceModalProps) {
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState(invoice?.supplierInvoiceNo || '');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0] ?? ''
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!invoice) return null;

  const handleResubmit = async () => {
    const validation = SupplyChainEngine.validateResubmission({
      supplierInvoiceNo,
      invoiceDate,
      notes,
    });

    if (!validation.isValid) {
      setError(validation.errors[0] ?? 'Please verify submission fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await invoiceRepository.resubmitInvoice({
        invoiceId: invoice.id,
        supplierId: invoice.supplierId,
        supplierInvoiceNo,
        invoiceDate,
        notes,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to resubmit invoice.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error resubmitting invoice';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={`Correct & Resubmit: ${invoice.clmsRef}`}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
          <Button variant="secondary" size="md" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={isSubmitting}
            icon={isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            onClick={handleResubmit}
          >
            {isSubmitting ? 'Resubmitting...' : 'Resubmit to Supply Chain'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginTop: '-8px', marginBottom: 'var(--space-1)' }}>
          Certificate: <strong>{invoice.certificateNumber}</strong> ({invoice.certType})
        </div>

        {error && (
          <Alert type="danger" title="Validation Error">
            {error}
          </Alert>
        )}

        <div
          style={{
            padding: 'var(--space-3)',
            backgroundColor: 'var(--color-surface-sunken)',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            gap: 'var(--space-2)',
          }}
        >
          <AlertCircle size={18} color="var(--color-brand-primary)" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            This invoice was returned by Supply Chain. Update the required commercial reference details or
            replace documents below. The underlying certified commercial entitlement remains strictly locked.
          </div>
        </div>

        {/* Locked Commercial Position */}
        <div
          className="border-hairline"
          style={{
            padding: 'var(--space-3)',
            backgroundColor: 'var(--color-surface-card)',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} /> Certified Entitlement (Locked)
            </span>
            <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
              {invoice.certificateNumber} ({invoice.certType})
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>Total Claim</span>
            <FinancialValue amount={invoice.totalAmount} currency={invoice.currency} size="sm" className="font-semibold" />
          </div>
        </div>

        {/* Editable Fields */}
        <div>
          <label
            htmlFor="resubmit-invoice-no"
            style={{
              display: 'block',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-1)',
            }}
          >
            Corrected Supplier Invoice Number *
          </label>
          <Input
            id="resubmit-invoice-no"
            value={supplierInvoiceNo}
            onChange={(e) => setSupplierInvoiceNo(e.target.value)}
            placeholder="e.g. TAX-INV-2026-0042"
          />
        </div>

        <div>
          <label
            htmlFor="resubmit-invoice-date"
            style={{
              display: 'block',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-1)',
            }}
          >
            Invoice Issuance Date *
          </label>
          <Input
            id="resubmit-invoice-date"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
        </div>

        <div>
          <label
            htmlFor="resubmit-notes"
            style={{
              display: 'block',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-1)',
            }}
          >
            Correction Explanation Notes (Optional)
          </label>
          <textarea
            id="resubmit-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Explain corrections made in response to Supply Chain feedback..."
            style={{
              width: '100%',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--color-border-hairline)',
              backgroundColor: 'var(--color-surface-card)',
              color: 'var(--color-text-primary)',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>
      </div>
    </Modal>
  );
}
