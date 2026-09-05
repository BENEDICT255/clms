import React from 'react';
import { ChevronRight } from 'lucide-react';
import './PageHeader.css';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumbs" className={`clms-breadcrumbs ${className}`}>
      <ol className="clms-breadcrumbs__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="clms-breadcrumbs__item">
              {item.href && !isLast ? (
                <a href={item.href} className="clms-breadcrumbs__link">
                  {item.label}
                </a>
              ) : (
                <span className="clms-breadcrumbs__current" aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight size={12} className="clms-breadcrumbs__separator" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  badge,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`clms-page-header ${className}`}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} className="clms-page-header__breadcrumbs" />}
      <div className="clms-page-header__main">
        <div className="clms-page-header__titles">
          <div className="clms-page-header__title-row">
            <h1 className="clms-page-header__title">{title}</h1>
            {badge && <div className="clms-page-header__badge">{badge}</div>}
          </div>
          {description && <p className="clms-page-header__description">{description}</p>}
        </div>
        {actions && <div className="clms-page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}
