# CLMS — End-to-End Commercial Lifecycle Test Plan

**Commercial Lifecycle Management System**  
*From commitment to settlement.*

---

## 1. Scope & Objective

This document defines the authoritative end-to-end manual and automated verification procedure for the CLMS commercial lifecycle across all four organizational tiers:

```
[ Projects ]                [ Supplier ]                 [ Supply Chain ]              [ Finance ]
   Import BOQ + PO             Acceptance Cert             Review Queue                  Payment Queue
         │                            │                           │                            │
         ▼                            ▼                           ▼                            ▼
Commercial Package  ──►  PAC/FAC Generation & Issue ──► Multi-Page Invoice Packet ──► Three-Way Match & Settle
```

Every test step uses **authentic commercial fixtures** located in `ACTULA/` and asserts strict invariant adherence without operational mock or fabricated data.

---

## 2. Test Fixtures & Preconditions

### 2.1 Authoritative Golden Master Fixtures
All testing must utilize the authentic files located in `ACTULA/`:
- **BOQ Workbook**: `Site Improvement( Oversite Aggregates and Concrete ) BOQ-16sites-Prime power_Reviewed (1).xlsx` (or alias `BOQ sample.xlsx`)
  - Template: `BOQ_TEMPLATE_SITE_IMPROVEMENT_V1`
  - Sites: Exact 16 sites across Tabora region
  - Total Authorized: `123,512,849.94 TZS` (reconciled line-by-line)
- **Purchase Order PDF**: `PO 4500015358 -16 Sites- Primepower.pdf` (or alias `PO sample.pdf`)
  - Order Number: `4500015358`
  - Supplier: `PRIME POWER T LTD` (ID: `S4.P01007`)
  - Currency: `TZS`
  - Payment Terms: `90 days`
  - Net Commitment: `123,512,849.94 TZS`
  - Total Incl. Tax: `145,745,162.93 TZS`
- **Acceptance Certificate Samples**:
  - `PAC sample.pdf` (9 pages: 2 certificate pages + 7 linked PO pages)
  - `FAC sample.pdf` (9 pages: 2 certificate pages + 7 linked PO pages)
- **Supplier Commercial Invoice Sample**:
  - `invoice sample.pdf` (11 pages: 1 page Supplier Invoice + 1 page EFD Fiscal Receipt + 9 pages Certificate Packet)

---

## 3. Four-Tier Execution Workflow

### Stage 1: Projects Department — Ingestion & Commercial Package

1. **Navigate to**: `Commercial Packages` (`/packages`).
2. **Action**: Click `+ New Package` to launch the Ingestion Wizard.
3. **Step 1: Upload Source Documents**:
   - Drag & drop `ACTULA/BOQ sample.xlsx`.
   - Drag & drop `ACTULA/PO sample.pdf`.
4. **Expected Behavior**:
   - Files are uploaded to private storage (`commercial-packages/{packageId}/source/`).
   - SHA-256 checksums are calculated and verified before parser execution.
   - Zero continuation on storage upload failure.
5. **Step 2: Cross-Validation & Reconciliation**:
   - Status transitions to `PARSED` then `READY_FOR_CONFIRM`.
   - 16 sites parsed: Nyalaja, Mabama, Usoke, Ndono, Bukene, etc.
   - Total Net Commitment: `123,512,849.94 TZS`.
   - Variance: `0.00 TZS` (exact match).
   - Payment terms extracted: `90 days` (zero `30` default).
6. **Step 3: Atomic Commitment**:
   - Click `Confirm & Commit Commercial Package`.
   - Executes `ingest_commercial_package_atomic` RPC.
   - Package status transitions to `ACTIVE`.

---

### Stage 2: Projects Department — Milestone Certification (PAC / FAC)

1. **Navigate to**: `Certificates` (`/certificates`).
2. **Action**: Click `+ New Certificate`.
3. **Step 1: Select Scope**:
   - Choose active package `PO 4500015358`.
   - Select Certificate Type: `PAC` (`PROVISIONAL ACCEPTANCE CERTIFICATE`).
   - Note: Wording must strictly state *Provisional Acceptance Certificate*, never *Preliminary*.
4. **Step 2: Allocate Certified Quantities**:
   - Allocate milestone percentages against specific sites (e.g. 100% on site 1 and 2).
   - System calculates `currentCertifiedAmount` with decimal safety.
5. **Step 3: Submit for Lead & HoP Approval**:
   - Submit for internal review.
   - Lead Approver (`certificate.approve.lead`) confirms.
   - Head of Projects (`certificate.approve.hop`) signs.
6. **Step 4: Upload Signed Certificate & Issue**:
   - Upload signed PDF sheet. Upload to private vault strictly verified before metadata write.
   - Click `Issue to Supplier`.
   - Certificate status transitions atomically to `ISSUED`.
   - Direct database fallback is strictly blocked; trusted RPC execution required.

---

### Stage 3: Supplier Portal — Invoicing & Unified Packet Compilation

1. **Navigate to**: `My Invoices` (`/invoices`) or `My Certificates` (`/supplier/certificates`).
2. **Action**: Find issued certificate `PAC-SI-26-XXXX` and click `Create Commercial Invoice`.
3. **Step 1: Commercial Position**:
   - Certified entitlement is auto-populated and locked: Net Base Amount, 18% VAT, Total Claim.
   - Enter `Supplier Legal Invoice Number`: e.g. `INV-2026-TZ-0042`.
   - Enter `Invoice Date`: defaults to current date.
4. **Step 2: Draft Creation & Document Attachment**:
   - Click `Save Draft`: status creates as `DRAFT` (no auto-submit).
   - Upload primary `Supplier Commercial Invoice` PDF. Green checkmark appears indicating real private storage write.
   - Upload optional `TRA Fiscal Receipt` PDF.
   - Upload optional `Supporting Annex` (delivery note, site photo).
   - Verify: user can view uploaded file sizes and remove/replace documents while in `DRAFT`.
5. **Step 3: Continuous Multi-Page Packet Preview**:
   - Click `Preview Packet`.
   - In-app `DocumentViewer` renders continuous vertical pages without IDM interception:
     - **Section A**: Uploaded Supplier Invoice (Page 1).
     - **Section B**: TRA Fiscal Receipt (Page 2) & Supporting annexes.
     - **Section C**: Issued Certificate Cover (Page 3) + Site Allocations (Page 4) + All 7 Pages of Linked PO `4500015358` (Pages 5–11).
   - Total Page Count: exactly 11 pages (matching `invoice sample.pdf`).
   - Zero pages omitted, zero hardcoded reviewer names.
6. **Step 4: Submission**:
   - Click `Confirm & Submit to Supply Chain`.
   - An immutable snapshot of the 11-page packet is committed to the vault.
   - Invoice transitions to `SUBMITTED`.

---

### Stage 4: Supply Chain Review Queue — Inspection & Three-Way Match

1. **Navigate to**: `Supply Chain Review` (`/supply-chain`).
2. **Action**: Click row with CLMS reference `INV-26-XXXXX`.
3. **Inspection Drawer**:
   - Commercial claim valuation: Net Base Amount + 18% VAT = Total Claim.
   - Click `View Packet`: in-app `DocumentViewer` opens the exact 11-page continuous submitted packet.
   - Zero requirement to navigate to external tabs or open individual files.
4. **Decision Paths**:
   - **Path A: Return for Correction**:
     - Select Return Reason: `INVOICE_NUMBER_MISMATCH` or `DOCUMENT_DEFECT`.
     - Enter reviewer comment.
     - Click `Return Invoice`. Status becomes `RETURNED`.
     - Supplier logs in, views return reason, reviews previous submission, replaces documents, and resubmits.
   - **Path B: Supply Chain Approval**:
     - Click `Approve & Transfer to Finance`.
     - Status transitions atomically to `SC_APPROVED`.
     - Invoice is immediately queued for Finance processing.

---

### Stage 5: Finance & Accounts Payable — Aging & Settlement

1. **Navigate to**: `Finance & Settlement` (`/finance`).
2. **Aging & Due Date Calculation**:
   - Baseline date: `sc_approved_at`.
   - Payment terms: strictly `90 days` from linked PO `4500015358` (zero `30` default).
   - Aging bucket: `CURRENT` (0–30 days from approval).
3. **Post Payment Transaction**:
   - Click `Post Payment`.
   - Enter payment amount (e.g. partial or full settlement).
   - Enter bank transfer / settlement reference number.
   - Invariant enforced: Cumulative payments can never exceed total payable amount (`Non-Overpayment Invariant`).
4. **Settlement Completion**:
   - When outstanding balance reaches `0.00 TZS`, status transitions to `SETTLED`.
   - Full immutable audit record is logged.

---

## 4. Quality & Compliance Checklist

| Phase | Gate | Criterion | Status |
|---|---|---|---|
| **Ingestion** | Golden BOQ | 16 sites, `123,512,849.94 TZS` | **PASS** |
| **Ingestion** | Golden PO | PO `4500015358`, 90 days terms, Prime Power | **PASS** |
| **Ingestion** | Strict Storage | Storage failure blocks ingestion | **PASS** |
| **Certification** | PAC Wording | *Provisional Acceptance Certificate* | **PASS** |
| **Certification** | Dynamic PO | Linked 7-page PO dynamically appended | **PASS** |
| **Certification** | Zero Hardcoding | No Benedict Bisama or fixed amounts | **PASS** |
| **Invoicing** | Draft State | Invoices initialize as DRAFT, no auto-submit | **PASS** |
| **Invoicing** | Real Uploads | Documents written to storage before metadata | **PASS** |
| **Invoicing** | 11-Page Packet | Section A + B + C continuous packet | **PASS** |
| **Invoicing** | Draft Discard | Clean deletion of draft and storage objects | **PASS** |
| **Viewing** | IDM Independence | In-app DocumentViewer renders Blobs directly | **PASS** |
| **Responsive** | 100% Zoom | 1366×768 desktop without clipped controls | **PASS** |
| **Finance** | Payment Terms | Actual PO terms (90 days), zero `30` fallback | **PASS** |
| **Security** | Zero Secret Leaks | Untracked `.env.local`, RLS default deny | **PASS** |
