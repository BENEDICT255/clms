// ==============================================================================
// CLMS Authoritative DocumentViewer Component
// ==============================================================================
// Governed by AGENTS.md and Stabilization Specification Sections 16-18, 45, 66-67:
// - Reusable in-app multi-page PDF canvas viewer powered by pdfjs-dist
// - In-app vertical scrolling: ALL pages visible continuously
// - Page number & total page count display
// - Zoom controls (+ / - / percentage / fit width / fit page)
// - Responsive fit-width wrapper (A4 ratio preserved, zero horizontal clipping on 1366x768)
// - Clean print action (prints document pages without application chrome)
// - Single-flight Blob download integration (zero external IDM interception)
// ==============================================================================

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Download,
  Printer,
  AlertCircle,
  X,
} from 'lucide-react';
import { downloadService } from '@/application/services/DownloadService';
import './DocumentViewer.css';

if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

export interface DocumentViewerProps {
  source: Uint8Array | ArrayBuffer | Blob | string | null;
  fileName?: string;
  title?: string;
  height?: string | number;
  initialScale?: number;
  showToolbar?: boolean;
  showDownload?: boolean;
  showPrint?: boolean;
  onDownload?: () => void;
  className?: string;
  isLoading?: boolean;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  source,
  fileName = 'document.pdf',
  title = 'Commercial Document',
  height = '600px',
  initialScale = 1.0,
  showToolbar = true,
  showDownload = true,
  showPrint = true,
  onDownload,
  className = '',
  isLoading: propLoading = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(initialScale);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<number[]>([]);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Cached raw bytes for download/print
  const rawBytesRef = useRef<Uint8Array | null>(null);

  // 1. Load PDF Document from source
  useEffect(() => {
    let isCancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    async function loadPdf() {
      if (!source) {
        if (!propLoading) {
          setIsLoading(false);
          setErrorMsg('No document source provided.');
        } else {
          setIsLoading(true);
          setErrorMsg(null);
        }
        return;
      }

      setIsLoading(true);
      setErrorMsg(null);
      setRenderedPages([]);

      try {
        let docData: Uint8Array;

        if (source instanceof Uint8Array) {
          if (source.buffer.byteLength === 0) {
            throw new Error('Source document buffer is empty or detached.');
          }
          docData = new Uint8Array(source.slice());
          rawBytesRef.current = new Uint8Array(docData.slice());
        } else if (source instanceof ArrayBuffer) {
          if (source.byteLength === 0) {
            throw new Error('Source document buffer is empty or detached.');
          }
          docData = new Uint8Array(source.slice(0));
          rawBytesRef.current = new Uint8Array(docData.slice());
        } else if (source instanceof Blob) {
          const ab = await source.arrayBuffer();
          if (ab.byteLength === 0) {
            throw new Error('Source document blob is empty.');
          }
          docData = new Uint8Array(ab);
          rawBytesRef.current = new Uint8Array(docData.slice());
        } else if (typeof source === 'string') {
          // Fetch from URL
          const res = await fetch(source);
          if (!res.ok) {
            throw new Error(`Failed to load document: HTTP ${res.status}`);
          }
          const ab = await res.arrayBuffer();
          if (ab.byteLength === 0) {
            throw new Error('Source document fetched from URL is empty.');
          }
          docData = new Uint8Array(ab);
          rawBytesRef.current = new Uint8Array(docData.slice());
        } else {
          throw new Error('Unsupported document source type.');
        }

        // Always clone a dedicated slice for the Web Worker so that worker.postMessage
        // transferable object transfer does NOT detach docData or rawBytesRef!
        const workerData = new Uint8Array(docData.slice());

        loadingTask = pdfjsLib.getDocument({
          data: workerData,
          useSystemFonts: true,
        });
        const loadedPdf = await loadingTask.promise;

        if (isCancelled) return;

        setPdfDoc(loadedPdf);
        setPageCount(loadedPdf.numPages);
        setCurrentPage(1);
        setIsLoading(false);
      } catch (err: unknown) {
        if (isCancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to render PDF document';
        console.error('[DocumentViewer] Loading error:', err);
        setErrorMsg(msg);
        setIsLoading(false);
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
      if (loadingTask) {
        loadingTask.destroy().catch(() => {});
      }
    };
  }, [source, propLoading]);

  // 2. Render all pages on canvas
  const renderPages = useCallback(async () => {
    if (!pdfDoc || !viewportRef.current) return;

    const numPages = pdfDoc.numPages;
    const pagesToRender: number[] = [];

    for (let pNum = 1; pNum <= numPages; pNum++) {
      pagesToRender.push(pNum);
    }
    setRenderedPages(pagesToRender);
  }, [pdfDoc]);

  useEffect(() => {
    renderPages();
  }, [renderPages, scale]);

  // 3. Render individual page canvas when renderedPages changes
  useEffect(() => {
    if (!pdfDoc) return;

    renderedPages.forEach(async (pageNumber) => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = document.getElementById(`clms-doc-page-${pageNumber}`) as HTMLCanvasElement | null;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale });

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport,
          canvas,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        // Page render error
      }
    });
  }, [pdfDoc, renderedPages, scale]);

  // 4. Track visible page on scroll
  const handleScroll = () => {
    if (!viewportRef.current || pageCount === 0) return;
    const container = viewportRef.current;
    const containerMid = container.scrollTop + container.clientHeight / 2;

    for (let p = 1; p <= pageCount; p++) {
      const el = document.getElementById(`clms-doc-wrapper-${p}`);
      if (el) {
        const top = el.offsetTop;
        const bottom = top + el.clientHeight;
        if (containerMid >= top && containerMid <= bottom) {
          setCurrentPage(p);
          break;
        }
      }
    }
  };

  // Zoom controls
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setScale(initialScale);

  // Fullscreen / Expand controls — preserves default / current scale without auto-zooming
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Intercept Escape key in capture phase so full screen exits cleanly without closing parent modal
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isFullscreen]);

  // Lock body scroll while in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  // Download handler
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }

    if (rawBytesRef.current && rawBytesRef.current.byteLength > 0) {
      const clone = new Uint8Array(rawBytesRef.current.slice());
      const blob = new Blob([clone.buffer as ArrayBuffer], { type: 'application/pdf' });
      downloadService.downloadBlob(blob, fileName);
    }
  };

  // Print handler — executes clean browser print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      ref={containerRef}
      className={`clms-document-viewer ${isFullscreen ? 'clms-document-viewer--fullscreen' : ''} ${className}`}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* Floating Top-Right Exit Toggle when in Fullscreen */}
      {isFullscreen && (
        <button
          type="button"
          className="clms-document-viewer__fullscreen-toggle"
          onClick={() => setIsFullscreen(false)}
          title="Click or press Escape to go to normal view"
        >
          <kbd>ESC</kbd>
          <span>Press Escape to go to normal view</span>
          <X size={13} style={{ marginLeft: 2, opacity: 0.8 }} />
        </button>
      )}

      {/* Viewer Toolbar */}
      {showToolbar && (
        <div className="clms-document-viewer__toolbar">
          <div className="clms-document-viewer__toolbar-group">
            {title && (
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginRight: 8 }}>
                {title}
              </span>
            )}
            <span className="clms-document-viewer__page-indicator">
              Page {currentPage} of {pageCount || '—'}
            </span>
          </div>

          <div className="clms-document-viewer__toolbar-group">
            <button
              type="button"
              className="clms-document-viewer__btn"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="clms-document-viewer__zoom-label">
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              className="clms-document-viewer__btn"
              onClick={handleZoomIn}
              disabled={scale >= 2.5}
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              className={`clms-document-viewer__btn ${isFullscreen ? 'clms-document-viewer__btn--active' : ''}`}
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Expand to Full Screen'}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              {isFullscreen ? 'Normal View' : 'Expand'}
            </button>
            <button
              type="button"
              className="clms-document-viewer__btn"
              onClick={handleResetZoom}
              title="Actual Size (100%)"
            >
              <Minimize2 size={13} /> Reset
            </button>

            {showPrint && (
              <button
                type="button"
                className="clms-document-viewer__btn"
                onClick={handlePrint}
                title="Print Document"
              >
                <Printer size={13} /> Print
              </button>
            )}

            {showDownload && (
              <button
                type="button"
                className="clms-document-viewer__btn clms-document-viewer__btn--primary"
                onClick={handleDownload}
                title="Download Packet"
              >
                <Download size={13} /> Download
              </button>
            )}
          </div>
        </div>
      )}

      {/* Viewport & Pages Container */}
      <div
        ref={viewportRef}
        className="clms-document-viewer__viewport"
        onScroll={handleScroll}
      >
        {(isLoading || propLoading) && (
          <div className="clms-document-viewer__loading">
            <div className="clms-document-viewer__spinner" />
            <p>Loading document packet...</p>
          </div>
        )}

        {!(isLoading || propLoading) && errorMsg && (
          <div className="clms-document-viewer__error">
            <AlertCircle size={32} color="var(--color-status-danger, #EF4444)" />
            <p className="clms-document-viewer__error-title">Document Preview Unavailable</p>
            <p className="clms-document-viewer__error-desc">{errorMsg}</p>
          </div>
        )}

        {!(isLoading || propLoading) && !errorMsg && renderedPages.map((pNum) => (
          <div
            key={pNum}
            id={`clms-doc-wrapper-${pNum}`}
            className="clms-document-viewer__page-wrapper"
          >
            <canvas
              id={`clms-doc-page-${pNum}`}
              className="clms-document-viewer__page-canvas"
            />
            <div className="clms-document-viewer__page-badge">
              Page {pNum} / {pageCount}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
