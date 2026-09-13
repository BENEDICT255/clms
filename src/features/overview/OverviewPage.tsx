// ==============================================================================
// CLMS Commercial Overview & Role Landing Controller
// ==============================================================================
// Governed by PRODUCT.md, ARCHITECTURE.md, and AGENTS.md.
// Dynamically routes and renders the authoritative role-specific dashboard:
// - Projects Dashboard (for Project Lead, Engineer)
// - Supplier Dashboard (for Supplier personas)
// - Supply Chain Dashboard (for SCM Reviewers)
// - Finance Dashboard (for Finance & AP Officers)
// For System Administrators, provides a quiet role preview switcher.
// ==============================================================================

import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/AuthContext';
import { ProjectsDashboard } from '@/features/dashboard/ProjectsDashboard';
import { SupplierDashboard } from '@/features/dashboard/SupplierDashboard';
import { SupplyChainDashboard } from '@/features/dashboard/SupplyChainDashboard';
import { FinanceDashboard } from '@/features/dashboard/FinanceDashboard';
import '@/features/dashboard/components/Dashboard.css';

export type DashboardRoleView = 'projects' | 'supplier' | 'supply-chain' | 'finance';

export const OverviewPage: React.FC = () => {
  const { user, can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isSupplier = Boolean(user?.supplierId);
  const isAdmin = can('config.manage') || Boolean(user?.roles?.includes('SYSTEM_ADMIN'));

  // Determine natural role default
  const defaultRoleView: DashboardRoleView = useMemo(() => {
    if (isSupplier) return 'supplier';
    if (can('invoice.review.sc')) return 'supply-chain';
    if (can('finance.process')) return 'finance';
    return 'projects';
  }, [isSupplier, can]);

  // Read URL query parameter or fall back to role default
  const requestedView = searchParams.get('view') as DashboardRoleView | null;
  const activeView: DashboardRoleView = (requestedView && ['projects', 'supplier', 'supply-chain', 'finance'].includes(requestedView))
    ? requestedView
    : defaultRoleView;

  const handleRoleSwitch = (view: DashboardRoleView) => {
    setSearchParams({ view });
  };

  return (
    <div className="clms-overview-controller">
      {/* Admin / Multi-Role Quiet View Switcher */}
      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
          <div className="clms-role-selector-bar" role="tablist" aria-label="Dashboard Persona Selector">
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'projects'}
              className={`clms-role-selector-tab ${activeView === 'projects' ? 'clms-role-selector-tab--active' : ''}`}
              onClick={() => handleRoleSwitch('projects')}
            >
              Projects
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'supplier'}
              className={`clms-role-selector-tab ${activeView === 'supplier' ? 'clms-role-selector-tab--active' : ''}`}
              onClick={() => handleRoleSwitch('supplier')}
            >
              Supplier
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'supply-chain'}
              className={`clms-role-selector-tab ${activeView === 'supply-chain' ? 'clms-role-selector-tab--active' : ''}`}
              onClick={() => handleRoleSwitch('supply-chain')}
            >
              Supply Chain
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'finance'}
              className={`clms-role-selector-tab ${activeView === 'finance' ? 'clms-role-selector-tab--active' : ''}`}
              onClick={() => handleRoleSwitch('finance')}
            >
              Finance
            </button>
          </div>
        </div>
      )}

      {/* Authoritative Role Dashboard View */}
      {activeView === 'projects' && <ProjectsDashboard />}
      {activeView === 'supplier' && <SupplierDashboard />}
      {activeView === 'supply-chain' && <SupplyChainDashboard />}
      {activeView === 'finance' && <FinanceDashboard />}
    </div>
  );
};
