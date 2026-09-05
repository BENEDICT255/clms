// ==============================================================================
// CLMS Invoice Repository & Trusted Client Operations
// ==============================================================================

import { supabase } from '../supabase/client';
import { InvoiceStatus } from '@/domain/invoicing/InvoiceEngine';
import { auditRepository } from './AuditRepository';

export interface InvoiceRecord {
  id: string;
  clmsRef: string;
  supplierInvoiceNo: string;
  certificateId: string;
  certificateNumber: string;
  certType: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  projectName?: string | undefined;
  currency: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  submittedAt?: string | undefined;
  createdAt: string;
  returnCode?: string | undefined;
  returnReason?: string | undefined;
  supportingDocuments?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    docType: string;
    storagePath: string;
  }> | undefined;
}

export class InvoiceRepository {
  public async listInvoices(params?: {
    supplierId?: string | undefined;
    status?: string | undefined;
    certificateId?: string | undefined;
  }): Promise<InvoiceRecord[]> {
    try {
      let query = supabase
        .from('invoices')
        .select(`
          id,
          clms_ref,
          supplier_invoice_number,
          amount,
          tax_amount,
          total_amount,
          currency,
          status,
          submitted_at,
          created_at,
          certificate_id,
          certificates!inner (
            id,
            certificate_number,
            cert_type,
            purchase_orders!inner (
              id,
              po_number,
              supplier_id,
              suppliers ( id, name ),
              commercial_packages (
                projects ( id, name )
              )
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (params?.supplierId) {
        query = query.eq('certificates.purchase_orders.supplier_id', params.supplierId);
      }

      if (params?.status) {
        query = query.eq('status', params.status);
      }

      if (params?.certificateId) {
        query = query.eq('certificate_id', params.certificateId);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('Error listing invoices:', error.message);
        return [];
      }

      type InvoiceQueryRow = {
        id: string;
        clms_ref: string;
        supplier_invoice_number?: string;
        amount: number | string;
        tax_amount: number | string;
        total_amount: number | string;
        currency: string;
        status: string;
        submitted_at?: string;
        created_at: string;
        certificate_id: string;
        certificates?: {
          id: string;
          certificate_number: string;
          cert_type: string;
          purchase_orders?: {
            id: string;
            po_number: string;
            supplier_id: string;
            suppliers?: { id: string; name: string };
            commercial_packages?: { projects?: { id: string; name: string } };
          };
        };
      };

      return (data || []).map((rowRecord: unknown) => {
        const row = rowRecord as InvoiceQueryRow;
        const cert = row.certificates;
        const po = cert?.purchase_orders;
        const supplier = po?.suppliers;
        const project = po?.commercial_packages?.projects;

        return {
          id: row.id,
          clmsRef: row.clms_ref,
          supplierInvoiceNo: row.supplier_invoice_number || '—',
          certificateId: cert?.id || '',
          certificateNumber: cert?.certificate_number || '—',
          certType: cert?.cert_type || 'FAC',
          poNumber: po?.po_number || '—',
          supplierId: po?.supplier_id || '',
          supplierName: supplier?.name || '—',
          projectName: project?.name || 'Standard Project',
          currency: row.currency || 'TZS',
          amount: Number(row.amount) || 0,
          taxAmount: Number(row.tax_amount) || 0,
          totalAmount: Number(row.total_amount) || 0,
          status: row.status as InvoiceStatus,
          submittedAt: row.submitted_at,
          createdAt: row.created_at,
        };
      });
    } catch (err: unknown) {
      console.warn('listInvoices exception:', err);
      return [];
    }
  }

  public async listSubmittedInvoicesForSCM(): Promise<InvoiceRecord[]> {
    return this.listInvoices({ status: 'SUBMITTED' });
  }

  public async createInvoice(input: {
    certificateId: string;
    supplierInvoiceNo: string;
    invoiceDate: string;
    amount: number;
    taxAmount: number;
    notes?: string;
  }): Promise<{ success: boolean; invoiceId?: string; clmsRef?: string; error?: string }> {
    try {
      // 1. Try atomic PostgreSQL RPC create_invoice_from_certificate
      const { data, error } = await supabase.rpc('create_invoice_from_certificate', {
        p_certificate_id: input.certificateId,
        p_supplier_invoice_no: input.supplierInvoiceNo,
        p_amount: input.amount,
        p_tax_amount: input.taxAmount,
        p_notes: input.notes || '',
      });

      if (!error && data && data.success) {
        return {
          success: true,
          invoiceId: data.invoice_id,
          clmsRef: data.clms_ref,
        };
      }

      if (error && !error.message.includes('does not exist')) {
        return { success: false, error: error.message };
      }

      // Fallback
      return await this.createInvoiceFallback(input);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error creating invoice';
      return { success: false, error: msg };
    }
  }

  private async createInvoiceFallback(input: {
    certificateId: string;
    supplierInvoiceNo: string;
    invoiceDate: string;
    amount: number;
    taxAmount: number;
    notes?: string;
  }): Promise<{ success: boolean; invoiceId?: string; clmsRef?: string; error?: string }> {
    const clmsRef = `INV-${Date.now().toString().slice(-6)}`;
    const totalAmount = input.amount + input.taxAmount;

    const { data: inv, error } = await supabase
      .from('invoices')
      .insert({
        clms_ref: clmsRef,
        supplier_invoice_number: input.supplierInvoiceNo,
        certificate_id: input.certificateId,
        amount: input.amount,
        tax_amount: input.taxAmount,
        total_amount: totalAmount,
        currency: 'TZS',
        status: 'DRAFT',
        metadata: { invoiceDate: input.invoiceDate, notes: input.notes },
      })
      .select('id, clms_ref')
      .single();

    if (error || !inv) {
      return { success: false, error: error?.message || 'Failed to insert invoice' };
    }

    await auditRepository.recordEvent({
      action: 'INVOICE_DRAFT_CREATED',
      entityType: 'INVOICE',
      entityId: inv.id,
      metadata: { clmsRef: inv.clms_ref, amount: input.amount, totalAmount },
    });

    return {
      success: true,
      invoiceId: inv.id,
      clmsRef: inv.clms_ref,
    };
  }

  public async submitInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('submit_supplier_invoice', {
        p_invoice_id: invoiceId,
      });

      if (!error && data && data.success) {
        return { success: true };
      }

      if (error && !error.message.includes('does not exist')) {
        return { success: false, error: error.message };
      }

      // Fallback
      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('invoices')
        .update({ status: 'SUBMITTED', submitted_at: now, updated_at: now })
        .eq('id', invoiceId);

      if (updateErr) return { success: false, error: updateErr.message };

      await auditRepository.recordEvent({
        action: 'INVOICE_SUBMITTED',
        entityType: 'INVOICE',
        entityId: invoiceId,
        metadata: { submittedAt: now },
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting invoice';
      return { success: false, error: msg };
    }
  }

  public async resubmitInvoice(input: {
    invoiceId: string;
    supplierId: string;
    supplierInvoiceNo: string;
    invoiceDate: string;
    notes?: string | undefined;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase.rpc('resubmit_supplier_invoice', {
        p_invoice_id: input.invoiceId,
        p_supplier_id: input.supplierId,
        p_supplier_invoice_no: input.supplierInvoiceNo,
        p_invoice_date: input.invoiceDate,
        p_notes: input.notes ?? null,
        p_submitted_by: user?.id ?? null,
      });

      if (!error && data && data.success) {
        return { success: true };
      }

      if (error && !error.message.includes('does not exist')) {
        return { success: false, error: error.message };
      }

      // Fallback
      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from('invoices')
        .update({
          supplier_invoice_number: input.supplierInvoiceNo,
          invoice_date: input.invoiceDate,
          status: 'RESUBMITTED',
          submitted_at: now,
          updated_at: now,
        })
        .eq('id', input.invoiceId);

      if (updateErr) return { success: false, error: updateErr.message };

      await auditRepository.recordEvent({
        action: 'INVOICE_RESUBMITTED',
        entityType: 'INVOICE',
        entityId: input.invoiceId,
        metadata: {
          supplierInvoiceNo: input.supplierInvoiceNo,
          invoiceDate: input.invoiceDate,
          resubmittedAt: now,
        },
      });

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error resubmitting invoice';
      return { success: false, error: msg };
    }
  }
}

export const invoiceRepository = new InvoiceRepository();
