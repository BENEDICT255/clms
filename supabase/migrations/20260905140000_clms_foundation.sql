-- ==============================================================================
-- CLMS PLATFORM FOUNDATION MIGRATION
-- ==============================================================================
-- Migration: 20260905140000_clms_foundation.sql
-- Description: Establishes the core relational schema, security functions,
--              Row Level Security policies, numbering sequences, and role/capability
--              access control for the Commercial Lifecycle Management System.
-- Authority: Governed by PRODUCT.md, ARCHITECTURE.md, and AGENTS.md.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. LOOKUPS & ACCESS CONTROL SCHEMA
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.role_capabilities (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    capability_id UUID NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (role_id, capability_id)
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    tax_id TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY, -- Maps directly to auth.users.id
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    assigned_by UUID REFERENCES public.users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role_id)
);

-- ==============================================================================
-- 3. COMMERCIAL MASTER & INGESTION FOUNDATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.project_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_type_id UUID NOT NULL REFERENCES public.project_types(id) ON DELETE RESTRICT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.commercial_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    package_ref TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('UPLOADED', 'PARSED', 'DIAGNOSTIC_REVIEW', 'READY_FOR_CONFIRM', 'ACTIVE', 'SUPERSEDED')),
    confirmed_by UUID REFERENCES public.users(id),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.commercial_packages(id) ON DELETE RESTRICT,
    po_number TEXT NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    currency TEXT NOT NULL DEFAULT 'TZS' CHECK (currency IN ('TZS', 'USD')),
    authorized_amount NUMERIC(18, 2) NOT NULL CHECK (authorized_amount >= 0),
    payment_terms_days INT NOT NULL DEFAULT 30 CHECK (payment_terms_days >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.boqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID NOT NULL REFERENCES public.commercial_packages(id) ON DELETE RESTRICT,
    template_version TEXT NOT NULL,
    total_amount NUMERIC(18, 2) NOT NULL CHECK (total_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'TZS' CHECK (currency IN ('TZS', 'USD')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id_ext TEXT NOT NULL UNIQUE,
    site_name TEXT NOT NULL,
    region TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.po_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
    site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
    authorized_amount NUMERIC(18, 2) NOT NULL CHECK (authorized_amount >= 0),
    scope_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (po_id, site_id)
);

-- ==============================================================================
-- 4. DOCUMENTS VAULT FOUNDATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.commercial_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type TEXT NOT NULL CHECK (document_type IN ('BOQ_SOURCE', 'PO_SOURCE', 'FAC_CERT', 'PAC_CERT', 'DPC_CERT', 'SUPPLIER_INVOICE', 'SIGNED_INVOICE', 'TAX_RECEIPT', 'PAYMENT_EVIDENCE')),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'commercial-documents',
    storage_path TEXT NOT NULL UNIQUE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    mime_type TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.users(id),
    version INT NOT NULL DEFAULT 1,
    is_immutable BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. CERTIFICATION FOUNDATION (FAC / PAC / DPC)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
    certificate_number TEXT NOT NULL UNIQUE,
    cert_type TEXT NOT NULL CHECK (cert_type IN ('FAC', 'PAC', 'DPC')),
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'PENDING_LEAD_APPROVAL', 'PENDING_HOP_APPROVAL', 'APPROVED', 'ISSUED', 'REJECTED', 'VOIDED')),
    total_amount NUMERIC(18, 2) NOT NULL CHECK (total_amount > 0),
    currency TEXT NOT NULL DEFAULT 'TZS' CHECK (currency IN ('TZS', 'USD')),
    issued_at TIMESTAMPTZ,
    voided_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.certificate_site_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE RESTRICT,
    po_site_id UUID NOT NULL REFERENCES public.po_sites(id) ON DELETE RESTRICT,
    previous_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (previous_amount >= 0),
    current_amount NUMERIC(18, 2) NOT NULL CHECK (current_amount > 0),
    cumulative_amount NUMERIC(18, 2) NOT NULL CHECK (cumulative_amount >= current_amount),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (certificate_id, po_site_id)
);

CREATE TABLE IF NOT EXISTS public.certificate_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL REFERENCES public.users(id),
    stage TEXT NOT NULL CHECK (stage IN ('PROJECT_LEAD', 'HEAD_OF_PROJECTS')),
    decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED')),
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. INVOICING & SCM REVIEW FOUNDATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE RESTRICT,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    clms_reference TEXT NOT NULL UNIQUE,
    supplier_invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    tax_amount NUMERIC(18, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    currency TEXT NOT NULL DEFAULT 'TZS' CHECK (currency IN ('TZS', 'USD')),
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'RETURNED', 'RESUBMITTED', 'SC_APPROVED', 'UNDER_FINANCE_REVIEW', 'APPROVED_FOR_PAYMENT', 'PARTIALLY_PAID', 'SETTLED')),
    sc_approved_by UUID REFERENCES public.users(id),
    sc_approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (supplier_id, supplier_invoice_number)
);

CREATE TABLE IF NOT EXISTS public.invoice_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(18, 2) NOT NULL CHECK (allocated_amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (invoice_id, certificate_id)
);

CREATE TABLE IF NOT EXISTS public.invoice_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.users(id),
    decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'RETURNED')),
    return_code TEXT,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 7. FINANCE & PAYMENT LEDGER FOUNDATION
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
    reference_number TEXT NOT NULL UNIQUE,
    payment_date DATE NOT NULL,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'TZS' CHECK (currency IN ('TZS', 'USD')),
    funding_source TEXT NOT NULL,
    evidence_doc_id UUID REFERENCES public.commercial_documents(id),
    created_by UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 8. SYSTEM, AUDIT, NOTIFICATIONS & SEQUENCES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    actor_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    pre_state JSONB,
    post_state JSONB,
    correlation_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    key TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    endpoint TEXT NOT NULL,
    response JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Database sequences for atomic numbering
CREATE SEQUENCE IF NOT EXISTS public.seq_commercial_package START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_certificate_fac START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_certificate_pac START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_certificate_dpc START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_invoice START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.seq_payment_voucher START WITH 1 INCREMENT BY 1;

-- Concurrency-safe sequence formatting function
CREATE OR REPLACE FUNCTION public.fn_next_sequence_number(
    p_prefix TEXT,
    p_seq_name TEXT,
    p_padding INT DEFAULT 4
) RETURNS TEXT AS $$
DECLARE
    v_next_val BIGINT;
    v_formatted TEXT;
BEGIN
    EXECUTE format('SELECT nextval(%L)', p_seq_name) INTO v_next_val;
    v_formatted := p_prefix || '-' || to_char(now(), 'YY') || '-' || lpad(v_next_val::TEXT, p_padding, '0');
    RETURN v_formatted;
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public;

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL HELPERS
-- ==============================================================================

-- Helper: Retrieve bound supplier_id for current authenticated user
CREATE OR REPLACE FUNCTION public.get_user_supplier_id()
RETURNS UUID AS $$
    SELECT supplier_id FROM public.users WHERE id = auth.uid() AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

-- Helper: Check if current authenticated user has a specific capability
CREATE OR REPLACE FUNCTION public.has_capability(p_cap_code TEXT)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_role_assignments ura
        JOIN public.role_capabilities rc ON rc.role_id = ura.role_id
        JOIN public.capabilities c ON c.id = rc.capability_id
        JOIN public.users u ON u.id = ura.user_id
        WHERE ura.user_id = auth.uid()
          AND u.is_active = true
          AND c.code = p_cap_code
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

-- Helper: Check if current user is an internal staff member (not a supplier user)
CREATE OR REPLACE FUNCTION public.is_internal_staff()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND is_active = true AND supplier_id IS NULL
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION public.get_user_supplier_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_capability(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_internal_staff() TO authenticated, anon;

-- Enable RLS on ALL tables
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_site_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 10. RLS POLICIES
-- ==============================================================================

-- Roles & Capabilities (Read-only to authenticated users; manage by admin)
CREATE POLICY roles_read ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY capabilities_read ON public.capabilities FOR SELECT TO authenticated USING (true);
CREATE POLICY role_capabilities_read ON public.role_capabilities FOR SELECT TO authenticated USING (true);

-- Suppliers: Internal staff see all; Suppliers see only their own organization
CREATE POLICY suppliers_read ON public.suppliers FOR SELECT TO authenticated
USING (public.is_internal_staff() OR id = public.get_user_supplier_id());

-- Users: Users see themselves and colleagues in the same tenant or internal staff
CREATE POLICY users_read ON public.users FOR SELECT TO authenticated
USING (public.is_internal_staff() OR id = auth.uid() OR supplier_id = public.get_user_supplier_id());

CREATE POLICY user_role_assignments_read ON public.user_role_assignments FOR SELECT TO authenticated
USING (public.is_internal_staff() OR user_id = auth.uid());

-- Projects & Project Types: Read-only to authenticated users
CREATE POLICY project_types_read ON public.project_types FOR SELECT TO authenticated USING (true);
CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING (true);

-- Commercial Packages & BOQs: Internal staff access; Suppliers cannot read raw commercial packages
CREATE POLICY packages_internal_read ON public.commercial_packages FOR SELECT TO authenticated
USING (public.is_internal_staff());

CREATE POLICY boqs_internal_read ON public.boqs FOR SELECT TO authenticated
USING (public.is_internal_staff());

-- Purchase Orders: Internal staff see all; Suppliers see only POs awarded to them
CREATE POLICY po_read ON public.purchase_orders FOR SELECT TO authenticated
USING (public.is_internal_staff() OR supplier_id = public.get_user_supplier_id());

-- Sites & PO Sites: Internal staff see all; Suppliers see sites under their POs
CREATE POLICY sites_read ON public.sites FOR SELECT TO authenticated
USING (
    public.is_internal_staff()
    OR id IN (
        SELECT ps.site_id FROM public.po_sites ps
        JOIN public.purchase_orders po ON po.id = ps.po_id
        WHERE po.supplier_id = public.get_user_supplier_id()
    )
);

CREATE POLICY po_sites_read ON public.po_sites FOR SELECT TO authenticated
USING (
    public.is_internal_staff()
    OR po_id IN (
        SELECT id FROM public.purchase_orders
        WHERE supplier_id = public.get_user_supplier_id()
    )
);

-- Certificates: Internal staff see all; Suppliers see only ISSUED certificates for their POs
CREATE POLICY certificates_read ON public.certificates FOR SELECT TO authenticated
USING (
    public.is_internal_staff()
    OR (
        status = 'ISSUED'
        AND po_id IN (
            SELECT id FROM public.purchase_orders
            WHERE supplier_id = public.get_user_supplier_id()
        )
    )
);

CREATE POLICY cert_allocations_read ON public.certificate_site_allocations FOR SELECT TO authenticated
USING (
    public.is_internal_staff()
    OR certificate_id IN (
        SELECT c.id FROM public.certificates c
        JOIN public.purchase_orders po ON po.id = c.po_id
        WHERE c.status = 'ISSUED' AND po.supplier_id = public.get_user_supplier_id()
    )
);

CREATE POLICY cert_approvals_read ON public.certificate_approvals FOR SELECT TO authenticated
USING (public.is_internal_staff());

-- Invoices: Strictly isolated by supplier_id for suppliers; SCM and Finance see submitted invoices
CREATE POLICY invoices_select ON public.invoices FOR SELECT TO authenticated
USING (
    (public.get_user_supplier_id() IS NOT NULL AND supplier_id = public.get_user_supplier_id())
    OR (public.is_internal_staff() AND public.has_capability('invoice.review.sc'))
    OR (public.is_internal_staff() AND public.has_capability('finance.process'))
    OR (public.is_internal_staff() AND public.has_capability('report.view.executive'))
);

CREATE POLICY invoices_supplier_insert ON public.invoices FOR INSERT TO authenticated
WITH CHECK (
    public.get_user_supplier_id() IS NOT NULL
    AND supplier_id = public.get_user_supplier_id()
    AND public.has_capability('invoice.create')
);

CREATE POLICY invoice_allocations_read ON public.invoice_allocations FOR SELECT TO authenticated
USING (
    invoice_id IN (SELECT id FROM public.invoices)
);

CREATE POLICY invoice_reviews_read ON public.invoice_reviews FOR SELECT TO authenticated
USING (
    invoice_id IN (SELECT id FROM public.invoices)
);

-- Payment Transactions: Suppliers see payments on their invoices; Finance sees all
CREATE POLICY payments_read ON public.payment_transactions FOR SELECT TO authenticated
USING (
    public.has_capability('finance.process')
    OR public.has_capability('report.view.executive')
    OR invoice_id IN (
        SELECT id FROM public.invoices
        WHERE supplier_id = public.get_user_supplier_id()
    )
);

-- Commercial Documents: Access controlled by ownership and authorization
CREATE POLICY documents_read ON public.commercial_documents FOR SELECT TO authenticated
USING (
    public.is_internal_staff()
    OR uploaded_by = auth.uid()
    OR (
        entity_type = 'INVOICE' AND entity_id IN (
            SELECT id FROM public.invoices WHERE supplier_id = public.get_user_supplier_id()
        )
    )
    OR (
        entity_type = 'CERTIFICATE' AND entity_id IN (
            SELECT c.id FROM public.certificates c
            JOIN public.purchase_orders po ON po.id = c.po_id
            WHERE c.status = 'ISSUED' AND po.supplier_id = public.get_user_supplier_id()
        )
    )
);

-- Notifications: Strictly user-scoped
CREATE POLICY notifications_select ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY notifications_update ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Audit Events: Read-only for authorized audit/executive roles; STRICTLY ZERO UPDATE OR DELETE
CREATE POLICY audit_select ON public.audit_events FOR SELECT TO authenticated
USING (public.has_capability('audit.view.all'));

CREATE POLICY audit_insert ON public.audit_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- System Settings: Read by all authenticated; manage by admin
CREATE POLICY system_settings_read ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY system_settings_write ON public.system_settings FOR ALL TO authenticated
USING (public.has_capability('config.manage'))
WITH CHECK (public.has_capability('config.manage'));

-- Idempotency Keys: User scoped
CREATE POLICY idempotency_policy ON public.idempotency_keys FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- 11. SYSTEM CONFIGURATION SEED (ROLES & CAPABILITIES ONLY)
-- ==============================================================================
-- ZERO OPERATIONAL MOCK DATA IS INSERTED HERE.
-- Only standard platform roles, capabilities, and settings are seeded.

INSERT INTO public.roles (code, name, description) VALUES
('PROJECT_ENGINEER', 'Project Engineer', 'Prepares commercial packages and drafts site acceptance certificates'),
('PROJECT_LEAD', 'Project Lead', 'First-level technical approval of commercial certifications'),
('HEAD_OF_PROJECTS', 'Head of Projects', 'Final authorization and official issuance of acceptance certificates'),
('SUPPLIER_USER', 'Supplier Commercial User', 'Accesses issued certificates and submits commercial invoices'),
('SCM_OFFICER', 'Supply Chain Specialist', 'Reviews submitted supplier invoices against certificates and POs'),
('FINANCE_OFFICER', 'Finance AP Officer', 'Processes SC-approved invoices and posts payment transactions'),
('EXECUTIVE_MANAGEMENT', 'Executive Management', 'Strategic read-only portfolio monitoring and exposure visibility'),
('SYSTEM_ADMIN', 'System Administrator', 'Manages system master data, configuration, and security settings')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.capabilities (code, category, description) VALUES
('package.import', 'Commercial', 'Import approved BOQ and PO commercial packages'),
('package.confirm', 'Commercial', 'Confirm and activate commercial package ingestion'),
('explorer.view', 'Commercial', 'Access global commercial explorer and search'),
('certificate.create', 'Certification', 'Create and draft site acceptance certificates'),
('certificate.approve.lead', 'Certification', 'Execute Project Lead approval on certificates'),
('certificate.approve.hop', 'Certification', 'Execute Head of Projects signoff on certificates'),
('certificate.issue', 'Certification', 'Officially issue approved certificates to suppliers'),
('certificate.void', 'Certification', 'Formally void an issued certificate'),
('invoice.create', 'Invoicing', 'Create supplier invoice claim from an issued certificate'),
('invoice.submit', 'Invoicing', 'Submit commercial invoice to Supply Chain'),
('invoice.review.sc', 'Supply Chain', 'Review submitted supplier invoices'),
('invoice.approve.sc', 'Supply Chain', 'Approve supplier invoice and forward to Finance'),
('invoice.return.sc', 'Supply Chain', 'Return deficient invoice to supplier with reasons'),
('finance.process', 'Finance', 'Move invoices through Finance accounting processing'),
('payment.post', 'Finance', 'Post discrete payment transaction disbursements'),
('payment.reverse', 'Finance', 'Execute auditable payment reversal transactions'),
('report.view.executive', 'Management', 'View strategic portfolio metrics and exposure reports'),
('config.manage', 'Administration', 'Manage system settings, templates, and numbering'),
('audit.view.all', 'Audit', 'Inspect comprehensive audit event logs')
ON CONFLICT (code) DO NOTHING;

-- Map capabilities to roles
DO $$
DECLARE
    v_lead_id UUID;
    v_hop_id UUID;
    v_supp_id UUID;
    v_scm_id UUID;
    v_fin_id UUID;
    v_mgmt_id UUID;
    v_admin_id UUID;
BEGIN
    SELECT id INTO v_lead_id FROM public.roles WHERE code = 'PROJECT_LEAD';
    SELECT id INTO v_hop_id FROM public.roles WHERE code = 'HEAD_OF_PROJECTS';
    SELECT id INTO v_supp_id FROM public.roles WHERE code = 'SUPPLIER_USER';
    SELECT id INTO v_scm_id FROM public.roles WHERE code = 'SCM_OFFICER';
    SELECT id INTO v_fin_id FROM public.roles WHERE code = 'FINANCE_OFFICER';
    SELECT id INTO v_mgmt_id FROM public.roles WHERE code = 'EXECUTIVE_MANAGEMENT';
    SELECT id INTO v_admin_id FROM public.roles WHERE code = 'SYSTEM_ADMIN';

    -- Project Lead Capabilities
    INSERT INTO public.role_capabilities (role_id, capability_id)
    SELECT v_lead_id, id FROM public.capabilities WHERE code IN ('package.import', 'package.confirm', 'explorer.view', 'certificate.create', 'certificate.approve.lead')
    ON CONFLICT DO NOTHING;

    -- Head of Projects Capabilities
    INSERT INTO public.role_capabilities (role_id, capability_id)
    SELECT v_hop_id, id FROM public.capabilities WHERE code IN ('package.import', 'package.confirm', 'explorer.view', 'certificate.create', 'certificate.approve.hop', 'certificate.issue', 'certificate.void')
    ON CONFLICT DO NOTHING;

    -- Supplier Capabilities
    INSERT INTO public.role_capabilities (role_id, capability_id)
    SELECT v_supp_id, id FROM public.capabilities WHERE code IN ('explorer.view', 'invoice.create', 'invoice.submit')
    ON CONFLICT DO NOTHING;

    -- Supply Chain Capabilities
    INSERT INTO public.role_capabilities (role_id, capability_id)
    SELECT v_scm_id, id FROM public.capabilities WHERE code IN ('explorer.view', 'invoice.review.sc', 'invoice.approve.sc', 'invoice.return.sc')
    ON CONFLICT DO NOTHING;

    -- Finance Capabilities
    INSERT INTO public.role_capabilities (role_id, capability_id)
    SELECT v_fin_id, id FROM public.capabilities WHERE code IN ('explorer.view', 'finance.process', 'payment.post', 'payment.reverse')
    ON CONFLICT DO NOTHING;

    -- Executive Management Capabilities
    INSERT INTO public.role_capabilities (role_id, capability_id)
    SELECT v_mgmt_id, id FROM public.capabilities WHERE code IN ('explorer.view', 'report.view.executive', 'audit.view.all')
    ON CONFLICT DO NOTHING;

    -- Admin Capabilities
    INSERT INTO public.role_capabilities (role_id, capability_id)
    SELECT v_admin_id, id FROM public.capabilities
    ON CONFLICT DO NOTHING;
END $$;

-- Default baseline system settings
INSERT INTO public.system_settings (key, value, description) VALUES
('reminder_intervals_days', '[2, 5]'::jsonb, 'Cadence in days for reminder alerts on un-invoiced certificates'),
('commercial_tolerance_amount', '1.00'::jsonb, 'Maximum permitted monetary variance between PO authorized sum and BOQ total'),
('aging_bucket_days', '[30, 60, 90]'::jsonb, 'Day thresholds defining payment aging overdue brackets')
ON CONFLICT (key) DO NOTHING;
