-- ==============================================================================
-- ADD INVOICE NOTES COLUMN MIGRATION
-- ==============================================================================
-- Migration: 20260913120000_add_invoice_notes_column.sql
-- Description: Adds notes column to public.invoices table to support supplier
--              and commercial remarks during draft creation and lifecycle tracking.
-- ==============================================================================

ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS notes TEXT;
