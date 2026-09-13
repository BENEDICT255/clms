// ==============================================================================
// CLMS Supplier Dashboard Repository & Aggregations
// ==============================================================================
// Governed by PRODUCT.md, ARCHITECTURE.md, and AGENTS.md.
// Enforces tenant isolation: Supplier A only accesses Supplier A records.
// Zero fabricated data.
// ==============================================================================

import { supabase } from '@/infrastructure/supabase/client';

export interface SupplierDashboardMetrics {
  activePOsCount: number;
  certificatesIssuedCount: number;
  awaitingInvoiceCount: number;
  invoicesSubmittedCount: number;
}

export interface SupplierInvoicePipelineItem {
  id: string;
  label: string;
  count: number;
  statusCode: string;
  color?: 'brand' | 'neutral' | 'success' | 'danger' | 'warning';
}

export interface SupplierAttentionItem {
  id: string;
  label: string;
  count: number;
  type: 'ready_to_invoice' | 'returned' | 'draft_incomplete' | 'partially_invoiced';
}

export interface CertificateReadyToInvoiceItem {
  id: string;
  certificateNumber: string;
  poNumber: string;
  certType: string;
  amount: number;
  currency: string;
  issuedDate: string;
}

export class SupplierDashboardRepository {
  public async getDashboardData(supplierId?: string): Promise<{
    metrics: SupplierDashboardMetrics;
    pipeline: SupplierInvoicePipelineItem[];
    attentionItems: SupplierAttentionItem[];
    readyCertificates: CertificateReadyToInvoiceItem[];
  }> {
    try {
      // 1. Query POs for supplier
      let poQuery = supabase.from('purchase_orders').select('id, po_number, authorized_amount');
      if (supplierId) {
        poQuery = poQuery.eq('supplier_id', supplierId);
      }
      const { data: posData } = await poQuery;
      const pos = posData || [];

      // 2. Query Certificates with linked PO and Invoices
      let certQuery = supabase
        .from('certificates')
        .select(`
          id,
          certificate_number,
          cert_type,
          status,
          total_amount,
          currency,
          issued_at,
          created_at,
          po_id,
          purchase_orders!inner (
            id,
            po_number,
            supplier_id
          )
        `);
      if (supplierId) {
        certQuery = certQuery.eq('purchase_orders.supplier_id', supplierId);
      }
      const { data: certsData } = await certQuery;
      const certs = certsData || [];

      // 3. Query Invoices for supplier
      let invQuery = supabase
        .from('invoices')
        .select(`
          id,
          clms_reference,
          supplier_invoice_number,
          amount,
          tax_amount,
          status,
          created_at,
          submitted_at,
          certificate_id,
          supplier_id
        `);
      if (supplierId) {
        invQuery = invQuery.eq('supplier_id', supplierId);
      }
      const { data: invoicesData } = await invQuery;
      const invoices = invoicesData || [];

      // Identify invoiced certificate IDs
      const invoicedCertIds = new Set<string>();
      for (const inv of invoices) {
        if (inv.certificate_id && inv.status !== 'RETURNED') {
          invoicedCertIds.add(inv.certificate_id);
        }
      }

      // Metrics
      const activePOsCount = pos.length;
      const issuedCerts = certs.filter((c) => c.status === 'ISSUED');
      const certificatesIssuedCount = issuedCerts.length;
      const awaitingInvoiceCerts = issuedCerts.filter((c) => !invoicedCertIds.has(c.id));
      const awaitingInvoiceCount = awaitingInvoiceCerts.length;
      const submittedInvoices = invoices.filter((i) =>
        ['SUBMITTED', 'RESUBMITTED', 'SC_APPROVED', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT', 'PARTIALLY_PAID', 'SETTLED'].includes(i.status)
      );
      const invoicesSubmittedCount = submittedInvoices.length;

      // Pipeline counts
      const draftCount = invoices.filter((i) => i.status === 'DRAFT').length;
      const submittedCount = invoices.filter((i) => i.status === 'SUBMITTED').length;
      const scmReviewCount = invoices.filter((i) => i.status === 'RESUBMITTED').length;
      const financeCount = invoices.filter((i) =>
        ['SC_APPROVED', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT'].includes(i.status)
      ).length;
      const partialCount = invoices.filter((i) => i.status === 'PARTIALLY_PAID').length;
      const settledCount = invoices.filter((i) => i.status === 'SETTLED').length;

      const pipeline: SupplierInvoicePipelineItem[] = [
        { id: 'draft', label: 'Draft', count: draftCount, statusCode: 'DRAFT', color: 'neutral' },
        { id: 'submitted', label: 'Submitted', count: submittedCount, statusCode: 'SUBMITTED', color: 'brand' },
        { id: 'scm-review', label: 'Supply Chain Review', count: scmReviewCount, statusCode: 'SC_REVIEW', color: 'brand' },
        { id: 'finance', label: 'Finance', count: financeCount, statusCode: 'FINANCE', color: 'brand' },
        { id: 'partial', label: 'Partially Paid', count: partialCount, statusCode: 'PARTIALLY_PAID', color: 'warning' },
        { id: 'settled', label: 'Settled', count: settledCount, statusCode: 'SETTLED', color: 'success' },
      ];

      // Attention Items
      const returnedCount = invoices.filter((i) => i.status === 'RETURNED').length;
      const readyToInvoiceCount = awaitingInvoiceCount;
      const incompleteDraftsCount = draftCount;

      const attentionItems: SupplierAttentionItem[] = [
        {
          id: 'ready-to-invoice',
          label: `${readyToInvoiceCount} certificate${readyToInvoiceCount === 1 ? '' : 's'} ready for invoicing`,
          count: readyToInvoiceCount,
          type: 'ready_to_invoice',
        },
        {
          id: 'returned-invoices',
          label: `${returnedCount} invoice${returnedCount === 1 ? '' : 's'} returned for correction`,
          count: returnedCount,
          type: 'returned',
        },
        {
          id: 'incomplete-drafts',
          label: `${incompleteDraftsCount} draft invoice${incompleteDraftsCount === 1 ? '' : 's'} incomplete`,
          count: incompleteDraftsCount,
          type: 'draft_incomplete',
        },
      ];

      // Certificates Ready to Invoice table records
      const readyCertificates: CertificateReadyToInvoiceItem[] = awaitingInvoiceCerts.slice(0, 5).map((c) => {
        const po = Array.isArray(c.purchase_orders) ? c.purchase_orders[0] : c.purchase_orders;
        const issuedDateStr = c.issued_at || c.created_at;
        return {
          id: c.id,
          certificateNumber: c.certificate_number,
          poNumber: po?.po_number || '—',
          certType: c.cert_type,
          amount: Number(c.total_amount) || 0,
          currency: c.currency || 'TZS',
          issuedDate: issuedDateStr
            ? new Date(issuedDateStr).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '—',
        };
      });

      return {
        metrics: {
          activePOsCount,
          certificatesIssuedCount,
          awaitingInvoiceCount,
          invoicesSubmittedCount,
        },
        pipeline,
        attentionItems,
        readyCertificates,
      };
    } catch (err) {
      console.error('SupplierDashboardRepository error:', err);
      return {
        metrics: {
          activePOsCount: 0,
          certificatesIssuedCount: 0,
          awaitingInvoiceCount: 0,
          invoicesSubmittedCount: 0,
        },
        pipeline: [],
        attentionItems: [],
        readyCertificates: [],
      };
    }
  }
}

export const supplierDashboardRepository = new SupplierDashboardRepository();
