// ==============================================================================
// CLMS Commercial Package Detail Modal (PO & BOQ Viewer)
// ==============================================================================
// Governed by DESIGN.md, PRODUCT.md, and AGENTS.md:
// - Direct in-app viewing of both the Purchase Order PDF and BOQ spreadsheet schedule
// - Authentic stored document downloads (PDF & XLSX) via private storage
// - Tabular breakdown of extracted sites, rates, authorized commitments, and scope
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { Modal, Button, FinancialValue, DocumentViewer, Tabs, TabItem, Skeleton } from '@/design-system';
import { commercialPackageRepository } from '@/infrastructure/repositories/CommercialPackageRepository';
import { supabase } from '@/infrastructure/supabase/client';
import { downloadService } from '@/application/services/DownloadService';
import {
  FileText,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

interface CommercialPackageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageId: string;
  initialTab?: 'BOQ' | 'PO' | 'DOCS';
}

export const CommercialPackageDetailModal: React.FC<CommercialPackageDetailModalProps> = ({
  isOpen,
  onClose,
  packageId,
  initialTab = 'BOQ',
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [packageData, setPackageData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [poPdfBlob, setPoPdfBlob] = useState<Blob | null>(null);
  const [isLoadingPoPdf, setIsLoadingPoPdf] = useState<boolean>(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [siteSearch, setSiteSearch] = useState<string>('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Load package details, sites, and documents
  useEffect(() => {
    if (!isOpen || !packageId) return;

    let isMounted = true;
    setIsLoading(true);

    async function loadData() {
      try {
        const details = await commercialPackageRepository.getPackageDetails(packageId);
        if (isMounted) {
          setPackageData(details);
          setIsLoading(false);

          // If PO document exists, prefetch blob for DocumentViewer
          const poDoc = details?.documents.find((d: any) => d.documentType === 'PO_SOURCE');
          if (poDoc) {
            setIsLoadingPoPdf(true);
            try {
              const { data, error } = await supabase.storage
                .from('commercial-documents')
                .download(poDoc.storagePath);
              if (!error && data && isMounted) {
                setPoPdfBlob(data);
              }
            } catch (err) {
              console.warn('Could not load PO PDF blob for preview:', err);
            } finally {
              if (isMounted) setIsLoadingPoPdf(false);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load package details:', err);
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, packageId]);

  if (!isOpen) return null;

  const boqDoc = packageData?.documents?.find((d: any) => d.documentType === 'BOQ_SOURCE');
  const poDoc = packageData?.documents?.find((d: any) => d.documentType === 'PO_SOURCE');

  const handleDownloadDoc = async (doc: any) => {
    if (!doc) return;
    setDownloadingDocId(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from('commercial-documents')
        .download(doc.storagePath);
      if (error) throw error;
      downloadService.downloadBlob(data, doc.fileName);
    } catch (err) {
      console.error('Failed to download document:', err);
    } finally {
      setDownloadingDocId(null);
    }
  };

  const tabs: TabItem[] = [
    {
      id: 'BOQ',
      label: 'BOQ Schedule & Sites',
      count: packageData?.sites?.length,
    },
    {
      id: 'PO',
      label: 'Purchase Order Contract',
    },
    {
      id: 'DOCS',
      label: 'Attached Source Files',
      count: packageData?.documents?.length,
    },
  ];

  const filteredSites = (packageData?.sites || []).filter((s: any) => {
    if (!siteSearch.trim()) return true;
    const q = siteSearch.toLowerCase();
    return (
      s.siteIdExt.toLowerCase().includes(q) ||
      s.siteName.toLowerCase().includes(q) ||
      s.region.toLowerCase().includes(q)
    );
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Commercial Package: ${packageData?.packageRef || 'Loading...'} • PO ${packageData?.poNumber || ''}`}
      width="1060px"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {boqDoc && (
              <Button
                variant="secondary"
                size="sm"
                icon={<FileSpreadsheet size={14} />}
                isLoading={downloadingDocId === boqDoc.id}
                onClick={() => handleDownloadDoc(boqDoc)}
              >
                Download BOQ (.xlsx)
              </Button>
            )}
            {poDoc && (
              <Button
                variant="secondary"
                size="sm"
                icon={<FileText size={14} />}
                isLoading={downloadingDocId === poDoc.id}
                onClick={() => handleDownloadDoc(poDoc)}
              >
                Download PO (.pdf)
              </Button>
            )}
          </div>

          <Button variant="secondary" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-2)' }}>
          <Skeleton height={56} />
          <Skeleton height={36} />
          <Skeleton height={320} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {/* Package Header Summary Strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--space-3) var(--space-4)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-hairline)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Project</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>
                {packageData?.projectName || '—'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Purchase Order</span>
              <strong style={{ color: 'var(--color-text-primary)' }}>
                {packageData?.poNumber || '—'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Supplier</span>
              <span style={{ color: 'var(--color-text-primary)' }}>{packageData?.supplierName || '—'}</span>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Scope</span>
              <span style={{ color: 'var(--color-text-primary)' }}>
                {packageData?.sites?.length || 0} Authorized Sites
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Authorized Commitment</span>
            <FinancialValue
              amount={packageData?.authorizedAmount || 0}
              currency={packageData?.currency || 'TZS'}
              size="md"
            />
          </div>
        </div>

        {/* Tabs: BOQ Schedule vs Purchase Order vs Attached Documents */}
        <Tabs tabs={tabs} activeTabId={activeTab} onTabChange={setActiveTab} />

        {/* TAB 1: BOQ SCHEDULE & SITES */}
        {activeTab === 'BOQ' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* BOQ Source Meta Banner */}
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                backgroundColor: 'var(--color-bg-primary)',
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <FileSpreadsheet size={20} color="var(--color-brand-primary)" />
                <div>
                  <strong style={{ fontSize: 'var(--font-size-xs)' }}>
                    {boqDoc?.fileName || 'Approved Bill of Quantities (BOQ)'}
                  </strong>
                  <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-secondary)' }}>
                    Template: {packageData?.templateVersion || 'Standard'} &bull; Ingested {new Date(packageData?.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {boqDoc && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download size={14} />}
                  isLoading={downloadingDocId === boqDoc.id}
                  onClick={() => handleDownloadDoc(boqDoc)}
                >
                  Download Original BOQ (.xlsx)
                </Button>
              )}
            </div>

            {/* Sites Search & Counter */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 'var(--font-weight-semibold)' }}>
                Authorized Site Allocations ({filteredSites.length} of {packageData?.sites?.length || 0} sites)
              </span>
              <input
                type="text"
                value={siteSearch}
                onChange={(e) => setSiteSearch(e.target.value)}
                placeholder="Filter by Site ID, Name, Region..."
                style={{
                  padding: 'var(--space-1) var(--space-3)',
                  fontSize: 'var(--font-size-xs)',
                  border: '1px solid var(--color-border-hairline)',
                  borderRadius: 'var(--radius-xs)',
                  width: '260px',
                }}
              />
            </div>

            {/* Sites Schedule Table */}
            <div
              className="border-hairline"
              style={{
                maxHeight: '440px',
                overflowY: 'auto',
                borderRadius: 'var(--radius-xs)',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-hairline)', textAlign: 'left' }}>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', fontWeight: 'var(--font-weight-semibold)' }}>Site ID</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', fontWeight: 'var(--font-weight-semibold)' }}>Site Name</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', fontWeight: 'var(--font-weight-semibold)' }}>Region</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', fontWeight: 'var(--font-weight-semibold)', textAlign: 'right' }}>Authorized Valuation</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', fontWeight: 'var(--font-weight-semibold)' }}>Scope Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSites.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        No sites matching search criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSites.map((site: any, idx: number) => (
                      <tr
                        key={site.id || idx}
                        style={{
                          borderBottom: '1px solid var(--color-border-hairline)',
                          backgroundColor: idx % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)',
                        }}
                      >
                        <td style={{ padding: 'var(--space-2) var(--space-3)', fontWeight: 'var(--font-weight-medium)' }}>
                          {site.siteIdExt}
                        </td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)' }}>{site.siteName}</td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-text-secondary)' }}>{site.region}</td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>
                          <FinancialValue amount={site.authorizedAmount} currency={packageData?.currency || 'TZS'} size="sm" />
                        </td>
                        <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-text-muted)' }}>
                          {site.scopeDescription || 'Commercial civil works & site improvements'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: PURCHASE ORDER DOCUMENT */}
        {activeTab === 'PO' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* PO Source Meta Banner */}
            <div
              className="border-hairline"
              style={{
                padding: 'var(--space-3) var(--space-4)',
                backgroundColor: 'var(--color-bg-primary)',
                borderRadius: 'var(--radius-xs)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <FileText size={20} color="var(--color-brand-primary)" />
                <div>
                  <strong style={{ fontSize: 'var(--font-size-xs)' }}>
                    Purchase Order: {packageData?.poNumber} {poDoc ? `• ${poDoc.fileName}` : ''}
                  </strong>
                  <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-secondary)' }}>
                    Supplier: {packageData?.supplierName} &bull; Authorized: {packageData?.currency} {Number(packageData?.authorizedAmount || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              {poDoc && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Download size={14} />}
                  isLoading={downloadingDocId === poDoc.id}
                  onClick={() => handleDownloadDoc(poDoc)}
                >
                  Download PO (.pdf)
                </Button>
              )}
            </div>

            {/* In-App Document Viewer for PO PDF */}
            <div
              style={{
                minHeight: '560px',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-hairline)',
                overflow: 'hidden',
              }}
            >
              {!poDoc ? (
                <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No stored PO source document is registered for this package.
                </div>
              ) : (
                <DocumentViewer
                  source={poPdfBlob}
                  isLoading={isLoadingPoPdf}
                  fileName={poDoc.fileName}
                  title={`PO ${packageData?.poNumber}`}
                  initialScale={1.1}
                />
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ATTACHED SOURCE FILES VAULT */}
        {activeTab === 'DOCS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Authoritative commercial documents ingested and cryptographically preserved in private storage for this package.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {(packageData?.documents || []).map((doc: any) => {
                const isBoq = doc.documentType === 'BOQ_SOURCE';
                return (
                  <div
                    key={doc.id}
                    className="border-hairline"
                    style={{
                      padding: 'var(--space-3) var(--space-4)',
                      borderRadius: 'var(--radius-xs)',
                      backgroundColor: 'var(--color-bg-primary)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      {isBoq ? (
                        <FileSpreadsheet size={24} color="var(--color-brand-primary)" />
                      ) : (
                        <FileText size={24} color="var(--color-brand-primary)" />
                      )}
                      <div>
                        <strong style={{ fontSize: 'var(--font-size-xs)', display: 'block' }}>{doc.fileName}</strong>
                        <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-secondary)' }}>
                          Type: {doc.documentType} &bull; Size: {(doc.fileSize / 1024).toFixed(1)} KB &bull; Mime: {doc.mimeType}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<Download size={14} />}
                        isLoading={downloadingDocId === doc.id}
                        onClick={() => handleDownloadDoc(doc)}
                      >
                        Download
                      </Button>
                      {isBoq ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<FileSpreadsheet size={14} />}
                          onClick={() => setActiveTab('BOQ')}
                        >
                          View Schedule
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<FileText size={14} />}
                          onClick={() => setActiveTab('PO')}
                        >
                          View Document
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      )}
    </Modal>
  );
};
