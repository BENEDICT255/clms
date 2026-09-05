// ==============================================================================
// CLMS Certificate Repository & Trusted Client Operations
// ==============================================================================

import { supabase } from '../supabase/client';
import { CertificateType, CertificateStatus } from '@/domain/certification/CertificationEngine';
import { auditRepository } from './AuditRepository';

export interface CertificateRecord {
  id: string;
  certificateNumber: string;
  certType: CertificateType;
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  projectName?: string;
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
          current_certified_value,
          status,
          template_version,
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
            current_amount,
            percentage,
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
        current_certified_value: number | string;
        status: string;
        template_version?: string;
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
          current_amount: number | string;
          percentage: number | string;
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
          return {
            poSiteId: alloc.po_site_id,
            siteIdExt: site?.site_id_ext || '—',
            siteName: site?.site_name || '—',
            region: site?.region || '—',
            authorizedAmount: Number(poSite?.authorized_amount) || 0,
            currentAmount: Number(alloc.current_amount) || 0,
            percentage: Number(alloc.percentage) || 0,
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
          projectName: project?.name || 'Standard Project',
          currency: row.currency || 'TZS',
          currentCertifiedAmount: Number(row.current_certified_value) || 0,
          status: row.status as CertificateStatus,
          templateVersion: row.template_version || 'PROVISIONAL_V1',
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
   * Creates a draft certificate using database concurrency locking (create_certificate_with_lock RPC)
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
      // 1. Try atomic PostgreSQL RPC with FOR UPDATE locking
      const { data, error } = await supabase.rpc('create_certificate_with_lock', {
        p_po_id: input.poId,
        p_cert_type: input.certType,
        p_currency: input.currency,
        p_sites_json: input.sites,
        p_notes: input.notes || '',
      });

      if (!error && data && data.success) {
        return {
          success: true,
          certificateId: data.certificate_id,
          certificateNumber: data.certificate_number,
        };
      }

      if (error && !error.message.includes('function create_certificate_with_lock') && !error.message.includes('does not exist')) {
        return { success: false, error: error.message };
      }

      // Fallback for local development if RPC is not yet executed on server
      return await this.createCertificateFallback(input);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unexpected failure creating certificate';
      return { success: false, error: msg };
    }
  }

  private async createCertificateFallback(input: {
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
    const totalAmount = input.sites.reduce((sum, s) => sum + s.currentAmount, 0);
    const certNumber = `${input.certType}-${Date.now().toString().slice(-6)}`;

    const { data: cert, error: certErr } = await supabase
      .from('certificates')
      .insert({
        certificate_number: certNumber,
        cert_type: input.certType,
        po_id: input.poId,
        currency: input.currency,
        current_certified_value: totalAmount,
        status: 'DRAFT',
        template_version: 'PROVISIONAL_V1',
        metadata: { notes: input.notes },
      })
      .select('id, certificate_number')
      .single();

    if (certErr || !cert) {
      return { success: false, error: certErr?.message || 'Failed to insert certificate' };
    }

    // Insert site allocations
    const allocRows = input.sites.map((s) => ({
      certificate_id: cert.id,
      po_site_id: s.poSiteId,
      current_amount: s.currentAmount,
      percentage: s.percentage,
    }));

    const { error: allocErr } = await supabase.from('certificate_site_allocations').insert(allocRows);
    if (allocErr) {
      return { success: false, error: allocErr.message };
    }

    await auditRepository.recordEvent({
      action: 'CERTIFICATE_CREATED',
      entityType: 'CERTIFICATE',
      entityId: cert.id,
      metadata: { certNumber: cert.certificate_number, totalAmount, certType: input.certType },
    });

    return {
      success: true,
      certificateId: cert.id,
      certificateNumber: cert.certificate_number,
    };
  }

  /**
   * Approves a stage in the certificate workflow:
   * PROJECT_LEAD -> HEAD_OF_PROJECTS -> APPROVED
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

      if (!error && data && data.success) {
        return { success: true, nextStatus: data.status };
      }

      if (error && !error.message.includes('does not exist')) {
        return { success: false, error: error.message };
      }

      // Fallback
      const nextStatus = stage === 'PROJECT_LEAD' ? 'PENDING_HEAD_OF_PROJECTS' : 'APPROVED';
      const { error: updateErr } = await supabase
        .from('certificates')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', certificateId);

      if (updateErr) return { success: false, error: updateErr.message };

      await auditRepository.recordEvent({
        action: `CERTIFICATE_APPROVED_${stage}`,
        entityType: 'CERTIFICATE',
        entityId: certificateId,
        metadata: { stage, nextStatus, comment },
      });

      return { success: true, nextStatus };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error approving certificate';
      return { success: false, error: msg };
    }
  }

  /**
   * Issues the approved certificate to the supplier idempotently.
   * Freezes document version and creates notification.
   */
  public async issueCertificate(
    certificateId: string
  ): Promise<{ success: boolean; issuedAt?: string; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('issue_certificate', {
        p_certificate_id: certificateId,
      });

      if (!error && data && data.success) {
        return { success: true, issuedAt: data.issued_at };
      }

      if (error && !error.message.includes('does not exist')) {
        return { success: false, error: error.message };
      }

      // Fallback
      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('certificates')
        .update({ status: 'ISSUED', issued_at: now, updated_at: now })
        .eq('id', certificateId);

      if (updateErr) return { success: false, error: updateErr.message };

      await auditRepository.recordEvent({
        action: 'CERTIFICATE_ISSUED',
        entityType: 'CERTIFICATE',
        entityId: certificateId,
        metadata: { issuedAt: now },
      });

      return { success: true, issuedAt: now };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error issuing certificate';
      return { success: false, error: msg };
    }
  }
}

export const certificateRepository = new CertificateRepository();
