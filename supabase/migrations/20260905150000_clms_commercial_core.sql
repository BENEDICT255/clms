-- ==============================================================================
-- CLMS COMMERCIAL CORE MIGRATION
-- ==============================================================================
-- Migration: 20260905150000_clms_commercial_core.sql
-- Description: Establishes commercial views, atomic transactional RPC functions,
--              concurrency row-level locking, and financial integrity constraints.
-- Authority: Governed by PRODUCT.md, ARCHITECTURE.md, and AGENTS.md.
-- ==============================================================================

-- 1. SEARCH INDEXES FOR COMMERCIAL EXPLORER
CREATE INDEX IF NOT EXISTS idx_sites_site_id_ext ON public.sites(site_id_ext);
CREATE INDEX IF NOT EXISTS idx_sites_site_name ON public.sites(site_name);
CREATE INDEX IF NOT EXISTS idx_sites_region ON public.sites(region);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON public.purchase_orders(po_number);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_certificates_cert_number ON public.certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(status);
CREATE INDEX IF NOT EXISTS idx_invoices_clms_ref ON public.invoices(clms_reference);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON public.invoices(supplier_id);

-- ==============================================================================
-- 2. COMMERCIAL POSITION VIEWS
-- ==============================================================================

-- Site-level commercial position view
CREATE OR REPLACE VIEW public.view_site_commercial_positions AS
SELECT
    ps.id AS po_site_id,
    ps.po_id,
    po.po_number,
    po.supplier_id,
    sup.name AS supplier_name,
    po.currency,
    s.id AS site_id,
    s.site_id_ext,
    s.site_name,
    s.region,
    ps.authorized_amount,
    COALESCE(SUM(csa.current_amount) FILTER (WHERE c.status = 'ISSUED'), 0)::NUMERIC(18, 2) AS cumulative_certified_amount,
    (ps.authorized_amount - COALESCE(SUM(csa.current_amount) FILTER (WHERE c.status = 'ISSUED'), 0))::NUMERIC(18, 2) AS remaining_certifiable_amount,
    COALESCE(SUM(csa.current_amount) FILTER (WHERE c.status = 'ISSUED' AND c.cert_type = 'PAC'), 0)::NUMERIC(18, 2) AS pac_certified_amount,
    COALESCE(SUM(csa.current_amount) FILTER (WHERE c.status = 'ISSUED' AND c.cert_type = 'FAC'), 0)::NUMERIC(18, 2) AS fac_certified_amount,
    COALESCE(SUM(csa.current_amount) FILTER (WHERE c.status = 'ISSUED' AND c.cert_type = 'DPC'), 0)::NUMERIC(18, 2) AS dpc_certified_amount
FROM public.po_sites ps
JOIN public.purchase_orders po ON po.id = ps.po_id
JOIN public.suppliers sup ON sup.id = po.supplier_id
JOIN public.sites s ON s.id = ps.site_id
LEFT JOIN public.certificate_site_allocations csa ON csa.po_site_id = ps.id
LEFT JOIN public.certificates c ON c.id = csa.certificate_id AND c.status != 'VOIDED'
GROUP BY ps.id, ps.po_id, po.po_number, po.supplier_id, sup.name, po.currency, s.id, s.site_id_ext, s.site_name, s.region, ps.authorized_amount;

-- PO-level commercial summary view
CREATE OR REPLACE VIEW public.view_po_commercial_summaries AS
SELECT
    po.id AS po_id,
    po.po_number,
    po.supplier_id,
    sup.name AS supplier_name,
    proj.name AS project_name,
    po.currency,
    po.authorized_amount,
    COALESCE(SUM(vscp.cumulative_certified_amount), 0)::NUMERIC(18, 2) AS total_certified_amount,
    (po.authorized_amount - COALESCE(SUM(vscp.cumulative_certified_amount), 0))::NUMERIC(18, 2) AS remaining_certifiable_amount,
    COUNT(DISTINCT vscp.site_id) AS total_sites_count
FROM public.purchase_orders po
JOIN public.suppliers sup ON sup.id = po.supplier_id
JOIN public.commercial_packages cp ON cp.id = po.package_id
JOIN public.projects proj ON proj.id = cp.project_id
LEFT JOIN public.view_site_commercial_positions vscp ON vscp.po_id = po.id
GROUP BY po.id, po.po_number, po.supplier_id, sup.name, proj.name, po.currency, po.authorized_amount;

-- ==============================================================================
-- 3. ATOMIC TRANSACTION FUNCTIONS (SECURITY DEFINER)
-- ==============================================================================

-- 3.1 Confirm Commercial Package Transaction
CREATE OR REPLACE FUNCTION public.confirm_commercial_package(
    p_package_id UUID,
    p_confirmed_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_package RECORD;
    v_result JSONB;
BEGIN
    -- Verify package exists and is ready
    SELECT * INTO v_package
    FROM public.commercial_packages
    WHERE id = p_package_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Commercial Package with ID % not found.', p_package_id;
    END IF;

    IF v_package.status = 'ACTIVE' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Package already confirmed', 'package_id', p_package_id);
    END IF;

    -- Update package status to ACTIVE
    UPDATE public.commercial_packages
    SET status = 'ACTIVE',
        confirmed_by = p_confirmed_by,
        confirmed_at = now(),
        updated_at = now()
    WHERE id = p_package_id;

    -- Log immutable audit event
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        new_state
    ) VALUES (
        'COMMERCIAL_PACKAGE',
        p_package_id,
        'PACKAGE_CONFIRMED',
        p_confirmed_by,
        jsonb_build_object('status', 'ACTIVE', 'package_ref', v_package.package_ref)
    );

    RETURN jsonb_build_object(
        'success', true,
        'package_id', p_package_id,
        'package_ref', v_package.package_ref,
        'status', 'ACTIVE'
    );
END;
$$;

-- 3.2 Create Certificate with Concurrency Row-Locking & Cumulative Invariant Checks
CREATE OR REPLACE FUNCTION public.create_certificate_with_lock(
    p_po_id UUID,
    p_cert_type TEXT,
    p_allocations JSONB, -- Array of { po_site_id: UUID, current_amount: NUMERIC }
    p_created_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item JSONB;
    v_po_site_id UUID;
    v_current_amount NUMERIC(18, 2);
    v_authorized_amount NUMERIC(18, 2);
    v_previously_certified NUMERIC(18, 2);
    v_remaining_balance NUMERIC(18, 2);
    v_total_cert_amount NUMERIC(18, 2) := 0;
    v_seq_num BIGINT;
    v_cert_ref TEXT;
    v_cert_id UUID;
    v_po_record RECORD;
BEGIN
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

    -- Generate official certificate reference from sequence
    v_seq_num := nextval('public.seq_certificate_number');
    v_cert_ref := p_cert_type || '-SI-' || to_char(now(), 'YY') || '-' || lpad(v_seq_num::TEXT, 4, '0');

    -- Pre-calculate total amount
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
        v_current_amount := (v_item->>'current_amount')::NUMERIC(18, 2);
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
        created_by
    ) VALUES (
        p_po_id,
        v_cert_ref,
        p_cert_type,
        'DRAFT',
        v_total_cert_amount,
        v_po_record.currency,
        p_created_by
    ) RETURNING id INTO v_cert_id;

    -- Lock each po_site and verify financial invariants
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_allocations) LOOP
        v_po_site_id := (v_item->>'po_site_id')::UUID;
        v_current_amount := (v_item->>'current_amount')::NUMERIC(18, 2);

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
            cumulative_amount
        ) VALUES (
            v_cert_id,
            v_po_site_id,
            v_previously_certified,
            v_current_amount,
            v_previously_certified + v_current_amount
        );
    END LOOP;

    -- Record audit event
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        new_state
    ) VALUES (
        'CERTIFICATE',
        v_cert_id,
        'CERTIFICATE_CREATED',
        p_created_by,
        jsonb_build_object('certificate_number', v_cert_ref, 'total_amount', v_total_cert_amount, 'status', 'DRAFT')
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

-- 3.3 Approve Certificate Stage
CREATE OR REPLACE FUNCTION public.approve_certificate_stage(
    p_cert_id UUID,
    p_approver_id UUID,
    p_stage TEXT,
    p_decision TEXT,
    p_comments TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cert RECORD;
    v_next_status TEXT;
BEGIN
    SELECT * INTO v_cert
    FROM public.certificates
    WHERE id = p_cert_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Certificate with ID % not found.', p_cert_id;
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
        p_cert_id,
        p_approver_id,
        p_stage,
        p_decision,
        p_comments
    );

    -- Update certificate state
    UPDATE public.certificates
    SET status = v_next_status,
        updated_at = now()
    WHERE id = p_cert_id;

    -- Audit event
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        new_state
    ) VALUES (
        'CERTIFICATE',
        p_cert_id,
        'CERTIFICATE_APPROVAL_' || p_decision,
        p_approver_id,
        jsonb_build_object('stage', p_stage, 'decision', p_decision, 'status', v_next_status)
    );

    RETURN jsonb_build_object(
        'success', true,
        'certificate_id', p_cert_id,
        'status', v_next_status
    );
END;
$$;

-- 3.4 Issue Certificate to Supplier (Atomic & Idempotent)
CREATE OR REPLACE FUNCTION public.issue_certificate(
    p_cert_id UUID,
    p_issuer_id UUID
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
BEGIN
    SELECT * INTO v_cert
    FROM public.certificates
    WHERE id = p_cert_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Certificate with ID % not found.', p_cert_id;
    END IF;

    -- Idempotent return if already issued
    IF v_cert.status = 'ISSUED' THEN
        RETURN jsonb_build_object('success', true, 'status', 'ISSUED', 'message', 'Certificate already issued');
    END IF;

    IF v_cert.status != 'APPROVED' THEN
        RAISE EXCEPTION 'Certificate must be APPROVED before issuance. Current status: %', v_cert.status;
    END IF;

    SELECT po.*, sup.id AS supplier_id, sup.name AS supplier_name
    INTO v_po
    FROM public.purchase_orders po
    JOIN public.suppliers sup ON sup.id = po.supplier_id
    WHERE po.id = v_cert.po_id;

    -- Shift status to ISSUED
    UPDATE public.certificates
    SET status = 'ISSUED',
        issued_at = now(),
        updated_at = now()
    WHERE id = p_cert_id;

    -- Audit event
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        new_state
    ) VALUES (
        'CERTIFICATE',
        p_cert_id,
        'CERTIFICATE_ISSUED',
        p_issuer_id,
        jsonb_build_object('certificate_number', v_cert.certificate_number, 'status', 'ISSUED', 'issued_at', now())
    );

    -- Dispatch notification to all users bound to this supplier
    FOR v_supplier_user IN
        SELECT id FROM public.users WHERE supplier_id = v_po.supplier_id AND is_active = true
    LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            entity_type,
            entity_id
        ) VALUES (
            v_supplier_user.id,
            'New Certificate Issued: ' || v_cert.certificate_number,
            'A new commercial certificate (' || v_cert.cert_type || ') has been issued under PO ' || v_po.po_number || '. You may now raise an invoice against this certificate.',
            'CERTIFICATE',
            p_cert_id
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'certificate_id', p_cert_id,
        'certificate_number', v_cert.certificate_number,
        'status', 'ISSUED'
    );
END;
$$;

-- 3.5 Create Invoice from Certificate
CREATE OR REPLACE FUNCTION public.create_invoice_from_certificate(
    p_cert_id UUID,
    p_supplier_id UUID,
    p_supplier_invoice_no TEXT,
    p_invoice_date DATE,
    p_amount NUMERIC(18, 2),
    p_tax_amount NUMERIC(18, 2) DEFAULT 0,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_cert RECORD;
    v_seq_num BIGINT;
    v_clms_ref TEXT;
    v_invoice_id UUID;
    v_already_invoiced NUMERIC(18, 2);
BEGIN
    -- Verify certificate is ISSUED and belongs to supplier
    SELECT c.*, po.supplier_id, po.currency AS po_currency
    INTO v_cert
    FROM public.certificates c
    JOIN public.purchase_orders po ON po.id = c.po_id
    WHERE c.id = p_cert_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Certificate with ID % not found.', p_cert_id;
    END IF;

    IF v_cert.status != 'ISSUED' THEN
        RAISE EXCEPTION 'Cannot invoice certificate with status %. Certificate must be ISSUED.', v_cert.status;
    END IF;

    IF v_cert.supplier_id != p_supplier_id THEN
        RAISE EXCEPTION 'Supplier mismatch: authenticated supplier does not own this certificate.';
    END IF;

    -- INVOICE ENTITLEMENT INVARIANT CHECK: Invoiced Total <= Certificate Total
    SELECT COALESCE(SUM(amount), 0)::NUMERIC(18, 2) INTO v_already_invoiced
    FROM public.invoices
    WHERE certificate_id = p_cert_id AND status != 'RETURNED';

    IF (v_already_invoiced + p_amount) > v_cert.total_amount THEN
        RAISE EXCEPTION 'Invoice entitlement exceeded: cumulative invoiced (%) exceeds certificate total (%).',
            (v_already_invoiced + p_amount), v_cert.total_amount;
    END IF;

    -- Generate atomic CLMS reference: INV-YY-XXXXX
    v_seq_num := nextval('public.seq_invoice_clms_ref');
    v_clms_ref := 'INV-' || to_char(now(), 'YY') || '-' || lpad(v_seq_num::TEXT, 5, '0');

    -- Insert invoice in DRAFT
    INSERT INTO public.invoices (
        certificate_id,
        supplier_id,
        clms_reference,
        supplier_invoice_number,
        invoice_date,
        amount,
        tax_amount,
        currency,
        status
    ) VALUES (
        p_cert_id,
        p_supplier_id,
        v_clms_ref,
        p_supplier_invoice_no,
        p_invoice_date,
        p_amount,
        p_tax_amount,
        v_cert.po_currency,
        'DRAFT'
    ) RETURNING id INTO v_invoice_id;

    -- Insert allocation
    INSERT INTO public.invoice_allocations (
        invoice_id,
        certificate_id,
        allocated_amount
    ) VALUES (
        v_invoice_id,
        p_cert_id,
        p_amount
    );

    -- Audit event
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        new_state
    ) VALUES (
        'INVOICE',
        v_invoice_id,
        'INVOICE_CREATED',
        p_created_by,
        jsonb_build_object('clms_reference', v_clms_ref, 'supplier_invoice_number', p_supplier_invoice_no, 'amount', p_amount)
    );

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_invoice_id,
        'clms_reference', v_clms_ref,
        'status', 'DRAFT'
    );
END;
$$;

-- 3.6 Submit Supplier Invoice (Idempotent State Shift)
CREATE OR REPLACE FUNCTION public.submit_supplier_invoice(
    p_invoice_id UUID,
    p_supplier_id UUID,
    p_submitted_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invoice RECORD;
    v_scm_user RECORD;
BEGIN
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice with ID % not found.', p_invoice_id;
    END IF;

    -- Idempotent check
    IF v_invoice.status = 'SUBMITTED' THEN
        RETURN jsonb_build_object('success', true, 'status', 'SUBMITTED', 'message', 'Invoice already submitted');
    END IF;

    IF v_invoice.supplier_id != p_supplier_id THEN
        RAISE EXCEPTION 'Unauthorized: Invoice does not belong to supplier %.', p_supplier_id;
    END IF;

    IF v_invoice.status NOT IN ('DRAFT', 'RETURNED') THEN
        RAISE EXCEPTION 'Cannot submit invoice with status %.', v_invoice.status;
    END IF;

    -- Shift state to SUBMITTED
    UPDATE public.invoices
    SET status = 'SUBMITTED',
        updated_at = now()
    WHERE id = p_invoice_id;

    -- Audit event
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        new_state
    ) VALUES (
        'INVOICE',
        p_invoice_id,
        'INVOICE_SUBMITTED',
        p_submitted_by,
        jsonb_build_object('clms_reference', v_invoice.clms_reference, 'status', 'SUBMITTED')
    );

    -- Notify Supply Chain queue
    FOR v_scm_user IN
        SELECT DISTINCT u.id
        FROM public.users u
        JOIN public.user_role_assignments ura ON ura.user_id = u.id
        JOIN public.role_capabilities rc ON rc.role_id = ura.role_id
        JOIN public.capabilities cap ON cap.id = rc.capability_id
        WHERE cap.code = 'invoice.review.sc' AND u.is_active = true
    LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            entity_type,
            entity_id
        ) VALUES (
            v_scm_user.id,
            'New Invoice Awaiting SCM Review: ' || v_invoice.clms_reference,
            'Supplier has submitted invoice ' || v_invoice.supplier_invoice_number || ' (' || v_invoice.clms_reference || ') for commercial review.',
            'INVOICE',
            p_invoice_id
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'clms_reference', v_invoice.clms_reference,
        'status', 'SUBMITTED'
    );
END;
$$;
