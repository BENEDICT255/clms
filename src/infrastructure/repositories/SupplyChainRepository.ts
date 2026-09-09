// ==============================================================================
// CLMS Supply Chain Repository & Trusted SCM Operations
// ==============================================================================

import { supabase } from '../supabase/client';
import { InvoiceRecord } from './InvoiceRepository';

export interface InvoiceReviewHistoryItem {
  id: string;
  invoiceId: string;
  reviewerId: string;
  reviewerName?: string | undefined;
  decision: 'APPROVED' | 'RETURNED';
  returnCode?: string | undefined;
  reason: string;
  createdAt: string;
}

export class SupplyChainRepository {
  /**
   * Fetches the Supply Chain review queue: all invoices in SUBMITTED or RESUBMITTED status.
   */
  public async getPendingReviewQueue(): Promise<InvoiceRecord[]> {
    try {
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
          created_at,
          submitted_at,
          certificate_id,
          supplier_id,
          suppliers ( id, name ),
          certificates!inner (
            id,
            certificate_number,
            cert_type,
            purchase_orders!inner (
              id,
              po_number,
              commercial_packages (
                projects ( id, name )
              )
            )
          )
        `)
        .in('status', ['SUBMITTED', 'RESUBMITTED'])
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error fetching SCM pending queue:', error.message);
        return [];
      }

      type ScmQueueRow = {
        id: string;
        clms_reference: string;
        supplier_invoice_number?: string;
        amount: number | string;
        tax_amount: number | string;
        currency: string;
        status: string;
        created_at: string;
        submitted_at?: string;
        certificate_id: string;
        supplier_id: string;
        suppliers?: { id: string; name: string };
        certificates?: {
          id: string;
          certificate_number: string;
          cert_type: string;
          purchase_orders?: {
            id: string;
            po_number: string;
            commercial_packages?: { projects?: { id: string; name: string } };
          };
        };
      };

      return (data || []).map((rowRecord: unknown) => {
        const row = rowRecord as ScmQueueRow;
        const cert = row.certificates;
        const po = cert?.purchase_orders;
        const supplier = row.suppliers;
        const project = po?.commercial_packages?.projects;

        const baseAmount = Number(row.amount) || 0;
        const taxAmount = Number(row.tax_amount) || 0;

        return {
          id: row.id,
          clmsRef: row.clms_reference,
          clmsReference: row.clms_reference,
          supplierInvoiceNo: row.supplier_invoice_number || '—',
          supplierInvoiceNumber: row.supplier_invoice_number || '—',
          certificateId: cert?.id || row.certificate_id,
          certificateNumber: cert?.certificate_number || '—',
          certType: cert?.cert_type || 'FAC',
          poNumber: po?.po_number || '—',
          supplierId: row.supplier_id,
          supplierName: supplier?.name || 'Authorized Supplier',
          projectName: project?.name || 'Standard Network Rollout',
          currency: row.currency || 'TZS',
          amount: baseAmount,
          taxAmount: taxAmount,
          totalAmount: baseAmount + taxAmount,
          status: row.status as InvoiceRecord['status'],
          invoiceDate: row.created_at,
          submittedAt: row.submitted_at || row.created_at,
          createdAt: row.created_at,
        };
      });
    } catch (err: unknown) {
      console.warn('getPendingReviewQueue exception:', err);
      return [];
    }
  }

  /**
   * Approves an invoice and hands it off to Finance.
   */
  public async approveInvoice(
    invoiceId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const reviewerId = user?.id;

      // Attempt atomic PostgreSQL RPC
      const { data, error } = await supabase.rpc('approve_invoice_supply_chain', {
        p_invoice_id: invoiceId,
        p_reviewer_id: reviewerId,
        p_notes: notes ?? null,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.success) {
        return { success: true };
      }

      return { success: false, error: 'Supply Chain approval failed: unexpected response from database.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error approving invoice';
      return { success: false, error: msg };
    }
  }

  /**
   * Returns an invoice to the supplier with structured reason code and comment.
   */
  public async returnInvoice(
    invoiceId: string,
    returnCode: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const reviewerId = user?.id;

      // Attempt atomic PostgreSQL RPC
      const { data, error } = await supabase.rpc('return_supplier_invoice', {
        p_invoice_id: invoiceId,
        p_reviewer_id: reviewerId,
        p_return_code: returnCode,
        p_reason: reason,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data && data.success) {
        return { success: true };
      }

      return { success: false, error: 'Invoice return failed: unexpected response from database.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error returning invoice';
      return { success: false, error: msg };
    }
  }

  /**
   * Loads the history of review decisions for a given invoice.
   */
  public async getInvoiceReviewHistory(invoiceId: string): Promise<InvoiceReviewHistoryItem[]> {
    try {
      const { data, error } = await supabase
        .from('invoice_reviews')
        .select(`
          id,
          invoice_id,
          reviewer_id,
          decision,
          return_code,
          reason,
          created_at,
          users ( name )
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Error loading invoice review history:', error.message);
        return [];
      }

      type ReviewRow = {
        id: string;
        invoice_id: string;
        reviewer_id: string;
        decision: 'APPROVED' | 'RETURNED';
        return_code?: string;
        reason: string;
        created_at: string;
        users?: { name: string };
      };

      return (data || []).map((rowRecord: unknown) => {
        const row = rowRecord as ReviewRow;
        return {
          id: row.id,
          invoiceId: row.invoice_id,
          reviewerId: row.reviewer_id,
          reviewerName: row.users?.name ?? undefined,
          decision: row.decision,
          returnCode: row.return_code ?? undefined,
          reason: row.reason,
          createdAt: row.created_at,
        };
      });
    } catch (err: unknown) {
      console.warn('getInvoiceReviewHistory exception:', err);
      return [];
    }
  }
}

export const supplyChainRepository = new SupplyChainRepository();
