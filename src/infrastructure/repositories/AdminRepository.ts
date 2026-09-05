// ==============================================================================
// CLMS Administration & Governance Repository
// ==============================================================================

import { supabase } from '../supabase/client';
import { auditRepository } from './AuditRepository';

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  roleCode: string;
  roleName: string;
  supplierId?: string | undefined;
  supplierName?: string | undefined;
  isActive: boolean;
  createdAt: string;
}

export interface AdminRoleItem {
  id: string;
  code: string;
  name: string;
  description: string;
  capabilities: string[];
}

export interface AdminSupplierBinding {
  supplierId: string;
  supplierName: string;
  taxNumber?: string | undefined;
  contactEmail?: string | undefined;
  boundUsersCount: number;
  activePackagesCount: number;
}

export interface AdminSettingItem {
  key: string;
  description: string;
  value: unknown;
  updatedAt?: string | undefined;
}

export interface AuditEventRecord {
  id: string;
  createdAt: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId?: string | undefined;
  actorName?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export class AdminRepository {
  /**
   * Retrieves users along with their active role assignments and supplier bindings.
   */
  public async getUsers(): Promise<AdminUserRecord[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          is_active,
          created_at,
          supplier_id,
          suppliers ( name ),
          user_role_assignments (
            roles (
              code,
              name
            )
          )
        `)
        .order('name');

      if (error || !data) {
        console.warn('Error fetching admin users:', error?.message);
        return [];
      }

      type UserQueryRow = {
        id: string;
        name: string;
        email: string;
        is_active: boolean;
        created_at: string;
        supplier_id?: string;
        suppliers?: { name: string };
        user_role_assignments?: Array<{
          roles?: { code: string; name: string };
        }>;
      };

      return (data as unknown as UserQueryRow[]).map((u) => {
        const firstRole = u.user_role_assignments?.[0]?.roles;
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          roleCode: firstRole?.code || 'UNASSIGNED',
          roleName: firstRole?.name || 'Unassigned Role',
          supplierId: u.supplier_id ?? undefined,
          supplierName: u.suppliers?.name ?? undefined,
          isActive: u.is_active,
          createdAt: u.created_at,
        };
      });
    } catch (err: unknown) {
      console.warn('getUsers exception:', err);
      return [];
    }
  }

  /**
   * Retrieves all defined roles and their mapped fine-grained capabilities.
   */
  public async getRolesAndCapabilities(): Promise<AdminRoleItem[]> {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select(`
          id,
          code,
          name,
          description,
          role_capabilities (
            capabilities (
              code
            )
          )
        `)
        .order('name');

      if (error || !data) {
        return [];
      }

      type RoleQueryRow = {
        id: string;
        code: string;
        name: string;
        description: string;
        role_capabilities?: Array<{
          capabilities?: { code: string };
        }>;
      };

      return (data as unknown as RoleQueryRow[]).map((r) => {
        const caps = (r.role_capabilities || [])
          .map((rc) => rc.capabilities?.code)
          .filter((code): code is string => Boolean(code));

        return {
          id: r.id,
          code: r.code,
          name: r.name,
          description: r.description || '',
          capabilities: caps,
        };
      });
    } catch (err: unknown) {
      console.warn('getRolesAndCapabilities exception:', err);
      return [];
    }
  }

  /**
   * Retrieves supplier organizations with active binding statistics.
   */
  public async getSuppliers(): Promise<AdminSupplierBinding[]> {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select(`
          id,
          name,
          tax_number,
          contact_email,
          users ( id ),
          purchase_orders ( id )
        `)
        .order('name');

      if (error || !data) {
        return [];
      }

      type SupplierQueryRow = {
        id: string;
        name: string;
        tax_number?: string;
        contact_email?: string;
        users?: Array<{ id: string }>;
        purchase_orders?: Array<{ id: string }>;
      };

      return (data as unknown as SupplierQueryRow[]).map((s) => ({
        supplierId: s.id,
        supplierName: s.name,
        taxNumber: s.tax_number ?? undefined,
        contactEmail: s.contact_email ?? undefined,
        boundUsersCount: s.users?.length || 0,
        activePackagesCount: s.purchase_orders?.length || 0,
      }));
    } catch (err: unknown) {
      console.warn('getSuppliers exception:', err);
      return [];
    }
  }

  /**
   * Retrieves system configuration key-value pairs.
   */
  public async getSystemSettings(): Promise<AdminSettingItem[]> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, description, value, updated_at')
        .order('key');

      if (error || !data) {
        return [];
      }

      type SettingRow = {
        key: string;
        description?: string;
        value: unknown;
        updated_at?: string;
      };

      return (data as SettingRow[]).map((s) => ({
        key: s.key,
        description: s.description || 'System parameter',
        value: s.value,
        updatedAt: s.updated_at ?? undefined,
      }));
    } catch (err: unknown) {
      console.warn('getSystemSettings exception:', err);
      return [];
    }
  }

  /**
   * Updates a system setting with mandatory audit log.
   */
  public async updateSetting(key: string, value: unknown): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key,
          value,
          updated_by: user?.id ?? null,
          updated_at: new Date().toISOString(),
        });

      if (error) return { success: false, error: error.message };

      await auditRepository.recordEvent({
        action: 'SYSTEM_SETTING_UPDATED',
        entityType: 'CONFIGURATION',
        entityId: key,
        metadata: { key, value },
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating setting';
      return { success: false, error: msg };
    }
  }

  /**
   * Queries the append-only system audit trail.
   */
  public async getAuditTrail(filter?: {
    entityType?: string | undefined;
    action?: string | undefined;
    limit?: number | undefined;
  }): Promise<AuditEventRecord[]> {
    try {
      let query = supabase
        .from('audit_events')
        .select(`
          id,
          created_at,
          action,
          entity_type,
          entity_id,
          actor_id,
          metadata,
          users ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(filter?.limit || 100);

      if (filter?.entityType && filter.entityType !== 'ALL') {
        query = query.eq('entity_type', filter.entityType);
      }
      if (filter?.action) {
        query = query.ilike('action', `%${filter.action}%`);
      }

      const { data, error } = await query;

      if (error || !data) {
        return [];
      }

      type AuditRow = {
        id: string;
        created_at: string;
        action: string;
        entity_type: string;
        entity_id: string;
        actor_id?: string;
        metadata?: Record<string, unknown>;
        users?: { name: string };
      };

      return (data as unknown as AuditRow[]).map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        action: row.action,
        entityType: row.entity_type,
        entityId: row.entity_id,
        actorId: row.actor_id ?? undefined,
        actorName: row.users?.name ?? undefined,
        metadata: row.metadata ?? undefined,
      }));
    } catch (err: unknown) {
      console.warn('getAuditTrail exception:', err);
      return [];
    }
  }
}

export const adminRepository = new AdminRepository();
