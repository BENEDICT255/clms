import { useState } from 'react';
import { PageHeader, Tabs, TabItem, DataTable, Column } from '@/design-system';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('system-settings');

  const tabs: TabItem[] = [
    { id: 'system-settings', label: 'System Settings' },
    { id: 'roles-capabilities', label: 'Roles & Capabilities' },
    { id: 'audit-log', label: 'Audit Trail' },
  ];

  interface SettingItem {
    key: string;
    description: string;
    value: string;
  }

  // Baseline standard platform settings
  const settingsData: SettingItem[] = [
    { key: 'reminder_intervals_days', description: 'Cadence in days for reminder alerts on un-invoiced certificates', value: '[2, 5]' },
    { key: 'commercial_tolerance_amount', description: 'Maximum permitted monetary variance between PO authorized sum and BOQ total', value: '1.00 TZS' },
    { key: 'aging_bucket_days', description: 'Day thresholds defining payment aging overdue brackets', value: '[30, 60, 90]' },
  ];

  const settingsColumns: Column<SettingItem>[] = [
    { header: 'Setting Key', accessorKey: 'key', width: '260px' },
    { header: 'Description', accessorKey: 'description' },
    { header: 'Value', accessorKey: 'value', width: '180px' },
  ];

  return (
    <div className="clms-admin-page">
      <PageHeader
        title="Administration Console"
        description="Configure master system parameters, inspect capabilities, and review immutable audit records."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Administration' }]}
      />

      <Tabs tabs={tabs} activeTabId={activeTab} onTabChange={setActiveTab} style={{ marginBottom: 'var(--space-4)' }} />

      {activeTab === 'system-settings' && (
        <DataTable
          columns={settingsColumns}
          data={settingsData}
          emptyTitle="No settings configured"
          emptyDescription="System configuration settings will appear here."
        />
      )}

      {activeTab === 'roles-capabilities' && (
        <div style={{ padding: 'var(--space-6)', backgroundColor: 'var(--color-surface-card)', borderRadius: 'var(--radius-xs)' }} className="border-hairline">
          <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-2)' }}>
            Configured Platform Roles & Permissions
          </h3>
          <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
            CLMS implements 8 standard roles mapped across 19 fine-grained commercial capabilities. Access is strictly enforced server-side via PostgreSQL Row Level Security (RLS).
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: 'var(--space-6)', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <li><strong>PROJECT_LEAD:</strong> package.import, package.confirm, explorer.view, certificate.create, certificate.approve.lead</li>
            <li><strong>HEAD_OF_PROJECTS:</strong> package.import, package.confirm, explorer.view, certificate.create, certificate.approve.hop, certificate.issue, certificate.void</li>
            <li><strong>SUPPLIER_USER:</strong> explorer.view, invoice.create, invoice.submit</li>
            <li><strong>SCM_OFFICER:</strong> explorer.view, invoice.review.sc, invoice.approve.sc, invoice.return.sc</li>
            <li><strong>FINANCE_OFFICER:</strong> explorer.view, finance.process, payment.post, payment.reverse</li>
            <li><strong>EXECUTIVE_MANAGEMENT:</strong> explorer.view, report.view.executive, audit.view.all</li>
            <li><strong>SYSTEM_ADMIN:</strong> config.manage, audit.view.all, explorer.view</li>
          </ul>
        </div>
      )}

      {activeTab === 'audit-log' && (
        <DataTable
          columns={[
            { header: 'Event Timestamp', accessorKey: 'createdAt', width: '180px' },
            { header: 'Action', accessorKey: 'action', width: '200px' },
            { header: 'Entity Type', accessorKey: 'entityType', width: '140px' },
            { header: 'Entity ID', accessorKey: 'entityId' },
            { header: 'Actor', accessorKey: 'actorId', width: '140px' },
          ]}
          data={[]}
          emptyTitle="No audit events recorded"
          emptyDescription="Material state transitions and commercial mutations will generate immutable append-only audit records here."
        />
      )}
    </div>
  );
}
