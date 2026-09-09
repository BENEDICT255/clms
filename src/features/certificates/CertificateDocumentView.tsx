// ==============================================================================
// CLMS Authentic Certificate Document View (On-Screen & Print Replica)
// ==============================================================================
// Governed by AGENTS.md and Stabilization Specification Sections 11-16, 45:
// - Powered by the canonical CertificatePacketService and DocumentViewer
// - Zero hardcoded commercial/reviewer values
// - Dynamically appends ALL pages of the actual linked PO document
// - Responsive fit-width scaling without 794px horizontal clipping
// - Zero external IDM interception
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { CertificateRecord } from '@/infrastructure/repositories/CertificateRepository';
import {
  CertificatePacketService,
  PoSiteDetail,
} from '@/application/services/CertificatePacketService';
import { DocumentViewer } from '@/design-system';

interface CertificateDocumentViewProps {
  certificate: CertificateRecord;
  poSites?: PoSiteDetail[] | undefined;
  reviewerName?: string | undefined;
  className?: string | undefined;
}

export const CertificateDocumentView: React.FC<CertificateDocumentViewProps> = ({
  certificate,
  poSites = [],
  reviewerName,
  className = '',
}) => {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const requestIdRef = useRef<number>(0);

  useEffect(() => {
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMsg(null);

    async function compilePacket() {
      try {
        const result = await CertificatePacketService.generateCertificatePacket({
          certificate,
          poSites,
          approverName: reviewerName,
        });

        if (currentRequestId === requestIdRef.current) {
          setPdfBytes(result.pdfBytes);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (currentRequestId === requestIdRef.current) {
          const msg = err instanceof Error ? err.message : 'Failed to compile certificate preview packet';
          console.error('[CertificateDocumentView] Error generating certificate preview:', err);
          setErrorMsg(msg);
          setIsLoading(false);
        }
      }
    }

    compilePacket();
  }, [
    certificate.id,
    certificate.certificateNumber,
    certificate.status,
    certificate.currentCertifiedAmount,
    poSites.length,
    reviewerName,
  ]);

  if (isLoading && !pdfBytes) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: '560px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-surface-sunken, #F8FAFC)',
          borderRadius: 'var(--radius-xs, 4px)',
          gap: 'var(--space-3, 12px)',
          color: 'var(--color-text-secondary, #64748B)',
          fontSize: 'var(--font-size-sm, 13px)',
        }}
      >
        <Loader2 className="animate-spin text-brand" size={32} />
        <div style={{ fontWeight: 'var(--font-weight-semibold, 600)', color: 'var(--color-text-primary, #0F172A)' }}>
          Compiling Authentic Certificate Packet...
        </div>
        <div style={{ fontSize: 'var(--font-size-xs, 12px)', color: 'var(--color-text-tertiary, #94A3B8)' }}>
          {certificate.certificateNumber} ({certificate.certType}) — Assembling acceptance certificate and linked purchase order
        </div>
      </div>
    );
  }

  if (errorMsg && !pdfBytes) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-surface-sunken, #F8FAFC)',
          borderRadius: 'var(--radius-xs, 4px)',
          gap: 'var(--space-2, 8px)',
          padding: 'var(--space-4, 16px)',
          textAlign: 'center',
        }}
      >
        <AlertCircle size={32} color="var(--color-status-danger, #EF4444)" />
        <div style={{ fontWeight: 'var(--font-weight-semibold, 600)', color: 'var(--color-text-primary, #0F172A)' }}>
          Certificate Compilation Error
        </div>
        <div style={{ fontSize: 'var(--font-size-xs, 12px)', color: 'var(--color-text-secondary, #64748B)', maxWidth: '440px' }}>
          {errorMsg}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
      <DocumentViewer
        source={pdfBytes}
        fileName={`${certificate.certificateNumber}.pdf`}
        title={`${certificate.certificateNumber} (${certificate.certType})`}
        className={className}
        isLoading={isLoading}
      />
    </div>
  );
};
