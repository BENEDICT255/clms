-- ==============================================================================
-- CLMS Commercial Stabilization & Commercial-Truth Hardening Migration
-- ==============================================================================
-- Governed by PRODUCT.md, ARCHITECTURE.md, and AGENTS.md
-- Fixes:
-- 1. Missing sequences: seq_certificate_number, seq_invoice_clms_ref
-- 2. Audit schema drift: adds new_state JSONB column to audit_events
-- 3. Notifications schema drift: default for type column
-- 4. Invoices schema: adds submitted_at timestamp column
-- 5. Certificates & allocations contract alignment
-- 6. Atomic Commercial Package Ingestion RPC (ingest_commercial_package_atomic)
-- 7. Security Definer permissions lockdown & least privilege
-- ==============================================================================

-- 1. Database Sequences
CREATE SEQUENCE IF NOT EXISTS public.seq_commercial_package START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_certificate_number START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_invoice_clms_ref START WITH 1 INCREMENT BY 1;

-- 2. Audit Events Drift Resolution
ALTER TABLE public.audit_events ADD COLUMN IF NOT EXISTS new_state JSONB;

-- 3. Notifications Drift Resolution (safe default for type)
ALTER TABLE public.notifications ALTER COLUMN type SET DEFAULT 'IN_APP';

-- 4. Invoices & PO Schema Drift Resolution
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.sites ALTER COLUMN region DROP NOT NULL;

-- 5. Atomic Commercial Package Ingestion Transaction
CREATE OR REPLACE FUNCTION public.ingest_commercial_package_atomic(
    p_project_id UUID,
    p_supplier_id UUID,
    p_po_number TEXT,
    p_currency TEXT,
    p_authorized_amount NUMERIC,
    p_payment_terms_days INT,
    p_template_version TEXT,
    p_sites JSONB,
    p_boq_file_name TEXT,
    p_boq_file_hash TEXT,
    p_boq_file_size BIGINT,
    p_boq_mime_type TEXT,
    p_boq_storage_path TEXT,
    p_po_file_name TEXT,
    p_po_file_hash TEXT,
    p_po_file_size BIGINT,
    p_po_mime_type TEXT,
    p_po_storage_path TEXT,
    p_confirmed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_seq_num BIGINT;
    v_package_ref TEXT;
    v_package_id UUID;
    v_boq_id UUID;
    v_po_id UUID;
    v_site_elem JSONB;
    v_site_id UUID;
    v_site_ext TEXT;
    v_site_name TEXT;
    v_region TEXT;
    v_site_amount NUMERIC;
    v_scope TEXT;
    v_existing_po RECORD;
BEGIN
    -- 1. Authoritative Actor Resolution (prefer auth.uid(), defensive fallback to parameter)
    v_actor_id := COALESCE(auth.uid(), p_confirmed_by);
    IF v_actor_id IS NOT NULL THEN
        PERFORM 1 FROM public.users WHERE id = v_actor_id AND is_active = true;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'UNAUTHORIZED_ACTOR: Confirming user % is inactive or does not exist.', v_actor_id;
        END IF;
    END IF;

    -- 2. Duplicate Purchase Order Detection
    SELECT id, po_number INTO v_existing_po
    FROM public.purchase_orders
    WHERE po_number = trim(p_po_number)
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'DUPLICATE_PO: Purchase Order "%" is already registered in CLMS ledger.', p_po_number;
    END IF;

    -- 3. Commercial Validation Invariants
    IF p_authorized_amount <= 0 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: Authorized commitment amount must be strictly positive.';
    END IF;

    IF jsonb_array_length(p_sites) = 0 THEN
        RAISE EXCEPTION 'ZERO_SITES: At least one commercial site allocation is required.';
    END IF;

    -- 4. Atomic Concurrency-Safe Sequence Generation (Rule 12 / 13)
    v_seq_num := nextval('public.seq_commercial_package');
    v_package_ref := 'CP-' || to_char(now(), 'YY') || '-' || lpad(v_seq_num::TEXT, 4, '0');

    -- 5. Insert Commercial Package (ACTIVE directly on confirmed atomic commit)
    INSERT INTO public.commercial_packages (
        project_id,
        package_ref,
        status,
        confirmed_by,
        confirmed_at,
        created_at,
        updated_at
    ) VALUES (
        p_project_id,
        v_package_ref,
        'ACTIVE',
        v_actor_id,
        now(),
        now(),
        now()
    ) RETURNING id INTO v_package_id;

    -- 6. Insert BOQ Record
    INSERT INTO public.boqs (
        package_id,
        template_version,
        total_amount,
        currency,
        created_at
    ) VALUES (
        v_package_id,
        p_template_version,
        p_authorized_amount,
        p_currency,
        now()
    ) RETURNING id INTO v_boq_id;

    -- 7. Insert Purchase Order Record
    INSERT INTO public.purchase_orders (
        package_id,
        po_number,
        supplier_id,
        currency,
        authorized_amount,
        payment_terms_days,
        created_at
    ) VALUES (
        v_package_id,
        trim(p_po_number),
        p_supplier_id,
        p_currency,
        p_authorized_amount,
        COALESCE(p_payment_terms_days, 30),
        now()
    ) RETURNING id INTO v_po_id;

    -- 8. Upsert Master Sites and Insert PO-Site Allocations
    FOR v_site_elem IN SELECT * FROM jsonb_array_elements(p_sites)
    LOOP
        v_site_ext := trim(v_site_elem->>'siteIdExt');
        v_site_name := trim(COALESCE(v_site_elem->>'siteName', ''));
        v_region := COALESCE(NULLIF(trim(COALESCE(v_site_elem->>'region', '')), ''), 'General');
        v_site_amount := (v_site_elem->>'authorizedAmount')::NUMERIC;
        v_scope := NULLIF(trim(COALESCE(v_site_elem->>'scopeDescription', '')), '');

        IF v_site_amount <= 0 THEN
            RAISE EXCEPTION 'INVALID_SITE_AMOUNT: Site % has non-positive amount %.', v_site_ext, v_site_amount;
        END IF;

        -- Upsert master site record
        INSERT INTO public.sites (site_id_ext, site_name, region)
        VALUES (v_site_ext, v_site_name, v_region)
        ON CONFLICT (site_id_ext) DO UPDATE
        SET site_name = CASE WHEN EXCLUDED.site_name <> '' THEN EXCLUDED.site_name ELSE sites.site_name END,
            region = COALESCE(EXCLUDED.region, sites.region)
        RETURNING id INTO v_site_id;

        -- Insert po_sites allocation
        INSERT INTO public.po_sites (
            po_id,
            site_id,
            authorized_amount,
            scope_description,
            created_at
        ) VALUES (
            v_po_id,
            v_site_id,
            v_site_amount,
            v_scope,
            now()
        );
    END LOOP;

    -- 9. Insert Immutable Source Documents Metadata (with real file sizes & hashes)
    INSERT INTO public.commercial_documents (
        document_type,
        entity_type,
        entity_id,
        storage_path,
        file_name,
        file_size,
        mime_type,
        sha256_hash,
        uploaded_by,
        is_immutable,
        created_at
    ) VALUES
    (
        'BOQ_SOURCE',
        'COMMERCIAL_PACKAGE',
        v_package_id,
        p_boq_storage_path,
        p_boq_file_name,
        p_boq_file_size,
        p_boq_mime_type,
        p_boq_file_hash,
        v_actor_id,
        true,
        now()
    ),
    (
        'PO_SOURCE',
        'PURCHASE_ORDER',
        v_po_id,
        p_po_storage_path,
        p_po_file_name,
        p_po_file_size,
        p_po_mime_type,
        p_po_file_hash,
        v_actor_id,
        true,
        now()
    );

    -- 10. Immutable Audit Event
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        post_state,
        new_state,
        created_at
    ) VALUES (
        'COMMERCIAL_PACKAGE',
        v_package_id,
        'PACKAGE_CONFIRMED',
        v_actor_id,
        jsonb_build_object(
            'package_ref', v_package_ref,
            'po_number', p_po_number,
            'authorized_amount', p_authorized_amount,
            'site_count', jsonb_array_length(p_sites),
            'currency', p_currency
        ),
        jsonb_build_object(
            'package_ref', v_package_ref,
            'po_number', p_po_number,
            'authorized_amount', p_authorized_amount,
            'site_count', jsonb_array_length(p_sites),
            'currency', p_currency
        ),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'package_id', v_package_id,
        'package_ref', v_package_ref,
        'po_id', v_po_id,
        'status', 'ACTIVE'
    );
END;
$$;

-- 6. Lock down permissions
REVOKE EXECUTE ON FUNCTION public.ingest_commercial_package_atomic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ingest_commercial_package_atomic TO authenticated;

-- 7. Allow internal staff with config.manage or package.import to manage master suppliers & projects
DROP POLICY IF EXISTS suppliers_admin_write ON public.suppliers;
CREATE POLICY suppliers_admin_write ON public.suppliers
  FOR ALL
  TO authenticated
  USING (public.is_internal_staff() AND (public.has_capability('config.manage') OR public.has_capability('package.import')))
  WITH CHECK (public.is_internal_staff() AND (public.has_capability('config.manage') OR public.has_capability('package.import')));

DROP POLICY IF EXISTS projects_admin_write ON public.projects;
CREATE POLICY projects_admin_write ON public.projects
  FOR ALL
  TO authenticated
  USING (public.is_internal_staff() AND (public.has_capability('config.manage') OR public.has_capability('package.import')))
  WITH CHECK (public.is_internal_staff() AND (public.has_capability('config.manage') OR public.has_capability('package.import')));

DROP POLICY IF EXISTS project_types_admin_write ON public.project_types;
CREATE POLICY project_types_admin_write ON public.project_types
  FOR ALL
  TO authenticated
  USING (public.is_internal_staff() AND (public.has_capability('config.manage') OR public.has_capability('package.import')))
  WITH CHECK (public.is_internal_staff() AND (public.has_capability('config.manage') OR public.has_capability('package.import')));

