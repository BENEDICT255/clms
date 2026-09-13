// ==============================================================================
// CLMS Finance Dashboard (IMAGE 1 FIDELITY)
// ==============================================================================
// Cash outflow control, approved liabilities, and settlement queue.
// Governed by PRODUCT.md, DESIGN.md (v1.2 frozen), and AGENTS.md.
// All values computed from authoritative database tables. Decimal-safe.
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  financeDashboardRepository,
  FinanceDashboardMetrics,
  FinancePaymentPositionItem,
  FinanceObligationItem,
  FinancePaymentQueueItem,
} from '@/infrastructure/repositories/dashboard/FinanceDashboardRepository';
import { DashboardMetricCard } from './components/DashboardMetricCard';
import { DashboardCard } from './components/DashboardCard';
import { ClickableProgressRow } from './components/ClickableProgressRow';
import { AttentionList, AttentionItemData } from './components/AttentionList';
import { Skeleton } from '@/design-system';
import { ChevronRight } from 'lucide-react';
import './components/Dashboard.css';

export const FinanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<FinanceDashboardMetrics | null>(null);
  const [positions, setPositions] = useState<FinancePaymentPositionItem[]>([]);
  const [obligations, setObligations] = useState<FinanceObligationItem[]>([]);
  const [paymentQueue, setPaymentQueue] = useState<FinancePaymentQueueItem[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await financeDashboardRepository.getDashboardData();
        setMetrics(data.metrics);
        setPositions(data.paymentPositions);
        setObligations(data.obligations);
        setPaymentQueue(data.paymentQueue);
      } catch (err) {
        console.error('Failed to load Finance Dashboard data:', err);
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

  const formattedObligations: AttentionItemData[] = obligations.map((ob) => {
    const clickHandler = () => {
      navigate(`/finance?dueFilter=${ob.type}`);
    };

    return {
      id: ob.id,
      label: `${ob.label} (${ob.count} invoice${ob.count === 1 ? '' : 's'})`,
      count: ob.amount > 0 ? (formatCurrency(ob.amount) as any) : undefined,
      iconType: ob.type === 'overdue' ? 'alert' : 'clock',
      onClick: clickHandler,
      ariaLabel: `${ob.label}: ${ob.count} invoices, TZS ${formatCurrency(ob.amount)}`,
    };
  });

  if (isLoading) {
    return (
      <div className="clms-role-dashboard">
        <div className="clms-role-dashboard__header-row">
          <div className="clms-role-dashboard__header-left">
            <Skeleton width="220px" height="28px" />
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
    approvedLiability: 0,
    outstanding: 0,
    dueOrOverdue: 0,
    settled: 0,
    currency: 'TZS',
  };

  return (
    <div className="clms-role-dashboard">
      {/* Header */}
      <div className="clms-role-dashboard__header-row">
        <div className="clms-role-dashboard__header-left">
          <h1 className="clms-role-dashboard__title">Finance Dashboard</h1>
          <p className="clms-role-dashboard__subtitle">
            Payment obligations, settlement position and financial control.
          </p>
        </div>
        <div className="clms-role-dashboard__header-right">
          <span className="clms-role-dashboard__fy-badge">FY 2026</span>
        </div>
      </div>

      {/* Top 4 Financial Metrics */}
      <div className="clms-role-dashboard__metrics-grid">
        <DashboardMetricCard
          title="Approved Liability"
          value={`TZS ${formatCurrency(m.approvedLiability)}`}
          subvalue="Ready for payment"
          onClick={() => navigate('/finance')}
        />
        <DashboardMetricCard
          title="Outstanding"
          value={`TZS ${formatCurrency(m.outstanding)}`}
          subvalue="Not yet paid"
          onClick={() => navigate('/finance')}
        />
        <DashboardMetricCard
          title="Due / Overdue"
          value={`TZS ${formatCurrency(m.dueOrOverdue)}`}
          subvalue="Including overdue"
          accent="brand"
          onClick={() => navigate('/finance?dueFilter=overdue')}
        />
        <DashboardMetricCard
          title="Settled"
          value={`TZS ${formatCurrency(m.settled)}`}
          subvalue="To date"
          accent="success"
          onClick={() => navigate('/finance?tab=settled')}
        />
      </div>

      {/* Middle Section: Payment Position & Upcoming Obligations */}
      <div className="clms-role-dashboard__middle-grid">
        <DashboardCard title="Payment Position">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {positions.map((pos) => (
              <ClickableProgressRow
                key={pos.id}
                label={pos.label}
                amount={pos.amount}
                percentage={pos.percentage}
                color={pos.color}
                currency="TZS"
                onClick={() => navigate(`/finance?position=${pos.id}`)}
              />
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Upcoming Obligations">
          <AttentionList
            items={formattedObligations}
            emptyMessage="No pending payment obligations."
          />
        </DashboardCard>
      </div>

      {/* Bottom Section: Payment Queue */}
      <DashboardCard
        title="Payment Queue"
        actionText="View all"
        onAction={() => navigate('/finance')}
      >
        {paymentQueue.length === 0 ? (
          <div className="clms-attention-list__empty">
            <span>No invoices currently in the payment queue.</span>
          </div>
        ) : (
          <table className="clms-dashboard-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th>Supplier</th>
                <th>PO Number</th>
                <th>Due Date</th>
                <th>Outstanding (TZS)</th>
                <th>Age</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paymentQueue.map((inv) => (
                <tr
                  key={inv.id}
                  className="clms-dashboard-table__row--clickable"
                  onClick={() => navigate(`/finance?invoiceId=${inv.id}`)}
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
                  <td className="tabular-nums">{inv.dueDate}</td>
                  <td className="tabular-nums font-semibold">
                    {formatCurrency(inv.outstandingAmount)}
                  </td>
                  <td className="tabular-nums">
                    {inv.ageDays === 0 ? 'Today' : `${inv.ageDays} day${inv.ageDays === 1 ? '' : 's'}`}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className="clms-dashboard-table__action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/finance?invoiceId=${inv.id}`);
                      }}
                    >
                      <span>Open</span>
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
