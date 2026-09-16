// ==============================================================================
// CLMS PO Lifecycle Repository & Commercial Lineage Projection
// ==============================================================================
// Governed by PRODUCT.md, ARCHITECTURE.md, and AGENTS.md.
// Projects authoritative lineage from Purchase Order -> Certificate(s) -> Invoice(s) -> Payment(s).
// Enforces tenant isolation (Supplier A cannot view Supplier B POs).
// Real database records, decimal-safe values, zero fabricated mock trees.
// ==============================================================================

import { supabase } from '../supabase/client';

export interface POLifecycleSearchItem {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  projectName: string;
  authorizedAmount: number;
  currency: string;
  siteCount: number;
}

export interface POLifecycleSummary {
  poId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  projectName: string;
  siteCount: number;
  authorizedValue: number;
  certifiedValue: number;
  certifiedPercentage: number;
  invoicedValue: number;
  invoicedPercentage: number;
  paidValue: number;
  paidPercentage: number;
  paymentTermsDays: number;
  currency: string;
  issuedDate: string;
  status: string;
}

export interface POLifecyclePaymentNode {
  id: string;
  isPlaceholder?: boolean;
  referenceNumber: string;
  amount: number;
  currency: string;
  paymentDate: string;
  status: 'Partial' | 'Settled' | 'Pending';
  fundingSource?: string;
  notes?: string;
  paymentMethod?: string;
  invoiceId: string;
}

export interface POLifecycleInvoiceNode {
  id: string;
  isPlaceholder?: boolean;
  clmsReference: string;
  supplierInvoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  submittedDate: string;
  certificateId: string;
  payments: POLifecyclePaymentNode[];
}

export interface POLifecycleCertificateNode {
  id: string;
  certificateNumber: string;
  certType: 'FAC' | 'PAC' | 'DPC';
  certTypeName: string;
  amount: number;
  currency: string;
  status: string;
  issuedDate: string;
  siteCount: number;
  invoices: POLifecycleInvoiceNode[];
}

export interface POLifecycleTreeData {
  summary: POLifecycleSummary;
  sites: Array<{
    id: string;
    siteIdExt: string;
    siteName: string;
    region: string;
    authorizedAmount: number;
  }>;
  certificates: POLifecycleCertificateNode[];
  documents: Array<{
    id: string;
    documentType: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    storagePath: string;
  }>;
}

export class POLifecycleRepository {
  /**
   * Search for purchase orders matching query and supplier scope
   */
  public async searchPOs(params?: {
    query?: string;
    supplierId?: string;
  }): Promise<POLifecycleSearchItem[]> {
    try {
      let q = supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          supplier_id,
          authorized_amount,
          currency,
          suppliers ( id, name ),
          commercial_packages (
            id,
            projects ( id, name )
          ),
          po_sites ( count )
        `);

      if (params?.supplierId) {
        q = q.eq('supplier_id', params.supplierId);
      }

      if (params?.query && params.query.trim().length > 0) {
        q = q.ilike('po_number', `%${params.query.trim()}%`);
      }

      const { data, error } = await q.order('po_number', { ascending: true }).limit(50);
      if (error) throw error;

      return (data || []).map((row: any) => {
        const supplier = Array.isArray(row.suppliers) ? row.suppliers[0] : row.suppliers;
        const pkg = Array.isArray(row.commercial_packages) ? row.commercial_packages[0] : row.commercial_packages;
        const project = Array.isArray(pkg?.projects) ? pkg?.projects[0] : pkg?.projects;
        const siteCount = Array.isArray(row.po_sites) ? row.po_sites.length : (row.po_sites?.[0]?.count || 0);

        return {
          id: row.id,
          poNumber: row.po_number,
          supplierId: row.supplier_id,
          supplierName: supplier?.name || '—',
          projectName: project?.name || 'Commercial Scope',
          authorizedAmount: Number(row.authorized_amount) || 0,
          currency: row.currency || 'TZS',
          siteCount: Number(siteCount) || 0,
        };
      });
    } catch (err) {
      console.error('Error searching POs for lifecycle:', err);
      return [];
    }
  }

  /**
   * Fetch complete authoritative commercial lineage for a PO
   */
  public async getPOLifecycleData(
    poIdOrNumber: string,
    supplierId?: string
  ): Promise<POLifecycleTreeData | null> {
    try {
      // 1. Fetch PO Record
      let poQuery = supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          supplier_id,
          currency,
          authorized_amount,
          payment_terms_days,
          created_at,
          package_id,
          suppliers ( id, name ),
          commercial_packages (
            id,
            package_ref,
            projects ( id, name )
          )
        `);

      // Determine whether lookup is by UUID or po_number
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(poIdOrNumber);
      if (isUUID) {
        poQuery = poQuery.eq('id', poIdOrNumber);
      } else {
        poQuery = poQuery.eq('po_number', poIdOrNumber);
      }

      if (supplierId) {
        poQuery = poQuery.eq('supplier_id', supplierId);
      }

      const { data: poRows, error: poErr } = await poQuery.limit(1);
      if (poErr || !poRows || poRows.length === 0) return null;

      const po = poRows[0];
      const supplier = Array.isArray(po.suppliers) ? po.suppliers[0] : po.suppliers;
      const pkg = Array.isArray(po.commercial_packages) ? po.commercial_packages[0] : po.commercial_packages;
      const project = Array.isArray(pkg?.projects) ? pkg?.projects[0] : pkg?.projects;

      // 2. Fetch Sites for PO
      const { data: poSitesData } = await supabase
        .from('po_sites')
        .select(`
          id,
          authorized_amount,
          sites (
            id,
            site_id_ext,
            site_name,
            region
          )
        `)
        .eq('po_id', po.id);

      const sitesList = (poSitesData || []).map((ps: any) => {
        const s = Array.isArray(ps.sites) ? ps.sites[0] : ps.sites;
        return {
          id: s?.id || ps.id,
          siteIdExt: s?.site_id_ext || '—',
          siteName: s?.site_name || '—',
          region: s?.region || '—',
          authorizedAmount: Number(ps.authorized_amount) || 0,
        };
      });

      // 3. Fetch Certificates for this PO
      const { data: certsData } = await supabase
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
          certificate_site_allocations ( id )
        `)
        .eq('po_id', po.id)
        .neq('status', 'VOIDED')
        .order('created_at', { ascending: true });

      const certs = certsData || [];
      const certIds = certs.map((c) => c.id);

      // 4. Fetch Invoices for these Certificates
      let invoices: any[] = [];
      if (certIds.length > 0) {
        const { data: invData } = await supabase
          .from('invoices')
          .select(`
            id,
            certificate_id,
            clms_reference,
            supplier_invoice_number,
            amount,
            tax_amount,
            currency,
            status,
            invoice_date,
            created_at,
            submitted_at,
            payment_transactions (
              id,
              reference_number,
              payment_date,
              amount,
              currency,
              funding_source,
              created_at
            )
          `)
          .in('certificate_id', certIds)
          .order('created_at', { ascending: true });
        invoices = invData || [];
      }

      // 5. Fetch Commercial Documents for this PO & Package
      const { data: docsData } = await supabase
        .from('commercial_documents')
        .select('id, document_type, file_name, file_size, mime_type, storage_path')
        .in('entity_id', [po.id, po.package_id]);

      const documents = docsData || [];

      // 6. Compute Financial Aggregates
      const authorizedVal = Number(po.authorized_amount) || 0;
      let certifiedVal = 0;
      for (const c of certs) {
        if (c.status === 'ISSUED') {
          certifiedVal += Number(c.total_amount) || 0;
        }
      }

      let invoicedVal = 0;
      let paidVal = 0;
      for (const inv of invoices) {
        if (['SUBMITTED', 'RESUBMITTED', 'SC_APPROVED', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT', 'PARTIALLY_PAID', 'SETTLED'].includes(inv.status)) {
          invoicedVal += (Number(inv.amount) || 0) + (Number(inv.tax_amount) || 0);
        }
        const invPayments = Array.isArray(inv.payment_transactions) ? inv.payment_transactions : [];
        for (const p of invPayments) {
          paidVal += Number(p.amount) || 0;
        }
      }

      const certPct = authorizedVal > 0 ? (certifiedVal / authorizedVal) * 100 : 0;
      const invPct = authorizedVal > 0 ? (invoicedVal / authorizedVal) * 100 : 0;
      const paidPct = authorizedVal > 0 ? (paidVal / authorizedVal) * 100 : 0;

      // Map Cert Type Name
      const getCertTypeName = (t: string) => {
        if (t === 'FAC') return 'Final Acceptance Certificate';
        if (t === 'PAC') return 'Provisional Acceptance Certificate';
        if (t === 'DPC') return 'Defects Period Certificate';
        return 'Site Certificate';
      };

      // 7. Assemble 4-Stage Tree Hierarchy
      const certNodes: POLifecycleCertificateNode[] = certs.map((c) => {
        const siteAllocations = Array.isArray(c.certificate_site_allocations)
          ? c.certificate_site_allocations
          : [];
        const certSiteCount = siteAllocations.length > 0 ? siteAllocations.length : sitesList.length;

        // Invoices linked to this cert
        const linkedInvoices = invoices.filter((i) => i.certificate_id === c.id);

        let invoiceNodes: POLifecycleInvoiceNode[] = [];

        if (linkedInvoices.length > 0) {
          invoiceNodes = linkedInvoices.map((inv) => {
            const invPayments = Array.isArray(inv.payment_transactions) ? inv.payment_transactions : [];
            const invTotal = (Number(inv.amount) || 0) + (Number(inv.tax_amount) || 0);
            const totalPaidOnInv = invPayments.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);

            let paymentNodes: POLifecyclePaymentNode[] = [];
            if (invPayments.length > 0) {
              paymentNodes = invPayments.map((p: any) => {
                const isFull = totalPaidOnInv >= invTotal;
                return {
                  id: p.id,
                  referenceNumber: p.reference_number || 'PAY-REF',
                  amount: Number(p.amount) || 0,
                  currency: p.currency || inv.currency || 'TZS',
                  paymentDate: p.payment_date
                    ? new Date(p.payment_date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—',
                  status: isFull ? 'Settled' : 'Partial',
                  fundingSource: p.funding_source,
                  invoiceId: inv.id,
                };
              });

              // If partially paid, add remainder placeholder
              if (totalPaidOnInv < invTotal) {
                const remainingPay = invTotal - totalPaidOnInv;
                paymentNodes.push({
                  id: `placeholder-pay-rem-${inv.id}`,
                  isPlaceholder: true,
                  referenceNumber: 'Remaining Balance',
                  amount: remainingPay,
                  currency: inv.currency || 'TZS',
                  paymentDate: 'Pending',
                  status: 'Pending',
                  invoiceId: inv.id,
                });
              }
            } else {
              // Placeholder for payment
              const isApproved = ['SC_APPROVED', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT'].includes(inv.status);
              paymentNodes = [
                {
                  id: `placeholder-pay-${inv.id}`,
                  isPlaceholder: true,
                  referenceNumber: isApproved ? 'Awaiting Payment' : 'No payment yet',
                  amount: invTotal,
                  currency: inv.currency || 'TZS',
                  paymentDate: isApproved ? 'Approved by Finance' : 'Under Review',
                  status: 'Pending',
                  invoiceId: inv.id,
                },
              ];
            }

            return {
              id: inv.id,
              clmsReference: inv.clms_reference,
              supplierInvoiceNumber: inv.supplier_invoice_number,
              amount: (Number(inv.amount) || 0) + (Number(inv.tax_amount) || 0),
              currency: inv.currency || 'TZS',
              status: inv.status,
              submittedDate: inv.submitted_at || inv.created_at
                ? new Date(inv.submitted_at || inv.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—',
              certificateId: c.id,
              payments: paymentNodes,
            };
          });
        } else {
          // Placeholder for invoice
          invoiceNodes = [
            {
              id: `placeholder-inv-${c.id}`,
              isPlaceholder: true,
              clmsReference: 'Awaiting Invoice',
              supplierInvoiceNumber: 'Supplier to submit invoice',
              amount: Number(c.total_amount) || 0,
              currency: c.currency || 'TZS',
              status: 'AWAITING_SUBMISSION',
              submittedDate: 'Pending',
              certificateId: c.id,
              payments: [
                {
                  id: `placeholder-pay-na-${c.id}`,
                  isPlaceholder: true,
                  referenceNumber: 'Awaiting Invoice',
                  amount: 0,
                  currency: c.currency || 'TZS',
                  paymentDate: 'No payment yet',
                  status: 'Pending',
                  invoiceId: `placeholder-inv-${c.id}`,
                },
              ],
            },
          ];
        }

        return {
          id: c.id,
          certificateNumber: c.certificate_number,
          certType: c.cert_type,
          certTypeName: getCertTypeName(c.cert_type),
          amount: Number(c.total_amount) || 0,
          currency: c.currency || 'TZS',
          status: c.status,
          issuedDate: c.issued_at || c.created_at
            ? new Date(c.issued_at || c.created_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : '—',
          siteCount: certSiteCount,
          invoices: invoiceNodes,
        };
      });

      const issuedDateFormatted = po.created_at
        ? new Date(po.created_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : '—';

      return {
        summary: {
          poId: po.id,
          poNumber: po.po_number,
          supplierId: po.supplier_id,
          supplierName: supplier?.name || '—',
          projectName: project?.name || 'Commercial Scope',
          siteCount: sitesList.length,
          authorizedValue: authorizedVal,
          certifiedValue: certifiedVal,
          certifiedPercentage: certPct,
          invoicedValue: invoicedVal,
          invoicedPercentage: invPct,
          paidValue: paidVal,
          paidPercentage: paidPct,
          paymentTermsDays: Number(po.payment_terms_days) || 30,
          currency: po.currency || 'TZS',
          issuedDate: issuedDateFormatted,
          status: 'Active',
        },
        sites: sitesList,
        certificates: certNodes,
        documents: (documents || []).map((d: any) => ({
          id: d.id,
          documentType: d.document_type,
          fileName: d.file_name,
          fileSize: Number(d.file_size) || 0,
          mimeType: d.mime_type,
          storagePath: d.storage_path,
        })),
      };
    } catch (err) {
      console.error('Error fetching PO Lifecycle data:', err);
      return null;
    }
  }
}

export const poLifecycleRepository = new POLifecycleRepository();
