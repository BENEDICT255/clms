// ==============================================================================
// CLMS Unified Commercial Invoice Document View
// ==============================================================================
// High-fidelity on-screen multi-page viewer powered by the canonical DocumentViewer.
// Renders all pages of the complete commercial packet:
//   - Part 1: Attached Supplier Commercial Invoice Document
//   - Part 2: Attached TRA / EFD Fiscal Receipt & Supporting Documents
//   - Part 3: Official Acceptance Certificate (FAC / PAC) with linked PO & Terms
// Governed by Stabilization Sections 16, 17, 18, 24, 26, 28:
// - Zero hardcoded commercial values (no Benedict Bisama, no fake amounts)
// - IDM-independent in-app viewing via ArrayBuffer/Blob
// - Continuous vertical scroll displaying ALL pages
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { InvoiceRecord, invoiceRepository } from '@/infrastructure/repositories/InvoiceRepository';
import { certificateRepository } from '@/infrastructure/repositories/CertificateRepository';
import { CertificatePacketService } from '@/application/services/CertificatePacketService';
import { DocumentViewer, Button } from '@/design-system';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { documentStorageService } from '@/infrastructure/storage/DocumentStorageService';

interface InvoiceDocumentViewProps {
  invoice: InvoiceRecord;
  onPdfReady?: (pdfBytes: Uint8Array) => void;
  className?: string;
}

export const InvoiceDocumentView: React.FC<InvoiceDocumentViewProps> = ({
  invoice,
  onPdfReady,
  className = '',
}) => {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState<string>('Loading commercial packet...');
  const [error, setError] = useState<string | null>(null);

  const loadDocument = async () => {
    setIsLoading(true);
    setError(null);
    setPdfBytes(null);

    try {
      // 1. Try to load pre-compiled authoritative unified document from storage
      setLoadingStep('Checking commercial vault for authoritative packet snapshot...');
      const storedDoc = await invoiceRepository.getUnifiedInvoiceDocument(invoice.id);
      if (storedDoc) {
        try {
          const blob = await documentStorageService.downloadBlob(storedDoc.storagePath);
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          if (bytes.length > 0) {
            setPdfBytes(bytes);
            onPdfReady?.(bytes);
            setIsLoading(false);
            return;
          }
        } catch (vaultErr) {
          console.warn('[InvoiceDocumentView] Vault fetch fallback:', vaultErr);
        }
      }

      // 2. Fallback: Dynamically assemble the certificate packet linked to this invoice
      setLoadingStep('Assembling authentic commercial certificate packet from linked PO...');
      const cert = await certificateRepository.getCertificateById(invoice.certificateId);
      if (!cert) {
        setError(`Referenced certificate (${invoice.certificateNumber}) could not be retrieved.`);
        setIsLoading(false);
        return;
      }

      const poSites = await certificateRepository.getPoSites(cert.poId);
      const certResult = await CertificatePacketService.generateCertificatePacket({
        certificate: cert,
        poSites,
      });

      setPdfBytes(certResult.pdfBytes);
      onPdfReady?.(certResult.pdfBytes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to compile commercial packet';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocument();
  }, [invoice.id, invoice.certificateId]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '520px',
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
    );
  }

  if (error || !pdfBytes) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '420px',
          backgroundColor: 'var(--color-surface-sunken)',
          borderRadius: 'var(--radius-xs)',
          gap: 'var(--space-3)',
          padding: 'var(--space-4)',
          textAlign: 'center',
        }}
      >
        <AlertCircle size={28} color="var(--color-semantic-error-text)" />
        <div style={{ color: 'var(--color-text-primary)', fontWeight: 'var(--font-weight-semibold)' }}>
          Commercial Packet Unavailable
        </div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)', maxWidth: '420px' }}>
          {error || 'The document packet could not be rendered from the commercial vault.'}
        </div>
        <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={loadDocument}>
          Retry Retrieval
        </Button>
      </div>
    );
  }

  return (
    <div className={`clms-invoice-document-view ${className}`} style={{ width: '100%' }}>
      <DocumentViewer
        source={pdfBytes}
        fileName={`${invoice.clmsRef || 'Invoice'}_Complete_Packet.pdf`}
        title={`Commercial Invoice Packet: ${invoice.clmsRef}`}
        height="640px"
        initialScale={1.1}
      />
    </div>
  );
};
