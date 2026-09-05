// ==============================================================================
// CLMS Commercial Explorer Repository
// ==============================================================================

import { supabase } from '../supabase/client';

export interface CommercialExplorerRecord {
  id: string;
  poSiteId: string;
  siteId: string;
  siteIdExt: string;
  siteName: string;
  region: string;
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  projectName?: string;
  authorizedValue: number;
  cumulativeCertified: number;
  remainingCertifiable: number;
  invoicedAmount: number;
  status: string;
  currency: string;
}

export interface SearchCommercialParams {
  query?: string | undefined;
  region?: string | undefined;
  supplierId?: string | undefined;
  projectId?: string | undefined;
  limit?: number | undefined;
  offset?: number | undefined;
}

export class CommercialExplorerRepository {
  public async searchRecords(params: SearchCommercialParams = {}): Promise<CommercialExplorerRecord[]> {
    try {
      let query = supabase
        .from('po_sites')
        .select(`
          id,
          authorized_amount,
          purchase_orders!inner (
            id,
            po_number,
            currency,
            supplier_id,
            suppliers ( id, name ),
            commercial_packages (
              projects ( id, name )
            )
          ),
          sites!inner (
            id,
            site_id_ext,
            site_name,
            region
          ),
          certificate_site_allocations (
            current_amount,
            certificates (
              id,
              status
            )
          )
        `);

      // Tenant isolation: if supplierId is provided or user is supplier
      if (params.supplierId) {
        query = query.eq('purchase_orders.supplier_id', params.supplierId);
      }

      if (params.region) {
        query = query.ilike('sites.region', `%${params.region}%`);
      }

      const { data, error } = await query.limit(params.limit || 100);

      if (error) {
        console.warn('Commercial Explorer database query error:', error.message);
        return [];
      }

      type POSiteQueryRow = {
        id: string;
        authorized_amount: number | string;
        purchase_orders?: {
          id: string;
          po_number: string;
          currency: string;
          supplier_id: string;
          suppliers?: { id: string; name: string };
          commercial_packages?: { projects?: { id: string; name: string } };
        };
        sites?: {
          id: string;
          site_id_ext: string;
          site_name: string;
          region: string;
        };
        certificate_site_allocations?: Array<{
          current_amount: number | string;
          certificates?: { id: string; status: string };
        }>;
      };

      let results: CommercialExplorerRecord[] = (data || []).map((rowRecord: unknown) => {
        const row = rowRecord as POSiteQueryRow;
        const po = row.purchase_orders;
        const site = row.sites;
        const supplier = po?.suppliers;
        const project = po?.commercial_packages?.projects;

        // Compute cumulative certified from issued certificates only
        let cumulativeCertified = 0;
        if (Array.isArray(row.certificate_site_allocations)) {
          row.certificate_site_allocations.forEach((alloc) => {
            if (alloc.certificates?.status === 'ISSUED') {
              cumulativeCertified += Number(alloc.current_amount) || 0;
            }
          });
        }

        const authorizedValue = Number(row.authorized_amount) || 0;
        const remainingCertifiable = Math.max(0, authorizedValue - cumulativeCertified);

        let status = 'UNCOMMENCED';
        if (cumulativeCertified >= authorizedValue && authorizedValue > 0) {
          status = 'FULLY_CERTIFIED';
        } else if (cumulativeCertified > 0) {
          status = 'PARTIALLY_CERTIFIED';
        }

        return {
          id: row.id,
          poSiteId: row.id,
          siteId: site?.id || '',
          siteIdExt: site?.site_id_ext || '—',
          siteName: site?.site_name || '—',
          region: site?.region || '—',
          poId: po?.id || '',
          poNumber: po?.po_number || '—',
          supplierId: po?.supplier_id || '',
          supplierName: supplier?.name || '—',
          projectName: project?.name || 'Standard Project',
          authorizedValue,
          cumulativeCertified,
          remainingCertifiable,
          invoicedAmount: 0,
          status,
          currency: po?.currency || 'TZS',
        };
      });

      // Filter by text query across Site ID, Site Name, PO Number, Supplier Name
      if (params.query?.trim()) {
        const q = params.query.toLowerCase().trim();
        results = results.filter(
          (r) =>
            r.siteIdExt.toLowerCase().includes(q) ||
            r.siteName.toLowerCase().includes(q) ||
            r.poNumber.toLowerCase().includes(q) ||
            r.supplierName.toLowerCase().includes(q) ||
            r.region.toLowerCase().includes(q)
        );
      }

      return results;
    } catch (err: unknown) {
      console.warn('Explorer query failed:', err);
      return [];
    }
  }

  public async getSiteCommercialPosition(poSiteId: string): Promise<CommercialExplorerRecord | null> {
    const list = await this.searchRecords();
    return list.find((r) => r.poSiteId === poSiteId) || null;
  }
}

export const commercialExplorerRepository = new CommercialExplorerRepository();
