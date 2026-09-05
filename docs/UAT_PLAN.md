# CLMS User Acceptance Testing (UAT) Plan

**Product:** Commercial Lifecycle Management System (CLMS)  
**Tagline:** *"From commitment to settlement."*  
**Document Version:** 1.0 — Enterprise Release Readiness  
**Authority:** Governed by `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`, and `AGENTS.md`.

---

## 1. Purpose & Scope
This document outlines the formal User Acceptance Testing (UAT) protocol for CLMS. UAT provides business stakeholders, project teams, supply chain specialists, financial controllers, and executive sponsors with structured verification scenarios confirming that the commercial lifecycle operates with absolute mathematical integrity, strict tenant isolation, and full auditability.

---

## 2. Environment Strategy & Test Data
- **Target Environment:** Dedicated `CLMS-UAT` Supabase environment built purely from versioned migrations (`supabase/migrations/`).
- **Zero Production Data Contamination:** UAT operates strictly against dedicated, isolated test fixtures. No real supplier confidential banking details, real contract spreadsheets, or production operational records are uploaded.
- **Environment Isolation:** Separate Supabase Project URL, JWT secrets, and private Storage buckets from Development and Production.

---

## 3. Test Personas & Capability Matrix

| Persona Identifier | System Role | Primary Assigned Capabilities | Expected Access Scope |
|:---|:---|:---|:---|
| **Persona-PRJ** | `PROJECT_LEAD` | `package.import`, `package.confirm`, `explorer.view`, `certificate.create`, `certificate.approve.lead` | Internal Projects scope; site discovery; cert preparation. |
| **Persona-HOP** | `HEAD_OF_PROJECTS` | `certificate.approve.hop`, `certificate.issue`, `certificate.void` | Internal Projects signoff and formal issuance to suppliers. |
| **Persona-SUP-A** | `SUPPLIER_USER` (Supplier A) | `invoice.create`, `invoice.submit` | Strictly isolated to Supplier A awarded POs, certs, and invoices. |
| **Persona-SUP-B** | `SUPPLIER_USER` (Supplier B) | `invoice.create`, `invoice.submit` | Strictly isolated to Supplier B awarded POs, certs, and invoices. |
| **Persona-SCM** | `SCM_OFFICER` | `invoice.review.sc`, `invoice.approve.sc`, `invoice.return.sc` | Queue of submitted supplier invoices across vendors. |
| **Persona-FIN** | `FINANCE_OFFICER` | `finance.process`, `payment.post`, `payment.reverse` | SCM-approved invoices, payment ledger, and cash settlement. |
| **Persona-MGT** | `EXECUTIVE_MANAGEMENT`| `report.view.executive`, `audit.view.all` | Real-time aggregate portfolio metrics (Read-only). |
| **Persona-ADM** | `SYSTEM_ADMIN` | `config.manage`, `audit.view.all` | Master settings, numbering preview, user bindings. |

---

## 4. Entry Criteria
- [x] All database migrations applied successfully in chronological order.
- [x] TypeScript compilation passes with zero errors (`tsc --noEmit`).
- [x] ESLint static analysis passes with zero warnings (`eslint . --max-warnings 0`).
- [x] Automated unit and concurrency test suite passes 100% (65 tests across 15 test files).
- [x] Production bundle builds successfully without compilation errors.
- [x] Authenticated users created for all 9 UAT personas.

---

## 5. Structured Test Scenarios

### Scenario 1: The Commercial Golden Path
**Objective:** Execute the unbroken end-to-end commercial lifecycle from contract import to terminal settlement.

1. **Step 1 (Projects):** Persona-PRJ uploads Approved Commercial Package (`CP-26-0001`) with matching BOQ spreadsheet and PO document (Authorized Value: TZS 140,000,000, Supplier: *Camusat Tanzania Ltd*). Confirms ingestion.
2. **Step 2 (Projects):** Persona-PRJ opens Commercial Explorer, searches for site `TZ-DAR-1042`, verifies Authorized Value (TZS 10,000,000) and Remaining Certifiable (TZS 10,000,000).
3. **Step 3 (Projects):** Persona-PRJ authors a Provisional Acceptance Certificate (PAC) for TZS 7,000,000 (70% milestone). Submits for Lead approval.
4. **Step 4 (Projects):** Persona-PRJ approves as Project Lead. State transitions to `PENDING_HOP_APPROVAL`.
5. **Step 5 (Head of Projects):** Persona-HOP applies HoP stamp and clicks *Issue Certificate*. Status shifts to `ISSUED`.
6. **Step 6 (Supplier A):** Persona-SUP-A logs in. Observes newly issued certificate in *My Certificates*. Clicks *Create Invoice*. Commercial details auto-populate. Persona-SUP-A enters external tax invoice number `TAX-2026-001`, attaches required documents, and submits.
7. **Step 7 (Supply Chain):** Persona-SCM logs in. Observes invoice in *Supply Chain Review Queue*. Clicks *Review*. Inspects 100% match against certificate. Clicks *Approve & Send to Finance*.
8. **Step 8 (Finance):** Persona-FIN logs in. Observes invoice in *Finance Queue*. Clicks *Pay*. Posts partial payment of TZS 60,000,000 under bank reference `EFT-CRDB-001`. Status shifts to `PARTIALLY_PAID`. Outstanding drops to TZS 40,000,000.
9. **Step 9 (Finance):** Persona-FIN posts final payment of TZS 40,000,000 under `EFT-CRDB-002`. Outstanding reaches TZS 0. Status shifts to `SETTLED`.
10. **Step 10 (Management & Audit):** Persona-MGT verifies portfolio metrics reconcile exactly: Cumulative Certified = 7.0M, Invoiced = 7.0M, Paid = 7.0M, Outstanding = 0. Auditor traces complete 360° lineage in Commercial Flow.

---

### Scenario 2: SCM Return & Supplier Resubmission Path
**Objective:** Verify non-destructive rejection, structured feedback transmission, and controlled supplier resubmission.

1. **Submission:** Persona-SUP-A submits invoice with clerical error in tax invoice reference.
2. **Review & Return:** Persona-SCM reviews claim, selects *Return to Supplier*, selects category `INVOICE_NUMBER_MISMATCH`, enters comment: *"Tax invoice reference TAX-INV-OLD does not match TRA fiscal receipt."*
3. **Status Shift:** Invoice status shifts to `RETURNED`. Notification is dispatched to Supplier A.
4. **Correction:** Persona-SUP-A opens invoice in Supplier portal, clicks *Resubmit*, enters corrected reference `TAX-INV-NEW`, and submits.
5. **Resubmission Queue:** Status shifts to `RESUBMITTED`. Invoice returns to Persona-SCM queue with full review history preserved.
6. **Approval:** Persona-SCM confirms correction and approves. Lineage reflects both review cycles.

---

### Scenario 3: Non-Overpayment Invariant & Concurrency Protection
**Objective:** Confirm that the database rejects overpayment attempts and serializes simultaneous disbursements.

1. **Test 3A (Overpayment Boundary):** An invoice has an outstanding balance of TZS 25,000,000. Persona-FIN enters disbursement amount of TZS 26,000,000.
   - *Expected Result:* System blocks mutation with `PAYMENT_EXCEEDS_OUTSTANDING_BALANCE`. Outstanding remains TZS 25,000,000.
2. **Test 3B (Concurrent Race Condition):** Two Finance officers simultaneously attempt to disburse the remaining TZS 25,000,000 on the same invoice.
   - *Expected Result:* Row locking (`SELECT ... FOR UPDATE`) serializes transactions. Officer 1 commits; Officer 2 is rejected with balance changed warning. Total disbursements never exceed invoiced liability.

---

### Scenario 4: Multi-Tenant Supplier Isolation
**Objective:** Confirm that no supplier user can access or discover data belonging to another supplier organization.

1. **Direct UI Test:** Persona-SUP-A attempts to view Supplier B certificates or search for Supplier B sites.
   - *Expected Result:* Zero cross-tenant records returned.
2. **Direct API / IDOR Attack Test:** Persona-SUP-A issues a direct database RPC/query requesting invoice or certificate UUID belonging to Supplier B.
   - *Expected Result:* PostgreSQL Row Level Security (RLS) policy blocks the read; returns empty result / 404.
3. **Private Document Test:** Persona-SUP-A attempts to access signed certificate storage URL belonging to Supplier B.
   - *Expected Result:* Access denied; private storage tokens scoped to authorized tenant.

---

### Scenario 5: Cumulative Milestone Certification (PAC $\rightarrow$ FAC)
**Objective:** Verify that incremental milestones cannot double-certify or exceed authorized commitments.

1. On site `TZ-KIL-009` (Authorized: TZS 10,000,000), issue PAC for TZS 7,000,000. Remaining balance drops to TZS 3,000,000.
2. Author subsequent FAC. Enter Current Certified Value = TZS 4,000,000.
   - *Expected Result:* System triggers validation block: maximum certifiable is TZS 3,000,000.
3. Enter TZS 3,000,000.
   - *Expected Result:* Commit succeeds; cumulative certified reaches TZS 10,000,000 (100%); remaining balance drops to TZS 0.

---

## 6. Exit Criteria & UAT Sign-Off

The system is declared **UAT-Passed** when:
1. 100% of Scenarios 1 through 5 pass without defect.
2. Zero unauthorized data leaks between supplier tenants.
3. All financial calculations and ledger balances reconcile with zero discrepancy.
4. Formal UAT sign-off is completed by business leads:

| Stakeholder Role | Representative Name | Decision (PASS / FAIL) | Signature / Date |
|:---|:---|:---:|:---|
| **Head of Projects** | *Designated HoP* | `[ ] PASS  [ ] FAIL` | ___________________ |
| **Head of Supply Chain**| *Designated SCM Lead* | `[ ] PASS  [ ] FAIL` | ___________________ |
| **Financial Controller** | *Designated Controller*| `[ ] PASS  [ ] FAIL` | ___________________ |
| **IT & Security Lead** | *Designated IT Lead* | `[ ] PASS  [ ] FAIL` | ___________________ |
