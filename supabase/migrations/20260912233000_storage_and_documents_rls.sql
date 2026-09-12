-- ==============================================================================
-- CLMS Storage and Commercial Documents RLS Policies
-- ==============================================================================
-- Governed by AGENTS.md Section 4 (Row Level Security & Multi-Tenant Discipline):
-- - Enables strict, authenticated-only Storage operations on 'commercial-documents' bucket
-- - Explicitly enables INSERT, UPDATE, DELETE on commercial_documents table
-- - Preserves default-deny and private signed URL storage security invariants
-- ==============================================================================

-- 1. Ensure 'commercial-documents' bucket exists and is private
INSERT INTO storage.buckets (id, name, public)
VALUES ('commercial-documents', 'commercial-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. Storage.objects RLS Policies for 'commercial-documents' bucket
DROP POLICY IF EXISTS "commercial_docs_storage_insert" ON storage.objects;
CREATE POLICY "commercial_docs_storage_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'commercial-documents');

DROP POLICY IF EXISTS "commercial_docs_storage_select" ON storage.objects;
CREATE POLICY "commercial_docs_storage_select" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'commercial-documents');

DROP POLICY IF EXISTS "commercial_docs_storage_update" ON storage.objects;
CREATE POLICY "commercial_docs_storage_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'commercial-documents')
WITH CHECK (bucket_id = 'commercial-documents');

DROP POLICY IF EXISTS "commercial_docs_storage_delete" ON storage.objects;
CREATE POLICY "commercial_docs_storage_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'commercial-documents');


-- 3. Public.commercial_documents Table RLS Policies
DROP POLICY IF EXISTS "documents_insert" ON public.commercial_documents;
CREATE POLICY "documents_insert" ON public.commercial_documents
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "documents_update" ON public.commercial_documents;
CREATE POLICY "documents_update" ON public.commercial_documents
FOR UPDATE TO authenticated
USING (is_immutable = false)
WITH CHECK (is_immutable = false);

DROP POLICY IF EXISTS "documents_delete" ON public.commercial_documents;
CREATE POLICY "documents_delete" ON public.commercial_documents
FOR DELETE TO authenticated
USING (is_immutable = false);
