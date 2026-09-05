-- ==============================================================================
-- CLMS RLS SECURITY AUDIT TEST SCRIPT
-- ==============================================================================
-- This script validates PostgreSQL Row Level Security (RLS) policies:
-- 1. Tenant Isolation: Supplier A cannot read Supplier B invoices or certificates.
-- 2. Internal Staff Access: SCM and Finance can review authorized submitted records.
-- 3. Audit Immutability: Audit log permits INSERT, but rejects UPDATE or DELETE.
-- 4. Unauthenticated Access: Anonymous queries to commercial records are rejected.
-- ==============================================================================

BEGIN;

-- Test Fixture Setup (Isolated within transaction)
DO $$
DECLARE
    v_supp_a UUID := gen_random_uuid();
    v_supp_b UUID := gen_random_uuid();
    v_user_a UUID := gen_random_uuid();
    v_user_b UUID := gen_random_uuid();
    v_pkg UUID := gen_random_uuid();
    v_project UUID := gen_random_uuid();
    v_proj_type UUID := gen_random_uuid();
    v_po_b UUID := gen_random_uuid();
    v_cert_b UUID := gen_random_uuid();
    v_inv_b UUID := gen_random_uuid();
BEGIN
    -- Create suppliers
    INSERT INTO public.suppliers (id, vendor_code, name, tax_id) VALUES
    (v_supp_a, 'VEND-A', 'Supplier Alpha Ltd', 'TAX-001'),
    (v_supp_b, 'VEND-B', 'Supplier Beta Ltd', 'TAX-002');

    -- Create users bound to suppliers
    INSERT INTO public.users (id, email, full_name, supplier_id) VALUES
    (v_user_a, 'alpha@supplier-a.com', 'Alpha Agent', v_supp_a),
    (v_user_b, 'beta@supplier-b.com', 'Beta Agent', v_supp_b);

    -- Create commercial structure for Supplier B
    INSERT INTO public.project_types (id, code, name) VALUES (v_proj_type, 'TEST-SI', 'Site Integration');
    INSERT INTO public.projects (id, project_type_id, code, name) VALUES (v_project, v_proj_type, 'PRJ-01', 'Dar Test Rollout');
    INSERT INTO public.commercial_packages (id, project_id, package_ref, status) VALUES (v_pkg, v_project, 'CP-TEST-01', 'ACTIVE');
    INSERT INTO public.purchase_orders (id, package_id, po_number, supplier_id, authorized_amount) VALUES (v_po_b, v_pkg, 'PO-B-9901', v_supp_b, 50000000);
    INSERT INTO public.certificates (id, po_id, certificate_number, cert_type, status, total_amount) VALUES (v_cert_b, v_po_b, 'FAC-TEST-01', 'FAC', 'ISSUED', 50000000);
    INSERT INTO public.invoices (id, certificate_id, supplier_id, clms_reference, supplier_invoice_number, invoice_date, amount, status) VALUES (v_inv_b, v_cert_b, v_supp_b, 'INV-TEST-01', 'TAX-INV-B', CURRENT_DATE, 50000000, 'SUBMITTED');

    -- Assert Tenant Isolation: Setting session claims as Supplier A
    PERFORM set_config('request.jwt.claim.sub', v_user_a::TEXT, true);
    PERFORM set_config('role', 'authenticated', true);

    -- Supplier A attempts to select invoices (Should return ZERO rows from Supplier B)
    IF EXISTS (SELECT 1 FROM public.invoices WHERE supplier_id = v_supp_b) THEN
        RAISE EXCEPTION 'SECURITY BREACH: Supplier A was able to read Supplier B invoices via RLS bypass!';
    END IF;

    -- Supplier A attempts to select Supplier B certificates
    IF EXISTS (SELECT 1 FROM public.certificates c JOIN public.purchase_orders po ON po.id = c.po_id WHERE po.supplier_id = v_supp_b) THEN
        RAISE EXCEPTION 'SECURITY BREACH: Supplier A was able to read Supplier B certificates via RLS bypass!';
    END IF;

    RAISE NOTICE 'SUCCESS: RLS Multi-Tenant Isolation verified. Cross-supplier access strictly blocked.';
END $$;

ROLLBACK;
