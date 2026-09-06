-- ==============================================================================
-- CLMS Master Data: Golden Fixtures (Target Project & Supplier Organization)
-- ==============================================================================
-- Run this in your Supabase SQL Editor to populate the initial Target Project
-- and Supplier Organization matching your golden test BOQ and PO documents.
-- ==============================================================================

-- 1. Insert Golden Supplier Organization: PRIME POWER T LTD
-- Matches PO 4500015358: Supplier ID S4.P01007, VAT 112252525
INSERT INTO public.suppliers (vendor_code, name, tax_id, is_active)
VALUES ('S4.P01007', 'PRIME POWER T LTD', '112252525', true)
ON CONFLICT (vendor_code) DO UPDATE
SET name = EXCLUDED.name,
    tax_id = EXCLUDED.tax_id,
    is_active = true;

-- 2. Insert Project Type: Site Improvement
INSERT INTO public.project_types (code, name, description)
VALUES ('SITE_IMPROVEMENT', 'Site Improvement', 'Site improvement, civil foundations, oversite aggregates, and concrete works')
ON CONFLICT (code) DO NOTHING;

-- 3. Insert Target Project: Site Improvement (Oversite Aggregates and Concrete)
INSERT INTO public.projects (project_type_id, code, name)
VALUES (
    (SELECT id FROM public.project_types WHERE code = 'SITE_IMPROVEMENT'),
    'PRJ-SI-001',
    'Site Improvement (Oversite Aggregates and Concrete)'
)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name;

-- ==============================================================================
-- Template: How to add any NEW Supplier Organization in the future:
-- ==============================================================================
-- INSERT INTO public.suppliers (vendor_code, name, tax_id, is_active)
-- VALUES ('VENDOR_CODE_HERE', 'Supplier Legal Name', 'Tax_Or_VAT_Number', true);

-- ==============================================================================
-- Template: How to add any NEW Target Project in the future:
-- ==============================================================================
-- INSERT INTO public.projects (project_type_id, code, name)
-- VALUES (
--     (SELECT id FROM public.project_types WHERE code = 'SITE_IMPROVEMENT'), -- or another project_type code
--     'PROJECT_CODE_HERE',
--     'Project Display Name'
-- );
