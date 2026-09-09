// ==============================================================================
// CLMS Commercial Invoice Preview Modal
// ==============================================================================
// Displays the full multi-page unified invoice packet on screen:
//   - Attached Supplier Commercial Invoice Document
//   - Attached TRA / EFD Fiscal Receipt (if provided)
//   - Official 9-Page Helios Acceptance Certificate (FAC / PAC)
// Offers instant PDF download and print options.
// ==============================================================================

import { useState } from 'react';
import { Modal, Button, StatusBadge, FinancialValue } from '@/design-system';
import { InvoiceRecord } from '@/infrastructure/repositories/InvoiceRepository';
import { InvoiceDocumentView } from './InvoiceDocumentView';
import { CertificatePdfService } from '@/features/certificates/CertificatePdfService';
import { Download, Printer, ShieldCheck } from 'lucide-react';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceRecord | null;
}

export function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice,
}: InvoicePreviewModalProps) {
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);

  if (!invoice) return null;

  const handleDownload = () => {
    if (pdfBytes) {
      CertificatePdfService.triggerDownload(
        pdfBytes,
        `${invoice.clmsRef}_Complete_Invoice_Packet.pdf`
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Commercial Invoice Packet: ${invoice.clmsRef}`}
      width="920px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
            <ShieldCheck size={16} color="var(--color-semantic-success-text)" />
            <span>Authoritative commercial claim tied to Certificate {invoice.certificateNumber}</span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              variant="secondary"
              size="md"
              icon={<Printer size={15} />}
              onClick={handlePrint}
            >
              Print
            </Button>

            <Button
              variant="primary"
              size="md"
              icon={<Download size={15} />}
              onClick={handleDownload}
              disabled={!pdfBytes}
            >
              Download Complete Packet (PDF)
            </Button>

            <Button variant="secondary" size="md" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Commercial Lineage Card */}
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
            <strong>{invoice.supplierInvoiceNo}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Supplier Entity</span>
            <strong>{invoice.supplierName}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Milestone Certificate</span>
            <strong>{invoice.certificateNumber}</strong> ({invoice.certType})
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Purchase Order</span>
            <strong>{invoice.poNumber}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Net Base Amount</span>
            <FinancialValue amount={invoice.amount} currency={invoice.currency} size="sm" />
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>VAT (18%)</span>
            <FinancialValue amount={invoice.taxAmount} currency={invoice.currency} size="sm" />
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Total Claim Payable</span>
            <FinancialValue
              amount={invoice.totalAmount}
              currency={invoice.currency}
              size="md"
              className="font-bold text-positive"
            />
          </div>
          <div>
            <span style={{ color: 'var(--color-text-secondary)', display: 'block' }}>Review Status</span>
            <div style={{ marginTop: '2px' }}>
              <StatusBadge status={invoice.status} size="sm" />
            </div>
          </div>
        </div>

        {/* High-Fidelity On-Screen Multi-Page Document View */}
        <InvoiceDocumentView
          invoice={invoice}
          onPdfReady={(bytes) => setPdfBytes(bytes)}
        />
      </div>
    </Modal>
  );
}
