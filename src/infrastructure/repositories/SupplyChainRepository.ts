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
          supplierInvoiceNo: row.supplier_invoice_number || '—',
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
   * Executes public.approve_invoice_supply_chain RPC with defensive fallback.
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

      if (!error && data && data.success) {
        return { success: true };
      }

      if (error) {
        const isRpcUnavailable =
          error.message.includes('schema cache') ||
          error.message.includes('Could not find the function') ||
          error.code === 'PGRST202' ||
          error.code === '42883';

        if (isRpcUnavailable) {
          console.warn('RPC approve_invoice_supply_chain unavailable, executing direct authorized fallback:', error.message);
          return await this.approveInvoiceDirectFallback(invoiceId, reviewerId, notes);
        }
        return { success: false, error: error.message };
      }

      return { success: false, error: 'Supply Chain approval failed: unexpected response from database.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error approving invoice';
      return { success: false, error: msg };
    }
  }

  /**
   * Defensive fallback executing identical Supply Chain approval invariants
   * when database schema cache is reloading.
   */
  private async approveInvoiceDirectFallback(
    invoiceId: string,
    reviewerId?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: inv, error: fetchErr } = await supabase
        .from('invoices')
        .select('id, status, clms_reference, supplier_invoice_number')
        .eq('id', invoiceId)
        .single();

      if (fetchErr || !inv) {
        return { success: false, error: `Invoice not found: ${fetchErr?.message || 'unknown'}` };
      }

      if (inv.status === 'SC_APPROVED') {
        return { success: true };
      }

      if (!['SUBMITTED', 'RESUBMITTED'].includes(inv.status)) {
        return { success: false, error: `Cannot approve invoice with status ${inv.status}; must be SUBMITTED or RESUBMITTED.` };
      }

      const now = new Date().toISOString();
      const { error: updErr } = await supabase
        .from('invoices')
        .update({
          status: 'SC_APPROVED',
          sc_approved_by: reviewerId ?? null,
          sc_approved_at: now,
          updated_at: now,
        })
        .eq('id', invoiceId);

      if (updErr) {
        return { success: false, error: updErr.message };
      }

      // Record in invoice_reviews history
      await supabase.from('invoice_reviews').insert({
        invoice_id: invoiceId,
        reviewer_id: reviewerId ?? null,
        decision: 'APPROVED',
        reason: notes || 'Approved by Supply Chain verification',
      });

      // Record append-only audit event
      await supabase.from('audit_events').insert({
        entity_type: 'INVOICE',
        entity_id: invoiceId,
        action: 'INVOICE_SC_APPROVED',
        actor_id: reviewerId ?? null,
        new_state: {
          clms_reference: inv.clms_reference,
          supplier_invoice_number: inv.supplier_invoice_number,
          status: 'SC_APPROVED',
          notes: notes ?? null,
        },
      });

      return { success: true };
    } catch (fallbackErr: unknown) {
      const msg = fallbackErr instanceof Error ? fallbackErr.message : 'Fallback approval failed';
      return { success: false, error: msg };
    }
  }

  /**
   * Returns an invoice to the supplier with structured reason code and comment.
   * Executes public.return_supplier_invoice RPC with defensive fallback.
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

      if (!error && data && data.success) {
        return { success: true };
      }

      if (error) {
        const isRpcUnavailable =
          error.message.includes('schema cache') ||
          error.message.includes('Could not find the function') ||
          error.code === 'PGRST202' ||
          error.code === '42883';

        if (isRpcUnavailable) {
          console.warn('RPC return_supplier_invoice unavailable, executing direct authorized fallback:', error.message);
          return await this.returnInvoiceDirectFallback(invoiceId, returnCode, reason, reviewerId);
        }
        return { success: false, error: error.message };
      }

      return { success: false, error: 'Invoice return failed: unexpected response from database.' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error returning invoice';
      return { success: false, error: msg };
    }
  }

  /**
   * Defensive fallback executing identical invoice return invariants
   * when database schema cache is reloading.
   */
  private async returnInvoiceDirectFallback(
    invoiceId: string,
    returnCode: string,
    reason: string,
    reviewerId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!reason || !reason.trim()) {
        return { success: false, error: 'A detailed explanatory reason is mandatory when returning an invoice.' };
      }

      const { data: inv, error: fetchErr } = await supabase
        .from('invoices')
        .select('id, status, clms_reference')
        .eq('id', invoiceId)
        .single();

      if (fetchErr || !inv) {
        return { success: false, error: `Invoice not found: ${fetchErr?.message || 'unknown'}` };
      }

      if (!['SUBMITTED', 'RESUBMITTED'].includes(inv.status)) {
        return { success: false, error: `Cannot return invoice with status ${inv.status}; must be SUBMITTED or RESUBMITTED.` };
      }

      const now = new Date().toISOString();
      const { error: updErr } = await supabase
        .from('invoices')
        .update({
          status: 'RETURNED',
          updated_at: now,
        })
        .eq('id', invoiceId);

      if (updErr) {
        return { success: false, error: updErr.message };
      }

      // Record in invoice_reviews history
      await supabase.from('invoice_reviews').insert({
        invoice_id: invoiceId,
        reviewer_id: reviewerId ?? null,
        decision: 'RETURNED',
        return_code: returnCode,
        reason: reason,
      });

      // Record append-only audit event
      await supabase.from('audit_events').insert({
        entity_type: 'INVOICE',
        entity_id: invoiceId,
        action: 'INVOICE_RETURNED',
        actor_id: reviewerId ?? null,
        new_state: {
          clms_reference: inv.clms_reference,
          status: 'RETURNED',
          return_code: returnCode,
          reason: reason,
        },
      });

      return { success: true };
    } catch (fallbackErr: unknown) {
      const msg = fallbackErr instanceof Error ? fallbackErr.message : 'Fallback return failed';
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
