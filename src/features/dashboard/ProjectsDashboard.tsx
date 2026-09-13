// ==============================================================================
// CLMS Projects Dashboard (IMAGE 1 FIDELITY)
// ==============================================================================
// Displays commercial packages, site certification progress, and pending approvals.
// Governed by PRODUCT.md, DESIGN.md (v1.2 frozen), and AGENTS.md.
// All numbers backed by real database records.
// ==============================================================================

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  projectsDashboardRepository,
  ProjectsDashboardMetrics,
  ProjectsCertificationProgress,
  ProjectsAttentionItem,
  RecentCommercialPackageItem,
} from '@/infrastructure/repositories/dashboard/ProjectsDashboardRepository';
import { DashboardMetricCard } from './components/DashboardMetricCard';
import { DashboardCard } from './components/DashboardCard';
import { AttentionList, AttentionItemData } from './components/AttentionList';
import { Skeleton } from '@/design-system';
import './components/Dashboard.css';

export const ProjectsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<ProjectsDashboardMetrics | null>(null);
  const [progress, setProgress] = useState<ProjectsCertificationProgress | null>(null);
  const [attentionItems, setAttentionItems] = useState<ProjectsAttentionItem[]>([]);
  const [recentPackages, setRecentPackages] = useState<RecentCommercialPackageItem[]>([]);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await projectsDashboardRepository.getDashboardData();
        setMetrics(data.metrics);
        setProgress(data.progress);
        setAttentionItems(data.attentionItems);
        setRecentPackages(data.recentPackages);
      } catch (err) {
        console.error('Failed to load Projects Dashboard data:', err);
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

  const formattedAttention: AttentionItemData[] = attentionItems.map((item) => {
    const clickHandler = () => {
      switch (item.type) {
        case 'pending_lead':
          navigate('/certificates?status=PENDING_LEAD_APPROVAL');
          break;
        case 'pending_hop':
          navigate('/certificates?status=PENDING_HOP_APPROVAL');
          break;
        case 'draft':
          navigate('/certificates?status=DRAFT');
          break;
        case 'sites_available':
          navigate('/explorer?certification=remaining');
          break;
        default:
          navigate('/certificates');
      }
    };

    return {
      id: item.id,
      label: item.label,
      iconType: 'file',
      onClick: clickHandler,
      ariaLabel: `${item.label}: ${item.count} items`,
    };
  });

  if (isLoading) {
    return (
      <div className="clms-role-dashboard">
        <div className="clms-role-dashboard__header-row">
          <div className="clms-role-dashboard__header-left">
            <Skeleton width="220px" height="28px" />
            <div style={{ marginTop: '8px' }}>
              <Skeleton width="340px" height="16px" />
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
    commercialPackagesCount: 0,
    sitesInScopeCount: 0,
    sitesCertifiedCount: 0,
    sitesCertifiedPercentage: 0,
    sitesNotYetCertifiedCount: 0,
    sitesNotYetCertifiedPercentage: 0,
    currency: 'TZS',
  };

  const p = progress || {
    authorizedCommitment: 0,
    certifiedToDate: 0,
    certifiedPercentage: 0,
    remaining: 0,
    remainingPercentage: 0,
    currency: 'TZS',
  };

  return (
    <div className="clms-role-dashboard">
      {/* Top Header */}
      <div className="clms-role-dashboard__header-row">
        <div className="clms-role-dashboard__header-left">
          <h1 className="clms-role-dashboard__title">Projects Dashboard</h1>
          <p className="clms-role-dashboard__subtitle">
            Overview of commercial packages and certification progress.
          </p>
        </div>
        <div className="clms-role-dashboard__header-right">
          <span className="clms-role-dashboard__fy-badge">FY 2026</span>
        </div>
      </div>

      {/* Top 4 Metrics */}
      <div className="clms-role-dashboard__metrics-grid">
        <DashboardMetricCard
          title="Commercial Packages"
          value={m.commercialPackagesCount}
          onClick={() => navigate('/commercial-packages')}
        />
        <DashboardMetricCard
          title="Sites In Scope"
          value={m.sitesInScopeCount}
          onClick={() => navigate('/explorer')}
        />
        <DashboardMetricCard
          title="Sites Certified"
          value={m.sitesCertifiedCount}
          progress={{
            percentage: m.sitesCertifiedPercentage,
            color: 'brand',
          }}
          onClick={() => navigate('/explorer?certification=certified')}
        />
        <DashboardMetricCard
          title="Sites Not Yet Certified"
          value={m.sitesNotYetCertifiedCount}
          progress={{
            percentage: m.sitesNotYetCertifiedPercentage,
            color: 'brand',
          }}
          onClick={() => navigate('/explorer?certification=remaining')}
        />
      </div>

      {/* Middle Section: Certification Progress & Requires Your Attention */}
      <div className="clms-role-dashboard__middle-grid">
        <DashboardCard title="Certification Progress">
          <div className="clms-projects-progress-stacked">
            {/* Horizontal Progress Bar */}
            <div
              className="clms-projects-progress-stacked__track"
              role="progressbar"
              aria-valuenow={Math.round(p.certifiedPercentage)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Commercial Certification Progress"
            >
              <div
                className="clms-projects-progress-stacked__segment clms-projects-progress-stacked__segment--certified"
                style={{ width: `${Math.min(100, Math.max(0, p.certifiedPercentage))}%` }}
                title={`Certified: ${Math.round(p.certifiedPercentage)}%`}
              />
              <div
                className="clms-projects-progress-stacked__segment clms-projects-progress-stacked__segment--remaining"
                style={{ width: `${Math.min(100, Math.max(0, p.remainingPercentage))}%` }}
                title={`Remaining: ${Math.round(p.remainingPercentage)}%`}
              />
            </div>

            {/* Exact Financial Values */}
            <div className="clms-projects-progress-stacked__legend">
              <div
                className="clms-projects-progress-stacked__legend-item"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/commercial-packages')}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/commercial-packages');
                  }
                }}
              >
                <span className="clms-projects-progress-stacked__legend-value tabular-nums">
                  {p.currency} {formatCurrency(p.authorizedCommitment)}
                </span>
                <span className="clms-projects-progress-stacked__legend-label">Authorized</span>
              </div>

              <div
                className="clms-projects-progress-stacked__legend-item"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/explorer?certification=certified')}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/explorer?certification=certified');
                  }
                }}
              >
                <span className="clms-projects-progress-stacked__legend-value tabular-nums">
                  {p.currency} {formatCurrency(p.certifiedToDate)}
                </span>
                <span className="clms-projects-progress-stacked__legend-label">Certified</span>
                <span className="clms-projects-progress-stacked__legend-pct tabular-nums">
                  {Math.round(p.certifiedPercentage)}%
                </span>
              </div>

              <div
                className="clms-projects-progress-stacked__legend-item"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate('/explorer?certification=remaining')}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/explorer?certification=remaining');
                  }
                }}
              >
                <span className="clms-projects-progress-stacked__legend-value tabular-nums">
                  {p.currency} {formatCurrency(p.remaining)}
                </span>
                <span className="clms-projects-progress-stacked__legend-label">Remaining</span>
                <span className="clms-projects-progress-stacked__legend-pct tabular-nums">
                  {Math.round(p.remainingPercentage)}%
                </span>
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title="Requires Your Attention">
          <AttentionList
            items={formattedAttention}
            emptyMessage="All site certifications are up to date."
          />
        </DashboardCard>
      </div>

      {/* Bottom Section: Recent Commercial Packages */}
      <DashboardCard
        title="Recent Commercial Packages"
        actionText="View all"
        onAction={() => navigate('/commercial-packages')}
      >
        {recentPackages.length === 0 ? (
          <div className="clms-attention-list__empty">
            <span>No commercial packages available.</span>
          </div>
        ) : (
          <table className="clms-dashboard-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Project</th>
                <th>Sites</th>
                <th>Certified</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {recentPackages.map((pkg) => (
                <tr
                  key={pkg.id}
                  className="clms-dashboard-table__row--clickable"
                  onClick={() => navigate('/commercial-packages')}
                >
                  <td>
                    <span
                      className="clms-dashboard-table__code-link tabular-nums"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/po-lifecycle?po=${pkg.poNumber}`);
                      }}
                      title="View in PO Lifecycle"
                    >
                      {pkg.poNumber}
                    </span>
                  </td>
                  <td>{pkg.supplierName}</td>
                  <td>{pkg.projectName}</td>
                  <td className="tabular-nums">{pkg.siteCount}</td>
                  <td className="tabular-nums">{pkg.certifiedPercentage}%</td>
                  <td className="tabular-nums">{pkg.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DashboardCard>
    </div>
  );
};
