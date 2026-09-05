# CLMS Enterprise Release Checklist

**Product:** Commercial Lifecycle Management System (CLMS)  
**Status:** Pre-Release Operational Quality Gate  
**Authority:** Governed by `AGENTS.md` Section 8 & `PRODUCT.md` Section 48.

---

## 1. Quality & Code Health Verification

- [x] **Constitution Frozen:** `DESIGN.md`, `PRODUCT.md`, `ARCHITECTURE.md`, and `AGENTS.md` reviewed and adhered to without deviation.
- [x] **Static Typecheck:** `npm run typecheck` executed with 0 TypeScript compilation errors.
- [x] **Lint & Style Discipline:** `npm run lint` executed with 0 ESLint errors and 0 warnings (`--max-warnings 0`).
- [x] **Automated Test Suite:** `npm test` executed with 100% pass rate (65 tests across 15 suites).
- [x] **Production Bundle Build:** `npm run build` executed successfully without compilation errors.
- [x] **Zero Mock Data:** All runtime application components and dashboards boot from genuine database queries with calm empty states.
- [x] **Dead Code Purge:** Legacy prototype artifacts, unused temporary routes, and obsolete services removed.

---

## 2. Database & Migration Discipline

- [x] **Migration Versioning:** All schema changes encapsulated in sequential versioned files (`supabase/migrations/`).
  - `20260905140000_clms_foundation.sql`
  - `20260905150000_clms_commercial_core.sql`
  - `20260905160000_clms_enterprise_completion.sql`
- [x] **Schema Reproducibility:** Migrations capable of standing up a fresh environment from scratch without manual dashboard interventions.
- [x] **Relational Integrity:** Foreign keys enforce `ON DELETE RESTRICT` for all financial relationships (`invoices`, `certificates`, `purchase_orders`, `payment_transactions`).
- [x] **Database Constraints:** Numeric positive check constraints (`amount > 0`, `currency IN ('TZS', 'USD')`, unique reference indexes).
- [x] **Atomic Numbering:** External sequences (`CP-`, `FAC-`, `PAC-`, `DPC-`, `INV-`, `PV-`) generated via atomic PostgreSQL sequences.

---

## 3. Enterprise Security & Multi-Tenant Data Isolation

- [x] **Row Level Security (RLS):** Enabled and enforced on 100% of commercial and financial tables (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- [x] **Supplier Tenant Isolation:** Supplier users can only query and mutate records matching their authenticated `supplier_id`.
- [x] **Separation of Duties:**
  - Suppliers cannot approve their own invoices or certificates.
  - Projects users cannot post payments or approve supplier invoices.
  - SCM reviewers cannot execute payments.
  - Finance officers cannot alter issued certificate allocations.
- [x] **Private Storage Security:** All commercial documents (BOQs, POs, signed certificates, payment receipts) stored in private buckets accessible only via signed short-lived URLs.
- [x] **CSV Formula Injection:** Tabular exports sanitize dangerous formula triggers (`=`, `+`, `-`, `@`) via `sanitizeCsvValue()`.
- [x] **Secrets Scan:** Zero hardcoded API secrets, database connection strings, or service-role keys committed to source control.

---

## 4. Financial Calculation Safety & Concurrency

- [x] **Cumulative Certification Ceiling:** Cumulative certified value cannot exceed authorized PO value ($\sum Certified \le Authorized$).
- [x] **Invoice Entitlement Ceiling:** Invoiced claim cannot exceed valid invoiceable certificate amount ($Invoiced \le Certified$).
- [x] **Non-Overpayment Invariant:** Cumulative valid payment disbursements cannot exceed total payable claim ($\sum Payments \le Invoiced$).
- [x] **Payment Concurrency Locking:** `post_invoice_payment` utilizes row-level locking (`FOR UPDATE`) to serialize concurrent payments and prevent overdraft races.
- [x] **Append-Only Payment Ledger:** Disbursements recorded as discrete transaction records; zero direct scalar overwriting.
- [x] **Append-Only Audit Trail:** State transitions emit immutable audit records into `audit_events`. Zero UPDATE/DELETE permissions on audit tables.

---

## 5. Organizational & Production Deployment Gates

The following items are required prior to live commercial cutover:

- [ ] **Production Supabase Instance:** Provision dedicated Production backend isolated from UAT.
- [ ] **Corporate Identity (Microsoft Entra ID):** Configure SSO authentication boundary following Entra approval.
- [ ] **Production Email Gateway:** Configure corporate SMTP/SendGrid credentials for alert dispatch.
- [ ] **Domain & TLS Setup:** Bind approved corporate domain (pending IT DNS allocation).
- [ ] **Backup & Disaster Recovery Policy:** Establish automated daily backups with point-in-time recovery (PITR).
- [ ] **Business Sign-Off:** Complete and sign off UAT Plan (`docs/UAT_PLAN.md`).
- [ ] **Admin Bootstrap:** Seed initial internal platform administrators with verified corporate credentials.

---

## 6. Sign-Off & Release Authorization

| Gate Stage | Evaluated By | Status | Approval Date |
|:---|:---|:---:|:---|
| **Technical Implementation Gate** | Antigravity AI Engineer | **PASSED (UAT-Ready)** | 2026-09-05 |
| **Business User Acceptance (UAT)**| Commercial & SCM Leads | *Pending Execution* | — |
| **IT Security & Architecture Gate**| Enterprise Security Architect | *Pending Review* | — |
| **Production Cutover Authorization**| Executive Sponsor | *Pending UAT Sign-Off* | — |
