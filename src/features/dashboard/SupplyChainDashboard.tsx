// ==============================================================================
// CLMS Supply Chain Dashboard (IMAGE 1 FIDELITY)
// ==============================================================================
// Control room for SCM invoice verification and workflow governance.
// Governed by PRODUCT.md, DESIGN.md (v1.2 frozen), and AGENTS.md.
// All values computed from authoritative database tables.
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  supplyChainDashboardRepository,
  SupplyChainDashboardMetrics,
  SupplyChainPipelineItem,
  SupplyChainAlertItem,
  InvoiceRequiringReviewItem,
} from '@/infrastructure/repositories/dashboard/SupplyChainDashboardRepository';
import { DashboardMetricCard } from './components/DashboardMetricCard';
import { DashboardCard } from './components/DashboardCard';
import { PipelineBarGroup, PipelineBarItem } from './components/PipelineBarGroup';
import { AttentionList, AttentionItemData } from './components/AttentionList';
import { Skeleton } from '@/design-system';
import { ChevronRight, ChevronDown } from 'lucide-react';
import './components/Dashboard.css';

export const SupplyChainDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<SupplyChainDashboardMetrics | null>(null);
  const [pipeline, setPipeline] = useState<SupplyChainPipelineItem[]>([]);
  const [alerts, setAlerts] = useState<SupplyChainAlertItem[]>([]);
  const [reviewQueue, setReviewQueue] = useState<InvoiceRequiringReviewItem[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await supplyChainDashboardRepository.getDashboardData();
        setMetrics(data.metrics);
        setPipeline(data.pipeline);
        setAlerts(data.alerts);
        setReviewQueue(data.reviewQueue);
      } catch (err) {
        console.error('Failed to load Supply Chain Dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  const formattedPipeline: PipelineBarItem[] = pipeline.map((item) => {
    const clickHandler = () => {
      switch (item.id) {
        case 'submitted':
        case 'resubmitted':
          navigate('/supply-chain?tab=pending');
          break;
        case 'returned':
          navigate('/supply-chain?tab=returned');
          break;
        case 'approved':
          navigate('/supply-chain?tab=approved');
          break;
        default:
          navigate('/supply-chain');
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

  const formattedAlerts: AttentionItemData[] = alerts.map((item) => {
    const clickHandler = () => {
      if (item.type === 'aging') {
        navigate('/supply-chain?tab=pending');
      } else if (item.type === 'overdue') {
        navigate('/supply-chain?tab=returned');
      } else {
        navigate('/supply-chain');
      }
    };

    return {
      id: item.id,
      label: item.label,
      iconType: item.type === 'overdue' ? 'alert' : 'clock',
      onClick: clickHandler,
      ariaLabel: item.label,
    };
  });

  if (isLoading) {
    return (
      <div className="clms-role-dashboard">
        <div className="clms-role-dashboard__header-row">
          <div className="clms-role-dashboard__header-left">
            <Skeleton width="240px" height="28px" />
            <div style={{ marginTop: '8px' }}>
              <Skeleton width="380px" height="16px" />
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
    totalPOsCount: 0,
    invoicesAwaitingReviewCount: 0,
    returnedForCorrectionCount: 0,
    approvedToFinanceCount: 0,
  };

  return (
    <div className="clms-role-dashboard">
      {/* Header */}
      <div className="clms-role-dashboard__header-row">
        <div className="clms-role-dashboard__header-left">
          <h1 className="clms-role-dashboard__title">Supply Chain Dashboard</h1>
          <p className="clms-role-dashboard__subtitle">
            Invoice verification, procurement control and workflow management.
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
          title="Total POs"
          value={m.totalPOsCount}
          onClick={() => navigate('/commercial-packages')}
        />
        <DashboardMetricCard
          title="Invoices Awaiting Review"
          value={m.invoicesAwaitingReviewCount}
          onClick={() => navigate('/supply-chain?tab=pending')}
        />
        <DashboardMetricCard
          title="Returned for Correction"
          value={m.returnedForCorrectionCount}
          onClick={() => navigate('/supply-chain?tab=returned')}
        />
        <DashboardMetricCard
          title="Approved to Finance"
          value={m.approvedToFinanceCount}
          onClick={() => navigate('/supply-chain?tab=approved')}
        />
      </div>

      {/* Middle Section: Invoice Review Pipeline & Requires Your Attention */}
      <div className="clms-role-dashboard__middle-grid">
        <DashboardCard title="Invoice Review Pipeline">
          <PipelineBarGroup items={formattedPipeline} maxHeight={100} />
        </DashboardCard>

        <DashboardCard title="Requires Your Attention">
          <AttentionList
            items={formattedAlerts}
            emptyMessage="No critical alerts or aging invoices."
          />
        </DashboardCard>
      </div>

      {/* Bottom Section: Invoices Requiring Review */}
      <DashboardCard
        title="Invoices Requiring Review"
        actionText="View all"
        onAction={() => navigate('/supply-chain?tab=pending')}
      >
        {reviewQueue.length === 0 ? (
          <div className="clms-attention-list__empty">
            <span>No invoices currently require review.</span>
          </div>
        ) : (
          <table className="clms-dashboard-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Supplier</th>
                <th>PO Number</th>
                <th>Amount (TZS)</th>
                <th>Submitted at</th>
                <th>Waiting</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {reviewQueue.map((inv) => (
                <tr
                  key={inv.id}
                  className="clms-dashboard-table__row--clickable"
                  onClick={() => navigate(`/supply-chain?reviewInvoiceId=${inv.id}`)}
                >
                  <td>
                    <span className="clms-dashboard-table__code-link tabular-nums">
                      {inv.invoiceNumber}
                    </span>
                  </td>
                  <td>{inv.supplierName}</td>
                  <td>
                    <span
                      className="clms-dashboard-table__code-link tabular-nums"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/po-lifecycle?po=${inv.poNumber}`);
                      }}
                      title="View in PO Lifecycle"
                    >
                      {inv.poNumber}
                    </span>
                  </td>
                  <td className="tabular-nums font-semibold">{formatCurrency(inv.amount)}</td>
                  <td className="tabular-nums">{inv.submittedAt}</td>
                  <td className="tabular-nums">
                    {inv.waitingDays === 0 ? 'Today' : `${inv.waitingDays} day${inv.waitingDays === 1 ? '' : 's'}`}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="clms-dashboard-table__action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/supply-chain?reviewInvoiceId=${inv.id}`);
                      }}
                    >
                      <span>Review</span>
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
