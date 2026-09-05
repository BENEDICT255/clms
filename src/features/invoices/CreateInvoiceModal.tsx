// ==============================================================================
// CLMS Create Commercial Invoice Modal
// ==============================================================================
// Auto-populates all commercial data from authoritative issued certificate.
// Supplier enters only invoice-specific fields: Supplier Invoice Number,
// Invoice Date, Tax adjustments, supporting documents, and signed invoice upload.

import { useState, useMemo } from 'react';
import { Modal, Button, FinancialValue, Input } from '@/design-system';
import { CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';
import { invoiceRepository } from '@/infrastructure/repositories/InvoiceRepository';
import { InvoiceEngine } from '@/domain/invoicing/InvoiceEngine';
import { FileText, UploadCloud, AlertTriangle, Send } from 'lucide-react';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: CertificateRecord | null;
  onSuccess?: (invoiceId: string) => void;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  certificate,
  onSuccess,
}: CreateInvoiceModalProps) {
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceAmount, setInvoiceAmount] = useState<number>(certificate?.currentCertifiedAmount || 0);
  const [notes, setNotes] = useState('');
  const [supportingFile, setSupportingFile] = useState<File | null>(null);
  const [signedInvoiceFile, setSignedInvoiceFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Live domain calculations
  const calcResult = useMemo(() => {
    return InvoiceEngine.calculateInvoice({
      certifiedEntitlement: certificate?.currentCertifiedAmount || 0,
      invoiceAmount: Number(invoiceAmount) || 0,
      taxRatePercent: 18,
    });
  }, [certificate?.currentCertifiedAmount, invoiceAmount]);

  if (!certificate) return null;

  const handleSubmit = async () => {
    if (!supplierInvoiceNo.trim()) {
      setErrorMessage('Supplier Legal Invoice Number is required.');
      return;
    }

    if (!calcResult.isValid) {
      setErrorMessage(calcResult.errors[0] || 'Invalid invoice amount.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Create draft invoice
      const createRes = await invoiceRepository.createInvoice({
        certificateId: certificate.id,
        supplierInvoiceNo: supplierInvoiceNo.trim(),
        invoiceDate,
        amount: calcResult.baseAmount,
        taxAmount: calcResult.taxAmount,
        notes,
      });

      if (!createRes.success || !createRes.invoiceId) {
        setErrorMessage(createRes.error || 'Failed to create invoice record.');
        return;
      }

      // 2. Submit invoice to Supply Chain
      const submitRes = await invoiceRepository.submitInvoice(createRes.invoiceId);
      if (!submitRes.success) {
        setErrorMessage(submitRes.error || 'Invoice drafted, but submission failed.');
        return;
      }

      onSuccess?.(createRes.invoiceId);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected failure during invoice creation.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Supplier Commercial Invoice"
      width="760px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>

          <Button
            variant="primary"
            icon={<Send size={16} />}
            isLoading={isSubmitting}
            disabled={!calcResult.isValid || !supplierInvoiceNo.trim()}
            onClick={handleSubmit}
          >
            Submit to Supply Chain
          </Button>
        </div>
      }
    >
      <div className="clms-create-invoice-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        {errorMessage && (
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--color-semantic-error-bg)',
              color: 'var(--color-semantic-error-text)',
              borderRadius: 'var(--radius-xs)',
              fontSize: 'var(--font-size-xs)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Read-Only Auto-Populated Commercial Foundation */}
        <div
          className="border-hairline"
          style={{
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'var(--color-surface-sunken)',
          }}
        >
          <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
            LOCKED COMMERCIAL LINEAGE (AUTO-POPULATED FROM ISSUED CERTIFICATE)
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-3)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <div>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Certificate Ref</span>
              <strong>{certificate.certificateNumber}</strong> ({certificate.certType})
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Purchase Order</span>
              <strong>{certificate.poNumber}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Supplier</span>
              <strong>{certificate.supplierName}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Project</span>
              <strong>{certificate.projectName}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Certified Sites</span>
              <strong>{certificate.siteCount} sites</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Invoiceable Entitlement</span>
              <FinancialValue
                amount={certificate.currentCertifiedAmount}
                currency={certificate.currency}
                size="sm"
                className="font-bold text-positive"
              />
            </div>
          </div>
        </div>

        {/* Supplier Specific Input Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <div>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', display: 'block', marginBottom: 'var(--space-1)' }}>
              Supplier / Legal Invoice Number *
            </label>
            <Input
              placeholder="e.g. INV-2026-TZ-0089"
              value={supplierInvoiceNo}
              onChange={(e) => setSupplierInvoiceNo(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', display: 'block', marginBottom: 'var(--space-1)' }}>
              Invoice Issue Date *
            </label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Financial Calculation Breakdown */}
        <div
          className="border-hairline"
          style={{
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-3)' }}>
            Invoice Financial Breakdown
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Base Amount (Excl. Tax):</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <input
                  type="number"
                  value={invoiceAmount}
                  max={certificate.currentCertifiedAmount}
                  onChange={(e) => setInvoiceAmount(parseFloat(e.target.value) || 0)}
                  style={{
                    width: '140px',
                    textAlign: 'right',
                    padding: 'var(--space-1) var(--space-2)',
                    fontSize: 'var(--font-size-xs)',
                  }}
                />
                <span>{certificate.currency}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Value Added Tax (18% VAT):</span>
              <FinancialValue amount={calcResult.taxAmount} currency={certificate.currency} size="sm" />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: 'var(--space-2)',
                borderTop: '1px solid var(--color-border-hairline)',
                fontWeight: 'var(--font-weight-bold)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              <span>Total Gross Payable Claim:</span>
              <FinancialValue
                amount={calcResult.totalPayable}
                currency={certificate.currency}
                size="md"
                className="text-positive"
              />
            </div>
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', display: 'block', marginBottom: 'var(--space-1)' }}>
            Invoice Notes / Payment Instructions
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional supplier comments or bank routing details..."
            style={{
              width: '100%',
              padding: 'var(--space-2)',
              fontSize: 'var(--font-size-xs)',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--color-border-hairline)',
            }}
          />
        </div>

        {/* Supporting Documents & Signed Invoice Upload */}
        <div>
          <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
            Supporting Commercial Documents & Signed Copy
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-xs)',
                textAlign: 'center',
                backgroundColor: 'var(--color-surface-sunken)',
              }}
            >
              <FileText size={20} color="var(--color-text-secondary)" style={{ margin: '0 auto var(--space-2)' }} />
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Tax Invoice / Delivery Note
              </div>
              <input
                type="file"
                accept=".pdf,.png,.jpg"
                onChange={(e) => setSupportingFile(e.target.files?.[0] || null)}
                style={{ fontSize: '10px' }}
              />
              {supportingFile && (
                <div style={{ fontSize: '10px', color: 'var(--color-semantic-success-text)', marginTop: 'var(--space-1)' }}>
                  ✓ {supportingFile.name}
                </div>
              )}
            </div>

            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-xs)',
                textAlign: 'center',
                backgroundColor: 'var(--color-surface-sunken)',
              }}
            >
              <UploadCloud size={20} color="var(--color-brand-primary)" style={{ margin: '0 auto var(--space-2)' }} />
              <div style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)', marginBottom: 'var(--space-1)' }}>
                Signed Invoice Copy (Optional)
              </div>
              <input
                type="file"
                accept=".pdf,.png,.jpg"
                onChange={(e) => setSignedInvoiceFile(e.target.files?.[0] || null)}
                style={{ fontSize: '10px' }}
              />
              {signedInvoiceFile && (
                <div style={{ fontSize: '10px', color: 'var(--color-semantic-success-text)', marginTop: 'var(--space-1)' }}>
                  ✓ {signedInvoiceFile.name}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
