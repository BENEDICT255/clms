// ==============================================================================
// CLMS Administration & System Governance Workspace (Enterprise Super Prompt 4)
// ==============================================================================
// Governed by PRODUCT.md Section 7, 8, 41, 43 & DESIGN.md v1.2:
// - System Settings & Aging Configuration
// - Roles & Fine-Grained Capability Vocabulary
// - User Access & Supplier Organization Bindings
// - Numbering Sequence Standards
// - Append-Only Immutable Audit Log Explorer
// ==============================================================================

import { useState, useEffect, useCallback } from 'react';
import {
  PageHeader,
  Tabs,
  TabItem,
  DataTable,
  Column,
  Button,
  Modal,
  Input,
  Alert,
} from '@/design-system';
import {
  adminRepository,
  AdminUserRecord,
  AdminRoleItem,
  AdminSupplierBinding,
  AdminSettingItem,
  AuditEventRecord,
} from '@/infrastructure/repositories/AdminRepository';
import {
  RefreshCw,
  Edit2,
  CheckCircle2,
} from 'lucide-react';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('system-settings');
  const [isLoading, setIsLoading] = useState(false);

  // Data states
  const [settings, setSettings] = useState<AdminSettingItem[]>([]);
  const [roles, setRoles] = useState<AdminRoleItem[]>([]);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [suppliers, setSuppliers] = useState<AdminSupplierBinding[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEventRecord[]>([]);
  const [auditEntityTypeFilter, setAuditEntityTypeFilter] = useState('ALL');

  // Edit Setting Modal
  const [editSetting, setEditSetting] = useState<AdminSettingItem | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSavingSetting, setIsSavingSetting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'system-settings') {
        const data = await adminRepository.getSystemSettings();
        setSettings(data);
      } else if (activeTab === 'roles-capabilities') {
        const data = await adminRepository.getRolesAndCapabilities();
        setRoles(data);
      } else if (activeTab === 'users-access') {
        const data = await adminRepository.getUsers();
        setUsers(data);
      } else if (activeTab === 'suppliers-master') {
        const data = await adminRepository.getSuppliers();
        setSuppliers(data);
      } else if (activeTab === 'audit-log') {
        const data = await adminRepository.getAuditTrail({
          entityType: auditEntityTypeFilter,
        });
        setAuditLogs(data);
      }
    } catch (err: unknown) {
      console.error('Failed to load admin workspace data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, auditEntityTypeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tabs: TabItem[] = [
    { id: 'system-settings', label: 'System Settings' },
    { id: 'roles-capabilities', label: 'Roles & Capabilities' },
    { id: 'users-access', label: 'Users & Access' },
    { id: 'suppliers-master', label: 'Supplier Master' },
    { id: 'numbering-preview', label: 'Numbering Sequences' },
    { id: 'audit-log', label: 'Audit Trail' },
  ];

  const handleOpenEditSetting = (item: AdminSettingItem) => {
    setEditSetting(item);
    setEditValue(typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value));
  };

  const handleSaveSetting = async () => {
    if (!editSetting) return;
    setIsSavingSetting(true);
    try {
      let parsedValue: unknown = editValue;
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        // Keep string if not valid JSON
      }

      const res = await adminRepository.updateSetting(editSetting.key, parsedValue);
      if (res.success) {
        setFeedback(`Setting "${editSetting.key}" updated successfully.`);
        setEditSetting(null);
        fetchData();
      }
    } catch (err: unknown) {
      console.error('Failed to save setting:', err);
    } finally {
      setIsSavingSetting(false);
    }
  };

  // 1. Settings Columns
  const settingsColumns: Column<AdminSettingItem>[] = [
    { header: 'Setting Parameter', accessorKey: 'key', width: '260px' },
    { header: 'Description', accessorKey: 'description' },
    {
      header: 'Current Value',
      accessorKey: 'value',
      width: '220px',
      cell: (row) => (
        <code style={{ fontSize: 'var(--font-size-xs)', backgroundColor: 'var(--color-surface-sunken)', padding: '2px 6px', borderRadius: 'var(--radius-xs)' }}>
          {typeof row.value === 'object' ? JSON.stringify(row.value) : String(row.value)}
        </code>
      ),
    },
    {
      header: 'Action',
      align: 'center',
      width: '100px',
      cell: (row) => (
        <Button variant="secondary" size="sm" icon={<Edit2 size={13} />} onClick={() => handleOpenEditSetting(row)}>
          Edit
        </Button>
      ),
    },
  ];

  // 2. Users Columns
  const userColumns: Column<AdminUserRecord>[] = [
    { header: 'Full Name', accessorKey: 'name' },
    { header: 'Corporate Email', accessorKey: 'email' },
    { header: 'Assigned Role', accessorKey: 'roleName', width: '180px' },
    {
      header: 'Supplier Organization',
      accessorKey: 'supplierName',
      width: '200px',
      cell: (row) => row.supplierName || <span style={{ color: 'var(--color-text-tertiary)' }}>Internal Staff</span>,
    },
    {
      header: 'Status',
      align: 'center',
      width: '110px',
      cell: (row) => (
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            fontSize: 'var(--font-size-2xs)',
            fontWeight: 'var(--font-weight-semibold)',
            backgroundColor: row.isActive ? 'var(--color-semantic-success-bg)' : 'var(--color-surface-sunken)',
            color: row.isActive ? 'var(--color-semantic-success-text)' : 'var(--color-text-secondary)',
          }}
        >
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  // 3. Supplier Columns
  const supplierColumns: Column<AdminSupplierBinding>[] = [
    { header: 'Supplier Legal Entity', accessorKey: 'supplierName' },
    { header: 'TIN / Tax Number', accessorKey: 'taxNumber', width: '160px', cell: (r) => r.taxNumber || '—' },
    { header: 'Contact Email', accessorKey: 'contactEmail', cell: (r) => r.contactEmail || '—' },
    { header: 'Bound Users', accessorKey: 'boundUsersCount', align: 'center', width: '120px' },
    { header: 'Active Packages', accessorKey: 'activePackagesCount', align: 'center', width: '140px' },
  ];

  // 4. Audit Trail Columns
  const auditColumns: Column<AuditEventRecord>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'createdAt',
      width: '170px',
      cell: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      header: 'Action Verb',
      accessorKey: 'action',
      width: '210px',
      cell: (row) => (
        <span style={{ fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-brand-primary)' }}>
          {row.action}
        </span>
      ),
    },
    { header: 'Entity Type', accessorKey: 'entityType', width: '150px' },
    {
      header: 'Actor',
      accessorKey: 'actorName',
      width: '160px',
      cell: (row) => row.actorName || row.actorId || 'System / Batch',
    },
    {
      header: 'Metadata / Context',
      accessorKey: 'metadata',
      cell: (row) => (
        <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-secondary)' }}>
          {row.metadata ? JSON.stringify(row.metadata) : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="clms-admin-page">
      <PageHeader
        title="Administration & Platform Governance"
        description="Configure master system parameters, inspect fine-grained capabilities, govern user tenant bindings, and review the append-only audit trail."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Administration' }]}
        actions={
          <Button
            variant="secondary"
            size="md"
            icon={<RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />}
            onClick={fetchData}
          >
            Refresh
          </Button>
        }
      />

      {feedback && (
        <Alert type="success" title="Setting Saved" style={{ marginBottom: 'var(--space-4)' }} onClose={() => setFeedback(null)}>
          {feedback}
        </Alert>
      )}

      <Tabs tabs={tabs} activeTabId={activeTab} onTabChange={setActiveTab} style={{ marginBottom: 'var(--space-4)' }} />

      {/* Tab 1: System Settings */}
      {activeTab === 'system-settings' && (
        <DataTable
          columns={settingsColumns}
          data={settings}
          isLoading={isLoading}
          emptyTitle="No system settings found"
          emptyDescription="Platform parameters will display here."
        />
      )}

      {/* Tab 2: Roles & Capabilities */}
      {activeTab === 'roles-capabilities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div
            className="border-hairline"
            style={{
              padding: 'var(--space-4)',
              backgroundColor: 'var(--color-surface-card)',
              borderRadius: 'var(--radius-xs)',
            }}
          >
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-1)' }}>
              Separation of Roles and Capabilities (Least Privilege Architecture)
            </h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
              CLMS defines standard roles mapped across 19 curated fine-grained capabilities. Authorization is strictly evaluated
              against PostgreSQL Row Level Security (RLS) policies.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
            {roles.map((r) => (
              <div
                key={r.id}
                className="border-hairline"
                style={{
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--color-surface-card)',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>{r.name}</strong>
                  <code style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-brand-primary)' }}>{r.code}</code>
                </div>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
                  {r.description || 'Standard corporate operational role.'}
                </p>
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--font-size-2xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                    Granted Capabilities ({r.capabilities.length}):
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'var(--space-1)' }}>
                    {r.capabilities.map((cap) => (
                      <span
                        key={cap}
                        style={{
                          fontSize: 'var(--font-size-2xs)',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: 'var(--color-surface-sunken)',
                          border: '1px solid var(--color-border-hairline)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Users & Access */}
      {activeTab === 'users-access' && (
        <DataTable
          columns={userColumns}
          data={users}
          isLoading={isLoading}
          emptyTitle="No users registered"
          emptyDescription="Platform users and their role assignments will appear here."
        />
      )}

      {/* Tab 4: Supplier Master */}
      {activeTab === 'suppliers-master' && (
        <DataTable
          columns={supplierColumns}
          data={suppliers}
          isLoading={isLoading}
          emptyTitle="No suppliers registered"
          emptyDescription="Commercial supplier organizations will display here."
        />
      )}

      {/* Tab 5: Numbering Sequences */}
      {activeTab === 'numbering-preview' && (
        <div
          className="border-hairline"
          style={{
            padding: 'var(--space-5)',
            backgroundColor: 'var(--color-surface-card)',
            borderRadius: 'var(--radius-xs)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <div>
            <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)', marginBottom: 'var(--space-1)' }}>
              Atomic Sequence Generation & Reference Standards
            </h3>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
              All commercial reference numbers originate from dedicated PostgreSQL sequences. Concurrency-safe formatting
              prevents numbering race conditions and guarantees collision-free references.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)', fontSize: 'var(--font-size-xs)' }}>
            <div className="border-hairline" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-surface-sunken)' }}>
              <div style={{ color: 'var(--color-text-secondary)' }}>Commercial Package Reference</div>
              <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-brand-primary)' }}>
                CP-26-0042
              </div>
              <code style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>Pattern: CP-{'{YY}'}-{'{SEQ:4}'}</code>
            </div>

            <div className="border-hairline" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-surface-sunken)' }}>
              <div style={{ color: 'var(--color-text-secondary)' }}>Final Acceptance Certificate</div>
              <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-brand-primary)' }}>
                FAC-SI-26-0004
              </div>
              <code style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>Pattern: FAC-{'{PROJ}'}-{'{YY}'}-{'{SEQ:4}'}</code>
            </div>

            <div className="border-hairline" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-surface-sunken)' }}>
              <div style={{ color: 'var(--color-text-secondary)' }}>Provisional Acceptance Certificate</div>
              <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-brand-primary)' }}>
                PAC-SI-26-0018
              </div>
              <code style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>Pattern: PAC-{'{PROJ}'}-{'{YY}'}-{'{SEQ:4}'}</code>
            </div>

            <div className="border-hairline" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-surface-sunken)' }}>
              <div style={{ color: 'var(--color-text-secondary)' }}>Down Payment Certificate</div>
              <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-brand-primary)' }}>
                DPC-SI-26-0001
              </div>
              <code style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>Pattern: DPC-{'{PROJ}'}-{'{YY}'}-{'{SEQ:4}'}</code>
            </div>

            <div className="border-hairline" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-surface-sunken)' }}>
              <div style={{ color: 'var(--color-text-secondary)' }}>Internal CLMS Invoice Reference</div>
              <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-brand-primary)' }}>
                INV-26-00104
              </div>
              <code style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>Pattern: INV-{'{YY}'}-{'{SEQ:5}'}</code>
            </div>

            <div className="border-hairline" style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-xs)', backgroundColor: 'var(--color-surface-sunken)' }}>
              <div style={{ color: 'var(--color-text-secondary)' }}>Payment Voucher Reference</div>
              <div style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)', color: 'var(--color-brand-primary)' }}>
                PV-26-00089
              </div>
              <code style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--color-text-tertiary)' }}>Pattern: PV-{'{YY}'}-{'{SEQ:5}'}</code>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Audit Trail */}
      {activeTab === 'audit-log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              Immutable append-only record of all commercial transactions, state transitions, and configuration mutations.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <label htmlFor="audit-entity-filter" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
                Entity:
              </label>
              <select
                id="audit-entity-filter"
                value={auditEntityTypeFilter}
                onChange={(e) => setAuditEntityTypeFilter(e.target.value)}
                style={{
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--color-border-hairline)',
                  fontSize: 'var(--font-size-xs)',
                  backgroundColor: 'var(--color-surface-card)',
                }}
              >
                <option value="ALL">All Entities</option>
                <option value="COMMERCIAL_PACKAGE">Commercial Package</option>
                <option value="CERTIFICATE">Certificate</option>
                <option value="INVOICE">Invoice</option>
                <option value="PAYMENT">Payment</option>
                <option value="CONFIGURATION">Configuration</option>
              </select>
            </div>
          </div>

          <DataTable
            columns={auditColumns}
            data={auditLogs}
            isLoading={isLoading}
            emptyTitle="No audit records found"
            emptyDescription="Commercial lifecycle transactions will produce immutable audit records here."
          />
        </div>
      )}

      {/* Edit Setting Modal */}
      {editSetting && (
        <Modal
          isOpen={Boolean(editSetting)}
          onClose={() => !isSavingSetting && setEditSetting(null)}
          title={`Edit Parameter: ${editSetting.key}`}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <Button variant="secondary" size="md" disabled={isSavingSetting} onClick={() => setEditSetting(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                disabled={isSavingSetting}
                icon={isSavingSetting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                onClick={handleSaveSetting}
              >
                {isSavingSetting ? 'Saving...' : 'Save Parameter'}
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
              {editSetting.description}
            </p>
            <div>
              <label
                htmlFor="setting-value-input"
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--color-text-secondary)',
                  marginBottom: 'var(--space-1)',
                }}
              >
                Parameter Value (JSON or Primitive) *
              </label>
              <Input
                id="setting-value-input"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
