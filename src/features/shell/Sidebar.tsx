import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  FileSpreadsheet,
  Award,
  FileText,
  CheckSquare,
  DollarSign,
  BarChart3,
  Settings,
  Bell,
  Workflow,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/app/providers/AuthContext';
import { IconButton } from '@/design-system';
import './Sidebar.css';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { can, user } = useAuth();
  const isSupplier = Boolean(user?.supplierId);

  return (
    <aside className={`clms-sidebar ${isCollapsed ? 'clms-sidebar--collapsed' : ''} border-hairline`}>
      {/* Brand Header */}
      <div className="clms-sidebar__header border-hairline">
        <div className="clms-sidebar__brand">
          <div className="clms-sidebar__brand-logo" aria-hidden="true">
            <span className="clms-sidebar__brand-mark">HT</span>
          </div>
          {!isCollapsed && (
            <div className="clms-sidebar__brand-text">
              <span className="clms-sidebar__brand-name">CLMS</span>
              <span className="clms-sidebar__brand-tagline">Helios Towers</span>
            </div>
          )}
        </div>
        <IconButton
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          size="sm"
          className="clms-sidebar__toggle"
          onClick={onToggle}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </IconButton>
      </div>

      {/* Navigation Links */}
      <nav className="clms-sidebar__nav" aria-label="Main Navigation">
        {/* Core Commercial Navigation */}
        <div className="clms-sidebar__group">
          {!isCollapsed && <span className="clms-sidebar__group-title">Commercial Lifecycle</span>}
          <ul className="clms-sidebar__menu">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                }
                title={isCollapsed ? 'Overview' : undefined}
              >
                <LayoutDashboard size={18} className="clms-sidebar__link-icon" />
                {!isCollapsed && <span>Overview</span>}
              </NavLink>
            </li>
            {can('explorer.view') && (
              <li>
                <NavLink
                  to="/explorer"
                  className={({ isActive }) =>
                    `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                  }
                  title={isCollapsed ? 'Commercial Explorer' : undefined}
                >
                  <Compass size={18} className="clms-sidebar__link-icon" />
                  {!isCollapsed && <span>Commercial Explorer</span>}
                </NavLink>
              </li>
            )}
            {can('package.import') && (
              <li>
                <NavLink
                  to="/commercial-packages"
                  className={({ isActive }) =>
                    `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                  }
                  title={isCollapsed ? 'Commercial Packages' : undefined}
                >
                  <FileSpreadsheet size={18} className="clms-sidebar__link-icon" />
                  {!isCollapsed && <span>Commercial Packages</span>}
                </NavLink>
              </li>
            )}
            {can('certificate.create') && (
              <li>
                <NavLink
                  to="/certificates"
                  className={({ isActive }) =>
                    `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                  }
                  title={isCollapsed ? 'Certificates' : undefined}
                >
                  <Award size={18} className="clms-sidebar__link-icon" />
                  {!isCollapsed && <span>Certificates</span>}
                </NavLink>
              </li>
            )}
          </ul>
        </div>

        {/* Supplier Specific Portal */}
        {(isSupplier || can('invoice.create')) && (
          <div className="clms-sidebar__group">
            {!isCollapsed && <span className="clms-sidebar__group-title">Supplier Portal</span>}
            <ul className="clms-sidebar__menu">
              <li>
                <NavLink
                  to="/supplier/certificates"
                  className={({ isActive }) =>
                    `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                  }
                  title={isCollapsed ? 'My Certificates' : undefined}
                >
                  <Award size={18} className="clms-sidebar__link-icon" />
                  {!isCollapsed && <span>My Certificates</span>}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/invoices"
                  className={({ isActive }) =>
                    `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                  }
                  title={isCollapsed ? 'Invoices' : undefined}
                >
                  <FileText size={18} className="clms-sidebar__link-icon" />
                  {!isCollapsed && <span>Invoices</span>}
                </NavLink>
              </li>
            </ul>
          </div>
        )}

        {/* Verification & Finance */}
        {(can('invoice.review.sc') || can('finance.process') || can('report.view.executive')) && (
          <div className="clms-sidebar__group">
            {!isCollapsed && <span className="clms-sidebar__group-title">Control & Finance</span>}
            <ul className="clms-sidebar__menu">
              {can('invoice.review.sc') && (
                <li>
                  <NavLink
                    to="/supply-chain"
                    className={({ isActive }) =>
                      `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                    }
                    title={isCollapsed ? 'Supply Chain Review' : undefined}
                  >
                    <CheckSquare size={18} className="clms-sidebar__link-icon" />
                    {!isCollapsed && <span>SCM Review</span>}
                  </NavLink>
                </li>
              )}
              {can('finance.process') && (
                <li>
                  <NavLink
                    to="/finance"
                    className={({ isActive }) =>
                      `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                    }
                    title={isCollapsed ? 'Finance & Payments' : undefined}
                  >
                    <DollarSign size={18} className="clms-sidebar__link-icon" />
                    {!isCollapsed && <span>Finance Processing</span>}
                  </NavLink>
                </li>
              )}
              {can('report.view.executive') && (
                <li>
                  <NavLink
                    to="/management"
                    className={({ isActive }) =>
                      `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                    }
                    title={isCollapsed ? 'Executive Management' : undefined}
                  >
                    <BarChart3 size={18} className="clms-sidebar__link-icon" />
                    {!isCollapsed && <span>Management View</span>}
                  </NavLink>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* System Administration */}
        <div className="clms-sidebar__group">
          {!isCollapsed && <span className="clms-sidebar__group-title">System</span>}
          <ul className="clms-sidebar__menu">
            <li>
              <NavLink
                to="/notifications"
                className={({ isActive }) =>
                  `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                }
                title={isCollapsed ? 'Notifications' : undefined}
              >
                <Bell size={18} className="clms-sidebar__link-icon" />
                {!isCollapsed && <span>Notifications</span>}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/po-lifecycle"
                className={({ isActive }) =>
                  `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                }
                title={isCollapsed ? 'PO Lifecycle' : undefined}
              >
                <Workflow size={18} className="clms-sidebar__link-icon" />
                {!isCollapsed && <span>PO Lifecycle</span>}
              </NavLink>
            </li>
            {can('config.manage') && (
              <li>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                  }
                  title={isCollapsed ? 'Administration' : undefined}
                >
                  <Settings size={18} className="clms-sidebar__link-icon" />
                  {!isCollapsed && <span>Admin Console</span>}
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
