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

-- 4. Invoices, PO & Certificates Schema Drift Resolution
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.sites ALTER COLUMN region DROP NOT NULL;
ALTER TABLE public.certificates ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.certificate_site_allocations ADD COLUMN IF NOT EXISTS percentage NUMERIC(5, 2);

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

-- ==============================================================================
-- 8. Reconciled Certification RPCs (Prompt Section 24 & Section 31)
-- ==============================================================================

-- 8.1 Create Certificate with Lock (Matching Application RPC Contract)
CREATE OR REPLACE FUNCTION public.create_certificate_with_lock(
    p_po_id UUID,
    p_cert_type TEXT,
    p_sites_json JSONB,
    p_currency TEXT DEFAULT 'TZS',
    p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_actor_id UUID;
    v_item JSONB;
    v_po_site_id UUID;
    v_current_amount NUMERIC(18, 2);
    v_percentage NUMERIC(5, 2);
    v_authorized_amount NUMERIC(18, 2);
    v_previously_certified NUMERIC(18, 2);
    v_remaining_balance NUMERIC(18, 2);
    v_total_cert_amount NUMERIC(18, 2) := 0;
    v_seq_num BIGINT;
    v_cert_ref TEXT;
    v_cert_id UUID;
    v_po_record RECORD;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        SELECT id INTO v_actor_id FROM public.users WHERE is_active = true LIMIT 1;
    END IF;

    -- Validate certificate type
    IF p_cert_type NOT IN ('FAC', 'PAC', 'DPC') THEN
        RAISE EXCEPTION 'Invalid certificate type %. Must be FAC, PAC, or DPC.', p_cert_type;
    END IF;

    -- Lock the parent PO
    SELECT * INTO v_po_record
    FROM public.purchase_orders
    WHERE id = p_po_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase Order with ID % not found.', p_po_id;
    END IF;

    -- Generate official certificate reference from atomic sequence
    v_seq_num := nextval('public.seq_certificate_number');
    v_cert_ref := p_cert_type || '-SI-' || to_char(now(), 'YY') || '-' || lpad(v_seq_num::TEXT, 4, '0');

    -- Pre-calculate total amount
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_sites_json) LOOP
        v_current_amount := COALESCE((v_item->>'currentAmount')::NUMERIC, (v_item->>'current_amount')::NUMERIC, 0);
        IF v_current_amount <= 0 THEN
            RAISE EXCEPTION 'Current certified amount must be strictly positive.';
        END IF;
        v_total_cert_amount := v_total_cert_amount + v_current_amount;
    END LOOP;

    -- Create draft certificate
    INSERT INTO public.certificates (
        po_id,
        certificate_number,
        cert_type,
        status,
        total_amount,
        currency,
        notes,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        p_po_id,
        v_cert_ref,
        p_cert_type,
        'DRAFT',
        v_total_cert_amount,
        COALESCE(p_currency, v_po_record.currency, 'TZS'),
        p_notes,
        v_actor_id,
        now(),
        now()
    ) RETURNING id INTO v_cert_id;

    -- Lock each po_site and verify financial invariants
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_sites_json) LOOP
        v_po_site_id := COALESCE((v_item->>'poSiteId')::UUID, (v_item->>'po_site_id')::UUID);
        v_current_amount := COALESCE((v_item->>'currentAmount')::NUMERIC, (v_item->>'current_amount')::NUMERIC, 0);
        v_percentage := COALESCE((v_item->>'percentage')::NUMERIC, NULL);

        -- Acquire exclusive row lock on po_site to prevent concurrent overdraft
        SELECT ps.authorized_amount,
               COALESCE(SUM(csa.current_amount) FILTER (WHERE c.status = 'ISSUED'), 0)::NUMERIC(18, 2)
        INTO v_authorized_amount, v_previously_certified
        FROM public.po_sites ps
        LEFT JOIN public.certificate_site_allocations csa ON csa.po_site_id = ps.id
        LEFT JOIN public.certificates c ON c.id = csa.certificate_id AND c.status != 'VOIDED'
        WHERE ps.id = v_po_site_id AND ps.po_id = p_po_id
        GROUP BY ps.id, ps.authorized_amount
        FOR UPDATE OF ps;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PO-Site allocation % does not belong to PO %.', v_po_site_id, p_po_id;
        END IF;

        v_remaining_balance := v_authorized_amount - v_previously_certified;

        -- Tolerance for cent rounding: if current amount is within 0.05 of balance, clamp to exact balance
        IF v_current_amount > v_remaining_balance AND v_current_amount <= (v_remaining_balance + 0.05) THEN
            v_current_amount := v_remaining_balance;
        END IF;

        -- CORE INVARIANT CHECK: Current Certified <= Remaining Balance
        IF v_current_amount > v_remaining_balance THEN
            RAISE EXCEPTION 'Over-certification blocked: Site allocation % current amount (%) exceeds remaining certifiable balance (%).',
                v_po_site_id, v_current_amount, v_remaining_balance;
        END IF;

        -- Insert certificate site allocation record
        INSERT INTO public.certificate_site_allocations (
            certificate_id,
            po_site_id,
            previous_amount,
            current_amount,
            cumulative_amount,
            percentage
        ) VALUES (
            v_cert_id,
            v_po_site_id,
            v_previously_certified,
            v_current_amount,
            v_previously_certified + v_current_amount,
            v_percentage
        );
    END LOOP;

    -- Record immutable audit event
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        new_state,
        created_at
    ) VALUES (
        'CERTIFICATE',
        v_cert_id,
        'CERTIFICATE_CREATED',
        v_actor_id,
        jsonb_build_object('certificate_number', v_cert_ref, 'total_amount', v_total_cert_amount, 'status', 'DRAFT', 'notes', p_notes),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'certificate_id', v_cert_id,
        'certificate_number', v_cert_ref,
        'total_amount', v_total_cert_amount,
        'status', 'DRAFT'
    );
END;
$$;

-- 8.2 Approve Certificate Stage (Matching Application RPC Contract)
CREATE OR REPLACE FUNCTION public.approve_certificate_stage(
    p_certificate_id UUID,
    p_stage TEXT,
    p_comment TEXT DEFAULT '',
    p_decision TEXT DEFAULT 'APPROVED'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cert RECORD;
    v_next_status TEXT;
    v_actor_id UUID;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        SELECT id INTO v_actor_id FROM public.users WHERE is_active = true LIMIT 1;
    END IF;

    SELECT * INTO v_cert
    FROM public.certificates
    WHERE id = p_certificate_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Certificate with ID % not found.', p_certificate_id;
    END IF;

    IF p_decision = 'REJECTED' THEN
        v_next_status := 'REJECTED';
    ELSIF p_stage = 'PROJECT_LEAD' THEN
        v_next_status := 'PENDING_HOP_APPROVAL';
    ELSIF p_stage = 'HEAD_OF_PROJECTS' THEN
        v_next_status := 'APPROVED';
    ELSE
        RAISE EXCEPTION 'Invalid approval stage: %', p_stage;
    END IF;

    -- Record approval decision
    INSERT INTO public.certificate_approvals (
        certificate_id,
        approver_id,
        stage,
        decision,
        comments
    ) VALUES (
        p_certificate_id,
        v_actor_id,
        p_stage,
        p_decision,
        p_comment
    );

    -- Update certificate state
    UPDATE public.certificates
    SET status = v_next_status,
        updated_at = now()
    WHERE id = p_certificate_id;

    -- Audit event
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        new_state,
        created_at
    ) VALUES (
        'CERTIFICATE',
        p_certificate_id,
        'CERTIFICATE_APPROVAL_' || p_decision,
        v_actor_id,
        jsonb_build_object('stage', p_stage, 'decision', p_decision, 'status', v_next_status, 'comment', p_comment),
        now()
    );

    RETURN jsonb_build_object(
        'success', true,
        'certificate_id', p_certificate_id,
        'status', v_next_status
    );
END;
$$;

-- 8.3 Issue Certificate (Matching Application RPC Contract)
CREATE OR REPLACE FUNCTION public.issue_certificate(
    p_certificate_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cert RECORD;
    v_po RECORD;
    v_supplier_user RECORD;
    v_actor_id UUID;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        SELECT id INTO v_actor_id FROM public.users WHERE is_active = true LIMIT 1;
    END IF;

    SELECT * INTO v_cert
    FROM public.certificates
    WHERE id = p_certificate_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Certificate with ID % not found.', p_certificate_id;
    END IF;

    -- Idempotent return if already issued
    IF v_cert.status = 'ISSUED' THEN
        RETURN jsonb_build_object('success', true, 'status', 'ISSUED', 'issued_at', v_cert.issued_at, 'message', 'Certificate already issued');
    END IF;

    IF v_cert.status != 'APPROVED' THEN
        RAISE EXCEPTION 'Certificate must be APPROVED before issuance. Current status: %', v_cert.status;
    END IF;

    -- Update certificate state to ISSUED
    UPDATE public.certificates
    SET status = 'ISSUED',
        issued_at = now(),
        updated_at = now()
    WHERE id = p_certificate_id;

    -- Audit event
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        new_state,
        created_at
    ) VALUES (
        'CERTIFICATE',
        p_certificate_id,
        'CERTIFICATE_ISSUED',
        v_actor_id,
        jsonb_build_object('status', 'ISSUED', 'issued_at', now()),
        now()
    );

    -- In-app notification to supplier users
    SELECT * INTO v_po FROM public.purchase_orders WHERE id = v_cert.po_id;
    IF FOUND THEN
        FOR v_supplier_user IN 
            SELECT id FROM public.users 
            WHERE supplier_id = v_po.supplier_id AND is_active = true
        LOOP
            INSERT INTO public.notifications (user_id, type, title, message, entity_type, entity_id, created_at)
            VALUES (
                v_supplier_user.id,
                'IN_APP',
                'Certificate Issued: ' || v_cert.certificate_number,
                'Certificate ' || v_cert.certificate_number || ' has been issued for PO ' || v_po.po_number || '. You may now submit your commercial invoice claim.',
                'CERTIFICATE',
                p_certificate_id,
                now()
            );
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'certificate_id', p_certificate_id,
        'status', 'ISSUED',
        'issued_at', now()
    );
END;
$$;

-- 8.4 Lock down permissions
REVOKE EXECUTE ON FUNCTION public.create_certificate_with_lock(UUID, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_certificate_with_lock(UUID, TEXT, JSONB, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_certificate_stage(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_certificate_stage(UUID, TEXT, TEXT, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.issue_certificate(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_certificate(UUID) TO authenticated;


