// ==============================================================================
// CLMS Finance Repository & Payment Ledger Operations
// ==============================================================================

import { supabase } from '../supabase/client';
import { AgingEngine, AgingBucket } from '@/domain/finance/AgingEngine';

export interface FinanceQueueItem {
  id: string;
  clmsRef: string;
  supplierInvoiceNo: string;
  supplierId: string;
  supplierName: string;
  poNumber: string;
  currency: string;
  totalPayable: number;
  cumulativePaid: number;
  outstandingBalance: number;
  invoiceDate: string;
  scApprovedAt?: string | undefined;
  paymentTermsDays: number;
  dueDate: string;
  daysOverdue: number;
  agingBucket: AgingBucket;
  status: string;
}

export interface PaymentTransactionRecord {
  id: string;
  invoiceId: string;
  referenceNumber: string;
  paymentDate: string;
  amount: number;
  currency: string;
  fundingSource: string;
  evidenceDocId?: string | undefined;
  createdBy: string;
  createdByName?: string | undefined;
  createdAt: string;
}

export interface PostPaymentInput {
  invoiceId: string;
  referenceNumber: string;
  paymentDate: string;
  amount: number;
  fundingSource: string;
  evidenceDocId?: string | undefined;
}

export interface FinanceAgingSummary {
  totalPayable: number;
  cumulativePaid: number;
  totalOutstanding: number;
  currency: string;
  currentNotDue: number;
  aging1to30: number;
  aging31to60: number;
  aging61to90: number;
  agingOver90: number;
  settledCount: number;
}

export class FinanceRepository {
  /**
   * Retrieves invoices in Finance processing queue with real-time aging evaluation.
   */
  public async getFinanceQueue(filter?: {
    status?: string | undefined;
    agingBucket?: string | undefined;
  }): Promise<FinanceQueueItem[]> {
    try {
      // 1. Try querying view_finance_invoice_aging
      const { data: viewData, error: viewError } = await supabase
        .from('view_finance_invoice_aging')
        .select('*');

      if (!viewError && viewData) {
        type ViewAgingRow = {
          invoice_id: string;
          clms_reference: string;
          supplier_invoice_number: string;
          supplier_id: string;
          supplier_name: string;
          po_number: string;
          currency: string;
          total_payable: number | string;
          cumulative_paid: number | string;
          outstanding_balance: number | string;
          invoice_date: string;
          sc_approved_at?: string;
          payment_terms_days: number | string;
          due_date: string;
          days_overdue: number | string;
          aging_bucket: string;
          status: string;
        };

        const results: FinanceQueueItem[] = (viewData as ViewAgingRow[]).map((row) => ({
          id: row.invoice_id,
          clmsRef: row.clms_reference,
          supplierInvoiceNo: row.supplier_invoice_number,
          supplierId: row.supplier_id,
          supplierName: row.supplier_name,
          poNumber: row.po_number,
          currency: row.currency || 'TZS',
          totalPayable: Number(row.total_payable) || 0,
          cumulativePaid: Number(row.cumulative_paid) || 0,
          outstandingBalance: Number(row.outstanding_balance) || 0,
          invoiceDate: row.invoice_date,
          scApprovedAt: row.sc_approved_at ?? undefined,
          paymentTermsDays: Number(row.payment_terms_days) || 30,
          dueDate: row.due_date,
          daysOverdue: Number(row.days_overdue) || 0,
          agingBucket: row.aging_bucket as AgingBucket,
          status: row.status,
        }));

        return this.applyFilter(results, filter);
      }

      // 2. Fallback: Query invoices joined with purchase_orders and payment_transactions
      return await this.getFinanceQueueFallback(filter);
    } catch (err: unknown) {
      console.warn('getFinanceQueue exception:', err);
      return [];
    }
  }

  private applyFilter(
    items: FinanceQueueItem[],
    filter?: { status?: string | undefined; agingBucket?: string | undefined }
  ): FinanceQueueItem[] {
    let filtered = items;
    if (filter?.status) {
      filtered = filtered.filter((i) => i.status === filter.status);
    }
    if (filter?.agingBucket && filter.agingBucket !== 'ALL') {
      filtered = filtered.filter((i) => i.agingBucket === filter.agingBucket);
    }
    return filtered;
  }

  private async getFinanceQueueFallback(filter?: {
    status?: string | undefined;
    agingBucket?: string | undefined;
  }): Promise<FinanceQueueItem[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        id,
        clms_reference,
        supplier_invoice_number,
        amount,
        tax_amount,
        currency,
        status,
        invoice_date,
        sc_approved_at,
        supplier_id,
        suppliers ( id, name ),
        certificates!inner (
          id,
          purchase_orders!inner (
            id,
            po_number,
            payment_terms_days
          )
        ),
        payment_transactions (
          id,
          amount
        )
      `)
      .in('status', ['SC_APPROVED', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT', 'PARTIALLY_PAID', 'SETTLED'])
      .order('sc_approved_at', { ascending: false });

    if (error || !data) {
      console.warn('Fallback finance query error:', error?.message);
      return [];
    }

    type InvoiceRow = {
      id: string;
      clms_reference: string;
      supplier_invoice_number?: string;
      amount: number | string;
      tax_amount: number | string;
      currency: string;
      status: string;
      invoice_date: string;
      sc_approved_at?: string;
      supplier_id: string;
      suppliers?: { id: string; name: string };
      certificates?: {
        id: string;
        purchase_orders?: {
          id: string;
          po_number: string;
          payment_terms_days?: number;
        };
      };
      payment_transactions?: Array<{ id: string; amount: number | string }>;
    };

    const items: FinanceQueueItem[] = (data as unknown as InvoiceRow[]).map((row) => {
      const base = Number(row.amount) || 0;
      const tax = Number(row.tax_amount) || 0;
      const totalPayable = base + tax;

      const payments = row.payment_transactions || [];
      const cumulativePaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const outstanding = Math.max(0, totalPayable - cumulativePaid);

      const termsDays = row.certificates?.purchase_orders?.payment_terms_days || 30;
      const baselineDate = row.sc_approved_at || row.invoice_date || new Date().toISOString();

      const aging = AgingEngine.evaluateAging({
        baselineDate,
        paymentTermsDays: termsDays,
        outstandingBalance: outstanding,
      });

      return {
        id: row.id,
        clmsRef: row.clms_reference,
        supplierInvoiceNo: row.supplier_invoice_number || '—',
        supplierId: row.supplier_id,
        supplierName: row.suppliers?.name || 'Authorized Supplier',
        poNumber: row.certificates?.purchase_orders?.po_number || '—',
        currency: row.currency || 'TZS',
        totalPayable,
        cumulativePaid,
        outstandingBalance: outstanding,
        invoiceDate: row.invoice_date,
        scApprovedAt: row.sc_approved_at ?? undefined,
        paymentTermsDays: termsDays,
        dueDate: aging.dueDate,
        daysOverdue: aging.daysOverdue,
        agingBucket: aging.agingBucket,
        status: row.status,
      };
    });

    return this.applyFilter(items, filter);
  }

  /**
   * Posts an immutable payment transaction against an invoice.
   * Concurrency-safe: Wrapped in atomic PostgreSQL RPC with row locks.
   */
  public async postPayment(
    input: PostPaymentInput
  ): Promise<{ success: boolean; paymentId?: string; outstanding?: number; status?: string; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const createdBy = user?.id;

      // Attempt atomic PostgreSQL RPC post_invoice_payment
      const { data, error } = await supabase.rpc('post_invoice_payment', {
        p_invoice_id: input.invoiceId,
        p_reference_number: input.referenceNumber,
        p_payment_date: input.paymentDate,
        p_amount: input.amount,
        p_funding_source: input.fundingSource,
        p_evidence_doc_id: input.evidenceDocId ?? null,
        p_created_by: createdBy ?? null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.success) {
        return {
          success: true,
          paymentId: data.payment_id,
          outstanding: data.outstanding,
          status: data.status,
        };
      }

      return { success: false, error: 'Payment posting failed: unexpected response from database.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error posting payment transaction';
      return { success: false, error: msg };
    }
  }

  /**
   * Retrieves payment transaction history for an invoice.
   */
  public async getInvoicePaymentHistory(invoiceId: string): Promise<PaymentTransactionRecord[]> {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select(`
          id,
          invoice_id,
          reference_number,
          payment_date,
          amount,
          currency,
          funding_source,
          evidence_doc_id,
          created_by,
          created_at,
          users ( name )
        `)
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false });

      if (error) {
        console.warn('Error fetching invoice payment history:', error.message);
        return [];
      }

      type PaymentRow = {
        id: string;
        invoice_id: string;
        reference_number: string;
        payment_date: string;
        amount: number | string;
        currency: string;
        funding_source: string;
        evidence_doc_id?: string;
        created_by: string;
        created_at: string;
        users?: { name: string };
      };

      return (data || []).map((rowRecord: unknown) => {
        const row = rowRecord as PaymentRow;
        return {
          id: row.id,
          invoiceId: row.invoice_id,
          referenceNumber: row.reference_number,
          paymentDate: row.payment_date,
          amount: Number(row.amount) || 0,
          currency: row.currency || 'TZS',
          fundingSource: row.funding_source,
          evidenceDocId: row.evidence_doc_id ?? undefined,
          createdBy: row.created_by,
          createdByName: row.users?.name ?? undefined,
          createdAt: row.created_at,
        };
      });
    } catch (err: unknown) {
      console.warn('getInvoicePaymentHistory exception:', err);
      return [];
    }
  }

  /**
   * Calculates overall aging and financial liability aggregates.
   */
  public async getFinanceAgingSummary(): Promise<FinanceAgingSummary> {
    const queue = await this.getFinanceQueue();

    let totalPayable = 0;
    let cumulativePaid = 0;
    let totalOutstanding = 0;
    let currentNotDue = 0;
    let aging1to30 = 0;
    let aging31to60 = 0;
    let aging61to90 = 0;
    let agingOver90 = 0;
    let settledCount = 0;

    for (const item of queue) {
      totalPayable += item.totalPayable;
      cumulativePaid += item.cumulativePaid;
      totalOutstanding += item.outstandingBalance;

      if (item.status === 'SETTLED' || item.outstandingBalance <= 0) {
        settledCount++;
      } else {
        switch (item.agingBucket) {
          case 'CURRENT_NOT_DUE':
            currentNotDue += item.outstandingBalance;
            break;
          case 'AGING_1_30':
            aging1to30 += item.outstandingBalance;
            break;
          case 'AGING_31_60':
            aging31to60 += item.outstandingBalance;
            break;
          case 'AGING_61_90':
            aging61to90 += item.outstandingBalance;
            break;
          case 'AGING_OVER_90':
            agingOver90 += item.outstandingBalance;
            break;
        }
      }
    }

    return {
      totalPayable,
      cumulativePaid,
      totalOutstanding,
      currency: 'TZS',
      currentNotDue,
      aging1to30,
      aging31to60,
      aging61to90,
      agingOver90,
      settledCount,
    };
  }
}

export const financeRepository = new FinanceRepository();
