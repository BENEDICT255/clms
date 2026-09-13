-- ==============================================================================
-- ALLOW INVOICE PACKET DOCUMENT TYPE
-- ==============================================================================
-- Migration: 20260913123000_allow_invoice_packet_document_type.sql
-- Description: Adds INVOICE_PACKET to the allowed document_type values in
--              commercial_documents table to persist unified submission packets.
-- ==============================================================================

ALTER TABLE public.commercial_documents 
DROP CONSTRAINT IF EXISTS commercial_documents_document_type_check;

ALTER TABLE public.commercial_documents 
ADD CONSTRAINT commercial_documents_document_type_check 
CHECK (document_type IN (
  'BOQ_SOURCE', 
  'PO_SOURCE', 
  'FAC_CERT', 
  'PAC_CERT', 
  'DPC_CERT', 
  'SUPPLIER_INVOICE', 
  'SIGNED_INVOICE', 
  'TAX_RECEIPT', 
  'PAYMENT_EVIDENCE', 
  'INVOICE_PACKET'
));
