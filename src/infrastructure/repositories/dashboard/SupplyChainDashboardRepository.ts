// ==============================================================================
// CLMS Supply Chain Dashboard Repository & Aggregations
// ==============================================================================
// Governed by PRODUCT.md, ARCHITECTURE.md, and AGENTS.md.
// All values from real database queries.
// ==============================================================================

import { supabase } from '@/infrastructure/supabase/client';

export interface SupplyChainDashboardMetrics {
  totalPOsCount: number;
  invoicesAwaitingReviewCount: number;
  returnedForCorrectionCount: number;
  approvedToFinanceCount: number;
}

export interface SupplyChainPipelineItem {
  id: string;
  label: string;
  count: number;
  statusCode: string;
  color?: 'brand' | 'neutral' | 'success' | 'danger' | 'warning';
}

export interface SupplyChainAlertItem {
  id: string;
  label: string;
  count: number;
  type: 'aging' | 'missing_docs' | 'discrepancy' | 'overdue';
}

export interface InvoiceRequiringReviewItem {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  poNumber: string;
  amount: number;
  currency: string;
  submittedAt: string;
  waitingDays: number;
}

export class SupplyChainDashboardRepository {
  public async getDashboardData(): Promise<{
    metrics: SupplyChainDashboardMetrics;
    pipeline: SupplyChainPipelineItem[];
    alerts: SupplyChainAlertItem[];
    reviewQueue: InvoiceRequiringReviewItem[];
  }> {
    try {
      const [posRes, invoicesRes] = await Promise.all([
        supabase.from('purchase_orders').select('id'),
        supabase.from('invoices').select(`
          id,
          clms_reference,
          supplier_invoice_number,
          amount,
          tax_amount,
          currency,
          status,
          created_at,
          submitted_at,
          certificate_id,
          supplier_id,
          suppliers ( id, name ),
          certificates (
            id,
            certificate_number,
            purchase_orders (
              id,
              po_number
            )
          )
        `),
      ]);

      const pos = posRes.data || [];
      const invoices = invoicesRes.data || [];

      // Counts
      const totalPOsCount = pos.length;
      const awaitingReviewInvoices = invoices.filter((i) =>
        ['SUBMITTED', 'RESUBMITTED'].includes(i.status)
      );
      const returnedInvoices = invoices.filter((i) => i.status === 'RETURNED');
      const approvedInvoices = invoices.filter((i) =>
        ['SC_APPROVED', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT', 'PARTIALLY_PAID', 'SETTLED'].includes(i.status)
      );

      const submittedCount = invoices.filter((i) => i.status === 'SUBMITTED').length;
      const returnedCount = returnedInvoices.length;
      const resubmittedCount = invoices.filter((i) => i.status === 'RESUBMITTED').length;
      const approvedCount = approvedInvoices.length;

      // Pipeline
      const pipeline: SupplyChainPipelineItem[] = [
        { id: 'submitted', label: 'Submitted', count: submittedCount, statusCode: 'SUBMITTED', color: 'brand' },
        { id: 'returned', label: 'Returned', count: returnedCount, statusCode: 'RETURNED', color: 'danger' },
        { id: 'resubmitted', label: 'Resubmitted', count: resubmittedCount, statusCode: 'RESUBMITTED', color: 'brand' },
        { id: 'approved', label: 'Approved', count: approvedCount, statusCode: 'SC_APPROVED', color: 'success' },
      ];

      // Aging calculation
      const now = new Date();
      let waitingOver5Days = 0;
      for (const inv of awaitingReviewInvoices) {
        const subDate = new Date(inv.submitted_at || inv.created_at);
        const diffDays = Math.floor((now.getTime() - subDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays >= 5) {
          waitingOver5Days++;
        }
      }

      const alerts: SupplyChainAlertItem[] = [
        {
          id: 'waiting-5-days',
          label: `${waitingOver5Days} invoice${waitingOver5Days === 1 ? '' : 's'} waiting > 5 days`,
          count: waitingOver5Days,
          type: 'aging',
        },
        {
          id: 'returned-corrections',
          label: `${returnedCount} invoice${returnedCount === 1 ? '' : 's'} returned for correction`,
          count: returnedCount,
          type: 'overdue',
        },
        {
          id: 'awaiting-review',
          label: `${awaitingReviewInvoices.length} invoice${awaitingReviewInvoices.length === 1 ? '' : 's'} awaiting review`,
          count: awaitingReviewInvoices.length,
          type: 'aging',
        },
      ];

      // Review Queue Table
      const reviewQueue: InvoiceRequiringReviewItem[] = awaitingReviewInvoices.slice(0, 5).map((inv) => {
        const subDateStr = inv.submitted_at || inv.created_at;
        const subDate = new Date(subDateStr);
        const waitingDays = Math.max(0, Math.floor((now.getTime() - subDate.getTime()) / (1000 * 3600 * 24)));

        const supplier = Array.isArray(inv.suppliers) ? inv.suppliers[0] : inv.suppliers;
        const cert = Array.isArray(inv.certificates) ? inv.certificates[0] : inv.certificates;
        const po = Array.isArray(cert?.purchase_orders) ? cert?.purchase_orders[0] : cert?.purchase_orders;

        return {
          id: inv.id,
          invoiceNumber: inv.clms_reference || inv.supplier_invoice_number,
          supplierName: supplier?.name || '—',
          poNumber: po?.po_number || '—',
          amount: Number(inv.amount) || 0,
          currency: inv.currency || 'TZS',
          submittedAt: new Date(subDateStr).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
          waitingDays,
        };
      });

      return {
        metrics: {
          totalPOsCount,
          invoicesAwaitingReviewCount: awaitingReviewInvoices.length,
          returnedForCorrectionCount: returnedCount,
          approvedToFinanceCount: approvedCount,
        },
        pipeline,
        alerts,
        reviewQueue,
      };
    } catch (err) {
      console.error('SupplyChainDashboardRepository error:', err);
      return {
        metrics: {
          totalPOsCount: 0,
          invoicesAwaitingReviewCount: 0,
          returnedForCorrectionCount: 0,
          approvedToFinanceCount: 0,
        },
        pipeline: [],
        alerts: [],
        reviewQueue: [],
      };
    }
  }
}

export const supplyChainDashboardRepository = new SupplyChainDashboardRepository();
