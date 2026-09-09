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

import React, { useState, useEffect } from 'react';
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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function compilePacket() {
      try {
        setErrorMsg(null);
        const result = await CertificatePacketService.generateCertificatePacket({
          certificate,
          poSites,
          approverName: reviewerName,
        });

        if (isMounted) {
          setPdfBytes(result.pdfBytes);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to compile certificate preview packet';
          console.error('[CertificateDocumentView] Error generating certificate preview:', err);
          setErrorMsg(msg);
        }
      }
    }

    compilePacket();

    return () => {
      isMounted = false;
    };
  }, [certificate, poSites, reviewerName]);

  return (
    <div style={{ width: '100%', height: '100%', minHeight: '600px', display: 'flex', flexDirection: 'column' }}>
      {errorMsg ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-status-danger)' }}>
          {errorMsg}
        </div>
      ) : (
        <DocumentViewer
          source={pdfBytes}
          fileName={`${certificate.certificateNumber}.pdf`}
          title={`${certificate.certificateNumber} (${certificate.certType})`}
          className={className}
        />
      )}
    </div>
  );
};
