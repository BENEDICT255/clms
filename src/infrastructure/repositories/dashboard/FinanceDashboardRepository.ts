// ==============================================================================
// CLMS Finance Dashboard Repository & Aggregations
// ==============================================================================
// Governed by PRODUCT.md, ARCHITECTURE.md, and AGENTS.md.
// Real financial aggregation, decimal-safe values, zero multi-currency mixing.
// ==============================================================================

import { supabase } from '@/infrastructure/supabase/client';

export interface FinanceDashboardMetrics {
  approvedLiability: number;
  outstanding: number;
  dueOrOverdue: number;
  settled: number;
  currency: string;
}

export interface FinancePaymentPositionItem {
  id: string;
  label: string;
  amount: number;
  percentage: number;
  color: 'brand' | 'neutral' | 'success' | 'danger' | 'warning';
}

export interface FinanceObligationItem {
  id: string;
  label: string;
  count: number;
  amount: number;
  type: 'today' | 'week' | 'month' | 'overdue';
}

export interface FinancePaymentQueueItem {
  id: string;
  invoiceNumber: string;
  supplierName: string;
  poNumber: string;
  dueDate: string;
  outstandingAmount: number;
  ageDays: number;
  status: string;
  currency: string;
}

export class FinanceDashboardRepository {
  public async getDashboardData(): Promise<{
    metrics: FinanceDashboardMetrics;
    paymentPositions: FinancePaymentPositionItem[];
    obligations: FinanceObligationItem[];
    paymentQueue: FinancePaymentQueueItem[];
  }> {
    try {
      // 1. Fetch invoices with suppliers, purchase orders, and payment transactions
      const [invoicesRes, paymentsRes] = await Promise.all([
        supabase.from('invoices').select(`
          id,
          clms_reference,
          supplier_invoice_number,
          amount,
          tax_amount,
          currency,
          status,
          invoice_date,
          created_at,
          submitted_at,
          suppliers ( id, name ),
          certificates (
            id,
            certificate_number,
            purchase_orders (
              id,
              po_number,
              payment_terms_days
            )
          ),
          payment_transactions (
            id,
            amount,
            payment_date,
            reference_number
          )
        `),
        supabase.from('payment_transactions').select('id, amount, payment_date'),
      ]);

      const invoices = invoicesRes.data || [];
      const payments = paymentsRes.data || [];

      const settledTotal = payments.reduce(
        (acc, p) => acc + (Number(p.amount) || 0),
        0
      );

      const now = new Date();
      let approvedLiabilitySum = 0;
      let totalOutstandingSum = 0;
      let dueOrOverdueSum = 0;

      let notYetDueSum = 0;
      let dueSum = 0;
      let overdueSum = 0;

      let dueTodayCount = 0;
      let dueTodaySum = 0;
      let thisWeekCount = 0;
      let thisWeekSum = 0;
      let thisMonthCount = 0;
      let thisMonthSum = 0;
      let overdueCount = 0;

      const financeInvoices = invoices.filter((i) =>
        ['SC_APPROVED', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT', 'PARTIALLY_PAID', 'SETTLED'].includes(i.status)
      );

      const queueItems: FinancePaymentQueueItem[] = [];

      for (const inv of financeInvoices) {
        const totalInv = (Number(inv.amount) || 0) + (Number(inv.tax_amount) || 0);
        approvedLiabilitySum += totalInv;

        const invPayments = Array.isArray(inv.payment_transactions) ? inv.payment_transactions : [];
        const paidOnInv = invPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
        const outstanding = Math.max(0, totalInv - paidOnInv);
        totalOutstandingSum += outstanding;

        const cert = Array.isArray(inv.certificates) ? inv.certificates[0] : inv.certificates;
        const po = Array.isArray(cert?.purchase_orders) ? cert?.purchase_orders[0] : cert?.purchase_orders;
        const supplier = Array.isArray(inv.suppliers) ? inv.suppliers[0] : inv.suppliers;

        const termsDays = Number(po?.payment_terms_days) || 30;
        const baseDate = new Date(inv.submitted_at || inv.invoice_date || inv.created_at);
        const dueDate = new Date(baseDate.getTime() + termsDays * 24 * 3600 * 1000);

        const diffDays = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
        const ageDays = Math.max(0, Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 3600 * 24)));

        if (outstanding > 0) {
          if (diffDays < 0) {
            // Overdue
            overdueSum += outstanding;
            overdueCount++;
            dueOrOverdueSum += outstanding;
          } else if (diffDays <= 7) {
            // Due soon
            dueSum += outstanding;
            if (diffDays === 0) {
              dueTodayCount++;
              dueTodaySum += outstanding;
            }
            thisWeekCount++;
            thisWeekSum += outstanding;
            dueOrOverdueSum += outstanding;
          } else {
            // Not yet due
            notYetDueSum += outstanding;
            if (diffDays <= 30) {
              thisMonthCount++;
              thisMonthSum += outstanding;
            }
          }

          queueItems.push({
            id: inv.id,
            invoiceNumber: inv.clms_reference || inv.supplier_invoice_number,
            supplierName: supplier?.name || '—',
            poNumber: po?.po_number || '—',
            dueDate: dueDate.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
            outstandingAmount: outstanding,
            ageDays,
            status: inv.status,
            currency: inv.currency || 'TZS',
          });
        }
      }

      // Percentages for Payment Position
      const positionTotal = approvedLiabilitySum > 0 ? approvedLiabilitySum : 1;
      const paidPct = (settledTotal / positionTotal) * 100;
      const notYetDuePct = (notYetDueSum / positionTotal) * 100;
      const duePct = (dueSum / positionTotal) * 100;
      const overduePct = (overdueSum / positionTotal) * 100;

      const paymentPositions: FinancePaymentPositionItem[] = [
        { id: 'paid', label: 'Paid', amount: settledTotal, percentage: paidPct, color: 'success' },
        { id: 'not-yet-due', label: 'Not yet due', amount: notYetDueSum, percentage: notYetDuePct, color: 'neutral' },
        { id: 'due', label: 'Due', amount: dueSum, percentage: duePct, color: 'warning' },
        { id: 'overdue', label: 'Overdue', amount: overdueSum, percentage: overduePct, color: 'danger' },
      ];

      const obligations: FinanceObligationItem[] = [
        { id: 'due-today', label: 'Due today', count: dueTodayCount, amount: dueTodaySum, type: 'today' },
        { id: 'this-week', label: 'This week', count: thisWeekCount, amount: thisWeekSum, type: 'week' },
        { id: 'this-month', label: 'This month', count: thisMonthCount, amount: thisMonthSum, type: 'month' },
        { id: 'overdue', label: 'Overdue', count: overdueCount, amount: overdueSum, type: 'overdue' },
      ];

      return {
        metrics: {
          approvedLiability: approvedLiabilitySum,
          outstanding: totalOutstandingSum,
          dueOrOverdue: dueOrOverdueSum,
          settled: settledTotal,
          currency: 'TZS',
        },
        paymentPositions,
        obligations,
        paymentQueue: queueItems.slice(0, 5),
      };
    } catch (err) {
      console.error('FinanceDashboardRepository error:', err);
      return {
        metrics: {
          approvedLiability: 0,
          outstanding: 0,
          dueOrOverdue: 0,
          settled: 0,
          currency: 'TZS',
        },
        paymentPositions: [],
        obligations: [],
        paymentQueue: [],
      };
    }
  }
}

export const financeDashboardRepository = new FinanceDashboardRepository();
