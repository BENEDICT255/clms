// ==============================================================================
// CLMS Unified Commercial Invoice Document View
// ==============================================================================
// High-fidelity on-screen multi-page canvas renderer using pdfjs-dist.
// Renders all pages of the complete commercial packet:
//   - Part 1: Attached Supplier Commercial Invoice Document
//   - Part 2: Attached TRA / EFD Fiscal Receipt (if provided)
//   - Part 3: Authentic 9-Page Helios Acceptance Certificate (FAC / PAC)
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { InvoiceRecord, invoiceRepository } from '@/infrastructure/repositories/InvoiceRepository';
import { certificateRepository } from '@/infrastructure/repositories/CertificateRepository';
import { CertificatePdfService } from '@/features/certificates/CertificatePdfService';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { ZoomIn, ZoomOut, RotateCcw, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/design-system';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

interface InvoiceDocumentViewProps {
  invoice: InvoiceRecord;
  onPdfReady?: (pdfBytes: Uint8Array) => void;
}

export const InvoiceDocumentView: React.FC<InvoiceDocumentViewProps> = ({
  invoice,
  onPdfReady,
}) => {
  const [pages, setPages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState<string>('Loading document...');
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.2);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    let cancel = false;

    async function loadDocumentPages() {
      setIsLoading(true);
      setError(null);
      setPages([]);

      try {
        let pdfBytes: Uint8Array | null = null;

        // 1. Try to load pre-compiled unified document from storage
        setLoadingStep('Checking commercial vault for unified packet...');
        const storedDoc = await invoiceRepository.getUnifiedInvoiceDocument(invoice.id);
        if (storedDoc?.url) {
          try {
            const res = await fetch(storedDoc.url);
            if (res.ok) {
              const buffer = await res.arrayBuffer();
              pdfBytes = new Uint8Array(buffer);
            }
          } catch (fetchErr) {
            console.warn('Storage fetch warning, falling back to dynamic assembly:', fetchErr);
          }
        }

        // 2. If not stored, dynamically assemble the certificate packet
        if (!pdfBytes) {
          setLoadingStep('Assembling authentic commercial certificate packet...');
          const cert = await certificateRepository.getCertificateById(invoice.certificateId);
          if (cert) {
            const poSites = await certificateRepository.getPoSites(cert.poId);
            pdfBytes = await CertificatePdfService.generateCertificatePdf({
              certificate: cert,
              poSites,
              reviewerName: 'Benedict Bisama',
            });
          }
        }

        if (cancel || !isMountedRef.current) return;

        function isBufferUsable(bytes: Uint8Array | null | undefined): boolean {
          if (!bytes || bytes.byteLength === 0) return false;
          try {
            if (bytes.buffer) {
              if ((bytes.buffer as any).detached === true) return false;
              if (bytes.buffer.byteLength === 0) return false;
            }
            const _test = bytes[0];
            return typeof _test === 'number';
          } catch {
            return false;
          }
        }

        if (!isBufferUsable(pdfBytes)) {
          setError('Could not retrieve commercial document packet.');
          setIsLoading(false);
          return;
        }

        onPdfReady?.(pdfBytes!);

        // 3. Render pages using pdfjs-dist with dual-layer safety
        setLoadingStep('Rendering multi-page commercial packet...');
        let pdf: any = null;
        let activeLoadingTask: any = null;
        let blobUrl: string | null = null;

        try {
          const safeBuffer = new ArrayBuffer(pdfBytes!.byteLength);
          new Uint8Array(safeBuffer).set(pdfBytes!);
          activeLoadingTask = pdfjsLib.getDocument({ data: new Uint8Array(safeBuffer) });
          pdf = await activeLoadingTask.promise;
        } catch (postErr) {
          console.warn('Worker postMessage note in InvoiceDocumentView, using Blob URL fallback:', postErr);
          if (cancel || !isMountedRef.current) return;
          const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
          blobUrl = URL.createObjectURL(blob);
          activeLoadingTask = pdfjsLib.getDocument({ url: blobUrl });
          pdf = await activeLoadingTask.promise;
        } finally {
          if (blobUrl) {
            try { URL.revokeObjectURL(blobUrl); } catch (_) {}
          }
        }

        if (cancel || !isMountedRef.current || !pdf) return;

        const renderedPages: string[] = [];
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancel || !isMountedRef.current) return;
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport, canvas }).promise;
            renderedPages.push(canvas.toDataURL('image/png'));
          }
        }

        if (!cancel && isMountedRef.current) {
          setPages(renderedPages);
        }
      } catch (err: unknown) {
        console.error('Invoice document render error:', err);
        if (!cancel && isMountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to render document preview.');
        }
      } finally {
        if (!cancel && isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }

    loadDocumentPages();

    return () => {
      cancel = true;
      isMountedRef.current = false;
    };
  }, [invoice.id, invoice.certificateId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Zoom and Document Info Toolbar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
            Document Packet: {invoice.clmsRef}
          </span>
          {pages.length > 0 && (
            <span style={{ color: 'var(--color-text-secondary)' }}>
              ({pages.length} Pages: Invoice + Acceptance Certificate)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <Button
            variant="tertiary"
            size="sm"
            icon={<ZoomOut size={14} />}
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            disabled={zoom <= 0.6}
            title="Zoom Out"
          />
          <span style={{ minWidth: '45px', textAlign: 'center', fontWeight: 'var(--font-weight-medium)' }}>
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="tertiary"
            size="sm"
            icon={<ZoomIn size={14} />}
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
            disabled={zoom >= 2.0}
            title="Zoom In"
          />
          <Button
            variant="tertiary"
            size="sm"
            icon={<RotateCcw size={13} />}
            onClick={() => setZoom(1.2)}
            title="Reset Zoom"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div
          style={{
            minHeight: '480px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-3)',
            backgroundColor: 'var(--color-surface-sunken)',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--color-border-hairline)',
          }}
        >
          <RefreshCw size={28} color="var(--color-brand-primary)" className="animate-spin" />
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
            {loadingStep}
          </div>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
            Preparing high-fidelity multi-page document view...
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && !isLoading && (
        <div
          style={{
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-semantic-error-bg)',
            color: 'var(--color-semantic-error-text)',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Multi-Page Canvas Render */}
      {!isLoading && pages.length > 0 && (
        <div
          style={{
            maxHeight: '680px',
            overflowY: 'auto',
            overflowX: 'auto',
            padding: 'var(--space-4)',
            backgroundColor: '#475569',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          {pages.map((imgSrc, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-1)',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#cbd5e1',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Page {idx + 1} of {pages.length}
                {idx === 0
                  ? ' — Supplier Invoice Document'
                  : idx === 1 && pages.length > 10
                  ? ' — Fiscal Receipt'
                  : ` — Acceptance Certificate`}
              </div>
              <div
                style={{
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  lineHeight: 0,
                  transition: 'transform 0.15s ease-out',
                }}
              >
                <img
                  src={imgSrc}
                  alt={`Page ${idx + 1}`}
                  style={{
                    width: `${595 * zoom}px`,
                    height: 'auto',
                    display: 'block',
                    backgroundColor: '#ffffff',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
