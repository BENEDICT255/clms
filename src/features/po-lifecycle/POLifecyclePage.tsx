// ==============================================================================
// CLMS PO Lifecycle Page (IMAGE 2 FIDELITY)
// ==============================================================================
// Displays authoritative 4-stage horizontal commercial lineage:
// PURCHASE ORDER -> CERTIFICATION -> INVOICE -> PAYMENT
// Governed by PRODUCT.md, DESIGN.md (v1.2 frozen), ARCHITECTURE.md, and AGENTS.md.
// ==============================================================================

import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthContext';
import {
  poLifecycleRepository,
  POLifecycleSearchItem,
  POLifecycleTreeData,
  POLifecycleCertificateNode,
  POLifecycleInvoiceNode,
  POLifecyclePaymentNode,
} from '@/infrastructure/repositories/POLifecycleRepository';
import { Button, Skeleton } from '@/design-system';
import {
  FileText,
  Search,
  ChevronRight,
  Workflow,
  CheckCircle2,
} from 'lucide-react';
import {
  PODrawer,
  CertificateDrawer,
  InvoiceDrawer,
  PaymentDrawer,
} from './POLifecycleDrawers';
import { POLifecycleDocumentModal } from './POLifecycleDocumentModal';
import './POLifecycle.css';

export const POLifecyclePage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPoParam = searchParams.get('po');
  const currentFocusParam = searchParams.get('focus');

  // Search & Selector State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<POLifecycleSearchItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lineage Tree Data State
  const [treeData, setTreeData] = useState<POLifecycleTreeData | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState(false);

  // Drawer / Modal State
  const [isPODrawerOpen, setIsPODrawerOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<POLifecycleCertificateNode | null>(null);
  const [isCertDrawerOpen, setIsCertDrawerOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<POLifecycleInvoiceNode | null>(null);
  const [isInvoiceDrawerOpen, setIsInvoiceDrawerOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<POLifecyclePaymentNode | null>(null);
  const [isPaymentDrawerOpen, setIsPaymentDrawerOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search POs
  useEffect(() => {
    let active = true;
    async function performSearch() {
      try {
        const searchParamsObj: { query?: string; supplierId?: string } = {};
        if (searchQuery) searchParamsObj.query = searchQuery;
        if (user?.supplierId) searchParamsObj.supplierId = user.supplierId;

        const results = await poLifecycleRepository.searchPOs(searchParamsObj);
        if (active) {
          setSearchResults(results);
        }
      } catch (err) {
        console.error('Failed to search POs:', err);
      }
    }
    const timer = setTimeout(performSearch, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, user?.supplierId]);

  // Load Tree Data when `po` param changes
  useEffect(() => {
    async function loadTree() {
      if (!currentPoParam) {
        setTreeData(null);
        return;
      }
      setIsLoadingTree(true);
      try {
        const data = await poLifecycleRepository.getPOLifecycleData(
          currentPoParam,
          user?.supplierId ?? undefined
        );
        setTreeData(data);

        // Handle Deep Linking `focus` param
        if (data && currentFocusParam) {
          const [type, id] = currentFocusParam.split(':');
          if (type === 'cert' || type === 'certificate') {
            const foundCert = data.certificates.find(
              (c) => c.id === id || c.certificateNumber === id
            );
            if (foundCert) {
              setSelectedCertificate(foundCert);
              setIsCertDrawerOpen(true);
            }
          } else if (type === 'inv' || type === 'invoice') {
            for (const c of data.certificates) {
              const foundInv = c.invoices.find(
                (i) => i.id === id || i.clmsReference === id || i.supplierInvoiceNumber === id
              );
              if (foundInv && !foundInv.isPlaceholder) {
                setSelectedInvoice(foundInv);
                setIsInvoiceDrawerOpen(true);
                break;
              }
            }
          } else if (type === 'pay' || type === 'payment') {
            for (const c of data.certificates) {
              for (const i of c.invoices) {
                const foundPay = i.payments.find(
                  (p) => p.id === id || p.referenceNumber === id
                );
                if (foundPay && !foundPay.isPlaceholder) {
                  setSelectedPayment(foundPay);
                  setIsPaymentDrawerOpen(true);
                  break;
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to load PO lifecycle tree:', err);
      } finally {
        setIsLoadingTree(false);
      }
    }
    loadTree();
  }, [currentPoParam, currentFocusParam, user?.supplierId]);

  const handleSelectPO = (poItem: POLifecycleSearchItem) => {
    setIsDropdownOpen(false);
    setSearchQuery(poItem.poNumber);
    setSearchParams({ po: poItem.poNumber });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  return (
    <div className="clms-po-lifecycle-page">
      {/* Header & Breadcrumbs */}
      <div className="clms-po-lifecycle-header">
        <div className="clms-po-lifecycle-header__left">
          <div className="clms-po-lifecycle-header__breadcrumbs">
            <span>Commercial</span>
            <span>/</span>
            <span className="clms-po-lifecycle-header__crumb--active">PO Lifecycle</span>
          </div>
          <h1 className="clms-po-lifecycle-header__title">PO Lifecycle</h1>
          <p className="clms-po-lifecycle-header__subtitle">
            View the complete commercial lifecycle from purchase order to payment.
          </p>
        </div>

        <div>
          {treeData && (
            <Button
              variant="secondary"
              size="md"
              icon={<FileText size={15} />}
              onClick={() => setIsDocModalOpen(true)}
            >
              View PO Documents
            </Button>
          )}
        </div>
      </div>

      {/* PO Search / Dropdown Bar */}
      <div className="clms-po-selector-bar" ref={dropdownRef}>
        <label htmlFor="po-search-input" className="clms-po-selector-bar__label">
          Select Purchase Order:
        </label>
        <div className="clms-po-selector-bar__input-wrapper">
          <Search size={14} className="clms-po-selector-bar__search-icon" aria-hidden="true" />
          <input
            id="po-search-input"
            type="text"
            className="clms-po-selector-bar__input tabular-nums"
            placeholder="Search by PO Number (e.g. 4500015358)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
          />

          {isDropdownOpen && searchResults.length > 0 && (
            <div className="clms-po-selector-bar__dropdown">
              {searchResults.map((po) => (
                <div
                  key={po.id}
                  className="clms-po-selector-bar__option"
                  onClick={() => handleSelectPO(po)}
                >
                  <span className="clms-po-selector-bar__option-po tabular-nums">
                    {po.poNumber}
                  </span>
                  <span className="clms-po-selector-bar__option-meta">
                    {po.supplierName} • {po.siteCount} Sites
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Empty State Before Selection */}
      {!currentPoParam && !isLoadingTree && (
        <div className="clms-po-lifecycle-empty">
          <Workflow size={40} style={{ color: 'var(--color-brand-primary)' }} />
          <h2 className="clms-po-lifecycle-empty__title">Select a Purchase Order</h2>
          <p className="clms-po-lifecycle-empty__desc">
            Select a Purchase Order to view its commercial lifecycle from commitment through certification, invoicing, and payment settlement.
          </p>
          {searchResults.length > 0 && (
            <div style={{ marginTop: 'var(--space-2)' }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSelectPO(searchResults[0])}
              >
                Load Recent PO: {searchResults[0].poNumber}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoadingTree && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Skeleton height="80px" />
          <Skeleton height="56px" />
          <Skeleton height="400px" />
        </div>
      )}

      {/* Selected PO Content */}
      {treeData && !isLoadingTree && (
        <>
          {/* PO Summary Strip */}
          <div className="clms-po-summary-strip">
            <div className="clms-po-summary-strip__po-info">
              <span className="clms-po-summary-strip__po-number tabular-nums">
                {treeData.summary.poNumber}
              </span>
              <span className="clms-po-summary-strip__po-supplier font-medium">
                <FileText size={12} style={{ color: 'var(--color-brand-primary)' }} />
                {treeData.summary.supplierName}
              </span>
              <span className="clms-po-summary-strip__po-scope">
                {treeData.summary.projectName} ({treeData.summary.siteCount} Sites)
              </span>
            </div>

            <div className="clms-po-summary-strip__metric">
              <span className="clms-po-summary-strip__metric-value tabular-nums">
                {treeData.summary.currency} {formatCurrency(treeData.summary.authorizedValue)}
              </span>
              <span className="clms-po-summary-strip__metric-label">Authorized Value</span>
            </div>

            <div className="clms-po-summary-strip__metric">
              <span className="clms-po-summary-strip__metric-value tabular-nums">
                {treeData.summary.currency} {formatCurrency(treeData.summary.certifiedValue)}
              </span>
              <span className="clms-po-summary-strip__metric-label">Certified Value</span>
              <span className="clms-po-summary-strip__metric-sub tabular-nums">
                {Math.round(treeData.summary.certifiedPercentage)}%
              </span>
            </div>

            <div className="clms-po-summary-strip__metric">
              <span className="clms-po-summary-strip__metric-value tabular-nums">
                {treeData.summary.currency} {formatCurrency(treeData.summary.invoicedValue)}
              </span>
              <span className="clms-po-summary-strip__metric-label">Invoiced Value</span>
              <span className="clms-po-summary-strip__metric-sub tabular-nums">
                {Math.round(treeData.summary.invoicedPercentage)}%
              </span>
            </div>

            <div className="clms-po-summary-strip__metric">
              <span className="clms-po-summary-strip__metric-value tabular-nums">
                {treeData.summary.currency} {formatCurrency(treeData.summary.paidValue)}
              </span>
              <span className="clms-po-summary-strip__metric-label">Paid Value</span>
              <span className="clms-po-summary-strip__metric-sub tabular-nums">
                {Math.round(treeData.summary.paidPercentage)}%
              </span>
            </div>

            <div className="clms-po-summary-strip__metric">
              <span className="clms-po-summary-strip__metric-value tabular-nums">
                {treeData.summary.paymentTermsDays} days
              </span>
              <span className="clms-po-summary-strip__metric-label">Payment Terms</span>
              <span className="clms-po-summary-strip__metric-sub">{treeData.summary.currency}</span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="clms-po-lifecycle-stepper" role="navigation" aria-label="Lifecycle Stage Summary">
            {/* Step 1: PO */}
            <div className="clms-po-lifecycle-stepper__step">
              <div className="clms-po-lifecycle-stepper__circle clms-po-lifecycle-stepper__circle--active">
                <div className="clms-po-lifecycle-stepper__dot" />
              </div>
              <div className="clms-po-lifecycle-stepper__step-content">
                <span className="clms-po-lifecycle-stepper__step-title">PURCHASE ORDER</span>
                <span className="clms-po-lifecycle-stepper__step-subtitle">Active</span>
              </div>
            </div>

            <div className="clms-po-lifecycle-stepper__line clms-po-lifecycle-stepper__line--active" />

            {/* Step 2: Certification */}
            <div className="clms-po-lifecycle-stepper__step">
              <div className="clms-po-lifecycle-stepper__circle clms-po-lifecycle-stepper__circle--active">
                <div className="clms-po-lifecycle-stepper__dot" />
              </div>
              <div className="clms-po-lifecycle-stepper__step-content">
                <span className="clms-po-lifecycle-stepper__step-title">CERTIFICATION</span>
                <span className="clms-po-lifecycle-stepper__step-subtitle">
                  {treeData.certificates.length} Certificate{treeData.certificates.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            <div
              className={`clms-po-lifecycle-stepper__line ${
                treeData.summary.invoicedValue > 0 ? 'clms-po-lifecycle-stepper__line--active' : ''
              }`}
            />

            {/* Step 3: Invoice */}
            <div className="clms-po-lifecycle-stepper__step">
              <div
                className={`clms-po-lifecycle-stepper__circle ${
                  treeData.summary.invoicedValue > 0 ? 'clms-po-lifecycle-stepper__circle--active' : ''
                }`}
              >
                {treeData.summary.invoicedValue > 0 && (
                  <div className="clms-po-lifecycle-stepper__dot" />
                )}
              </div>
              <div className="clms-po-lifecycle-stepper__step-content">
                <span className="clms-po-lifecycle-stepper__step-title">INVOICE</span>
                <span
                  className={`clms-po-lifecycle-stepper__step-subtitle ${
                    treeData.summary.invoicedValue === 0
                      ? 'clms-po-lifecycle-stepper__step-subtitle--neutral'
                      : ''
                  }`}
                >
                  {treeData.certificates.flatMap((c) => c.invoices.filter((i) => !i.isPlaceholder)).length} Invoices
                </span>
              </div>
            </div>

            <div
              className={`clms-po-lifecycle-stepper__line ${
                treeData.summary.paidValue > 0 ? 'clms-po-lifecycle-stepper__line--active' : ''
              }`}
            />

            {/* Step 4: Payment */}
            <div className="clms-po-lifecycle-stepper__step">
              <div
                className={`clms-po-lifecycle-stepper__circle ${
                  treeData.summary.paidValue > 0 ? 'clms-po-lifecycle-stepper__circle--active' : ''
                }`}
              >
                {treeData.summary.paidValue > 0 && (
                  <div className="clms-po-lifecycle-stepper__dot" />
                )}
              </div>
              <div className="clms-po-lifecycle-stepper__step-content">
                <span className="clms-po-lifecycle-stepper__step-title">PAYMENT</span>
                <span
                  className={`clms-po-lifecycle-stepper__step-subtitle ${
                    treeData.summary.paidValue === 0
                      ? 'clms-po-lifecycle-stepper__step-subtitle--neutral'
                      : ''
                  }`}
                >
                  {
                    treeData.certificates
                      .flatMap((c) => c.invoices)
                      .flatMap((i) => i.payments.filter((p) => !p.isPlaceholder)).length
                  }{' '}
                  Payments
                </span>
              </div>
            </div>
          </div>

          {/* Horizontal Lineage Tree */}
          <div className="clms-po-lifecycle-tree-container">
            {/* 4 Stage Columns */}
            <div className="clms-po-lifecycle-tree-columns">
              <span className="clms-po-lifecycle-tree-column-title">PURCHASE ORDER</span>
              <span className="clms-po-lifecycle-tree-column-title">CERTIFICATION</span>
              <span className="clms-po-lifecycle-tree-column-title">INVOICE</span>
              <span className="clms-po-lifecycle-tree-column-title">PAYMENT</span>
            </div>

            {/* Lineage Tree Body */}
            <div className="clms-po-lifecycle-tree-body">
              {/* Column 1: Anchor Purchase Order Node */}
              <div style={{ width: '280px', flexShrink: 0 }}>
                <div
                  className="clms-lifecycle-node"
                  onClick={() => setIsPODrawerOpen(true)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsPODrawerOpen(true);
                    }
                  }}
                  aria-label={`Purchase Order ${treeData.summary.poNumber}`}
                >
                  <div className="clms-lifecycle-node__header">
                    <div className="clms-lifecycle-node__header-left">
                      <FileText size={16} className="clms-lifecycle-node__icon" />
                      <span className="clms-lifecycle-node__ref">
                        PO {treeData.summary.poNumber}
                      </span>
                    </div>
                    <ChevronRight size={14} className="clms-lifecycle-node__chevron" aria-hidden="true" />
                  </div>

                  <div className="clms-lifecycle-node__meta font-medium">
                    {treeData.summary.supplierName}
                  </div>
                  <div className="clms-lifecycle-node__meta">
                    {treeData.summary.projectName}
                  </div>

                  <div className="clms-lifecycle-node__amount tabular-nums">
                    {treeData.summary.currency} {formatCurrency(treeData.summary.authorizedValue)}
                  </div>

                  <div className="clms-lifecycle-node__footer">
                    <span>{treeData.summary.siteCount} Sites</span>
                    <span>Issued {treeData.summary.issuedDate}</span>
                    <span>{treeData.summary.paymentTermsDays}d terms</span>
                  </div>
                </div>
              </div>

              {/* Columns 2, 3, 4: Certificates, Invoices, and Payments */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', flex: 1 }}>
                {treeData.certificates.length === 0 ? (
                  <div className="clms-attention-list__empty">
                    <span>No certificates issued under this purchase order yet.</span>
                  </div>
                ) : (
                  treeData.certificates.map((cert) => (
                    <div
                      key={cert.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '300px 280px 280px',
                        gap: 'var(--space-6)',
                        alignItems: 'center',
                      }}
                    >
                      {/* Column 2: Certificate Node */}
                      <div
                        className="clms-lifecycle-node"
                        onClick={() => {
                          setSelectedCertificate(cert);
                          setIsCertDrawerOpen(true);
                        }}
                        tabIndex={0}
                        role="button"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedCertificate(cert);
                            setIsCertDrawerOpen(true);
                          }
                        }}
                        aria-label={`Certificate ${cert.certificateNumber}`}
                      >
                        <div className="clms-lifecycle-node__header">
                          <div className="clms-lifecycle-node__header-left">
                            <FileText size={16} className="clms-lifecycle-node__icon" />
                            <span className="clms-lifecycle-node__ref">
                              {cert.certificateNumber}
                            </span>
                          </div>
                          <ChevronRight size={14} className="clms-lifecycle-node__chevron" aria-hidden="true" />
                        </div>

                        <div className="clms-lifecycle-node__meta">
                          {cert.certTypeName}
                        </div>

                        <div className="clms-lifecycle-node__amount tabular-nums">
                          {cert.currency} {formatCurrency(cert.amount)}
                        </div>

                        <div className="clms-lifecycle-node__footer">
                          <span>
                            {cert.status === 'ISSUED' ? `Issued ${cert.issuedDate}` : `● ${cert.status}`}
                          </span>
                          <span>{cert.siteCount} Sites</span>
                        </div>
                      </div>

                      {/* Column 3: Linked Invoice(s) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {cert.invoices.map((inv) => (
                          <div
                            key={inv.id}
                            className={`clms-lifecycle-node ${
                              inv.isPlaceholder ? 'clms-lifecycle-node--placeholder' : ''
                            }`}
                            onClick={() => {
                              if (!inv.isPlaceholder) {
                                setSelectedInvoice(inv);
                                setIsInvoiceDrawerOpen(true);
                              }
                            }}
                            tabIndex={inv.isPlaceholder ? undefined : 0}
                            role={inv.isPlaceholder ? undefined : 'button'}
                            onKeyDown={(e) => {
                              if (!inv.isPlaceholder && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                setSelectedInvoice(inv);
                                setIsInvoiceDrawerOpen(true);
                              }
                            }}
                            aria-label={inv.isPlaceholder ? 'Awaiting Invoice' : `Invoice ${inv.clmsReference}`}
                          >
                            <div className="clms-lifecycle-node__header">
                              <div className="clms-lifecycle-node__header-left">
                                <FileText
                                  size={16}
                                  className={
                                    inv.isPlaceholder
                                      ? 'clms-lifecycle-node__icon--neutral'
                                      : 'clms-lifecycle-node__icon'
                                  }
                                />
                                <span className="clms-lifecycle-node__ref">
                                  {inv.clmsReference}
                                </span>
                              </div>
                              {!inv.isPlaceholder && (
                                <ChevronRight size={14} className="clms-lifecycle-node__chevron" aria-hidden="true" />
                              )}
                            </div>

                            {!inv.isPlaceholder ? (
                              <>
                                <div className="clms-lifecycle-node__amount tabular-nums">
                                  {inv.currency} {formatCurrency(inv.amount)}
                                </div>
                                <div className="clms-lifecycle-node__footer">
                                  <span>Submitted {inv.submittedDate}</span>
                                  <span style={{ color: 'var(--color-brand-primary)', fontWeight: 'var(--font-weight-medium)' }}>
                                    {inv.status}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div className="clms-lifecycle-node__meta" style={{ color: 'var(--color-text-tertiary)' }}>
                                {inv.supplierInvoiceNumber}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Column 4: Linked Payment(s) */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {cert.invoices.flatMap((inv) =>
                          inv.payments.map((p) => (
                            <div
                              key={p.id}
                              className={`clms-lifecycle-node ${
                                p.isPlaceholder ? 'clms-lifecycle-node--placeholder' : ''
                              }`}
                              onClick={() => {
                                if (!p.isPlaceholder) {
                                  setSelectedPayment(p);
                                  setIsPaymentDrawerOpen(true);
                                }
                              }}
                              tabIndex={p.isPlaceholder ? undefined : 0}
                              role={p.isPlaceholder ? undefined : 'button'}
                              onKeyDown={(e) => {
                                if (!p.isPlaceholder && (e.key === 'Enter' || e.key === ' ')) {
                                  e.preventDefault();
                                  setSelectedPayment(p);
                                  setIsPaymentDrawerOpen(true);
                                }
                              }}
                              aria-label={p.isPlaceholder ? p.referenceNumber : `Payment ${p.referenceNumber}`}
                            >
                              <div className="clms-lifecycle-node__header">
                                <div className="clms-lifecycle-node__header-left">
                                  {p.isPlaceholder ? (
                                    <FileText size={16} className="clms-lifecycle-node__icon--neutral" />
                                  ) : (
                                    <CheckCircle2 size={16} className="clms-lifecycle-node__icon--success" />
                                  )}
                                  <span className="clms-lifecycle-node__ref">
                                    {p.referenceNumber}
                                  </span>
                                </div>
                                {!p.isPlaceholder && (
                                  <ChevronRight size={14} className="clms-lifecycle-node__chevron" aria-hidden="true" />
                                )}
                              </div>

                              {!p.isPlaceholder ? (
                                <>
                                  <div className="clms-lifecycle-node__amount tabular-nums">
                                    {p.currency} {formatCurrency(p.amount)}
                                  </div>
                                  <div className="clms-lifecycle-node__footer">
                                    <span>{p.paymentDate}</span>
                                    <span
                                      style={{
                                        color:
                                          p.status === 'Settled'
                                            ? 'var(--color-status-success-text)'
                                            : 'var(--color-status-pending-text)',
                                        fontWeight: 'var(--font-weight-medium)',
                                      }}
                                    >
                                      {p.status}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="clms-lifecycle-node__meta" style={{ color: 'var(--color-text-tertiary)' }}>
                                  {p.paymentDate}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Drawers & Document Modals */}
      <PODrawer
        isOpen={isPODrawerOpen}
        onClose={() => setIsPODrawerOpen(false)}
        summary={treeData?.summary || null}
        sites={treeData?.sites || []}
        documents={treeData?.documents || []}
        onViewDocuments={() => {
          setIsPODrawerOpen(false);
          setIsDocModalOpen(true);
        }}
      />

      <CertificateDrawer
        isOpen={isCertDrawerOpen}
        onClose={() => setIsCertDrawerOpen(false)}
        certificate={selectedCertificate}
        poNumber={treeData?.summary.poNumber || '—'}
        supplierName={treeData?.summary.supplierName || '—'}
      />

      <InvoiceDrawer
        isOpen={isInvoiceDrawerOpen}
        onClose={() => setIsInvoiceDrawerOpen(false)}
        invoice={selectedInvoice}
        poNumber={treeData?.summary.poNumber || '—'}
        supplierName={treeData?.summary.supplierName || '—'}
      />

      <PaymentDrawer
        isOpen={isPaymentDrawerOpen}
        onClose={() => setIsPaymentDrawerOpen(false)}
        payment={selectedPayment}
        supplierName={treeData?.summary.supplierName || '—'}
      />

      <POLifecycleDocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        poNumber={treeData?.summary.poNumber || '—'}
        documents={treeData?.documents || []}
      />
    </div>
  );
};
