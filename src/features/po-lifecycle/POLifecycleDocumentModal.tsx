// ==============================================================================
// CLMS PO Lifecycle Document Modal
// ==============================================================================
// Displays the authoritative stored Purchase Order document inside DocumentViewer.
// Governed by PRODUCT.md, ARCHITECTURE.md, and AGENTS.md.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Modal, DocumentViewer, Button } from '@/design-system';
import { Download } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { downloadService } from '@/application/services/DownloadService';

export interface POLifecycleDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  poNumber: string;
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storagePath: string;
  }>;
}

export const POLifecycleDocumentModal: React.FC<POLifecycleDocumentModalProps> = ({
  isOpen,
  onClose,
  poNumber,
  documents,
}) => {
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [docBlob, setDocBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeDoc = documents[activeDocIndex];

  useEffect(() => {
    async function loadDoc() {
      if (!isOpen || !activeDoc) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from('commercial-documents')
          .download(activeDoc.storagePath);
        if (error) throw error;
        setDocBlob(data);
      } catch (err) {
        console.error('Failed to download PO document from storage:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDoc();
  }, [isOpen, activeDoc]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (docBlob && activeDoc) {
      downloadService.downloadBlob(docBlob, activeDoc.fileName);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Purchase Order Document • ${poNumber}${activeDoc ? ` (${activeDoc.fileName})` : ''}`}
      width="900px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            {documents.length > 1 && (
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {documents.map((d, idx) => (
                  <Button
                    key={d.id}
                    variant={idx === activeDocIndex ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setActiveDocIndex(idx)}
                  >
                    {d.documentType === 'PO_SOURCE' ? 'PO Contract' : 'BOQ Source'}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" size="md" onClick={onClose}>
              Close
            </Button>
            {docBlob && (
              <Button
                variant="primary"
                size="md"
                icon={<Download size={15} />}
                onClick={handleDownload}
              >
                Download
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div style={{ minHeight: '600px' }}>
        {documents.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            No source document is currently attached to this purchase order.
          </div>
        ) : (
          <DocumentViewer
            source={docBlob}
            fileName={activeDoc?.fileName || 'purchase_order.pdf'}
            title={`PO ${poNumber}`}
            isLoading={isLoading}
            height="580px"
          />
        )}
      </div>
    </Modal>
  );
};
