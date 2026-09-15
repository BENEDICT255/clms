// ==============================================================================
// CLMS Supplier Dashboard (IMAGE 1 FIDELITY)
// ==============================================================================
// Displays supplier-scoped POs, issued certificates, and invoice progression.
// Governed by PRODUCT.md, DESIGN.md (v1.2 frozen), and AGENTS.md.
// Strict tenant isolation: Supplier A only accesses Supplier A records.
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthContext';
import {
  supplierDashboardRepository,
  SupplierDashboardMetrics,
  SupplierInvoicePipelineItem,
  SupplierAttentionItem,
  CertificateReadyToInvoiceItem,
} from '@/infrastructure/repositories/dashboard/SupplierDashboardRepository';
import { DashboardMetricCard } from './components/DashboardMetricCard';
import { DashboardCard } from './components/DashboardCard';
import { PipelineBarGroup, PipelineBarItem } from './components/PipelineBarGroup';
import { AttentionList, AttentionItemData } from './components/AttentionList';
import { Skeleton } from '@/design-system';
import { ChevronRight, ChevronDown } from 'lucide-react';
import './components/Dashboard.css';

export const SupplierDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<SupplierDashboardMetrics | null>(null);
  const [pipeline, setPipeline] = useState<SupplierInvoicePipelineItem[]>([]);
  const [attentionItems, setAttentionItems] = useState<SupplierAttentionItem[]>([]);
  const [readyCertificates, setReadyCertificates] = useState<CertificateReadyToInvoiceItem[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await supplierDashboardRepository.getDashboardData(user?.supplierId ?? undefined);
        setMetrics(data.metrics);
        setPipeline(data.pipeline);
        setAttentionItems(data.attentionItems);
        setReadyCertificates(data.readyCertificates);
      } catch (err) {
        console.error('Failed to load Supplier Dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [user?.supplierId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formattedPipeline: PipelineBarItem[] = pipeline.map((item) => {
    const clickHandler = () => {
      switch (item.id) {
        case 'draft':
          navigate('/invoices?status=DRAFT');
          break;
        case 'submitted':
          navigate('/invoices?status=SUBMITTED');
          break;
        case 'scm-review':
          navigate('/invoices?status=RESUBMITTED');
          break;
        case 'finance':
          navigate('/invoices?status=SC_APPROVED');
          break;
        case 'partial':
          navigate('/invoices?status=PARTIALLY_PAID');
          break;
        case 'settled':
          navigate('/invoices?status=SETTLED');
          break;
        default:
          navigate('/invoices');
      }
    };

    return {
      id: item.id,
      label: item.label,
      count: item.count,
      color: item.color,
      onClick: clickHandler,
      ariaLabel: `${item.label}: ${item.count} invoices`,
    };
  });

  const formattedAttention: AttentionItemData[] = attentionItems.map((item) => {
    const clickHandler = () => {
      switch (item.type) {
        case 'ready_to_invoice':
          navigate('/supplier/certificates?filter=uninvoiced');
          break;
        case 'returned':
          navigate('/invoices?status=RETURNED');
          break;
        case 'draft_incomplete':
          navigate('/invoices?status=DRAFT');
          break;
        default:
          navigate('/invoices');
      }
    };

    return {
      id: item.id,
      label: item.label,
      iconType: item.type === 'returned' ? 'alert' : 'file',
      onClick: clickHandler,
      ariaLabel: item.label,
    };
  });

  if (isLoading) {
    return (
      <div className="clms-role-dashboard">
        <div className="clms-role-dashboard__header-row">
          <div className="clms-role-dashboard__header-left">
            <Skeleton width="200px" height="28px" />
            <div style={{ marginTop: '8px' }}>
              <Skeleton width="300px" height="16px" />
            </div>
          </div>
          <Skeleton width="70px" height="24px" />
        </div>
        <div className="clms-role-dashboard__metrics-grid">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height="90px" />
          ))}
        </div>
        <div className="clms-role-dashboard__middle-grid">
          <Skeleton height="220px" />
          <Skeleton height="220px" />
        </div>
        <Skeleton height="220px" />
      </div>
    );
  }

  const m = metrics || {
    activePOsCount: 0,
    certificatesIssuedCount: 0,
    awaitingInvoiceCount: 0,
    invoicesSubmittedCount: 0,
  };

  return (
    <div className="clms-role-dashboard">
      {/* Header */}
      <div className="clms-role-dashboard__header-row">
        <div className="clms-role-dashboard__header-left">
          <h1 className="clms-role-dashboard__title">Supplier Dashboard</h1>
          <p className="clms-role-dashboard__subtitle">
            Your purchase orders, certificates and invoices.
          </p>
        </div>
        <div className="clms-role-dashboard__header-right">
          <div className="clms-role-dashboard__fy-badge">
            <span>FY 2026</span>
            <ChevronDown size={13} aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Top 4 Metrics */}
      <div className="clms-role-dashboard__metrics-grid">
        <DashboardMetricCard
          title="Active POs"
          value={m.activePOsCount}
          onClick={() => navigate('/invoices')}
        />
        <DashboardMetricCard
          title="Certificates Issued"
          value={m.certificatesIssuedCount}
          onClick={() => navigate('/supplier/certificates')}
        />
        <DashboardMetricCard
          title="Awaiting Invoice"
          value={m.awaitingInvoiceCount}
          onClick={() => navigate('/supplier/certificates?filter=uninvoiced')}
        />
        <DashboardMetricCard
          title="Invoices Submitted"
          value={m.invoicesSubmittedCount}
          onClick={() => navigate('/invoices?status=SUBMITTED')}
        />
      </div>

      {/* Middle Section: Invoice Pipeline & Requires Your Attention */}
      <div className="clms-role-dashboard__middle-grid">
        <DashboardCard title="Invoice Pipeline">
          <PipelineBarGroup items={formattedPipeline} maxHeight={100} />
        </DashboardCard>

        <DashboardCard title="Requires Your Attention">
          <AttentionList
            items={formattedAttention}
            emptyMessage="No pending actions required."
          />
        </DashboardCard>
      </div>

      {/* Bottom Section: Certificates Ready to Invoice */}
      <DashboardCard
        title="Certificates Ready to Invoice"
        actionText="View all"
        onAction={() => navigate('/supplier/certificates')}
      >
        {readyCertificates.length === 0 ? (
          <div className="clms-attention-list__empty">
            <span>No issued certificates are currently awaiting invoice.</span>
          </div>
        ) : (
          <table className="clms-dashboard-table">
            <thead>
              <tr>
                <th>Certificate No.</th>
                <th>PO Number</th>
                <th>Type</th>
                <th>Amount (TZS)</th>
                <th>Issued Date</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {readyCertificates.map((cert) => (
                <tr
                  key={cert.id}
                  className="clms-dashboard-table__row--clickable"
                  onClick={() => navigate(`/supplier/certificates?focus=${cert.id}`)}
                >
                  <td>
                    <span className="clms-dashboard-table__code-link tabular-nums">
                      {cert.certificateNumber}
                    </span>
                  </td>
                  <td>
                    <span
                      className="clms-dashboard-table__code-link tabular-nums"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/po-lifecycle?po=${cert.poNumber}`);
                      }}
                      title="View in PO Lifecycle"
                    >
                      {cert.poNumber}
                    </span>
                  </td>
                  <td>{cert.certType}</td>
                  <td className="tabular-nums font-semibold">{formatCurrency(cert.amount)}</td>
                  <td className="tabular-nums">{cert.issuedDate}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="clms-dashboard-table__action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/supplier/certificates?createInvoiceFor=${cert.id}`);
                      }}
                    >
                      <span>Create Invoice</span>
                      <ChevronRight size={13} aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DashboardCard>
    </div>
  );
};
