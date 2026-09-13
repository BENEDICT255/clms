// ==============================================================================
// CLMS PO Lifecycle Detail Drawers
// ==============================================================================
// Governed by PRODUCT.md, ARCHITECTURE.md, and AGENTS.md.
// Provides slide-out drawers for:
// - Purchase Order Details (with Overview, Sites, Documents, History tabs)
// - Certificate Details (with Overview & in-app DocumentViewer preview)
// - Invoice Details (with Overview & in-app DocumentViewer packet preview)
// - Payment Details (with Transaction metadata)
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Drawer, Button, DocumentViewer, Tabs, TabItem } from '@/design-system';
import { FileText, Download, CheckCircle2 } from 'lucide-react';
import {
  POLifecycleSummary,
  POLifecycleCertificateNode,
  POLifecycleInvoiceNode,
  POLifecyclePaymentNode,
} from '@/infrastructure/repositories/POLifecycleRepository';
import { CertificatePdfService } from '@/features/certificates/CertificatePdfService';
import { InvoiceDocumentView } from '@/features/invoices/InvoiceDocumentView';
import { certificateRepository } from '@/infrastructure/repositories/CertificateRepository';
import { invoiceRepository, InvoiceRecord } from '@/infrastructure/repositories/InvoiceRepository';
import { downloadService } from '@/application/services/DownloadService';

// ==========================================
// 1. PO Details Drawer
// ==========================================
export interface PODrawerProps {
  isOpen: boolean;
  onClose: () => void;
  summary: POLifecycleSummary | null;
  sites: Array<{
    id: string;
    siteIdExt: string;
    siteName: string;
    region: string;
    authorizedAmount: number;
  }>;
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storagePath: string;
  }>;
  onViewDocuments: () => void;
}

export const PODrawer: React.FC<PODrawerProps> = ({
  isOpen,
  onClose,
  summary,
  sites,
  documents,
  onViewDocuments,
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!summary) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'sites', label: `Sites (${sites.length})` },
    { id: 'documents', label: `Documents (${documents.length})` },
    { id: 'history', label: 'History' },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Purchase Order Details"
      subtitle={`PO ${summary.poNumber} • ${summary.supplierName}`}
      width="540px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', width: '100%' }}>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<FileText size={15} />}
            onClick={onViewDocuments}
          >
            View PO Documents
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Tabs tabs={tabs} activeTabId={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="border-hairline" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-surface-card)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>PO Number:</span>
                <span className="tabular-nums font-semibold" style={{ fontFamily: 'var(--font-family-mono)' }}>
                  {summary.poNumber}
                </span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Supplier:</span>
                <span style={{ fontWeight: 'var(--font-weight-medium)' }}>{summary.supplierName}</span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Project:</span>
                <span>{summary.projectName}</span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Authorized Value:</span>
                <span className="tabular-nums font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {summary.currency} {formatCurrency(summary.authorizedValue)}
                </span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Issued Date:</span>
                <span className="tabular-nums">{summary.issuedDate}</span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Payment Terms:</span>
                <span className="tabular-nums">{summary.paymentTermsDays} days</span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Currency:</span>
                <span>{summary.currency}</span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
                <span style={{ color: 'var(--color-status-success-text)', fontWeight: 'var(--font-weight-medium)' }}>
                  ● Active
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sites' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {sites.length === 0 ? (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                No sites mapped to this purchase order.
              </p>
            ) : (
              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                <table className="clms-dashboard-table">
                  <thead>
                    <tr>
                      <th>Site ID</th>
                      <th>Site Name</th>
                      <th>Region</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((s) => (
                      <tr key={s.id}>
                        <td style={{ fontFamily: 'var(--font-family-mono)' }}>{s.siteIdExt}</td>
                        <td>{s.siteName}</td>
                        <td>{s.region}</td>
                        <td style={{ textAlign: 'right' }} className="tabular-nums">
                          {formatCurrency(s.authorizedAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {documents.length === 0 ? (
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                No stored commercial documents.
              </p>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="border-hairline"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-xs)',
                    backgroundColor: 'var(--color-surface-card)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <FileText size={16} style={{ color: 'var(--color-brand-primary)' }} />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-medium)' }}>
                        {doc.fileName}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)' }}>
                        {doc.documentType} • {(doc.fileSize / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={onViewDocuments}>
                    Preview
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', fontSize: 'var(--font-size-xs)' }}>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--color-status-success-text)', flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 'var(--font-weight-medium)' }}>Purchase Order Authorized</div>
                <div style={{ color: 'var(--color-text-tertiary)' }}>{summary.issuedDate}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
};

// ==========================================
// 2. Certificate Details Drawer
// ==========================================
export interface CertificateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: POLifecycleCertificateNode | null;
  poNumber: string;
  supplierName: string;
}

export const CertificateDrawer: React.FC<CertificateDrawerProps> = ({
  isOpen,
  onClose,
  certificate,
  poNumber,
  supplierName,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  useEffect(() => {
    async function loadCertificateDocument() {
      if (!certificate || !isOpen) return;
      setIsLoadingPdf(true);
      try {
        const certRecords = await certificateRepository.listCertificates({ poId: undefined });
        const match = certRecords.find((c) => c.id === certificate.id || c.certificateNumber === certificate.certificateNumber);
        if (match) {
          const certBytes = await CertificatePdfService.generateCertificatePdf({ certificate: match });
          setPdfBlob(new Blob([new Uint8Array(certBytes)], { type: 'application/pdf' }));
        }
      } catch (err) {
        console.error('Failed to load certificate document PDF:', err);
      } finally {
        setIsLoadingPdf(false);
      }
    }
    loadCertificateDocument();
  }, [certificate, isOpen]);

  if (!certificate) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleDownload = () => {
    if (pdfBlob) {
      downloadService.downloadBlob(pdfBlob, `${certificate.certificateNumber}.pdf`);
    }
  };

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'document', label: 'Document Preview' },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Certificate Details"
      subtitle={`${certificate.certificateNumber} • ${certificate.certTypeName}`}
      width="640px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', width: '100%' }}>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
          {pdfBlob && (
            <Button
              variant="primary"
              size="md"
              icon={<Download size={15} />}
              onClick={handleDownload}
            >
              Download PDF
            </Button>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%' }}>
        <Tabs tabs={tabs} activeTabId={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="border-hairline" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-surface-card)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Certificate No:</span>
                <span className="tabular-nums font-semibold" style={{ fontFamily: 'var(--font-family-mono)' }}>
                  {certificate.certificateNumber}
                </span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Type:</span>
                <span style={{ fontWeight: 'var(--font-weight-medium)' }}>
                  {certificate.certType} ({certificate.certTypeName})
                </span>

                <span style={{ color: 'var(--color-text-secondary)' }}>PO Number:</span>
                <span className="tabular-nums">{poNumber}</span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Supplier:</span>
                <span>{supplierName}</span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Certified Amount:</span>
                <span className="tabular-nums font-semibold" style={{ color: 'var(--color-brand-primary)' }}>
                  {certificate.currency} {formatCurrency(certificate.amount)}
                </span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Sites Included:</span>
                <span className="tabular-nums">{certificate.siteCount} Sites</span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Issued Date:</span>
                <span className="tabular-nums">{certificate.issuedDate}</span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
                <span style={{ color: 'var(--color-status-success-text)', fontWeight: 'var(--font-weight-medium)' }}>
                  ● {certificate.status}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'document' && (
          <div style={{ flex: 1, minHeight: '500px' }}>
            <DocumentViewer
              source={pdfBlob}
              fileName={`${certificate.certificateNumber}.pdf`}
              title={certificate.certificateNumber}
              isLoading={isLoadingPdf}
              height="520px"
            />
          </div>
        )}
      </div>
    </Drawer>
  );
};

// ==========================================
// 3. Invoice Details Drawer
// ==========================================
export interface InvoiceDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: POLifecycleInvoiceNode | null;
  poNumber: string;
  supplierName: string;
}

export const InvoiceDrawer: React.FC<InvoiceDrawerProps> = ({
  isOpen,
  onClose,
  invoice,
  poNumber,
  supplierName,
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [fullInvoiceRecord, setFullInvoiceRecord] = useState<InvoiceRecord | null>(null);

  useEffect(() => {
    async function loadInvoicePacket() {
      if (!invoice || !isOpen || invoice.isPlaceholder) return;
      try {
        const full = await invoiceRepository.getInvoice(invoice.id);
        if (full) {
          setFullInvoiceRecord(full as any);
        }
      } catch (err) {
        console.error('Failed to load invoice:', err);
      }
    }
    loadInvoicePacket();
  }, [invoice, isOpen]);

  if (!invoice || invoice.isPlaceholder) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleDownload = () => {
    if (pdfBlob) {
      downloadService.downloadBlob(pdfBlob, `${invoice.clmsReference}_Packet.pdf`);
    }
  };

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'packet', label: 'Invoice Packet' },
  ];

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice Details"
      subtitle={`${invoice.clmsReference} • ${supplierName}`}
      width="640px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', width: '100%' }}>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
          {pdfBlob && (
            <Button
              variant="primary"
              size="md"
              icon={<Download size={15} />}
              onClick={handleDownload}
            >
              Download Packet
            </Button>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', height: '100%' }}>
        <Tabs tabs={tabs} activeTabId={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="border-hairline" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-surface-card)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', rowGap: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>CLMS Reference:</span>
                <span className="tabular-nums font-semibold" style={{ fontFamily: 'var(--font-family-mono)' }}>
                  {invoice.clmsReference}
                </span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Supplier Invoice No:</span>
                <span className="tabular-nums">{invoice.supplierInvoiceNumber}</span>

                <span style={{ color: 'var(--color-text-secondary)' }}>PO Number:</span>
                <span className="tabular-nums">{poNumber}</span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Supplier:</span>
                <span>{supplierName}</span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Invoice Amount:</span>
                <span className="tabular-nums font-semibold" style={{ color: 'var(--color-brand-primary)' }}>
                  {invoice.currency} {formatCurrency(invoice.amount)}
                </span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Submitted Date:</span>
                <span className="tabular-nums">{invoice.submittedDate}</span>

                <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
                <span style={{ fontWeight: 'var(--font-weight-medium)', color: 'var(--color-brand-primary)' }}>
                  ● {invoice.status}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'packet' && (
          <div style={{ flex: 1, minHeight: '500px' }}>
            {fullInvoiceRecord ? (
              <InvoiceDocumentView
                invoice={fullInvoiceRecord}
                onPdfReady={(safeBytes) =>
                  setPdfBlob(new Blob([new Uint8Array(safeBytes)], { type: 'application/pdf' }))
                }
              />
            ) : (
              <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                Loading commercial packet...
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
};

// ==========================================
// 4. Payment Details Drawer
// ==========================================
export interface PaymentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  payment: POLifecyclePaymentNode | null;
  supplierName: string;
}

export const PaymentDrawer: React.FC<PaymentDrawerProps> = ({
  isOpen,
  onClose,
  payment,
  supplierName,
}) => {
  if (!payment || payment.isPlaceholder) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Payment Transaction Details"
      subtitle={`${payment.referenceNumber} • ${supplierName}`}
      width="480px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div className="border-hairline" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-surface-card)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 'var(--space-2)', fontSize: 'var(--font-size-xs)' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>Payment Ref:</span>
            <span className="tabular-nums font-semibold" style={{ fontFamily: 'var(--font-family-mono)' }}>
              {payment.referenceNumber}
            </span>

            <span style={{ color: 'var(--color-text-secondary)' }}>Supplier:</span>
            <span>{supplierName}</span>

            <span style={{ color: 'var(--color-text-secondary)' }}>Amount Paid:</span>
            <span className="tabular-nums font-semibold" style={{ color: 'var(--color-status-success-text)' }}>
              {payment.currency} {formatCurrency(payment.amount)}
            </span>

            <span style={{ color: 'var(--color-text-secondary)' }}>Payment Date:</span>
            <span className="tabular-nums">{payment.paymentDate}</span>

            <span style={{ color: 'var(--color-text-secondary)' }}>Status:</span>
            <span style={{ color: 'var(--color-status-success-text)', fontWeight: 'var(--font-weight-medium)' }}>
              ● {payment.status}
            </span>

            {payment.paymentMethod && (
              <>
                <span style={{ color: 'var(--color-text-secondary)' }}>Method:</span>
                <span>{payment.paymentMethod}</span>
              </>
            )}

            {payment.notes && (
              <>
                <span style={{ color: 'var(--color-text-secondary)' }}>Notes:</span>
                <span>{payment.notes}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
