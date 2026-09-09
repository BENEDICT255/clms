// ==============================================================================
// CLMS Pre-Submission Commercial Invoice Document Preview Modal
// ==============================================================================
// Renders the authoritative 3-part unified commercial document on-screen before
// the supplier commits and submits to the Supply Chain review queue:
//   Part 1: Attached Supplier Commercial Invoice Document
//   Part 2: Attached TRA / EFD Fiscal Receipt (if provided)
//   Part 3: Authentic 9-Page Official Helios Acceptance Certificate (FAC / PAC)
// Allows on-screen multi-page review, zoom controls, draft PDF download, and
// direct confirmation to submit.
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, FinancialValue } from '@/design-system';
import { CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';
import { PoSiteDetail, CertificatePdfService } from '@/features/certificates/CertificatePdfService';
import { UnifiedInvoicePdfService } from './UnifiedInvoicePdfService';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Send,
  ArrowLeft,
  AlertCircle,
  RefreshCw,
  Layers,
} from 'lucide-react';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

interface PreSubmitInvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: CertificateRecord;
  poSites: PoSiteDetail[];
  invoiceFile: File;
  receiptFile: File | null;
  supplierInvoiceNo: string;
  invoiceDate: string;
  invoiceAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  reviewerName?: string;
  isSubmitting: boolean;
  statusStep: string | null;
  precompiledBytes?: Uint8Array | null;
  onCompiledBytesReady?: (bytes: Uint8Array) => void;
  onSubmit: () => void;
}

export const PreSubmitInvoicePreviewModal: React.FC<PreSubmitInvoicePreviewModalProps> = ({
  isOpen,
  onClose,
  certificate,
  poSites,
  invoiceFile,
  receiptFile,
  supplierInvoiceNo,
  invoiceDate,
  invoiceAmount,
  taxAmount,
  totalAmount,
  currency,
  reviewerName = 'Benedict Bisama',
  isSubmitting,
  statusStep,
  precompiledBytes,
  onCompiledBytesReady,
  onSubmit,
}) => {
  const [pages, setPages] = useState<string[]>([]);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [compiledBytes, setCompiledBytes] = useState<Uint8Array | null>(precompiledBytes || null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState<string>('Compiling unified document...');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.2);
  const isMountedRef = useRef<boolean>(true);
  const precompiledBytesRef = useRef<Uint8Array | null>(precompiledBytes || null);

  // Keep precompiledBytesRef in sync without triggering useEffect re-runs
  useEffect(() => {
    if (precompiledBytes && precompiledBytes.byteLength > 0) {
      precompiledBytesRef.current = precompiledBytes;
      setCompiledBytes(precompiledBytes);
    }
  }, [precompiledBytes]);

  useEffect(() => {
    if (!isOpen || !invoiceFile) return;

    isMountedRef.current = true;
    let cancel = false;
    let activeLoadingTask: any = null;
    let activePdfDoc: any = null;
    let activeBlobUrl: string | null = null;

    /**
     * Checks if a Uint8Array has an intact, non-detached underlying ArrayBuffer.
     */
    function isBufferUsable(bytes: Uint8Array | null | undefined): boolean {
      if (!bytes) return false;
      if (bytes.byteLength === 0) return false;
      try {
        if (bytes.buffer) {
          if ((bytes.buffer as any).detached === true) return false;
          if (bytes.buffer.byteLength === 0) return false;
        }
        // Test read byte to confirm buffer is not detached
        const _test = bytes[0];
        return typeof _test === 'number';
      } catch {
        return false;
      }
    }

    async function compileAndRender() {
      setIsLoading(true);
      setError(null);
      setPages([]);

      try {
        let bytes = precompiledBytesRef.current;
        const needsCompilation = !isBufferUsable(bytes);

        if (needsCompilation) {
          setLoadingStep('Compiling 3-part commercial packet (Invoice + Receipt + Certificate)...');
          const baseParams = {
            invoiceFile,
            invoiceFileName: invoiceFile.name,
            certificate,
            poSites,
            reviewerName,
          };
          const compileParams = receiptFile
            ? { ...baseParams, receiptFile, receiptFileName: receiptFile.name }
            : baseParams;

          bytes = await UnifiedInvoicePdfService.compileUnifiedInvoicePacket(compileParams);
          if (cancel || !isMountedRef.current) return;
        }

        if (!bytes || bytes.byteLength === 0) {
          throw new Error('Unified document packet could not be assembled.');
        }

        setCompiledBytes(bytes);
        setLoadingStep('Rendering preview...');

        // Dual-Layer Worker Protection:
        // 1. First attempt: Pass a brand-new, isolated ArrayBuffer copy so 'bytes' is never detached
        let pdf: any = null;
        try {
          const safeBuffer = new ArrayBuffer(bytes.byteLength);
          new Uint8Array(safeBuffer).set(bytes);
          activeLoadingTask = pdfjsLib.getDocument({ data: new Uint8Array(safeBuffer) });
          pdf = await activeLoadingTask.promise;
        } catch (workerPostErr: any) {
          // 2. Fallback attempt: If Worker postMessage fails on ArrayBuffer cloning,
          // load via standard Blob URL streaming which completely avoids worker transfer lists.
          console.warn('Worker postMessage note, engaging resilient Blob URL fallback:', workerPostErr);
          if (cancel || !isMountedRef.current) return;
          const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
          activeBlobUrl = URL.createObjectURL(blob);
          activeLoadingTask = pdfjsLib.getDocument({ url: activeBlobUrl });
          pdf = await activeLoadingTask.promise;
        }

        if (cancel || !isMountedRef.current || !pdf) return;
        activePdfDoc = pdf;

        const totalNum = pdf.numPages;
        setTotalPages(totalNum);

        // Safe cache synchronization to parent: Provide an isolated cloned copy
        if (isBufferUsable(bytes)) {
          const cacheCopy = new Uint8Array(bytes.byteLength);
          cacheCopy.set(bytes);
          precompiledBytesRef.current = cacheCopy;
          onCompiledBytesReady?.(cacheCopy);
        }

        // Fast Progressive Rendering: Render Page 1 first to display immediately
        const p1 = await pdf.getPage(1);
        const vp1 = p1.getViewport({ scale: 1.25 });
        const c1 = document.createElement('canvas');
        c1.width = vp1.width;
        c1.height = vp1.height;
        const ctx1 = c1.getContext('2d');
        if (ctx1) {
          await p1.render({ canvasContext: ctx1, viewport: vp1, canvas: c1 }).promise;
          const url1 = c1.toDataURL('image/jpeg', 0.88);
          if (!cancel && isMountedRef.current) {
            setPages([url1]);
            setIsLoading(false); // Reveal document immediately!
          }
        }

        // Stream remaining pages progressively in the background without freezing the UI
        for (let pageNum = 2; pageNum <= totalNum; pageNum++) {
          if (cancel || !isMountedRef.current) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.25 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport, canvas }).promise;
            const url = canvas.toDataURL('image/jpeg', 0.88);
            if (!cancel && isMountedRef.current) {
              setPages((prev) => [...prev, url]);
            }
          }
        }
      } catch (err: unknown) {
        console.error('Pre-submission preview generation error:', err);
        if (!cancel && isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to generate document preview.');
        }
      } finally {
        if (activeBlobUrl) {
          try { URL.revokeObjectURL(activeBlobUrl); } catch (_) {}
          activeBlobUrl = null;
        }
        if (!cancel && isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    void compileAndRender();

    return () => {
      cancel = true;
      isMountedRef.current = false;
      if (activeBlobUrl) {
        try { URL.revokeObjectURL(activeBlobUrl); } catch (_) {}
      }
      if (activeLoadingTask) {
        try { activeLoadingTask.destroy(); } catch (_) {}
      }
      if (activePdfDoc) {
        try { activePdfDoc.destroy(); } catch (_) {}
      }
    };
  }, [isOpen, invoiceFile, receiptFile, certificate.id, reviewerName]);

  if (!isOpen) return null;

  const handleDownloadDraft = () => {
    if (compiledBytes) {
      CertificatePdfService.triggerDownload(
        compiledBytes,
        `DRAFT_${supplierInvoiceNo || 'INVOICE'}_Unified_Packet.pdf`
      );
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.15, 2.0));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.15, 0.7));
  const handleResetZoom = () => setZoom(1.2);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Commercial Invoice Pre-Submission Document Review"
      width="960px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <Button
            variant="secondary"
            size="md"
            icon={<ArrowLeft size={16} />}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Back to Edit Form
          </Button>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              size="md"
              icon={<Download size={15} />}
              onClick={handleDownloadDraft}
              disabled={!compiledBytes || isLoading}
            >
              Download Draft PDF
            </Button>

            <Button
              variant="primary"
              size="md"
              icon={<Send size={16} />}
              isLoading={isSubmitting}
              onClick={onSubmit}
              disabled={isLoading || Boolean(error)}
            >
              {isSubmitting ? (statusStep || 'Submitting...') : 'Confirm & Submit to Supply Chain'}
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Commercial Summary Banner */}
        <div
          className="border-hairline"
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-xs)',
            backgroundColor: 'var(--color-surface-sunken)',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'var(--space-3)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Supplier Invoice No</span>
            <strong>{supplierInvoiceNo || '—'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Invoice Date</span>
            <strong>{invoiceDate || '—'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Certificate Ref</span>
            <strong>{certificate.certificateNumber}</strong> ({certificate.certType})
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>PO Number</span>
            <strong>{certificate.poNumber}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Base Amount</span>
            <FinancialValue amount={invoiceAmount} currency={currency} size="sm" />
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>VAT (18%)</span>
            <FinancialValue amount={taxAmount} currency={currency} size="sm" />
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Total Claim</span>
            <FinancialValue
              amount={totalAmount}
              currency={currency}
              size="md"
              className="font-bold text-positive"
            />
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Compiled Structure</span>
            <span style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-semibold)' }}>
              3-Part Unified Packet
            </span>
          </div>
        </div>

        {/* Toolbar: Zoom & Page Info */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--space-2) var(--space-3)',
            backgroundColor: 'var(--color-surface-sunken)',
            borderRadius: 'var(--radius-xs)',
            fontSize: 'var(--font-size-xs)',
            border: '1px solid var(--color-border-hairline)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Layers size={16} color="var(--color-brand-primary)" />
            <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
              Multi-Page Commercial Document View
            </span>
            {pages.length > 0 && (
              <span style={{ color: 'var(--color-text-secondary)' }}>
                ({pages.length} of {totalPages || pages.length} Pages {totalPages > 0 && pages.length < totalPages ? 'Streaming...' : 'Ready'})
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span style={{ color: 'var(--color-text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="secondary"
              size="sm"
              icon={<ZoomOut size={14} />}
              onClick={handleZoomOut}
              disabled={zoom <= 0.7 || isLoading}
            >
              Zoom Out
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={handleResetZoom}
              disabled={isLoading}
            >
              Reset
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<ZoomIn size={14} />}
              onClick={handleZoomIn}
              disabled={zoom >= 2.0 || isLoading}
            >
              Zoom In
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'var(--space-6)',
              backgroundColor: 'var(--color-surface-sunken)',
              borderRadius: 'var(--radius-xs)',
              gap: 'var(--space-3)',
              minHeight: '380px',
            }}
          >
            <RefreshCw
              size={32}
              color="var(--color-brand-primary)"
              style={{ animation: 'spin 1.5s linear infinite' }}
            />
            <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-medium)' }}>
              {loadingStep}
            </div>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Assembling supplier invoice, receipt, and 9-page Helios acceptance certificate into unified packet...
            </div>
            <style>{`
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-semantic-error-bg)',
              color: 'var(--color-semantic-error-text)',
              borderRadius: 'var(--radius-xs)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Multi-Page Canvas Pages List */}
        {!isLoading && !error && pages.length > 0 && (
          <div
            style={{
              maxHeight: '62vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-4)',
              padding: 'var(--space-4)',
              backgroundColor: '#525659',
              borderRadius: 'var(--radius-xs)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {pages.map((imgSrc, index) => {
              const pageNum = index + 1;
              let pageLabel = `Page ${pageNum}`;
              if (pageNum === 1) {
                pageLabel = `Page 1 — Part 1: Supplier Commercial Invoice (${invoiceFile?.name})`;
              } else if (receiptFile && pageNum === 2) {
                pageLabel = `Page 2 — Part 2: TRA / EFD Fiscal Receipt (${receiptFile.name})`;
              } else {
                const certStartPage = receiptFile ? 3 : 2;
                const certRelativePage = pageNum - certStartPage + 1;
                pageLabel = `Page ${pageNum} — Part 3: Acceptance Certificate (${certificate.certType}) — Page ${certRelativePage} of 9`;
              }

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-1)',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#ffffff',
                      backgroundColor: 'rgba(0, 0, 0, 0.65)',
                      padding: '2px 12px',
                      borderRadius: '12px',
                      fontWeight: 'var(--font-weight-semibold)',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {pageLabel}
                  </div>

                  <div
                    style={{
                      boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                      borderRadius: '2px',
                      overflow: 'hidden',
                      backgroundColor: '#ffffff',
                      lineHeight: 0,
                      maxWidth: '100%',
                    }}
                  >
                    <img
                      src={imgSrc}
                      alt={`Page ${pageNum}`}
                      style={{
                        width: `${Math.round(620 * zoom)}px`,
                        maxWidth: '100%',
                        height: 'auto',
                        display: 'block',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
