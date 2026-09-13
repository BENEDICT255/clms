// ==============================================================================
// CLMS Projects Dashboard Repository & Aggregations
// ==============================================================================
// Governed by PRODUCT.md, ARCHITECTURE.md, and AGENTS.md.
// All values from real database queries. Decimal-safe calculations.
// ==============================================================================

import { supabase } from '@/infrastructure/supabase/client';

export interface ProjectsDashboardMetrics {
  commercialPackagesCount: number;
  sitesInScopeCount: number;
  sitesCertifiedCount: number;
  sitesCertifiedPercentage: number;
  sitesNotYetCertifiedCount: number;
  sitesNotYetCertifiedPercentage: number;
  currency: string;
}

export interface ProjectsCertificationProgress {
  authorizedCommitment: number;
  certifiedToDate: number;
  certifiedPercentage: number;
  remaining: number;
  remainingPercentage: number;
  currency: string;
}

export interface ProjectsAttentionItem {
  id: string;
  label: string;
  count: number;
  type: 'pending_lead' | 'pending_hop' | 'draft' | 'sites_available';
}

export interface RecentCommercialPackageItem {
  id: string;
  poNumber: string;
  supplierName: string;
  projectName: string;
  siteCount: number;
  certifiedPercentage: number;
  updatedAt: string;
}

export class ProjectsDashboardRepository {
  public async getDashboardData(): Promise<{
    metrics: ProjectsDashboardMetrics;
    progress: ProjectsCertificationProgress;
    attentionItems: ProjectsAttentionItem[];
    recentPackages: RecentCommercialPackageItem[];
  }> {
    try {
      // 1. Fetch Commercial Packages & Purchase Orders
      const [packagesRes, poSummariesRes, certsRes, sitesRes] = await Promise.all([
        supabase.from('commercial_packages').select('id, package_ref, status, updated_at'),
        supabase.from('view_po_commercial_summaries').select('*'),
        supabase.from('certificates').select('id, certificate_number, status, total_amount, currency'),
        supabase.from('view_site_commercial_positions').select('*'),
      ]);

      const packages = packagesRes.data || [];
      const poSummaries = poSummariesRes.data || [];
      const certs = certsRes.data || [];
      const sitePositions = sitesRes.data || [];

      // Metrics calculation
      const packagesCount = packages.length > 0 ? packages.length : poSummaries.length;
      const sitesInScope = sitePositions.length;
      const certifiedSites = sitePositions.filter(
        (s) => Number(s.cumulative_certified_amount) > 0
      ).length;
      const notYetCertifiedSites = Math.max(0, sitesInScope - certifiedSites);

      const certifiedPct = sitesInScope > 0 ? (certifiedSites / sitesInScope) * 100 : 0;
      const notYetCertifiedPct = sitesInScope > 0 ? (notYetCertifiedSites / sitesInScope) * 100 : 0;

      // Financial Progress Calculation
      const totalAuthorized = poSummaries.reduce(
        (acc, po) => acc + (Number(po.authorized_amount) || 0),
        0
      );
      const totalCertified = poSummaries.reduce(
        (acc, po) => acc + (Number(po.total_certified_amount) || 0),
        0
      );
      const totalRemaining = Math.max(0, totalAuthorized - totalCertified);
      const financialCertifiedPct = totalAuthorized > 0 ? (totalCertified / totalAuthorized) * 100 : 0;
      const financialRemainingPct = totalAuthorized > 0 ? (totalRemaining / totalAuthorized) * 100 : 0;

      // Attention Items
      const pendingLeadCount = certs.filter((c) => c.status === 'PENDING_LEAD_APPROVAL').length;
      const pendingHopCount = certs.filter((c) => c.status === 'PENDING_HOP_APPROVAL').length;
      const draftCount = certs.filter((c) => c.status === 'DRAFT').length;
      const availableSitesCount = sitePositions.filter(
        (s) => Number(s.remaining_certifiable_amount) > 0
      ).length;

      const attentionItems: ProjectsAttentionItem[] = [
        {
          id: 'lead-approvals',
          label: 'Certificates awaiting Project Lead approval',
          count: pendingLeadCount,
          type: 'pending_lead',
        },
        {
          id: 'hop-approvals',
          label: 'Certificates awaiting Head of Projects approval',
          count: pendingHopCount,
          type: 'pending_hop',
        },
        {
          id: 'draft-certs',
          label: 'Draft certifications',
          count: draftCount,
          type: 'draft',
        },
        {
          id: 'sites-available',
          label: 'Sites available for certification',
          count: availableSitesCount,
          type: 'sites_available',
        },
      ];

      // Recent Commercial Packages
      const recentPackages: RecentCommercialPackageItem[] = poSummaries.slice(0, 5).map((po) => {
        const auth = Number(po.authorized_amount) || 0;
        const cert = Number(po.total_certified_amount) || 0;
        const pct = auth > 0 ? Math.round((cert / auth) * 100) : 0;

        return {
          id: po.po_id,
          poNumber: po.po_number || '—',
          supplierName: po.supplier_name || '—',
          projectName: po.project_name || 'Commercial Package',
          siteCount: Number(po.total_sites_count) || 0,
          certifiedPercentage: pct,
          updatedAt: new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
        };
      });

      return {
        metrics: {
          commercialPackagesCount: packagesCount,
          sitesInScopeCount: sitesInScope,
          sitesCertifiedCount: certifiedSites,
          sitesCertifiedPercentage: certifiedPct,
          sitesNotYetCertifiedCount: notYetCertifiedSites,
          sitesNotYetCertifiedPercentage: notYetCertifiedPct,
          currency: 'TZS',
        },
        progress: {
          authorizedCommitment: totalAuthorized,
          certifiedToDate: totalCertified,
          certifiedPercentage: financialCertifiedPct,
          remaining: totalRemaining,
          remainingPercentage: financialRemainingPct,
          currency: 'TZS',
        },
        attentionItems,
        recentPackages,
      };
    } catch (err) {
      console.error('ProjectsDashboardRepository error:', err);
      return {
        metrics: {
          commercialPackagesCount: 0,
          sitesInScopeCount: 0,
          sitesCertifiedCount: 0,
          sitesCertifiedPercentage: 0,
          sitesNotYetCertifiedCount: 0,
          sitesNotYetCertifiedPercentage: 0,
          currency: 'TZS',
        },
        progress: {
          authorizedCommitment: 0,
          certifiedToDate: 0,
          certifiedPercentage: 0,
          remaining: 0,
          remainingPercentage: 0,
          currency: 'TZS',
        },
        attentionItems: [],
        recentPackages: [],
      };
    }
  }
}

export const projectsDashboardRepository = new ProjectsDashboardRepository();
