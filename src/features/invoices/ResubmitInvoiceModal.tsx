// ==============================================================================
// CLMS Resubmit Corrected Invoice Modal
// ==============================================================================
// Governed by PRODUCT.md Section 27.2 and Stabilization Section 32:
// - Displays Supply Chain return code & reviewer commentary
// - Offers preview of the previous submitted packet
// - Provides real document replacement and new supporting document upload
// - New continuous submission packet preview before resubmitting
// - Transitions invoice status from RETURNED to RESUBMITTED
// - Certificate commercial entitlement remains strictly immutable
// ==============================================================================

import { useState, useEffect } from 'react';
import { Modal, Button, Input, Alert, FinancialValue, DocumentViewer } from '@/design-system';
import {
  InvoiceRecord,
  invoiceRepository,
  InvoiceDocumentRecord,
} from '@/infrastructure/repositories/InvoiceRepository';
import {
  supplyChainRepository,
  InvoiceReviewHistoryItem,
} from '@/infrastructure/repositories/SupplyChainRepository';
import { certificateRepository, CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';
import { PoSiteDetail } from '@/application/services/CertificatePacketService';
import { InvoicePacketService, SupportingDocumentItem } from '@/application/services/InvoicePacketService';
import { SupplyChainEngine } from '@/domain/supply-chain/SupplyChainEngine';
import { documentStorageService } from '@/infrastructure/storage/DocumentStorageService';
import {
  RefreshCw,
  Send,
  Lock,
  AlertCircle,
  FileText,
  Trash2,
  Plus,
  Eye,
  History,
  Layers,
} from 'lucide-react';

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
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0] ?? ''
  );
  const [notes, setNotes] = useState('');

  const [reviews, setReviews] = useState<InvoiceReviewHistoryItem[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<InvoiceDocumentRecord[]>([]);
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);
  const [poSites, setPoSites] = useState<PoSiteDetail[]>([]);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Packet Previews
  const [showPrevPacket, setShowPrevPacket] = useState(false);
  const [prevPacketBytes, setPrevPacketBytes] = useState<Uint8Array | null>(null);
  const [showNewPacket, setShowNewPacket] = useState(false);
  const [newPacketBytes, setNewPacketBytes] = useState<Uint8Array | null>(null);
  const [isCompilingNewPacket, setIsCompilingNewPacket] = useState(false);

  useEffect(() => {
    if (invoice && isOpen) {
      setSupplierInvoiceNo(invoice.supplierInvoiceNo !== '—' ? invoice.supplierInvoiceNo : '');
      if (invoice.invoiceDate) setInvoiceDate(invoice.invoiceDate.slice(0, 10));
      if (invoice.notes) setNotes(invoice.notes);
      setError(null);
      setFeedback(null);
      setShowPrevPacket(false);
      setShowNewPacket(false);

      // Load return reason & review history
      supplyChainRepository.getInvoiceReviewHistory(invoice.id).then(setReviews);

      // Load uploaded documents
      invoiceRepository.listInvoiceDocuments(invoice.id).then(setUploadedDocs);

      // Load certificate & PO sites for compiling new packet
      if (invoice.certificateId) {
        certificateRepository.getCertificateById(invoice.certificateId).then((cert) => {
          if (cert) {
            setCertificate(cert);
            certificateRepository.getPoSites(cert.poId).then(setPoSites);
          }
        });
      }
    }
  }, [invoice, isOpen]);

  if (!invoice) return null;

  // Latest return decision
  const returnReview = reviews.find((r) => r.decision === 'RETURNED');

  /**
   * Preview Previous Submitted Packet from storage vault.
   */
  const handlePreviewPreviousPacket = async () => {
    try {
      setError(null);
      const stored = await invoiceRepository.getUnifiedInvoiceDocument(invoice.id);
      if (stored) {
        const blob = await documentStorageService.downloadBlob(stored.storagePath);
        const buf = await blob.arrayBuffer();
        setPrevPacketBytes(new Uint8Array(buf));
        setShowPrevPacket(true);
      } else {
        setError('Previous submission packet snapshot not found in vault.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch previous packet';
      setError(msg);
    }
  };

  /**
   * Upload Replacement or Supporting Document.
   */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, role: 'SUPPLIER_INVOICE' | 'SUPPORTING_DOCUMENT') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    try {
      const res = await invoiceRepository.uploadInvoiceDocument({
        invoiceId: invoice.id,
        file,
        fileName: file.name,
        documentRole: role,
      });

      if (!res.success) throw new Error(res.error || 'Upload failed');

      const docs = await invoiceRepository.listInvoiceDocuments(invoice.id);
      setUploadedDocs(docs);
      setNewPacketBytes(null);
      setFeedback(`Uploaded ${file.name} successfully.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Document upload failed';
      setError(msg);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  /**
   * Delete / remove supporting or draft document.
   */
  const handleRemoveDoc = async (docId: string) => {
    try {
      await invoiceRepository.deleteDraftDocument(docId, invoice.id);
      setUploadedDocs((prev) => prev.filter((d) => d.id !== docId));
      setNewPacketBytes(null);
      setFeedback('Document removed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not remove document';
      setError(msg);
    }
  };

  /**
   * Compiles and previews the corrected new submission packet.
   */
  const handlePreviewNewPacket = async () => {
    if (!certificate) {
      setError('Certificate context unavailable for compiling new packet.');
      return;
    }

    const primaryDoc = uploadedDocs.find((d) => d.documentType === 'SUPPLIER_INVOICE');
    if (!primaryDoc) {
      setError('A primary Supplier Commercial Invoice document is required.');
      return;
    }

    setIsCompilingNewPacket(true);
    setError(null);

    try {
      // Fetch primary doc bytes
      const primBlob = await documentStorageService.downloadBlob(primaryDoc.storagePath);
      const primBytes = await primBlob.arrayBuffer();

      const supportingItems: SupportingDocumentItem[] = [];
      for (const d of uploadedDocs.filter((x) => x.id !== primaryDoc.id)) {
        try {
          const b = await documentStorageService.downloadBlob(d.storagePath);
          supportingItems.push({
            fileName: d.fileName,
            bytes: await b.arrayBuffer(),
            documentRole: d.documentType as any,
          });
        } catch {
          // skip
        }
      }

      const compiled = await InvoicePacketService.compileInvoicePacket({
        invoiceBytes: primBytes,
        invoiceFileName: primaryDoc.fileName,
        supportingDocs: supportingItems,
        certificate,
        poSites,
      });

      setNewPacketBytes(compiled.pdfBytes);
      setShowNewPacket(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to compile new packet';
      setError(msg);
    } finally {
      setIsCompilingNewPacket(false);
    }
  };

  /**
   * Resubmits the invoice to Supply Chain review queue.
   */
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

    const primaryDoc = uploadedDocs.find((d) => d.documentType === 'SUPPLIER_INVOICE');
    if (!primaryDoc) {
      setError('Please provide a corrected Supplier Invoice document.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Snapshot new packet if compiled
      if (newPacketBytes) {
        await invoiceRepository.uploadUnifiedInvoicePacket({
          invoiceId: invoice.id,
          file: newPacketBytes,
          fileName: `${invoice.clmsRef}_Resubmitted_Packet.pdf`,
          clmsRef: invoice.clmsRef,
        });
      }

      // 2. Execute resubmission RPC
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
      title={`Correct & Resubmit Invoice: ${invoice.clmsRef}`}
      width="860px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            <Button
              variant="secondary"
              size="sm"
              icon={<History size={14} />}
              onClick={handlePreviewPreviousPacket}
            >
              View Previous Submission
            </Button>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="secondary" size="md" disabled={isSubmitting} onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="md"
              disabled={isSubmitting || isCompilingNewPacket}
              icon={isCompilingNewPacket ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />}
              onClick={handlePreviewNewPacket}
            >
              Preview Corrected Packet
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={isSubmitting || !supplierInvoiceNo.trim()}
              icon={isSubmitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              onClick={handleResubmit}
            >
              {isSubmitting ? 'Resubmitting...' : 'Confirm & Resubmit'}
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {error && (
          <Alert type="danger" title="Validation Error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {feedback && (
          <Alert type="success" title="Status" onClose={() => setFeedback(null)}>
            {feedback}
          </Alert>
        )}

        {/* Supply Chain Return Code & Commentary Banner */}
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: '#fff7ed',
            border: '1px solid #fed7aa',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <AlertCircle size={16} color="#c2410c" />
            <span style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-xs)', color: '#9a3412' }}>
              SUPPLY CHAIN RETURN NOTICE
            </span>
            {returnReview?.returnCode && (
              <span style={{ padding: '1px 6px', borderRadius: '4px', backgroundColor: '#fed7aa', color: '#9a3412', fontSize: '10px', fontWeight: 700 }}>
                {returnReview.returnCode}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: '#7c2d12' }}>
            {returnReview?.reason || 'Document or reference defect noted by Supply Chain reviewer. Please correct below and resubmit.'}
          </p>
        </div>

        {/* Locked Commercial Position */}
        <div
          className="border-hairline"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-surface-card)',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} /> Certified Entitlement (Locked)
            </span>
            <div style={{ fontWeight: 'var(--font-weight-semibold)', fontSize: 'var(--font-size-sm)' }}>
              {invoice.certificateNumber} ({invoice.certType || 'PAC'})
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>Total Claim</span>
            <FinancialValue amount={invoice.totalAmount} currency={invoice.currency} size="sm" className="font-semibold" />
          </div>
        </div>

        {/* Editable Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--space-3)' }}>
          <div>
            <label
              htmlFor="resubmit-invoice-no"
              style={{
                display: 'block',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-semibold)',
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
                marginBottom: 'var(--space-1)',
              }}
            >
              Corrected Invoice Date *
            </label>
            <Input
              id="resubmit-invoice-date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="resubmit-notes"
            style={{
              display: 'block',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--space-1)',
            }}
          >
            Correction Notes / Clarification
          </label>
          <Input
            id="resubmit-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what corrections were made..."
          />
        </div>

        {/* Document Replacement & Annex Management Section (Section 32) */}
        <div
          className="border-hairline"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-surface-sunken)',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Layers size={14} color="var(--color-brand-primary)" />
              Document Replacements & Annexes
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              Upload corrected files to update the commercial vault
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-2)' }}>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'var(--color-surface-card)',
                border: '1px solid var(--color-border-hairline)',
                borderRadius: 'var(--radius-2xs)',
                fontSize: '11px',
                fontWeight: 'var(--font-weight-semibold)',
                cursor: 'pointer',
              }}
            >
              <FileText size={13} color="var(--color-brand-primary)" />
              Replace Primary Invoice Document
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                disabled={isUploading}
                onChange={(e) => handleFileUpload(e, 'SUPPLIER_INVOICE')}
                style={{ display: 'none' }}
              />
            </label>

            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'var(--color-surface-card)',
                border: '1px solid var(--color-border-hairline)',
                borderRadius: 'var(--radius-2xs)',
                fontSize: '11px',
                fontWeight: 'var(--font-weight-semibold)',
                cursor: 'pointer',
              }}
            >
              <Plus size={13} color="var(--color-brand-primary)" />
              Add Supporting Annex
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                disabled={isUploading}
                onChange={(e) => handleFileUpload(e, 'SUPPORTING_DOCUMENT')}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          {/* Current Attached Documents List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {uploadedDocs.map((doc) => (
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
                  <strong>[{doc.documentType}]</strong> {doc.fileName} ({Math.round(doc.fileSize / 1024)} KB)
                </span>
                <Button
                  variant="tertiary"
                  size="sm"
                  icon={<Trash2 size={12} />}
                  onClick={() => handleRemoveDoc(doc.id)}
                  style={{ padding: '2px 4px', color: 'var(--color-semantic-error-text)' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Modal: View Previous Submission Packet */}
        {showPrevPacket && prevPacketBytes && (
          <Modal
            isOpen={showPrevPacket}
            onClose={() => setShowPrevPacket(false)}
            title={`Previous Submission Packet: ${invoice.clmsRef}`}
            width="900px"
          >
            <DocumentViewer
              source={prevPacketBytes}
              fileName={`${invoice.clmsRef}_Previous_Submission.pdf`}
              height="550px"
            />
          </Modal>
        )}

        {/* Modal: View Corrected New Packet */}
        {showNewPacket && newPacketBytes && (
          <Modal
            isOpen={showNewPacket}
            onClose={() => setShowNewPacket(false)}
            title={`Corrected Submission Packet: ${invoice.clmsRef}`}
            width="900px"
          >
            <DocumentViewer
              source={newPacketBytes}
              fileName={`${invoice.clmsRef}_Corrected_Packet.pdf`}
              height="550px"
            />
          </Modal>
        )}
      </div>
    </Modal>
  );
}
