// ==============================================================================
// CLMS Create & Manage Commercial Invoice Workspace Modal
// ==============================================================================
// Governed by Stabilization Sections 19, 20, 21, 22, 23, 24, 26, 29, 50, 51:
// - Explicit Draft lifecycle: Creating an invoice results in DRAFT.
//   No auto-submission. Supplier can save, leave, return, and submit later.
// - Real document upload pipeline: Files uploaded to private storage, SHA-256
//   computed, and metadata recorded in commercial_documents before green checkmark.
// - Document roles: SUPPLIER_INVOICE, TAX_RECEIPT, SUPPORTING_DOCUMENT.
// - Multiple supporting documents: add, inspect, and remove while in DRAFT.
// - Full submission packet preview (Section A + B + C) via DocumentViewer.
// - Safe Draft Discard via invoiceRepository.deleteDraft with storage cleanup.
// - Zero hardcoded reviewer/commercial data.
// ==============================================================================

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Modal, Button, FinancialValue, Input, Alert } from '@/design-system';
import { CertificateRecord, certificateRepository } from '@/infrastructure/repositories/CertificateRepository';
import {
  invoiceRepository,
  InvoiceDocumentRecord,
} from '@/infrastructure/repositories/InvoiceRepository';
import { InvoiceEngine } from '@/domain/invoicing/InvoiceEngine';
import { PoSiteDetail } from '@/application/services/CertificatePacketService';
import { InvoicePacketService, SupportingDocumentItem } from '@/application/services/InvoicePacketService';
import { useAuth } from '@/app/providers/AuthContext';
import { PreSubmitInvoicePreviewModal } from './PreSubmitInvoicePreviewModal';
import {
  FileText,
  Send,
  Receipt,
  Layers,
  Eye,
  Lock,
  Trash2,
  Plus,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { documentStorageService } from '@/infrastructure/storage/DocumentStorageService';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: CertificateRecord | null;
  existingDraftId?: string | null | undefined;
  onSuccess?: (invoiceId: string) => void;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  certificate,
  existingDraftId,
  onSuccess,
}: CreateInvoiceModalProps) {
  const { user } = useAuth();
  const [draftInvoiceId, setDraftInvoiceId] = useState<string | null>(existingDraftId || null);
  const [clmsRef, setClmsRef] = useState<string | null>(null);

  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  // Attached Real Documents in Storage
  const [uploadedDocs, setUploadedDocs] = useState<InvoiceDocumentRecord[]>([]);
  const [isUploadingPrimary, setIsUploadingPrimary] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [isUploadingSupporting, setIsUploadingSupporting] = useState(false);

  // Local File References (for immediate packet compilation & upload)
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);

  const [poSites, setPoSites] = useState<PoSiteDetail[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isDiscardingDraft, setIsDiscardingDraft] = useState(false);
  const [statusStep, setStatusStep] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [cachedPacketBytes, setCachedPacketBytes] = useState<Uint8Array | null>(null);

  // Load PO sites for certificate compilation
  useEffect(() => {
    if (certificate?.poId) {
      certificateRepository.getPoSites(certificate.poId).then(setPoSites);
    }
  }, [certificate?.poId]);

  // Authoritative Compliance Calculation:
  // Entitlement is TOTAL VALUE AFTER TAX (inclusive of VAT).
  const calcResult = useMemo(() => {
    return InvoiceEngine.calculateInclusiveInvoice({
      certifiedEntitlement: certificate?.currentCertifiedAmount || 0,
      taxRatePercent: 18,
    });
  }, [certificate?.currentCertifiedAmount]);

  // Load existing draft if available
  const loadExistingDraft = useCallback(async () => {
    if (!certificate) return;

    try {
      // Find if an active draft exists for this certificate
      const allInvoices = await invoiceRepository.listInvoices({
        supplierId: user?.supplierId ?? undefined,
        status: 'DRAFT',
      });

      const matching = allInvoices.find(
        (inv) => inv.certificateId === certificate.id || inv.id === existingDraftId
      );

      if (matching) {
        setDraftInvoiceId(matching.id);
        setClmsRef(matching.clmsRef);
        setSupplierInvoiceNo(matching.supplierInvoiceNo !== '—' ? matching.supplierInvoiceNo : '');
        if (matching.invoiceDate) setInvoiceDate(matching.invoiceDate.slice(0, 10));
        if (matching.notes) setNotes(matching.notes);

        // Fetch documents already uploaded to this draft
        const docs = await invoiceRepository.listInvoiceDocuments(matching.id);
        setUploadedDocs(docs);
      }
    } catch (err) {
      console.warn('[CreateInvoiceModal] Error loading existing draft:', err);
    }
  }, [certificate, existingDraftId, user?.supplierId]);

  useEffect(() => {
    if (isOpen) {
      loadExistingDraft();
    } else {
      // Reset state on close
      setDraftInvoiceId(null);
      setClmsRef(null);
      setSupplierInvoiceNo('');
      setPrimaryFile(null);
      setReceiptFile(null);
      setSupportingFiles([]);
      setUploadedDocs([]);
      setCachedPacketBytes(null);
      setErrorMessage(null);
      setFeedbackMessage(null);
    }
  }, [isOpen, loadExistingDraft]);

  if (!certificate) return null;

  // Primary supplier invoice uploaded?
  const primaryDoc = uploadedDocs.find((d) => d.documentType === 'SUPPLIER_INVOICE');
  const receiptDoc = uploadedDocs.find((d) => d.documentType === 'TAX_RECEIPT');
  const supportingDocsList = uploadedDocs.filter((d) => d.documentType === 'SUPPORTING_DOCUMENT');

  /**
   * Helper to ensure a DRAFT record exists in PostgreSQL before uploading documents.
   */
  const ensureDraftExists = async (): Promise<{ invoiceId: string; clmsRef: string } | null> => {
    if (draftInvoiceId && clmsRef) {
      return { invoiceId: draftInvoiceId, clmsRef };
    }

    if (!supplierInvoiceNo.trim()) {
      setErrorMessage('Please enter your Supplier Legal Invoice Number before attaching files.');
      return null;
    }

    const res = await invoiceRepository.createInvoice({
      certificateId: certificate.id,
      supplierInvoiceNo: supplierInvoiceNo.trim(),
      invoiceDate,
      amount: calcResult.baseAmount,
      taxAmount: calcResult.taxAmount,
      notes: notes.trim() || undefined,
    });

    if (!res.success || !res.invoiceId || !res.clmsRef) {
      setErrorMessage(res.error || 'Failed to create invoice draft.');
      return null;
    }

    setDraftInvoiceId(res.invoiceId);
    setClmsRef(res.clmsRef);
    return { invoiceId: res.invoiceId, clmsRef: res.clmsRef };
  };

  /**
   * Real upload handler for primary supplier invoice.
   */
  const handlePrimaryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsUploadingPrimary(true);

    try {
      const draft = await ensureDraftExists();
      if (!draft) return;

      setPrimaryFile(file);
      const res = await invoiceRepository.uploadInvoiceDocument({
        invoiceId: draft.invoiceId,
        file,
        fileName: file.name,
        documentRole: 'SUPPLIER_INVOICE',
      });

      if (!res.success) throw new Error(res.error || 'Primary invoice upload failed');

      const docs = await invoiceRepository.listInvoiceDocuments(draft.invoiceId);
      setUploadedDocs(docs);
      setFeedbackMessage(`Uploaded & verified: ${file.name} (${Math.round(file.size / 1024)} KB)`);
      setCachedPacketBytes(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Primary invoice upload failed';
      setErrorMessage(`Upload failed: ${msg}`);
      setPrimaryFile(null);
    } finally {
      setIsUploadingPrimary(false);
      e.target.value = '';
    }
  };

  /**
   * Real upload handler for optional fiscal receipt.
   */
  const handleReceiptFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setIsUploadingReceipt(true);

    try {
      const draft = await ensureDraftExists();
      if (!draft) return;

      setReceiptFile(file);
      const res = await invoiceRepository.uploadInvoiceDocument({
        invoiceId: draft.invoiceId,
        file,
        fileName: file.name,
        documentRole: 'TAX_RECEIPT',
      });

      if (!res.success) throw new Error(res.error || 'Fiscal receipt upload failed');

      const docs = await invoiceRepository.listInvoiceDocuments(draft.invoiceId);
      setUploadedDocs(docs);
      setFeedbackMessage(`Fiscal receipt attached: ${file.name}`);
      setCachedPacketBytes(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fiscal receipt upload failed';
      setErrorMessage(`Upload failed: ${msg}`);
      setReceiptFile(null);
    } finally {
      setIsUploadingReceipt(false);
      e.target.value = '';
    }
  };

  /**
   * Real upload handler for multiple supporting annexes.
   */
  const handleSupportingFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMessage(null);
    setIsUploadingSupporting(true);

    try {
      const draft = await ensureDraftExists();
      if (!draft) return;

      const newFiles: File[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const res = await invoiceRepository.uploadInvoiceDocument({
          invoiceId: draft.invoiceId,
          file,
          fileName: file.name,
          documentRole: 'SUPPORTING_DOCUMENT',
        });
        if (!res.success) throw new Error(res.error || `Failed to upload ${file.name}`);
        newFiles.push(file);
      }

      const docs = await invoiceRepository.listInvoiceDocuments(draft.invoiceId);
      setUploadedDocs(docs);
      setSupportingFiles((prev) => [...prev, ...newFiles]);
      setFeedbackMessage(`Added ${newFiles.length} supporting annex(es).`);
      setCachedPacketBytes(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Supporting document upload failed';
      setErrorMessage(`Upload failed: ${msg}`);
    } finally {
      setIsUploadingSupporting(false);
      e.target.value = '';
    }
  };

  /**
   * Removes an uploaded draft document from PostgreSQL metadata and private storage.
   */
  const handleRemoveDocument = async (docId: string) => {
    if (!draftInvoiceId) return;
    try {
      await invoiceRepository.deleteDraftDocument(docId, draftInvoiceId);
      setUploadedDocs((prev) => prev.filter((d) => d.id !== docId));
      setCachedPacketBytes(null);
      setFeedbackMessage('Draft document removed successfully.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove document';
      setErrorMessage(msg);
    }
  };

  /**
   * Saves changes to the draft invoice in the database without submitting.
   */
  const handleSaveDraft = async () => {
    if (!supplierInvoiceNo.trim()) {
      setErrorMessage('Supplier Legal Invoice Number is required to save a draft.');
      return;
    }

    setIsSavingDraft(true);
    setErrorMessage(null);

    try {
      const draft = await ensureDraftExists();
      if (!draft) return;

      setFeedbackMessage(`Draft invoice ${draft.clmsRef} saved. You may return to edit or submit later.`);
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save draft';
      setErrorMessage(msg);
    } finally {
      setIsSavingDraft(false);
    }
  };

  /**
   * Discards the draft invoice and purges all staged storage files.
   */
  const handleDiscardDraft = async () => {
    if (!draftInvoiceId) {
      onClose();
      return;
    }

    if (!window.confirm('Are you sure you want to discard this draft invoice and all attached files?')) {
      return;
    }

    setIsDiscardingDraft(true);
    setErrorMessage(null);

    try {
      const res = await invoiceRepository.deleteDraft(draftInvoiceId);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to discard draft.');
        return;
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to discard draft';
      setErrorMessage(msg);
    } finally {
      setIsDiscardingDraft(false);
    }
  };

  /**
   * Prepares and opens continuous multi-page submission packet preview.
   */
  const handleOpenPreview = async () => {
    if (!primaryDoc && !primaryFile) {
      setErrorMessage('Please attach your Supplier Commercial Invoice document first.');
      return;
    }
    setIsPreviewOpen(true);
  };

  /**
   * Final Submission to Supply Chain Review Queue.
   * Compiles and persists authoritative packet snapshot (Section 27),
   * then transitions status to SUBMITTED.
   */
  const handleConfirmSubmit = async () => {
    if (!draftInvoiceId || !clmsRef) {
      setErrorMessage('Draft invoice not established. Please save your draft first.');
      return;
    }

    if (!primaryDoc && !primaryFile) {
      setErrorMessage('Primary Supplier Invoice document is required for submission.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      setStatusStep('Compiling final authoritative commercial submission packet...');
      let finalPacketBytes = cachedPacketBytes;

      if (!finalPacketBytes) {
        // Read bytes for compilation
        let invBytes: Uint8Array | ArrayBuffer;
        if (primaryFile) {
          invBytes = await primaryFile.arrayBuffer();
        } else {
          const blob = await documentStorageService.downloadBlob(primaryDoc!.storagePath);
          invBytes = await blob.arrayBuffer();
        }

        const supportingItems: SupportingDocumentItem[] = [];
        if (receiptFile) {
          supportingItems.push({
            fileName: receiptFile.name,
            bytes: await receiptFile.arrayBuffer(),
            documentRole: 'TAX_RECEIPT',
          });
        } else if (receiptDoc) {
          const blob = await documentStorageService.downloadBlob(receiptDoc.storagePath);
          supportingItems.push({
            fileName: receiptDoc.fileName,
            bytes: await blob.arrayBuffer(),
            documentRole: 'TAX_RECEIPT',
          });
        }

        for (const sDoc of supportingDocsList) {
          try {
            const blob = await documentStorageService.downloadBlob(sDoc.storagePath);
            supportingItems.push({
              fileName: sDoc.fileName,
              bytes: await blob.arrayBuffer(),
              documentRole: 'SUPPORTING_DOCUMENT',
            });
          } catch {
            // skip failed annex
          }
        }

        const compileRes = await InvoicePacketService.compileInvoicePacket({
          invoiceBytes: invBytes,
          invoiceFileName: primaryFile?.name || primaryDoc?.fileName || 'invoice.pdf',
          supportingDocs: supportingItems,
          certificate,
          poSites,
          approverName: user?.fullName,
        });

        finalPacketBytes = compileRes.pdfBytes;
        setCachedPacketBytes(finalPacketBytes);
      }

      // Persist snapshot to private storage vault (Section 27)
      setStatusStep('Storing immutable submission packet snapshot in commercial vault...');
      await invoiceRepository.uploadUnifiedInvoicePacket({
        invoiceId: draftInvoiceId,
        file: finalPacketBytes,
        fileName: `${clmsRef}_Complete_Submission_Packet.pdf`,
        clmsRef,
      });

      // Execute atomic status transition to SUBMITTED
      setStatusStep('Transmitting claim to Supply Chain review queue...');
      const submitRes = await invoiceRepository.submitInvoice(draftInvoiceId);
      if (!submitRes.success) {
        setErrorMessage(submitRes.error || 'Submission transaction failed.');
        return;
      }

      setIsPreviewOpen(false);
      onSuccess?.(draftInvoiceId);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected failure during invoice submission';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
      setStatusStep(null);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (!isSubmitting && !isSavingDraft && !isDiscardingDraft) onClose();
        }}
        title="Supplier Commercial Invoice Claim"
        width="840px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
            <div>
              {draftInvoiceId && (
                <Button
                  variant="tertiary"
                  size="sm"
                  disabled={isSubmitting || isSavingDraft || isDiscardingDraft}
                  icon={<Trash2 size={14} color="var(--color-semantic-error-text)" />}
                  onClick={handleDiscardDraft}
                  style={{ color: 'var(--color-semantic-error-text)' }}
                >
                  Discard Draft
                </Button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                variant="secondary"
                size="md"
                disabled={isSubmitting || isSavingDraft}
                onClick={handleSaveDraft}
                icon={<Clock size={15} />}
              >
                {isSavingDraft ? 'Saving...' : 'Save Draft'}
              </Button>

              <Button
                variant="secondary"
                size="md"
                disabled={(!primaryDoc && !primaryFile) || isSubmitting}
                icon={<Eye size={15} />}
                onClick={handleOpenPreview}
              >
                Preview Packet
              </Button>

              <Button
                variant="primary"
                size="md"
                disabled={(!primaryDoc && !primaryFile) || !supplierInvoiceNo.trim() || isSubmitting}
                isLoading={isSubmitting}
                icon={<Send size={15} />}
                onClick={handleConfirmSubmit}
              >
                {isSubmitting ? (statusStep || 'Submitting...') : 'Submit to Supply Chain'}
              </Button>
            </div>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {errorMessage && (
            <Alert type="danger" title="Action Required" onClose={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          )}

          {feedbackMessage && (
            <Alert type="success" title="Status" onClose={() => setFeedbackMessage(null)}>
              {feedbackMessage}
            </Alert>
          )}

          {/* Draft Reference Indicator if established */}
          {clmsRef && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-2) var(--space-3)',
                backgroundColor: 'var(--color-surface-sunken)',
                borderRadius: 'var(--radius-xs)',
                fontSize: 'var(--font-size-xs)',
              }}
            >
              <span>
                CLMS Internal Reference: <strong>{clmsRef}</strong>
              </span>
              <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: 600 }}>
                DRAFT (UNSUBMITTED)
              </span>
            </div>
          )}

          {/* Locked Commercial Lineage Card */}
          <div
            className="border-hairline"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--color-surface-sunken)',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} /> LOCKED COMMERCIAL LINEAGE (GOVERNED BY ISSUED CERTIFICATE)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
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
                <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Certified Sites</span>
                <strong>{certificate.siteCount} sites</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Certified Entitlement (Gross)</span>
                <FinancialValue
                  amount={certificate.currentCertifiedAmount}
                  currency={certificate.currency}
                  size="sm"
                  className="font-bold text-positive"
                />
              </div>
            </div>
          </div>

          {/* Supplier Input Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-3)' }}>
            <div>
              <label
                htmlFor="supplier-inv-num"
                style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', display: 'block', marginBottom: 'var(--space-1)' }}
              >
                Supplier Legal Invoice Number *
              </label>
              <Input
                id="supplier-inv-num"
                placeholder="e.g. TAX-INV-2026-0042"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="supplier-inv-date"
                style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', display: 'block', marginBottom: 'var(--space-1)' }}
              >
                Invoice Issue Date *
              </label>
              <Input
                id="supplier-inv-date"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Financial Breakdown (Locked) */}
          <div
            className="border-hairline"
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-xs)',
              backgroundColor: 'var(--color-surface-card)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                Commercial Valuation Breakdown
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                Inclusive VAT Model (18%)
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', fontSize: 'var(--font-size-xs)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Net Invoiced Base Amount:</span>
                <FinancialValue amount={calcResult.baseAmount} currency={certificate.currency} size="sm" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Value Added Tax (18% VAT):</span>
                <FinancialValue amount={calcResult.taxAmount} currency={certificate.currency} size="sm" />
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
                  amount={calcResult.totalPayable}
                  currency={certificate.currency}
                  size="sm"
                  className="font-bold text-positive"
                />
              </div>
            </div>
          </div>

          {/* Real Document Upload Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={15} color="var(--color-brand-primary)" />
                Attached Documents & Vault Provenance
              </span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                Private Storage Vault (Short-Lived URLs Only)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-3)' }}>
              {/* 1. Primary Commercial Invoice */}
              <div
                className="border-hairline"
                style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: primaryDoc ? '#f0fdf4' : 'var(--color-surface-sunken)',
                  borderColor: primaryDoc ? '#bbf7d0' : 'var(--color-border-hairline)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileText size={14} color={primaryDoc ? '#16a34a' : 'var(--color-brand-primary)'} />
                    Supplier Commercial Invoice *
                  </span>
                  {primaryDoc ? (
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#dcfce7', color: '#166534', fontWeight: 700 }}>
                      ✓ UPLOADED
                    </span>
                  ) : (
                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 700 }}>
                      REQUIRED
                    </span>
                  )}
                </div>

                {primaryDoc ? (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                      {primaryDoc.fileName}
                    </div>
                    <div>{Math.round(primaryDoc.fileSize / 1024)} KB • SHA-256: {primaryDoc.sha256Hash.slice(0, 10)}...</div>
                    <Button
                      variant="tertiary"
                      size="sm"
                      icon={<Trash2 size={12} />}
                      onClick={() => handleRemoveDocument(primaryDoc.id)}
                      style={{ marginTop: 'var(--space-1)', padding: '2px 4px', fontSize: '11px', color: 'var(--color-semantic-error-text)' }}
                    >
                      Replace / Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>
                      Attach signed invoice (PDF, PNG, JPG).
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      disabled={isUploadingPrimary}
                      onChange={handlePrimaryFileSelect}
                      style={{ fontSize: '11px', width: '100%' }}
                    />
                    {isUploadingPrimary && (
                      <div style={{ fontSize: '11px', color: 'var(--color-brand-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <RefreshCw size={12} className="animate-spin" /> Verifying & uploading to vault...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2. Fiscal Receipt (Optional) */}
              <div
                className="border-hairline"
                style={{
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-xs)',
                  backgroundColor: receiptDoc ? '#f0fdf4' : 'var(--color-surface-sunken)',
                  borderColor: receiptDoc ? '#bbf7d0' : 'var(--color-border-hairline)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                  <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Receipt size={14} color={receiptDoc ? '#16a34a' : 'var(--color-text-secondary)'} />
                    TRA Fiscal Receipt
                  </span>
                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'var(--color-surface-card)', color: 'var(--color-text-secondary)' }}>
                    OPTIONAL
                  </span>
                </div>

                {receiptDoc ? (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
                    <div style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-primary)' }}>
                      {receiptDoc.fileName}
                    </div>
                    <div>{Math.round(receiptDoc.fileSize / 1024)} KB</div>
                    <Button
                      variant="tertiary"
                      size="sm"
                      icon={<Trash2 size={12} />}
                      onClick={() => handleRemoveDocument(receiptDoc.id)}
                      style={{ marginTop: 'var(--space-1)', padding: '2px 4px', fontSize: '11px', color: 'var(--color-semantic-error-text)' }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: '0 0 var(--space-2)' }}>
                      Attach EFD fiscal receipt if separate.
                    </p>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      disabled={isUploadingReceipt}
                      onChange={handleReceiptFileSelect}
                      style={{ fontSize: '11px', width: '100%' }}
                    />
                    {isUploadingReceipt && (
                      <div style={{ fontSize: '11px', color: 'var(--color-brand-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <RefreshCw size={12} className="animate-spin" /> Uploading receipt...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Multiple Supporting Documents */}
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-xs)',
                backgroundColor: 'var(--color-surface-sunken)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                  Supporting Documents ({supportingDocsList.length})
                </span>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    color: 'var(--color-brand-primary)',
                    cursor: 'pointer',
                    fontWeight: 'var(--font-weight-semibold)',
                  }}
                >
                  <Plus size={13} /> Add Supporting File
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    multiple
                    disabled={isUploadingSupporting}
                    onChange={handleSupportingFileSelect}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              {supportingDocsList.length === 0 ? (
                <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', margin: 0 }}>
                  No extra supporting documents uploaded. (Delivery notes, site acceptance sheets, etc.)
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  {supportingDocsList.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 8px',
                        backgroundColor: 'var(--color-surface-card)',
                        borderRadius: 'var(--radius-2xs)',
                        fontSize: '11px',
                      }}
                    >
                      <span>
                        {doc.fileName} ({Math.round(doc.fileSize / 1024)} KB)
                      </span>
                      <Button
                        variant="tertiary"
                        size="sm"
                        icon={<Trash2 size={12} />}
                        onClick={() => handleRemoveDocument(doc.id)}
                        style={{ padding: '2px 4px', color: 'var(--color-semantic-error-text)' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Full Continuous Pre-Submission Packet Review Modal */}
      {isPreviewOpen && (
        <PreSubmitInvoicePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          certificate={certificate}
          poSites={poSites}
          invoiceFile={primaryFile || new File([], primaryDoc?.fileName || 'invoice.pdf')}
          receiptFile={receiptFile || (receiptDoc ? new File([], receiptDoc.fileName) : null)}
          supportingFiles={supportingFiles}
          supplierInvoiceNo={supplierInvoiceNo}
          invoiceDate={invoiceDate}
          invoiceAmount={calcResult.baseAmount}
          taxAmount={calcResult.taxAmount}
          totalAmount={calcResult.totalPayable}
          currency={certificate.currency}
          reviewerName={user?.fullName}
          isSubmitting={isSubmitting}
          statusStep={statusStep}
          precompiledBytes={cachedPacketBytes}
          onCompiledBytesReady={(bytes) => setCachedPacketBytes(bytes)}
          onSubmit={handleConfirmSubmit}
        />
      )}
    </>
  );
}
