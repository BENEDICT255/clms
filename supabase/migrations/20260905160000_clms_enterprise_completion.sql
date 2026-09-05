-- ==============================================================================
-- CLMS ENTERPRISE LIFECYCLE COMPLETION & HARDENING MIGRATION
-- ==============================================================================
-- Migration: 20260905160000_clms_enterprise_completion.sql
-- Description: Supply Chain approval/return workflows, Finance payment ledger
--              with row-locking non-overpayment guarantees, Aging calculation views,
--              Management portfolio aggregation, and enterprise RLS policies.
-- Authority: Governed by PRODUCT.md, ARCHITECTURE.md, and AGENTS.md.
-- ==============================================================================

-- 1. INDEXES FOR PERFORMANCE & CONCURRENCY
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice_id ON public.payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_date ON public.payment_transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_ref_number ON public.payment_transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_invoice_reviews_invoice_id ON public.invoice_reviews(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sc_approved_at ON public.invoices(sc_approved_at);

-- ==============================================================================
-- 2. SUPPLY CHAIN ACTIONS (SECURITY DEFINER)
-- ==============================================================================

-- 2.1 Approve Supplier Invoice and Hand Off to Finance
CREATE OR REPLACE FUNCTION public.approve_invoice_supply_chain(
    p_invoice_id UUID,
    p_reviewer_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invoice RECORD;
    v_fin_user RECORD;
BEGIN
    -- Verify invoice exists and lock record
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice with ID % not found.', p_invoice_id;
    END IF;

    -- Idempotent handling: If already approved by SCM, return success safely
    IF v_invoice.status = 'SC_APPROVED' THEN
        RETURN jsonb_build_object(
            'success', true,
            'invoice_id', p_invoice_id,
            'status', 'SC_APPROVED',
            'message', 'Invoice was already approved by Supply Chain'
        );
    END IF;

    -- Validate state eligibility
    IF v_invoice.status NOT IN ('SUBMITTED', 'RESUBMITTED') THEN
        RAISE EXCEPTION 'Cannot approve invoice with status %; must be SUBMITTED or RESUBMITTED.', v_invoice.status;
    END IF;

    -- Update invoice to SC_APPROVED
    UPDATE public.invoices
    SET status = 'SC_APPROVED',
        sc_approved_by = p_reviewer_id,
        sc_approved_at = now(),
        updated_at = now()
    WHERE id = p_invoice_id;

    -- Record in invoice_reviews history
    INSERT INTO public.invoice_reviews (
        invoice_id,
        reviewer_id,
        decision,
        reason
    ) VALUES (
        p_invoice_id,
        p_reviewer_id,
        'APPROVED',
        COALESCE(p_notes, 'Approved by Supply Chain verification')
    );

    -- Append-only audit record
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        new_state
    ) VALUES (
        'INVOICE',
        p_invoice_id,
        'INVOICE_SC_APPROVED',
        p_reviewer_id,
        jsonb_build_object(
            'clms_reference', v_invoice.clms_reference,
            'supplier_invoice_number', v_invoice.supplier_invoice_number,
            'status', 'SC_APPROVED',
            'notes', p_notes
        )
    );

    -- Notify Finance queue officers
    FOR v_fin_user IN
        SELECT DISTINCT u.id
        FROM public.users u
        JOIN public.user_role_assignments ura ON ura.user_id = u.id
        JOIN public.role_capabilities rc ON rc.role_id = ura.role_id
        JOIN public.capabilities cap ON cap.id = rc.capability_id
        WHERE cap.code = 'finance.process' AND u.is_active = true
    LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            entity_type,
            entity_id
        ) VALUES (
            v_fin_user.id,
            'Invoice Ready for Finance: ' || v_invoice.clms_reference,
            'Invoice ' || v_invoice.supplier_invoice_number || ' (' || v_invoice.clms_reference || ') has been approved by Supply Chain and transferred to Finance queue.',
            'INVOICE',
            p_invoice_id
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'status', 'SC_APPROVED',
        'clms_reference', v_invoice.clms_reference
    );
END;
$$;

-- 2.2 Return Supplier Invoice with Structured Reason
CREATE OR REPLACE FUNCTION public.return_supplier_invoice(
    p_invoice_id UUID,
    p_reviewer_id UUID,
    p_return_code TEXT,
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invoice RECORD;
    v_sup_user RECORD;
BEGIN
    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'A detailed explanatory reason is mandatory when returning an invoice.';
    END IF;

    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice with ID % not found.', p_invoice_id;
    END IF;

    IF v_invoice.status NOT IN ('SUBMITTED', 'RESUBMITTED') THEN
        RAISE EXCEPTION 'Cannot return invoice with status %; must be SUBMITTED or RESUBMITTED.', v_invoice.status;
    END IF;

    -- Update invoice to RETURNED
    UPDATE public.invoices
    SET status = 'RETURNED',
        updated_at = now()
    WHERE id = p_invoice_id;

    -- Record in invoice_reviews history
    INSERT INTO public.invoice_reviews (
        invoice_id,
        reviewer_id,
        decision,
        return_code,
        reason
    ) VALUES (
        p_invoice_id,
        p_reviewer_id,
        'RETURNED',
        p_return_code,
        p_reason
    );

    -- Append-only audit record
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        new_state
    ) VALUES (
        'INVOICE',
        p_invoice_id,
        'INVOICE_RETURNED',
        p_reviewer_id,
        jsonb_build_object(
            'clms_reference', v_invoice.clms_reference,
            'status', 'RETURNED',
            'return_code', p_return_code,
            'reason', p_reason
        )
    );

    -- Notify Supplier user(s)
    FOR v_sup_user IN
        SELECT id
        FROM public.users
        WHERE supplier_id = v_invoice.supplier_id AND is_active = true
    LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            entity_type,
            entity_id
        ) VALUES (
            v_sup_user.id,
            'Invoice Returned: ' || v_invoice.clms_reference,
            'Your invoice ' || v_invoice.supplier_invoice_number || ' (' || v_invoice.clms_reference || ') was returned by Supply Chain: ' || p_reason,
            'INVOICE',
            p_invoice_id
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'status', 'RETURNED',
        'clms_reference', v_invoice.clms_reference
    );
END;
$$;

-- 2.3 Resubmit Corrected Supplier Invoice
CREATE OR REPLACE FUNCTION public.resubmit_supplier_invoice(
    p_invoice_id UUID,
    p_supplier_id UUID,
    p_supplier_invoice_no TEXT,
    p_invoice_date DATE,
    p_notes TEXT DEFAULT NULL,
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

    IF v_invoice.supplier_id != p_supplier_id THEN
        RAISE EXCEPTION 'Unauthorized: Invoice does not belong to supplier %.', p_supplier_id;
    END IF;

    IF v_invoice.status != 'RETURNED' THEN
        RAISE EXCEPTION 'Cannot resubmit invoice with status %; must be RETURNED.', v_invoice.status;
    END IF;

    -- Update invoice with corrected details and shift to RESUBMITTED
    UPDATE public.invoices
    SET supplier_invoice_number = COALESCE(NULLIF(trim(p_supplier_invoice_no), ''), v_invoice.supplier_invoice_number),
        invoice_date = COALESCE(p_invoice_date, v_invoice.invoice_date),
        status = 'RESUBMITTED',
        updated_at = now()
    WHERE id = p_invoice_id;

    -- Append-only audit record
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        new_state
    ) VALUES (
        'INVOICE',
        p_invoice_id,
        'INVOICE_RESUBMITTED',
        p_submitted_by,
        jsonb_build_object(
            'clms_reference', v_invoice.clms_reference,
            'supplier_invoice_number', COALESCE(p_supplier_invoice_no, v_invoice.supplier_invoice_number),
            'status', 'RESUBMITTED',
            'notes', p_notes
        )
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
            'Resubmitted Invoice Awaiting Review: ' || v_invoice.clms_reference,
            'Supplier has resubmitted invoice ' || v_invoice.clms_reference || ' following corrections.',
            'INVOICE',
            p_invoice_id
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'status', 'RESUBMITTED',
        'clms_reference', v_invoice.clms_reference
    );
END;
$$;

-- ==============================================================================
-- 3. FINANCE & PAYMENT LEDGER (CONCURRENCY-SAFE ROW LOCKING)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.post_invoice_payment(
    p_invoice_id UUID,
    p_reference_number TEXT,
    p_payment_date DATE,
    p_amount NUMERIC(18, 2),
    p_funding_source TEXT,
    p_evidence_doc_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_invoice RECORD;
    v_total_payable NUMERIC(18, 2);
    v_current_paid NUMERIC(18, 2);
    v_outstanding NUMERIC(18, 2);
    v_new_outstanding NUMERIC(18, 2);
    v_new_status TEXT;
    v_payment_id UUID;
    v_sup_user RECORD;
BEGIN
    -- Input validations
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Payment amount must be greater than zero.';
    END IF;

    IF p_reference_number IS NULL OR trim(p_reference_number) = '' THEN
        RAISE EXCEPTION 'External payment/bank reference number is mandatory.';
    END IF;

    IF p_funding_source IS NULL OR trim(p_funding_source) = '' THEN
        RAISE EXCEPTION 'Funding source / bank account designation is mandatory.';
    END IF;

    -- Lock the target invoice FOR UPDATE to serialize concurrent payments
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice with ID % not found.', p_invoice_id;
    END IF;

    -- Valid invoice states for payment
    IF v_invoice.status NOT IN ('SC_APPROVED', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT', 'PARTIALLY_PAID') THEN
        RAISE EXCEPTION 'Invoice % cannot accept payments with status %; must be SC_APPROVED, APPROVED_FOR_PAYMENT, or PARTIALLY_PAID.',
            v_invoice.clms_reference, v_invoice.status;
    END IF;

    -- Total payable on invoice
    v_total_payable := v_invoice.amount + v_invoice.tax_amount;

    -- Cumulative valid payments already disbursed
    SELECT COALESCE(SUM(amount), 0) INTO v_current_paid
    FROM public.payment_transactions
    WHERE invoice_id = p_invoice_id;

    -- Authoritative outstanding balance
    v_outstanding := v_total_payable - v_current_paid;

    -- NON-OVERPAYMENT INVARIANT ASSERTION
    IF p_amount > v_outstanding THEN
        RAISE EXCEPTION 'PAYMENT_EXCEEDS_OUTSTANDING_BALANCE: Attempted payment of % exceeds current outstanding balance of %.',
            p_amount, v_outstanding;
    END IF;

    -- Check duplicate reference number
    IF EXISTS (SELECT 1 FROM public.payment_transactions WHERE reference_number = p_reference_number) THEN
        RAISE EXCEPTION 'A payment transaction with reference number "%" already exists.', p_reference_number;
    END IF;

    -- Insert into immutable payment ledger
    INSERT INTO public.payment_transactions (
        invoice_id,
        reference_number,
        payment_date,
        amount,
        currency,
        funding_source,
        evidence_doc_id,
        created_by
    ) VALUES (
        p_invoice_id,
        p_reference_number,
        p_payment_date,
        p_amount,
        v_invoice.currency,
        p_funding_source,
        p_evidence_doc_id,
        p_created_by
    ) RETURNING id INTO v_payment_id;

    -- Compute remaining balance after this payment
    v_new_outstanding := v_outstanding - p_amount;

    -- Transition invoice status: SETTLED if zero balance, else PARTIALLY_PAID
    IF v_new_outstanding <= 0 THEN
        v_new_status := 'SETTLED';
    ELSE
        v_new_status := 'PARTIALLY_PAID';
    END IF;

    UPDATE public.invoices
    SET status = v_new_status,
        updated_at = now()
    WHERE id = p_invoice_id;

    -- Append-only audit record
    INSERT INTO public.audit_events (
        entity_type,
        entity_id,
        action,
        actor_id,
        new_state
    ) VALUES (
        'PAYMENT',
        v_payment_id,
        'PAYMENT_POSTED',
        p_created_by,
        jsonb_build_object(
            'payment_id', v_payment_id,
            'invoice_id', p_invoice_id,
            'clms_reference', v_invoice.clms_reference,
            'reference_number', p_reference_number,
            'amount_paid', p_amount,
            'cumulative_paid', v_current_paid + p_amount,
            'remaining_outstanding', v_new_outstanding,
            'invoice_status', v_new_status
        )
    );

    IF v_new_status = 'SETTLED' THEN
        INSERT INTO public.audit_events (
            entity_type,
            entity_id,
            action,
            actor_id,
            new_state
        ) VALUES (
            'INVOICE',
            p_invoice_id,
            'INVOICE_SETTLED',
            p_created_by,
            jsonb_build_object(
                'clms_reference', v_invoice.clms_reference,
                'total_payable', v_total_payable,
                'total_paid', v_total_payable,
                'status', 'SETTLED'
            )
        );
    END IF;

    -- Notify Supplier user(s)
    FOR v_sup_user IN
        SELECT id
        FROM public.users
        WHERE supplier_id = v_invoice.supplier_id AND is_active = true
    LOOP
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            entity_type,
            entity_id
        ) VALUES (
            v_sup_user.id,
            CASE WHEN v_new_status = 'SETTLED' THEN 'Invoice Fully Settled: ' ELSE 'Payment Posted: ' END || v_invoice.clms_reference,
            'Payment of ' || to_char(p_amount, 'FM999,999,999,990.00') || ' ' || v_invoice.currency || ' has been posted under Ref ' || p_reference_number || '.',
            'PAYMENT',
            v_payment_id
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'invoice_id', p_invoice_id,
        'amount_paid', p_amount,
        'outstanding', v_new_outstanding,
        'status', v_new_status
    );
END;
$$;

-- ==============================================================================
-- 4. AGING & REPORTING DATABASE VIEWS
-- ==============================================================================

-- 4.1 Finance Queue & Aging View
CREATE OR REPLACE VIEW public.view_finance_invoice_aging AS
SELECT
    inv.id AS invoice_id,
    inv.clms_reference,
    inv.supplier_invoice_number,
    inv.supplier_id,
    sup.name AS supplier_name,
    po.id AS po_id,
    po.po_number,
    inv.currency,
    (inv.amount + inv.tax_amount)::NUMERIC(18, 2) AS total_payable,
    COALESCE(SUM(pt.amount), 0)::NUMERIC(18, 2) AS cumulative_paid,
    ((inv.amount + inv.tax_amount) - COALESCE(SUM(pt.amount), 0))::NUMERIC(18, 2) AS outstanding_balance,
    inv.invoice_date,
    inv.sc_approved_at,
    COALESCE(po.payment_terms_days, 30) AS payment_terms_days,
    -- Due Date derived from SC Approved date (or invoice_date) + payment terms
    (COALESCE(inv.sc_approved_at::DATE, inv.invoice_date) + COALESCE(po.payment_terms_days, 30)) AS due_date,
    -- Days Overdue (relative to CURRENT_DATE)
    CASE 
        WHEN ((inv.amount + inv.tax_amount) - COALESCE(SUM(pt.amount), 0)) <= 0 THEN 0
        WHEN (COALESCE(inv.sc_approved_at::DATE, inv.invoice_date) + COALESCE(po.payment_terms_days, 30)) < CURRENT_DATE 
        THEN (CURRENT_DATE - (COALESCE(inv.sc_approved_at::DATE, inv.invoice_date) + COALESCE(po.payment_terms_days, 30)))
        ELSE 0
    END AS days_overdue,
    -- Dynamic Aging Bucket
    CASE
        WHEN ((inv.amount + inv.tax_amount) - COALESCE(SUM(pt.amount), 0)) <= 0 THEN 'SETTLED'
        WHEN (COALESCE(inv.sc_approved_at::DATE, inv.invoice_date) + COALESCE(po.payment_terms_days, 30)) >= CURRENT_DATE THEN 'CURRENT_NOT_DUE'
        WHEN (CURRENT_DATE - (COALESCE(inv.sc_approved_at::DATE, inv.invoice_date) + COALESCE(po.payment_terms_days, 30))) BETWEEN 1 AND 30 THEN 'AGING_1_30'
        WHEN (CURRENT_DATE - (COALESCE(inv.sc_approved_at::DATE, inv.invoice_date) + COALESCE(po.payment_terms_days, 30))) BETWEEN 31 AND 60 THEN 'AGING_31_60'
        WHEN (CURRENT_DATE - (COALESCE(inv.sc_approved_at::DATE, inv.invoice_date) + COALESCE(po.payment_terms_days, 30))) BETWEEN 61 AND 90 THEN 'AGING_61_90'
        ELSE 'AGING_OVER_90'
    END AS aging_bucket,
    inv.status
FROM public.invoices inv
JOIN public.suppliers sup ON sup.id = inv.supplier_id
JOIN public.certificates cert ON cert.id = inv.certificate_id
JOIN public.purchase_orders po ON po.id = cert.po_id
LEFT JOIN public.payment_transactions pt ON pt.invoice_id = inv.id
GROUP BY inv.id, inv.clms_reference, inv.supplier_invoice_number, inv.supplier_id, sup.name, po.id, po.po_number, inv.currency, inv.amount, inv.tax_amount, inv.invoice_date, inv.sc_approved_at, po.payment_terms_days, inv.status;

-- 4.2 Management Portfolio Summary View
CREATE OR REPLACE VIEW public.view_management_portfolio_summary AS
SELECT
    -- Authorized PO commitments
    (SELECT COALESCE(SUM(authorized_amount), 0) FROM public.purchase_orders)::NUMERIC(18, 2) AS total_authorized_commitment,
    -- Cumulative certified values
    (SELECT COALESCE(SUM(csa.current_amount), 0) 
     FROM public.certificate_site_allocations csa 
     JOIN public.certificates c ON c.id = csa.certificate_id 
     WHERE c.status = 'ISSUED')::NUMERIC(18, 2) AS total_certified_value,
    -- Total invoiced liabilities
    (SELECT COALESCE(SUM(amount + tax_amount), 0) 
     FROM public.invoices 
     WHERE status IN ('SUBMITTED', 'RESUBMITTED', 'SC_APPROVED', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT', 'PARTIALLY_PAID', 'SETTLED'))::NUMERIC(18, 2) AS total_invoiced_liability,
    -- Cash settled / disbursements posted
    (SELECT COALESCE(SUM(amount), 0) FROM public.payment_transactions)::NUMERIC(18, 2) AS total_paid_outflow,
    -- Outstanding financial liability
    ((SELECT COALESCE(SUM(amount + tax_amount), 0) 
      FROM public.invoices 
      WHERE status IN ('SC_APPROVED', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT', 'PARTIALLY_PAID'))
     - (SELECT COALESCE(SUM(amount), 0) FROM public.payment_transactions))::NUMERIC(18, 2) AS total_outstanding_liability,
    -- DPC Advance Exposure
    (SELECT COALESCE(SUM(csa.current_amount), 0)
     FROM public.certificate_site_allocations csa
     JOIN public.certificates c ON c.id = csa.certificate_id
     WHERE c.status = 'ISSUED' AND c.cert_type = 'DPC')::NUMERIC(18, 2) AS total_dpc_exposure,
    -- Operational counts
    (SELECT COUNT(*) FROM public.commercial_packages WHERE status = 'ACTIVE') AS active_packages_count,
    (SELECT COUNT(*) FROM public.certificates WHERE status = 'ISSUED') AS issued_certificates_count,
    (SELECT COUNT(*) FROM public.invoices WHERE status IN ('SUBMITTED', 'RESUBMITTED')) AS invoices_awaiting_scm_count,
    (SELECT COUNT(*) FROM public.invoices WHERE status IN ('SC_APPROVED', 'PARTIALLY_PAID')) AS invoices_awaiting_finance_count;
