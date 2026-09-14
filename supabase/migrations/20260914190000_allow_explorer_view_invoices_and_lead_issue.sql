-- ==============================================================================
-- CLMS Migration: Allow Explorer/Lineage View for Invoices and Payments + Project Lead Certificate Issue
-- ==============================================================================
-- Governed by PRODUCT.md and AGENTS.md:
-- 1. Permits internal staff with 'explorer.view' or 'certificate.approve.lead'
--    to read invoices and payment transactions for commercial lineage / PO Lifecycle.
-- 2. Grants 'certificate.issue' and 'certificate.approve.hop' capabilities to
--    the PROJECT_LEAD role and assigns HEAD_OF_PROJECTS to projects@heliosclms.com.
-- ==============================================================================

-- 1. Update invoices_select RLS policy
DROP POLICY IF EXISTS invoices_select ON public.invoices;

CREATE POLICY invoices_select ON public.invoices FOR SELECT TO authenticated
USING (
    (public.get_user_supplier_id() IS NOT NULL AND supplier_id = public.get_user_supplier_id())
    OR (public.is_internal_staff() AND public.has_capability('invoice.review.sc'))
    OR (public.is_internal_staff() AND public.has_capability('finance.process'))
    OR (public.is_internal_staff() AND public.has_capability('report.view.executive'))
    OR (public.is_internal_staff() AND public.has_capability('explorer.view'))
    OR (public.is_internal_staff() AND public.has_capability('certificate.approve.lead'))
);

-- 2. Update payments_read RLS policy
DROP POLICY IF EXISTS payments_read ON public.payment_transactions;

CREATE POLICY payments_read ON public.payment_transactions FOR SELECT TO authenticated
USING (
    public.has_capability('finance.process')
    OR public.has_capability('report.view.executive')
    OR (public.is_internal_staff() AND public.has_capability('explorer.view'))
    OR (public.is_internal_staff() AND public.has_capability('certificate.approve.lead'))
    OR invoice_id IN (SELECT id FROM public.invoices)
);

-- 3. Grant certificate.issue and certificate.approve.hop to PROJECT_LEAD
INSERT INTO public.role_capabilities (role_id, capability_id)
SELECT r.id, c.id
FROM public.roles r
CROSS JOIN public.capabilities c
WHERE r.code = 'PROJECT_LEAD'
  AND c.code IN ('certificate.issue', 'certificate.approve.hop')
ON CONFLICT DO NOTHING;

-- 4. Assign HEAD_OF_PROJECTS role to projects@heliosclms.com user
INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT u.id, r.id
FROM public.users u
CROSS JOIN public.roles r
WHERE u.email = 'projects@heliosclms.com'
  AND r.code = 'HEAD_OF_PROJECTS'
ON CONFLICT DO NOTHING;
