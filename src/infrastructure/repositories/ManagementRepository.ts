// ==============================================================================
// CLMS Executive Management Portfolio Repository
// ==============================================================================
// Governed by PRODUCT.md Section 33:
// - Real Aggregated Portfolio Metrics (Zero Fake Data)
// - Supplier Exposure Breakdown
// - Regional Commitment Analytics
// ==============================================================================

import { supabase } from '../supabase/client';

export interface ManagementPortfolioMetrics {
  authorizedCommitment: number;
  totalCertified: number;
  invoicedLiability: number;
  cashSettled: number;
  outstandingExposure: number;
  dpcAdvanceExposure: number;
  activePackagesCount: number;
  issuedCertificatesCount: number;
  invoicesAwaitingScmCount: number;
  invoicesAwaitingFinanceCount: number;
  currency: string;
}

export interface SupplierExposureItem {
  supplierId: string;
  supplierName: string;
  authorizedAmount: number;
  certifiedAmount: number;
  invoicedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  currency: string;
}

export interface RegionalCommitmentItem {
  region: string;
  sitesCount: number;
  authorizedAmount: number;
  certifiedAmount: number;
  currency: string;
}

export class ManagementRepository {
  /**
   * Retrieves high-level portfolio metrics backed by actual transactional data.
   */
  public async getPortfolioMetrics(): Promise<ManagementPortfolioMetrics> {
    try {
      // 1. Try querying view_management_portfolio_summary
      const { data: viewData, error: viewError } = await supabase
        .from('view_management_portfolio_summary')
        .select('*')
        .single();

      if (!viewError && viewData) {
        type SummaryRow = {
          total_authorized_commitment: number | string;
          total_certified_value: number | string;
          total_invoiced_liability: number | string;
          total_paid_outflow: number | string;
          total_outstanding_liability: number | string;
          total_dpc_exposure: number | string;
          active_packages_count: number | string;
          issued_certificates_count: number | string;
          invoices_awaiting_scm_count: number | string;
          invoices_awaiting_finance_count: number | string;
        };

        const row = viewData as SummaryRow;
        return {
          authorizedCommitment: Number(row.total_authorized_commitment) || 0,
          totalCertified: Number(row.total_certified_value) || 0,
          invoicedLiability: Number(row.total_invoiced_liability) || 0,
          cashSettled: Number(row.total_paid_outflow) || 0,
          outstandingExposure: Number(row.total_outstanding_liability) || 0,
          dpcAdvanceExposure: Number(row.total_dpc_exposure) || 0,
          activePackagesCount: Number(row.active_packages_count) || 0,
          issuedCertificatesCount: Number(row.issued_certificates_count) || 0,
          invoicesAwaitingScmCount: Number(row.invoices_awaiting_scm_count) || 0,
          invoicesAwaitingFinanceCount: Number(row.invoices_awaiting_finance_count) || 0,
          currency: 'TZS',
        };
      }

      // 2. Fallback: Aggregate individually
      return await this.getPortfolioMetricsFallback();
    } catch (err: unknown) {
      console.warn('getPortfolioMetrics exception:', err);
      return this.emptyMetrics();
    }
  }

  private emptyMetrics(): ManagementPortfolioMetrics {
    return {
      authorizedCommitment: 0,
      totalCertified: 0,
      invoicedLiability: 0,
      cashSettled: 0,
      outstandingExposure: 0,
      dpcAdvanceExposure: 0,
      activePackagesCount: 0,
      issuedCertificatesCount: 0,
      invoicesAwaitingScmCount: 0,
      invoicesAwaitingFinanceCount: 0,
      currency: 'TZS',
    };
  }

  private async getPortfolioMetricsFallback(): Promise<ManagementPortfolioMetrics> {
    // 1. Authorized PO totals
    const { data: pos } = await supabase.from('purchase_orders').select('authorized_amount');
    const authorizedCommitment = (pos || []).reduce(
      (acc, po) => acc + (Number(po.authorized_amount) || 0),
      0
    );

    // 2. Certified totals (from ISSUED certificates)
    const { data: certAllocations } = await supabase
      .from('certificate_site_allocations')
      .select('current_amount, certificates!inner(status, cert_type)')
      .eq('certificates.status', 'ISSUED');

    type CertAllocRow = {
      current_amount: number | string;
      certificates: { status: string; cert_type: string };
    };

    let totalCertified = 0;
    let dpcAdvanceExposure = 0;
    for (const ca of (certAllocations || []) as unknown as CertAllocRow[]) {
      const amt = Number(ca.current_amount) || 0;
      totalCertified += amt;
      if (ca.certificates?.cert_type === 'DPC') {
        dpcAdvanceExposure += amt;
      }
    }

    // 3. Invoiced liability (Submitted, Approved, or Paid)
    const { data: invoices } = await supabase
      .from('invoices')
      .select('amount, tax_amount, status');

    let invoicedLiability = 0;
    let invoicesAwaitingScmCount = 0;
    let invoicesAwaitingFinanceCount = 0;

    for (const inv of invoices || []) {
      const total = (Number(inv.amount) || 0) + (Number(inv.tax_amount) || 0);
      if (['SUBMITTED', 'RESUBMITTED', 'SC_APPROVED', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT', 'PARTIALLY_PAID', 'SETTLED'].includes(inv.status)) {
        invoicedLiability += total;
      }
      if (['SUBMITTED', 'RESUBMITTED'].includes(inv.status)) {
        invoicesAwaitingScmCount++;
      }
      if (['SC_APPROVED', 'PARTIALLY_PAID', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT'].includes(inv.status)) {
        invoicesAwaitingFinanceCount++;
      }
    }

    // 4. Cash settled (payment transactions)
    const { data: payments } = await supabase.from('payment_transactions').select('amount');
    const cashSettled = (payments || []).reduce(
      (acc, p) => acc + (Number(p.amount) || 0),
      0
    );

    const outstandingExposure = Math.max(0, invoicedLiability - cashSettled);

    // Counts
    const { count: activePackagesCount } = await supabase
      .from('commercial_packages')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');

    const { count: issuedCertificatesCount } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ISSUED');

    return {
      authorizedCommitment,
      totalCertified,
      invoicedLiability,
      cashSettled,
      outstandingExposure,
      dpcAdvanceExposure,
      activePackagesCount: activePackagesCount || 0,
      issuedCertificatesCount: issuedCertificatesCount || 0,
      invoicesAwaitingScmCount,
      invoicesAwaitingFinanceCount,
      currency: 'TZS',
    };
  }

  /**
   * Retrieves supplier exposure metrics across all active commitments.
   */
  public async getSupplierExposures(): Promise<SupplierExposureItem[]> {
    try {
      const { data: suppliers, error } = await supabase
        .from('suppliers')
        .select(`
          id,
          name,
          purchase_orders (
            id,
            authorized_amount,
            currency,
            certificates (
              id,
              status,
              invoices (
                id,
                amount,
                tax_amount,
                status,
                payment_transactions (
                  amount
                )
              ),
              certificate_site_allocations (
                current_amount
              )
            )
          )
        `);

      if (error || !suppliers) {
        console.warn('getSupplierExposures error:', error?.message);
        return [];
      }

      type ExposureQuerySupplier = {
        id: string;
        name: string;
        purchase_orders?: Array<{
          id: string;
          authorized_amount: number | string;
          currency?: string;
          certificates?: Array<{
            id: string;
            status: string;
            invoices?: Array<{
              id: string;
              amount: number | string;
              tax_amount: number | string;
              status: string;
              payment_transactions?: Array<{ amount: number | string }>;
            }>;
            certificate_site_allocations?: Array<{ current_amount: number | string }>;
          }>;
        }>;
      };

      return (suppliers as unknown as ExposureQuerySupplier[]).map((s) => {
        let authorizedAmount = 0;
        let certifiedAmount = 0;
        let invoicedAmount = 0;
        let paidAmount = 0;

        for (const po of s.purchase_orders || []) {
          authorizedAmount += Number(po.authorized_amount) || 0;

          for (const cert of po.certificates || []) {
            if (cert.status === 'ISSUED') {
              for (const csa of cert.certificate_site_allocations || []) {
                certifiedAmount += Number(csa.current_amount) || 0;
              }
            }

            for (const inv of cert.invoices || []) {
              if (['SUBMITTED', 'RESUBMITTED', 'SC_APPROVED', 'PARTIALLY_PAID', 'SETTLED'].includes(inv.status)) {
                const invTotal = (Number(inv.amount) || 0) + (Number(inv.tax_amount) || 0);
                invoicedAmount += invTotal;

                for (const pt of inv.payment_transactions || []) {
                  paidAmount += Number(pt.amount) || 0;
                }
              }
            }
          }
        }

        const outstandingAmount = Math.max(0, invoicedAmount - paidAmount);

        return {
          supplierId: s.id,
          supplierName: s.name,
          authorizedAmount,
          certifiedAmount,
          invoicedAmount,
          paidAmount,
          outstandingAmount,
          currency: 'TZS',
        };
      });
    } catch (err: unknown) {
      console.warn('getSupplierExposures exception:', err);
      return [];
    }
  }

  /**
   * Retrieves regional distribution of site counts and commitments.
   */
  public async getRegionalCommitments(): Promise<RegionalCommitmentItem[]> {
    try {
      const { data, error } = await supabase
        .from('po_sites')
        .select(`
          authorized_amount,
          sites!inner (
            region
          ),
          certificate_site_allocations (
            current_amount,
            certificates!inner (
              status
            )
          )
        `);

      if (error || !data) {
        return [];
      }

      type RegionRow = {
        authorized_amount: number | string;
        sites: { region?: string };
        certificate_site_allocations?: Array<{
          current_amount: number | string;
          certificates: { status: string };
        }>;
      };

      const map = new Map<string, { sitesCount: number; authorized: number; certified: number }>();

      for (const row of (data as unknown as RegionRow[])) {
        const region = row.sites?.region || 'Unassigned';
        const entry = map.get(region) || { sitesCount: 0, authorized: 0, certified: 0 };

        entry.sitesCount += 1;
        entry.authorized += Number(row.authorized_amount) || 0;

        for (const csa of row.certificate_site_allocations || []) {
          if (csa.certificates?.status === 'ISSUED') {
            entry.certified += Number(csa.current_amount) || 0;
          }
        }

        map.set(region, entry);
      }

      const results: RegionalCommitmentItem[] = [];
      for (const [region, values] of map.entries()) {
        results.push({
          region,
          sitesCount: values.sitesCount,
          authorizedAmount: values.authorized,
          certifiedAmount: values.certified,
          currency: 'TZS',
        });
      }

      return results.sort((a, b) => b.authorizedAmount - a.authorizedAmount);
    } catch (err: unknown) {
      console.warn('getRegionalCommitments exception:', err);
      return [];
    }
  }
}

export const managementRepository = new ManagementRepository();
