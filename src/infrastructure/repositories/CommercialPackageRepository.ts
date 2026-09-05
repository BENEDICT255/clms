// ==============================================================================
// CLMS Commercial Package Repository
// ==============================================================================

import { supabase } from '../supabase/client';
import { CommercialPackageRecord, ExtractedSiteLine, PackageStatus } from '@/domain/commercial/types';

export interface ProjectLookup {
  id: string;
  code: string;
  name: string;
  projectTypeId: string;
}

export interface SupplierLookup {
  id: string;
  vendorCode: string;
  name: string;
  taxId: string;
}

export interface ConfirmPackagePayload {
  projectId: string;
  packageRef: string;
  poNumber: string;
  supplierId: string;
  currency: string;
  authorizedAmount: number;
  paymentTermsDays: number;
  templateVersion: string;
  sites: ExtractedSiteLine[];
  boqFileName: string;
  boqFileHash: string;
  poFileName: string;
  poFileHash: string;
  confirmedBy?: string | undefined;
}

export class CommercialPackageRepository {
  public async getProjects(): Promise<ProjectLookup[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('id, code, name, project_type_id')
      .order('name');

    if (error) {
      console.warn('Could not load projects from database:', error.message);
      return [];
    }

    return (data || []).map((row: { id: string; code: string; name: string; project_type_id: string }) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      projectTypeId: row.project_type_id,
    }));
  }

  public async getSuppliers(): Promise<SupplierLookup[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, vendor_code, name, tax_id')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.warn('Could not load suppliers from database:', error.message);
      return [];
    }

    return (data || []).map((row: { id: string; vendor_code: string; name: string; tax_id: string }) => ({
      id: row.id,
      vendorCode: row.vendor_code,
      name: row.name,
      taxId: row.tax_id,
    }));
  }

  public async listPackages(): Promise<CommercialPackageRecord[]> {
    const { data, error } = await supabase
      .from('commercial_packages')
      .select(`
        id,
        package_ref,
        status,
        created_at,
        updated_at,
        projects ( name ),
        purchase_orders (
          po_number,
          currency,
          authorized_amount,
          suppliers ( name )
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not list commercial packages:', error.message);
      return [];
    }

    return (data || []).map((rowRecord: unknown) => {
      const row = rowRecord as {
        id: string;
        project_id?: string;
        package_ref: string;
        status: PackageStatus;
        created_at: string;
        updated_at: string;
        projects?: { name: string };
        purchase_orders?: {
          po_number: string;
          currency: string;
          authorized_amount: number;
          suppliers?: { name: string };
        } | Array<{
          po_number: string;
          currency: string;
          authorized_amount: number;
          suppliers?: { name: string };
        }>;
      };
      const po = Array.isArray(row.purchase_orders) ? row.purchase_orders[0] : row.purchase_orders;
      return {
        id: row.id,
        projectId: row.project_id || '',
        projectName: row.projects?.name || 'Standard Rollout',
        packageRef: row.package_ref,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        poNumber: po?.po_number || '—',
        supplierName: po?.suppliers?.name || '—',
        authorizedAmount: po?.authorized_amount || 0,
        currency: po?.currency || 'TZS',
      };
    });
  }

  public async checkDuplicatePO(poNumber: string): Promise<boolean> {
    const { data } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('po_number', poNumber.trim())
      .limit(1);

    return Array.isArray(data) && data.length > 0;
  }

  public async confirmPackage(payload: ConfirmPackagePayload): Promise<{ success: boolean; packageId?: string; error?: string }> {
    try {
      // 1. Create Commercial Package in READY_FOR_CONFIRM / ACTIVE
      const { data: pkg, error: pkgError } = await supabase
        .from('commercial_packages')
        .insert({
          project_id: payload.projectId,
          package_ref: payload.packageRef,
          status: 'ACTIVE',
          confirmed_by: payload.confirmedBy || null,
          confirmed_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (pkgError || !pkg) {
        throw new Error(`Failed to create commercial package record: ${pkgError?.message}`);
      }

      const packageId = pkg.id;

      // 2. Insert BOQ record
      const { error: boqError } = await supabase.from('boqs').insert({
        package_id: packageId,
        template_version: payload.templateVersion,
        total_amount: payload.authorizedAmount,
        currency: payload.currency,
      });

      if (boqError) {
        throw new Error(`Failed to insert BOQ: ${boqError.message}`);
      }

      // 3. Insert Purchase Order record
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          package_id: packageId,
          po_number: payload.poNumber,
          supplier_id: payload.supplierId,
          currency: payload.currency,
          authorized_amount: payload.authorizedAmount,
          payment_terms_days: payload.paymentTermsDays,
        })
        .select('id')
        .single();

      if (poError || !po) {
        throw new Error(`Failed to insert Purchase Order: ${poError?.message}`);
      }

      const poId = po.id;

      // 4. Insert Sites and PO-Site Allocations
      for (const siteLine of payload.sites) {
        // Upsert site in master sites catalog
        const { data: siteRecord, error: siteError } = await supabase
          .from('sites')
          .upsert(
            {
              site_id_ext: siteLine.siteIdExt,
              site_name: siteLine.siteName,
              region: siteLine.region,
            },
            { onConflict: 'site_id_ext' }
          )
          .select('id')
          .single();

        if (siteError || !siteRecord) {
          throw new Error(`Failed to insert or resolve site "${siteLine.siteIdExt}": ${siteError?.message}`);
        }

        // Insert po_sites allocation
        const { error: poSiteError } = await supabase.from('po_sites').insert({
          po_id: poId,
          site_id: siteRecord.id,
          authorized_amount: siteLine.authorizedAmount,
          scope_description: siteLine.scopeDescription || null,
        });

        if (poSiteError) {
          throw new Error(`Failed to link site "${siteLine.siteIdExt}" to PO: ${poSiteError.message}`);
        }
      }

      // 5. Insert document metadata for BOQ and PO
      await supabase.from('commercial_documents').insert([
        {
          document_type: 'BOQ_SOURCE',
          entity_type: 'COMMERCIAL_PACKAGE',
          entity_id: packageId,
          storage_path: `packages/${packageId}/boq_${payload.boqFileName}`,
          file_name: payload.boqFileName,
          file_size: 1024, // Baseline metadata
          mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          sha256_hash: payload.boqFileHash,
          uploaded_by: payload.confirmedBy || null,
          is_immutable: true,
        },
        {
          document_type: 'PO_SOURCE',
          entity_type: 'PURCHASE_ORDER',
          entity_id: poId,
          storage_path: `purchase-orders/${poId}/po_${payload.poFileName}`,
          file_name: payload.poFileName,
          file_size: 1024,
          mime_type: 'application/pdf',
          sha256_hash: payload.poFileHash,
          uploaded_by: payload.confirmedBy || null,
          is_immutable: true,
        },
      ]);

      // 6. Record immutable audit event
      await supabase.from('audit_events').insert({
        entity_type: 'COMMERCIAL_PACKAGE',
        entity_id: packageId,
        action: 'PACKAGE_CONFIRMED',
        actor_id: payload.confirmedBy || null,
        new_state: {
          package_ref: payload.packageRef,
          po_number: payload.poNumber,
          authorized_amount: payload.authorizedAmount,
          site_count: payload.sites.length,
        },
      });

      return { success: true, packageId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown confirmation error';
      return { success: false, error: msg };
    }
  }
}

export const commercialPackageRepository = new CommercialPackageRepository();
