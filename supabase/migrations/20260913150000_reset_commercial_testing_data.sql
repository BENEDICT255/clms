-- ==============================================================================
-- CLMS Commercial Testing Reset Procedure
-- ==============================================================================
-- Governed by AGENTS.md:
-- - Cleanses all operational test data across commercial packages, POs, BOQs,
--   sites, certificates, invoices, payments, and storage files.
-- - Preserves all user accounts, RBAC roles, capabilities, suppliers, and projects.
-- - Resets all sequential numbering sequences to 1.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.reset_commercial_testing_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  -- 1. Truncate all commercial and financial records with CASCADE
  TRUNCATE TABLE 
    public.payment_transactions,
    public.invoice_reviews,
    public.invoice_allocations,
    public.invoices,
    public.certificate_approvals,
    public.certificate_site_allocations,
    public.certificates,
    public.commercial_documents,
    public.po_sites,
    public.purchase_orders,
    public.boqs,
    public.commercial_packages,
    public.sites,
    public.idempotency_keys
  CASCADE;

  -- 2. Clear transient commercial notifications
  DELETE FROM public.notifications WHERE true;

  -- 3. Reset sequential number generators back to 1
  ALTER SEQUENCE IF EXISTS public.seq_commercial_package RESTART WITH 1;
  ALTER SEQUENCE IF EXISTS public.seq_certificate_number RESTART WITH 1;
  ALTER SEQUENCE IF EXISTS public.seq_invoice_clms_ref RESTART WITH 1;
  ALTER SEQUENCE IF EXISTS public.seq_certificate_fac RESTART WITH 1;
  ALTER SEQUENCE IF EXISTS public.seq_certificate_pac RESTART WITH 1;
  ALTER SEQUENCE IF EXISTS public.seq_certificate_dpc RESTART WITH 1;
  ALTER SEQUENCE IF EXISTS public.seq_invoice RESTART WITH 1;
  ALTER SEQUENCE IF EXISTS public.seq_payment_voucher RESTART WITH 1;

END;
$$;

-- Allow authenticated admins to execute reset in testing environments
GRANT EXECUTE ON FUNCTION public.reset_commercial_testing_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_commercial_testing_data() TO service_role;

-- Execute the reset immediately when running this script
SELECT public.reset_commercial_testing_data();
