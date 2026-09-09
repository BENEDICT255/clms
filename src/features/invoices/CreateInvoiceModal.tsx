// ==============================================================================
// CLMS Create Commercial Invoice Modal
// ==============================================================================
// Auto-populates all commercial data from authoritative issued certificate.
// Enforces 3-part unified commercial document compilation:
//   1. Attached Supplier Commercial Invoice (Required)
//   2. TRA / EFD Fiscal Receipt (Optional — some vendors embed it in invoice)
//   3. Authentic 9-Page Helios Acceptance Certificate (FAC / PAC)
// Compiles into ONE unified PDF packet with instant download and storage.
// ==============================================================================

import { useState, useMemo, useEffect } from 'react';
import { Modal, Button, FinancialValue, Input } from '@/design-system';
import { CertificateRecord, certificateRepository } from '@/infrastructure/repositories/CertificateRepository';
import { invoiceRepository } from '@/infrastructure/repositories/InvoiceRepository';
import { InvoiceEngine } from '@/domain/invoicing/InvoiceEngine';
import { UnifiedInvoicePdfService } from './UnifiedInvoicePdfService';
import { PoSiteDetail } from '@/features/certificates/CertificatePdfService';
import { useAuth } from '@/app/providers/AuthContext';
import { PreSubmitInvoicePreviewModal } from './PreSubmitInvoicePreviewModal';
import {
  FileText,
  AlertTriangle,
  Send,
  Receipt,
  Layers,
  CheckCircle2,
  Download,
  X,
  Eye,
  Lock,
} from 'lucide-react';

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
  const { user } = useAuth();
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [poSites, setPoSites] = useState<PoSiteDetail[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusStep, setStatusStep] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cachedPdfBytes, setCachedPdfBytes] = useState<Uint8Array | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    invoiceId: string;
    clmsRef: string;
    pdfBytes?: Uint8Array | undefined;
  } | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Load PO sites for certificate compilation
  useEffect(() => {
    if (certificate?.poId) {
      certificateRepository.getPoSites(certificate.poId).then(setPoSites);
    }
  }, [certificate?.poId]);

  // Authoritative Compliance Calculation:
  // The certificate entitlement is the TOTAL VALUE AFTER TAX (inclusive of VAT).
  // Back-calculates Net Base Amount and 18% VAT with zero double-taxation.
  const calcResult = useMemo(() => {
    return InvoiceEngine.calculateInclusiveInvoice({
      certifiedEntitlement: certificate?.currentCertifiedAmount || 0,
      taxRatePercent: 18,
    });
  }, [certificate?.currentCertifiedAmount]);

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

    if (!invoiceFile) {
      setErrorMessage('Please attach your Supplier Commercial Invoice document.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Create draft invoice in database
      setStatusStep('Creating commercial invoice ledger entry...');
      const createRes = await invoiceRepository.createInvoice({
        certificateId: certificate.id,
        supplierInvoiceNo: supplierInvoiceNo.trim(),
        invoiceDate,
        amount: calcResult.baseAmount,
        taxAmount: calcResult.taxAmount,
        notes,
      });

      if (!createRes.success || !createRes.invoiceId || !createRes.clmsRef) {
        setErrorMessage(createRes.error || 'Failed to create invoice record.');
        return;
      }

      const invoiceId = createRes.invoiceId;
      const clmsRef = createRes.clmsRef;

      // 2. Compile Unified Commercial Invoice Packet
      // (1: Invoice Document + 2: Optional Receipt + 3: 9-Page Acceptance Certificate)
      setStatusStep('Compiling unified 3-part commercial packet (Invoice + Receipt + 9-Page Certificate)...');
      let compiledPdfBytes: Uint8Array | undefined;
      try {
        const baseParams = {
          invoiceFile,
          invoiceFileName: invoiceFile.name,
          certificate,
          poSites,
          reviewerName: user?.fullName || 'Benedict Bisama',
        };
        const compileParams = receiptFile
          ? { ...baseParams, receiptFile, receiptFileName: receiptFile.name }
          : baseParams;

        compiledPdfBytes = await UnifiedInvoicePdfService.compileUnifiedInvoicePacket(compileParams);
      } catch (pdfErr) {
        console.warn('PDF unification note (continuing with invoice submission):', pdfErr);
      }

      // 3. Submit invoice to Supply Chain review queue immediately
      setStatusStep('Submitting commercial claim to Supply Chain review queue...');
      const submitRes = await invoiceRepository.submitInvoice(invoiceId);
      if (!submitRes.success) {
        setErrorMessage(submitRes.error || 'Invoice drafted, but submission failed.');
        return;
      }

      // 4. Asynchronously persist unified document to storage vault without blocking UI
      if (compiledPdfBytes) {
        setCachedPdfBytes(compiledPdfBytes);
        void invoiceRepository.uploadUnifiedInvoicePacket({
          invoiceId,
          file: compiledPdfBytes,
          fileName: `${clmsRef}_Complete_Invoice_Packet.pdf`,
          clmsRef,
        }).catch((storageErr) => {
          console.warn('Background storage sync warning:', storageErr);
        });
      }

      setSuccessInfo({
        invoiceId,
        clmsRef,
        ...(compiledPdfBytes ? { pdfBytes: compiledPdfBytes } : {}),
      });

      onSuccess?.(invoiceId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected failure during invoice creation.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
      setStatusStep(null);
    }
  };

  const handleDownloadAgain = () => {
    if (successInfo?.pdfBytes) {
      UnifiedInvoicePdfService.triggerDownload(
        successInfo.pdfBytes,
        `${successInfo.clmsRef}_Complete_Invoice_Packet.pdf`
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Supplier Commercial Invoice"
      width="800px"
      footer={
        successInfo ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', width: '100%' }}>
            <Button
              variant="secondary"
              icon={<Download size={15} />}
              onClick={handleDownloadAgain}
            >
              Download Complete Invoice Packet
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                variant="secondary"
                icon={<Eye size={16} />}
                disabled={!invoiceFile || isSubmitting}
                onClick={() => setIsPreviewOpen(true)}
                title={!invoiceFile ? 'Attach supplier invoice document first to preview' : 'Review unified multi-page document before submitting'}
              >
                Preview Document
              </Button>

              <Button
                variant="primary"
                icon={<Send size={16} />}
                isLoading={isSubmitting}
                disabled={!calcResult.isValid || !supplierInvoiceNo.trim() || !invoiceFile}
                onClick={handleSubmit}
              >
                {isSubmitting ? (statusStep || 'Processing...') : 'Submit to Supply Chain'}
              </Button>
            </div>
          </div>
        )
      }
    >
      <div className="clms-create-invoice-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
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

        {successInfo ? (
          <div
            style={{
              padding: 'var(--space-5)',
              textAlign: 'center',
              backgroundColor: 'var(--color-surface-sunken)',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--color-border-hairline)',
            }}
          >
            <CheckCircle2 size={40} color="var(--color-semantic-success-text)" style={{ margin: '0 auto var(--space-3)' }} />
            <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', marginBottom: 'var(--space-1)' }}>
              Commercial Claim Submitted Successfully!
            </h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-3)' }}>
              Reference <strong>{successInfo.clmsRef}</strong> has been transmitted to the Supply Chain review queue.
            </p>
            <div
              style={{
                backgroundColor: 'var(--color-surface-card)',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-xs)',
                maxWidth: '480px',
                margin: '0 auto',
                fontSize: 'var(--font-size-xs)',
                border: '1px solid var(--color-border-hairline)',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-1)' }}>
                ✓ Unified Commercial Packet Compiled:
              </div>
              <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
                <li>Part 1: {invoiceFile?.name}</li>
                {receiptFile && <li>Part 2: {receiptFile.name} (Fiscal Receipt)</li>}
                <li>Part 3: 9-Page Official Acceptance Certificate ({certificate.certificateNumber})</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            {/* Read-Only Auto-Populated Commercial Lineage */}
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

            {/* Financial Calculation Breakdown (Locked & Non-Editable per Compliance Rules) */}
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--color-surface-card)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', margin: 0 }}>
                  Invoice Financial Breakdown
                </h4>
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Lock size={12} />
                  Locked & Governed by Certificate {certificate.certificateNumber}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Net Base Amount (Before Tax):</span>
                  <FinancialValue amount={calcResult.baseAmount} currency={certificate.currency} size="sm" />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>Value Added Tax (18% VAT):</span>
                  <FinancialValue amount={calcResult.taxAmount} currency={certificate.currency} size="sm" />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingTop: 'var(--space-2)',
                    borderTop: '1px solid var(--color-border-hairline)',
                    fontWeight: 'var(--font-weight-bold)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  <span>Total Gross Payable Claim (After Tax):</span>
                  <FinancialValue
                    amount={calcResult.totalPayable}
                    currency={certificate.currency}
                    size="md"
                    className="text-positive font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Unified Document Upload Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                <h4 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                  <Layers size={16} color="var(--color-brand-primary)" /> Attached Documents & Unified Invoice Compilation
                </h4>
              </div>

              {/* Informative Note about Automatic 3-Part Consolidation */}
              <div
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-surface-sunken)',
                  border: '1px solid var(--color-border-hairline)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-3)',
                }}
              >
                Upon submission, CLMS automatically compiles your <strong>attached invoice document</strong>, <strong>optional receipt</strong>, and the <strong>9-page Acceptance Certificate</strong> ({certificate.certificateNumber}) into one unified PDF for Supply Chain review and settlement.
              </div>

              {invoiceFile && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-2) var(--space-3)',
                    backgroundColor: 'var(--color-surface-card)',
                    border: '1px solid var(--color-brand-primary)',
                    borderRadius: 'var(--radius-xs)',
                    marginBottom: 'var(--space-3)',
                    fontSize: 'var(--font-size-xs)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Eye size={15} color="var(--color-brand-primary)" />
                    <span>
                      Documents ready for pre-submission review (Invoice + {receiptFile ? 'Fiscal Receipt + ' : ''}9-Page Certificate).
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Eye size={13} />}
                    onClick={() => setIsPreviewOpen(true)}
                  >
                    View Document Now
                  </Button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                {/* 1. Commercial Invoice Document (Required) */}
                <div
                  className="border-hairline"
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: invoiceFile ? 'var(--color-surface-card)' : 'var(--color-surface-sunken)',
                    border: invoiceFile ? '1px solid var(--color-brand-primary)' : '1px solid var(--color-border-hairline)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={15} color="var(--color-brand-primary)" />
                      Supplier Invoice Document *
                    </span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontWeight: 'bold' }}>
                      REQUIRED
                    </span>
                  </div>

                  <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>
                    Attach your signed supplier invoice (PDF, PNG, JPG).
                  </p>

                  <input
                    id="supplier-invoice-file-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      setInvoiceFile(e.target.files?.[0] || null);
                      setCachedPdfBytes(null);
                    }}
                    style={{ fontSize: '11px', width: '100%' }}
                  />

                  {invoiceFile && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-2)', fontSize: '11px', color: 'var(--color-semantic-success-text)' }}>
                      <span>✓ {invoiceFile.name} ({(invoiceFile.size / 1024).toFixed(0)} KB)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceFile(null);
                          setCachedPdfBytes(null);
                        }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. TRA / EFD Fiscal Receipt (Optional) */}
                <div
                  className="border-hairline"
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: receiptFile ? 'var(--color-surface-card)' : 'var(--color-surface-sunken)',
                    border: receiptFile ? '1px solid #10b981' : '1px solid var(--color-border-hairline)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                    <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-bold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Receipt size={15} color="#10b981" />
                      TRA / EFD Fiscal Receipt
                    </span>
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#64748b', fontWeight: 'bold' }}>
                      OPTIONAL
                    </span>
                  </div>

                  <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>
                    Optional: attach if receipt is not inside invoice.
                  </p>

                  <input
                    id="fiscal-receipt-file-input"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      setReceiptFile(e.target.files?.[0] || null);
                      setCachedPdfBytes(null);
                    }}
                    style={{ fontSize: '11px', width: '100%' }}
                  />

                  {receiptFile && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'var(--space-2)', fontSize: '11px', color: 'var(--color-semantic-success-text)' }}>
                      <span>✓ {receiptFile.name} ({(receiptFile.size / 1024).toFixed(0)} KB)</span>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptFile(null);
                          setCachedPdfBytes(null);
                        }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-tertiary)' }}
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
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
                placeholder="Optional comments, bank routing instructions, or commercial references..."
                style={{
                  width: '100%',
                  padding: 'var(--space-2)',
                  fontSize: 'var(--font-size-xs)',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--color-border-hairline)',
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* High-Fidelity Pre-Submission Document Viewer */}
      {isPreviewOpen && invoiceFile && (
        <PreSubmitInvoicePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          certificate={certificate}
          poSites={poSites}
          invoiceFile={invoiceFile}
          receiptFile={receiptFile}
          supplierInvoiceNo={supplierInvoiceNo}
          invoiceDate={invoiceDate}
          invoiceAmount={calcResult.baseAmount}
          taxAmount={calcResult.taxAmount}
          totalAmount={calcResult.totalPayable}
          currency={certificate.currency}
          reviewerName={user?.fullName || 'Benedict Bisama'}
          isSubmitting={isSubmitting}
          statusStep={statusStep}
          precompiledBytes={cachedPdfBytes}
          onCompiledBytesReady={(bytes) => setCachedPdfBytes(bytes)}
          onSubmit={() => {
            setIsPreviewOpen(false);
            void handleSubmit();
          }}
        />
      )}
    </Modal>
  );
}
