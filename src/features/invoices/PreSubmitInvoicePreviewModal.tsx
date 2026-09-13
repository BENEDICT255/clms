// ==============================================================================
// CLMS Pre-Submission Commercial Invoice Document Preview Modal
// ==============================================================================
// Renders the authoritative 3-part unified commercial document on-screen before
// the supplier commits and submits to the Supply Chain review queue:
//   Section A: Attached Supplier Commercial Invoice Document (all pages)
//   Section B: Attached Fiscal Receipt & Supporting Documents
//   Section C: Official Acceptance Certificate (FAC/PAC) with linked PO & Terms
// Governed by Stabilization Sections 16, 17, 24, 26, 50, 51:
// - Uses in-app DocumentViewer with complete page rendering
// - Zero hardcoded reviewer names (no Benedict Bisama)
// - IDM-independent preview and single-flight download
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Modal, Button, FinancialValue } from '@/design-system';
import { CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';
import { PoSiteDetail } from '@/application/services/CertificatePacketService';
import { InvoicePacketService, SupportingDocumentItem } from '@/application/services/InvoicePacketService';
import { DocumentViewer } from '@/design-system';
import { Send, RefreshCw, AlertCircle } from 'lucide-react';
import { documentStorageService } from '@/infrastructure/storage/DocumentStorageService';

interface PreSubmitInvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: CertificateRecord;
  poSites: PoSiteDetail[];
  invoiceFile?: File | null | undefined;
  primaryDocStoragePath?: string | null | undefined;
  receiptFile?: File | null | undefined;
  receiptDocStoragePath?: string | null | undefined;
  supportingFiles?: File[] | undefined;
  supportingDocStoragePaths?: { fileName: string; storagePath: string }[] | undefined;
  supplierInvoiceNo: string;
  invoiceDate: string;
  invoiceAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  reviewerName?: string | undefined;
  isSubmitting: boolean;
  statusStep?: string | null | undefined;
  precompiledBytes?: Uint8Array | null | undefined;
  onCompiledBytesReady?: (bytes: Uint8Array) => void;
  onSubmit: () => void;
}

export const PreSubmitInvoicePreviewModal: React.FC<PreSubmitInvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  certificate,
  poSites,
  invoiceFile,
  primaryDocStoragePath,
  receiptFile,
  receiptDocStoragePath,
  supportingFiles = [],
  supportingDocStoragePaths = [],
  supplierInvoiceNo,
  invoiceDate: _invoiceDate,
  invoiceAmount: _invoiceAmount,
  taxAmount: _taxAmount,
  totalAmount,
  currency,
  reviewerName,
  isSubmitting,
  statusStep,
  precompiledBytes,
  onCompiledBytesReady,
  onSubmit,
}) => {
  const [compiledBytes, setCompiledBytes] = useState<Uint8Array | null>(precompiledBytes ? new Uint8Array(precompiledBytes.slice()) : null);
  const [isLoading, setIsLoading] = useState<boolean>(!precompiledBytes);
  const [loadingStep, setLoadingStep] = useState<string>('Compiling authoritative commercial packet...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (precompiledBytes && precompiledBytes.byteLength > 0 && precompiledBytes.buffer.byteLength > 0) {
      setCompiledBytes(new Uint8Array(precompiledBytes.slice()));
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    async function compilePacket() {
      setIsLoading(true);
      setError(null);
      setLoadingStep('Reading uploaded commercial invoice document...');

      try {
        let invBuffer: ArrayBuffer | null = null;
        let invFileName = 'supplier_invoice.pdf';
        let invMimeType: string | undefined = undefined;

        if (invoiceFile && invoiceFile.size > 0) {
          invBuffer = await invoiceFile.arrayBuffer();
          invFileName = invoiceFile.name;
          invMimeType = invoiceFile.type;
        } else if (primaryDocStoragePath) {
          setLoadingStep('Fetching supplier invoice document from commercial storage...');
          const blob = await documentStorageService.downloadBlob(primaryDocStoragePath);
          invBuffer = await blob.arrayBuffer();
        }

        if (!invBuffer || invBuffer.byteLength === 0) {
          throw new Error('No supplier commercial invoice document attached. Please attach your invoice PDF to preview.');
        }

        const supportingItems: SupportingDocumentItem[] = [];
        if (receiptFile && receiptFile.size > 0) {
          const recBuffer = await receiptFile.arrayBuffer();
          supportingItems.push({
            fileName: receiptFile.name,
            bytes: recBuffer,
            documentRole: 'TAX_RECEIPT',
          });
        } else if (receiptDocStoragePath) {
          try {
            const blob = await documentStorageService.downloadBlob(receiptDocStoragePath);
            supportingItems.push({
              fileName: 'fiscal_receipt.pdf',
              bytes: await blob.arrayBuffer(),
              documentRole: 'TAX_RECEIPT',
            });
          } catch (rErr) {
            console.warn('[PreSubmitInvoicePreviewModal] Receipt fetch error:', rErr);
          }
        }

        for (const sf of supportingFiles) {
          if (sf.size > 0) {
            const sfBuffer = await sf.arrayBuffer();
            supportingItems.push({
              fileName: sf.name,
              bytes: sfBuffer,
              documentRole: 'SUPPORTING_DOCUMENT',
            });
          }
        }

        if (supportingDocStoragePaths) {
          for (const sDoc of supportingDocStoragePaths) {
            try {
              const blob = await documentStorageService.downloadBlob(sDoc.storagePath);
              supportingItems.push({
                fileName: sDoc.fileName,
                bytes: await blob.arrayBuffer(),
                documentRole: 'SUPPORTING_DOCUMENT',
              });
            } catch (sErr) {
              console.warn('[PreSubmitInvoicePreviewModal] Supporting doc fetch error:', sErr);
            }
          }
        }

        setLoadingStep('Merging supplier invoice, annexes, and official certificate packet...');
        const result = await InvoicePacketService.compileInvoicePacket({
          invoiceBytes: invBuffer,
          invoiceFileName: invFileName,
          invoiceMimeType: invMimeType,
          supportingDocs: supportingItems,
          certificate,
          poSites,
          approverName: reviewerName,
        });

        if (isCancelled) return;

        const safeCompiled = new Uint8Array(result.pdfBytes.slice());
        setCompiledBytes(safeCompiled);
        onCompiledBytesReady?.(new Uint8Array(safeCompiled.slice()));
      } catch (err: unknown) {
        if (isCancelled) return;
        const msg = err instanceof Error ? err.message : 'Packet compilation failed';
        setError(msg);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    compilePacket();

    return () => {
      isCancelled = true;
    };
  }, [
    isOpen,
    invoiceFile,
    primaryDocStoragePath,
    receiptFile,
    receiptDocStoragePath,
    supportingFiles,
    supportingDocStoragePaths,
    certificate,
    poSites,
    reviewerName,
    precompiledBytes,
  ]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) onClose();
      }}
      title={`Pre-Submission Packet Review: ${supplierInvoiceNo || 'Commercial Invoice'}`}
      width="960px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Total Payable Claim:
            </span>
            <FinancialValue amount={totalAmount} currency={currency} size="sm" className="font-bold text-positive" />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="secondary" size="md" disabled={isSubmitting} onClick={onClose}>
              Back to Edit
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={isSubmitting || isLoading || !compiledBytes}
              isLoading={isSubmitting}
              icon={isSubmitting ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
              onClick={onSubmit}
            >
              {isSubmitting ? (statusStep || 'Submitting...') : 'Confirm & Submit to Supply Chain'}
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Informative Guidance Banner */}
        <div
          style={{
            padding: 'var(--space-2) var(--space-3)',
            backgroundColor: 'var(--color-surface-sunken)',
            borderRadius: 'var(--radius-xs)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-secondary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            Continuous submission packet preview: <strong>Section A</strong> (Supplier Invoice) → <strong>Section B</strong> (Supporting Annexes) → <strong>Section C</strong> (Acceptance Certificate + Purchase Order).
          </span>
        </div>

        {/* Viewer or Loading/Error State */}
        {isLoading ? (
          <div
            style={{
              height: '560px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--color-surface-sunken)',
              borderRadius: 'var(--radius-xs)',
              gap: 'var(--space-3)',
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-xs)',
            }}
          >
            <RefreshCw size={24} className="animate-spin text-brand" />
            <span>{loadingStep}</span>
          </div>
        ) : error || !compiledBytes ? (
          <div
            style={{
              height: '420px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--color-surface-sunken)',
              borderRadius: 'var(--radius-xs)',
              gap: 'var(--space-2)',
              padding: 'var(--space-4)',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={24} color="var(--color-semantic-error-text)" />
            <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>Compilation Error</div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', maxWidth: '440px' }}>
              {error || 'Unable to assemble continuous commercial packet.'}
            </div>
          </div>
        ) : (
          <DocumentViewer
            source={compiledBytes}
            fileName={`${supplierInvoiceNo || 'Invoice'}_Complete_Submission_Packet.pdf`}
            title={`Commercial Submission Packet (${supplierInvoiceNo})`}
            height="580px"
            initialScale={1.1}
          />
        )}
      </div>
    </Modal>
  );
};
