// ==============================================================================
// CLMS Certificate Repository & Trusted Client Operations
// ==============================================================================
// Enforces:
// - Reconciled schema contract (total_amount, certificate_site_allocations)
// - Zero client-side sequence generation (no FAC-${Date.now()})
// - Zero unsafe direct mutation fallbacks (all mutations through trusted RPCs)
// - Row-level locking and concurrency invariants enforced at PostgreSQL layer
// ==============================================================================

import { supabase } from '../supabase/client';
import { CertificateType, CertificateStatus } from '@/domain/certification/CertificationEngine';

export interface CertificateRecord {
  id: string;
  certificateNumber: string;
  certType: CertificateType;
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  projectName?: string | undefined;
  currency: string;
  currentCertifiedAmount: number;
  status: CertificateStatus;
  templateVersion: string;
  issuedAt?: string | undefined;
  createdAt: string;
  updatedAt: string;
  siteCount: number;
  sites?: Array<{
    poSiteId: string;
    siteIdExt: string;
    siteName: string;
    region: string;
    authorizedAmount: number;
    currentAmount: number;
    percentage: number;
  }>;
  approvals?: Array<{
    stage: string;
    actorEmail: string;
    timestamp: string;
    comment?: string;
  }>;
}

export class CertificateRepository {
  public async listCertificates(params?: {
    supplierId?: string | undefined;
    status?: string | undefined;
    poId?: string | undefined;
  }): Promise<CertificateRecord[]> {
    try {
      let query = supabase
        .from('certificates')
        .select(`
          id,
          certificate_number,
          cert_type,
          currency,
          total_amount,
          status,
          issued_at,
          created_at,
          updated_at,
          purchase_orders!inner (
            id,
            po_number,
            supplier_id,
            suppliers ( id, name ),
            commercial_packages (
              projects ( id, name )
            )
          ),
          certificate_site_allocations (
            id,
            po_site_id,
            previous_amount,
            current_amount,
            cumulative_amount,
            po_sites (
              id,
              authorized_amount,
              sites (
                id,
                site_id_ext,
                site_name,
                region
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (params?.supplierId) {
        query = query.eq('purchase_orders.supplier_id', params.supplierId);
      }

      if (params?.status) {
        query = query.eq('status', params.status);
      }

      if (params?.poId) {
        query = query.eq('po_id', params.poId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Error querying certificates:', error.message);
        return [];
      }

      type CertQueryRow = {
        id: string;
        certificate_number: string;
        cert_type: string;
        currency: string;
        total_amount: number | string;
        status: string;
        issued_at?: string;
        created_at: string;
        updated_at: string;
        purchase_orders?: {
          id: string;
          po_number: string;
          supplier_id: string;
          suppliers?: { id: string; name: string };
          commercial_packages?: { projects?: { id: string; name: string } };
        };
        certificate_site_allocations?: Array<{
          id: string;
          po_site_id: string;
          previous_amount: number | string;
          current_amount: number | string;
          cumulative_amount: number | string;
          po_sites?: {
            id: string;
            authorized_amount: number | string;
            sites?: { id: string; site_id_ext: string; site_name: string; region: string };
          };
        }>;
      };

      return (data || []).map((rowRecord: unknown) => {
        const row = rowRecord as CertQueryRow;
        const po = row.purchase_orders;
        const supplier = po?.suppliers;
        const project = po?.commercial_packages?.projects;
        const allocations = row.certificate_site_allocations || [];

        const sites = allocations.map((alloc) => {
          const poSite = alloc.po_sites;
          const site = poSite?.sites;
          const authAmt = Number(poSite?.authorized_amount) || 0;
          const curAmt = Number(alloc.current_amount) || 0;
          const pct = authAmt > 0 ? (curAmt / authAmt) * 100 : 0;

          return {
            poSiteId: alloc.po_site_id,
            siteIdExt: site?.site_id_ext || '—',
            siteName: site?.site_name || '—',
            region: site?.region || '—',
            authorizedAmount: authAmt,
            currentAmount: curAmt,
            percentage: Math.round(pct * 100) / 100,
          };
        });

        return {
          id: row.id,
          certificateNumber: row.certificate_number,
          certType: row.cert_type as CertificateType,
          poId: po?.id || '',
          poNumber: po?.po_number || '—',
          supplierId: po?.supplier_id || '',
          supplierName: supplier?.name || '—',
          projectName: project?.name || '—',
          currency: row.currency || 'TZS',
          currentCertifiedAmount: Number(row.total_amount) || 0,
          status: row.status as CertificateStatus,
          templateVersion: 'PROVISIONAL_V1',
          issuedAt: row.issued_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          siteCount: sites.length,
          sites,
        };
      });
    } catch (err: unknown) {
      console.warn('listCertificates exception:', err);
      return [];
    }
  }

  public async getCertificateById(id: string): Promise<CertificateRecord | null> {
    const list = await this.listCertificates();
    return list.find((c) => c.id === id) || null;
  }

  /**
   * Creates a draft certificate using database concurrency locking (create_certificate_with_lock RPC).
   * Zero client-side fallback: Rejects if RPC or database rejects.
   */
  public async createCertificate(input: {
    certType: CertificateType;
    poId: string;
    currency: string;
    sites: Array<{
      poSiteId: string;
      currentAmount: number;
      percentage: number;
    }>;
    notes?: string;
  }): Promise<{ success: boolean; certificateId?: string; certificateNumber?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('create_certificate_with_lock', {
        p_po_id: input.poId,
        p_cert_type: input.certType,
        p_currency: input.currency,
        p_sites_json: input.sites,
        p_notes: input.notes || '',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.success) {
        return {
          success: true,
          certificateId: data.certificate_id,
          certificateNumber: data.certificate_number,
        };
      }

      return { success: false, error: 'Certificate creation failed: no confirmation returned.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected failure creating certificate';
      return { success: false, error: msg };
    }
  }

  /**
   * Approves a stage in the certificate workflow:
   * PROJECT_LEAD -> HEAD_OF_PROJECTS -> APPROVED
   * Zero client-side fallback.
   */
  public async approveCertificateStage(
    certificateId: string,
    stage: 'PROJECT_LEAD' | 'HEAD_OF_PROJECTS',
    comment?: string
  ): Promise<{ success: boolean; nextStatus?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('approve_certificate_stage', {
        p_certificate_id: certificateId,
        p_stage: stage,
        p_comment: comment || '',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.success) {
        return { success: true, nextStatus: data.status };
      }

      return { success: false, error: 'Stage approval failed: unexpected response from database.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error approving certificate';
      return { success: false, error: msg };
    }
  }

  /**
   * Issues the approved certificate to the supplier idempotently.
   * Zero client-side fallback.
   */
  public async issueCertificate(
    certificateId: string
  ): Promise<{ success: boolean; issuedAt?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('issue_certificate', {
        p_certificate_id: certificateId,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.success) {
        return { success: true, issuedAt: data.issued_at };
      }

      return { success: false, error: 'Certificate issuance failed: unexpected response from database.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error issuing certificate';
      return { success: false, error: msg };
    }
  }
}

export const certificateRepository = new CertificateRepository();
