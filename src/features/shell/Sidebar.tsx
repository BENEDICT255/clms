import { useState } from 'react';
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
  const [isHovered, setIsHovered] = useState(false);

  // Appears expanded if either permanently pinned open OR temporarily hovered while collapsed
  const isExpanded = !isCollapsed || isHovered;

  const handleMouseEnter = () => {
    if (isCollapsed) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  return (
    <aside
      className={`clms-sidebar ${isCollapsed ? 'clms-sidebar--collapsed' : ''} ${
        isCollapsed && isHovered ? 'clms-sidebar--hover-expanded' : ''
      } border-hairline`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Brand Header */}
      <div className="clms-sidebar__header border-hairline">
        <div className="clms-sidebar__brand">
          <div className="clms-sidebar__brand-logo" aria-hidden="true">
            <span className="clms-sidebar__brand-mark">HT</span>
          </div>
          {isExpanded && (
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
          {isExpanded && <span className="clms-sidebar__group-title">Commercial Lifecycle</span>}
          <ul className="clms-sidebar__menu">
            <li>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                }
                title={!isExpanded ? 'Overview' : undefined}
              >
                <LayoutDashboard size={18} className="clms-sidebar__link-icon" />
                {isExpanded && <span>Overview</span>}
              </NavLink>
            </li>
            {can('explorer.view') && (
              <li>
                <NavLink
                  to="/explorer"
                  className={({ isActive }) =>
                    `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                  }
                  title={!isExpanded ? 'Commercial Explorer' : undefined}
                >
                  <Compass size={18} className="clms-sidebar__link-icon" />
                  {isExpanded && <span>Commercial Explorer</span>}
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
                  title={!isExpanded ? 'Commercial Packages' : undefined}
                >
                  <FileSpreadsheet size={18} className="clms-sidebar__link-icon" />
                  {isExpanded && <span>Commercial Packages</span>}
                </NavLink>
              </li>
            )}
            {!isSupplier && (
              <li>
                <NavLink
                  to="/certificates"
                  className={({ isActive }) =>
                    `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                  }
                  title={!isExpanded ? 'Certificates' : undefined}
                >
                  <Award size={18} className="clms-sidebar__link-icon" />
                  {isExpanded && <span>Certificates</span>}
                </NavLink>
              </li>
            )}
          </ul>
        </div>

        {/* Supplier Specific Portal */}
        {(isSupplier || can('invoice.create')) && (
          <div className="clms-sidebar__group">
            {isExpanded && <span className="clms-sidebar__group-title">Supplier Portal</span>}
            <ul className="clms-sidebar__menu">
              <li>
                <NavLink
                  to="/supplier/certificates"
                  className={({ isActive }) =>
                    `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                  }
                  title={!isExpanded ? 'My Certificates' : undefined}
                >
                  <Award size={18} className="clms-sidebar__link-icon" />
                  {isExpanded && <span>My Certificates</span>}
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/invoices"
                  className={({ isActive }) =>
                    `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                  }
                  title={!isExpanded ? 'Invoices' : undefined}
                >
                  <FileText size={18} className="clms-sidebar__link-icon" />
                  {isExpanded && <span>Invoices</span>}
                </NavLink>
              </li>
            </ul>
          </div>
        )}

        {/* Verification & Finance */}
        {(can('invoice.review.sc') || can('finance.process') || can('report.view.executive')) && (
          <div className="clms-sidebar__group">
            {isExpanded && <span className="clms-sidebar__group-title">Control & Finance</span>}
            <ul className="clms-sidebar__menu">
              {can('invoice.review.sc') && (
                <li>
                  <NavLink
                    to="/supply-chain"
                    className={({ isActive }) =>
                      `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                    }
                    title={!isExpanded ? 'Supply Chain Review' : undefined}
                  >
                    <CheckSquare size={18} className="clms-sidebar__link-icon" />
                    {isExpanded && <span>SCM Review</span>}
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
                    title={!isExpanded ? 'Finance & Payments' : undefined}
                  >
                    <DollarSign size={18} className="clms-sidebar__link-icon" />
                    {isExpanded && <span>Finance Processing</span>}
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
                    title={!isExpanded ? 'Executive Management' : undefined}
                  >
                    <BarChart3 size={18} className="clms-sidebar__link-icon" />
                    {isExpanded && <span>Management View</span>}
                  </NavLink>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* System Administration */}
        <div className="clms-sidebar__group">
          {isExpanded && <span className="clms-sidebar__group-title">System</span>}
          <ul className="clms-sidebar__menu">
            <li>
              <NavLink
                to="/notifications"
                className={({ isActive }) =>
                  `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                }
                title={!isExpanded ? 'Notifications' : undefined}
              >
                <Bell size={18} className="clms-sidebar__link-icon" />
                {isExpanded && <span>Notifications</span>}
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/po-lifecycle"
                className={({ isActive }) =>
                  `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                }
                title={!isExpanded ? 'PO Lifecycle' : undefined}
              >
                <Workflow size={18} className="clms-sidebar__link-icon" />
                {isExpanded && <span>PO Lifecycle</span>}
              </NavLink>
            </li>
            {can('config.manage') && (
              <li>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `clms-sidebar__link ${isActive ? 'clms-sidebar__link--active' : ''}`
                  }
                  title={!isExpanded ? 'Administration' : undefined}
                >
                  <Settings size={18} className="clms-sidebar__link-icon" />
                  {isExpanded && <span>Admin Console</span>}
                </NavLink>
              </li>
            )}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
