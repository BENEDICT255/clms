---
version: 1.0
name: CLMS-product-specification
product: Commercial Lifecycle Management System
tagline: "From commitment to settlement."
status: active-constitution
authority: authoritative-for-business-behavior
governed-by: [DESIGN.md, AGENTS.md, ARCHITECTURE.md]
---

# CLMS Product Specification

**Commercial Lifecycle Management System**  
*From commitment to settlement.*

---

## 1. Document Status & Authority Model

### 1.1 Document Role
`PRODUCT.md` is the authoritative specification for **what CLMS does**. It defines business terminology, operational boundaries, actors, capabilities, commercial workflows, lifecycle states, calculation logic, financial invariants, exception handling, and acceptance criteria.

### 1.2 Four-Document Precedence Model
The CLMS product and engineering constitution comprises four mandatory documents:

```
┌─────────────────────────────────────────────────────────────┐
│                    CLMS CONSTITUTION                        │
├──────────────────────────┬──────────────────────────────────┤
│ Document                 │ Governs / Authority              │
├──────────────────────────┼──────────────────────────────────┤
│ PRODUCT.md               │ Business behavior & rules (WINS) │
│ DESIGN.md (v1.2 frozen)  │ Visual language & UX (WINS)      │
│ ARCHITECTURE.md          │ Technical architecture (WINS)    │
│ AGENTS.md                │ Implementation discipline (WINS) │
└──────────────────────────┴──────────────────────────────────┘
```

**Precedence Rules:**
1. For any question of **business logic, calculations, workflow transitions, eligibility, permissions, or financial rules**, `PRODUCT.md` is strictly authoritative.
2. For any question of **visual presentation, typography, colors, layout, spacing, components, or UI interaction**, `DESIGN.md` is strictly authoritative.
3. If an illustrative mock value, sample table, or workflow sketch in `DESIGN.md` conflicts with `PRODUCT.md`, **`PRODUCT.md` wins for all business behavior**. `DESIGN.md` retains visual authority.
4. Neither implementation code nor architecture documents may introduce business rules not grounded in `PRODUCT.md`.
5. Where requirements are marked `[AWAITING BUSINESS CONFIRMATION]`, no engineer or agent may fabricate rules to fill the gap.

---

## 2. Product Identity & Corporate Parentage

| Attribute | Specification |
|:---|:---|
| **Product Name** | CLMS |
| **Full Title** | Commercial Lifecycle Management System |
| **Tagline** | *"From commitment to settlement."* |
| **Corporate Parent** | Helios Towers |
| **Operating Context** | Telecom infrastructure acquisition, construction, rollouts, power modernization, and passive site maintenance |
| **Primary Currency** | TZS (Tanzanian Shillings) with multi-currency extensibility (e.g., USD) |
| **Visual Tone** | Institutional confidence, calm light-theme surfaces, hairline precision, Helios Orange accent restraint |

---

## 3. Product Objective & Problems Solved

### 3.1 Core Purpose
CLMS establishes a unified, auditable, digital commercial lifecycle connecting already-approved Bill of Quantities (BOQ) and Purchase Order (PO) commitments through site certification, supplier invoicing, Supply Chain verification, Finance processing, payment execution, and final settlement.

### 3.2 Systemic Vulnerabilities Eliminated
CLMS replaces legacy, fragmented spreadsheet and paper workflows, eliminating:

1. **Repeated Commercial Data Entry:** Manually re-typing supplier details, site names, PO numbers, and line items across disparate documents.
2. **Disconnected Documents:** BOQ spreadsheets, PDF POs, scanned certificates, and paper invoices living in unlinked folders and email threads.
3. **Manual PO Traversal:** Searching across dozens of PO files to identify which PO authorizes work on a specific site.
4. **Opaque Certification History:** Inability to instantly determine cumulative certified progress on a tower site.
5. **Commercial Over-Certification:** Issuing certificates that exceed remaining authorized PO value or double-certifying provisional milestones.
6. **Supplier Over-Invoicing:** Submitting invoices for amounts exceeding certified entitlements or billing against uncertified sites.
7. **Invoice Duplication:** Resubmission of identical commercial claims under varied invoice numbers.
8. **Payment Ambiguity:** Inability to reconcile posted payments against specific invoices, certificates, and sites.
9. **Fragmented Audit Lineage:** Inability to trace an approved payment back to its underlying certificate, PO, BOQ, and approving officer.
10. **Unmonitored Commercial Exposure:** Lack of real-time visibility into Down Payment Certificate (DPC) exposure, un-invoiced certificates, and payment aging.

---

## 4. System Boundary

### 4.1 Upstream Boundary: SUP (Outside CLMS)
CLMS **does not** create BOQs, negotiate contracts, evaluate vendor tenders, or author/approve Purchase Orders. That upstream commercial procurement process occurs within the organization's existing procurement and ERP systems (collectively referred to as **SUP**).

```
UPSTREAM (OUTSIDE CLMS)               INSIDE CLMS BOUNDARY
┌────────────────────────┐            ┌──────────────────────────────────────────────┐
│       SUP / ERP        │            │                    CLMS                      │
│                        │            │                                              │
│ - Vendor Sourcing      │            │ 1. Import Approved Commercial Package        │
│ - Tender Evaluation    │ Transfer   │ 2. Digital Ingestion, Validation & Lineage   │
│ - BOQ Preparation      │───────────>│ 3. Commercial Explorer & Discovery           │
│ - BOQ Approval         │ Approved   │ 4. Site Certification (FAC / PAC / DPC)      │
│ - PO Generation        │ BOQ + PO   │ 5. Supplier Invoicing from Certificate       │
│ - PO Authorized Signoff│            │ 6. Supply Chain Review & Approval            │
└────────────────────────┘            │ 7. Finance Processing & Payment Ledger       │
                                      │ 8. Audit, Exposure & Final Settlement        │
                                      └──────────────────────────────────────────────┘
```

### 4.2 Explicit Boundary Rules
- **Rule SB-01:** An upstream BOQ and Purchase Order must both be **formally approved and authorized** prior to ingestion into CLMS.
- **Rule SB-02:** CLMS will not support arbitrary "draft PO authoring" or "blanket BOQ creation" unless a future constitutional amendment explicitly incorporates upstream procurement.
- **Rule SB-03:** The point of commercial inception within CLMS is the **Import of the Approved Commercial Package** (Approved BOQ + Approved PO).

---

## 5. Glossary of Authoritative Commercial Terms

- **Commercial Package:** An atomic pairing of exactly one approved BOQ document and its corresponding approved Purchase Order document representing a committed scope of work.
- **Bill of Quantities (BOQ):** The authoritative technical and financial schedule defining site locations, scopes, quantities, unit rates, and commercial line totals.
- **Purchase Order (PO):** The legally binding commercial authorization issued to a supplier detailing authorized total values, currencies, payment terms, and scope references.
- **Site:** A physical telecom tower or infrastructure facility identified by an authoritative Site ID (e.g., `TZ-DAR-1042`), Site Name, and Region.
- **Certificate:** A formal commercial instrument generated by the Projects team confirming that works on one or more specified sites under a PO have satisfied certification criteria.
- **FAC (Final Acceptance Certificate):** The certificate confirming final, total completion of contractual scope for the designated sites, unlocking final settlement.
- **PAC (Provisional Acceptance Certificate):** The certificate confirming provisional milestone completion of contractual scope for the designated sites, subject to retention or punch lists.
- **DPC (Down Payment Certificate):** A commercial certificate authorizing an advance or mobilization payment against an authorized PO prior to milestone site delivery.
- **Authorized Value:** The total monetary commitment allocated to a site or PO within an approved Commercial Package.
- **Previously Certified Value:** The cumulative monetary sum certified across all prior valid issued certificates for a given site or PO.
- **Current Certified Value:** The specific incremental monetary amount certified on the immediate certificate under preparation.
- **Cumulative Certified Value:** The mathematical sum of Previously Certified Value plus Current Certified Value ($Prev + Curr$).
- **Remaining Certifiable Value:** The uncertified commercial balance remaining on a site or PO ($Authorized - Cumulative$).
- **Certificate Allocation:** The discrete mapping of a certificate's financial value to a specific site within the parent PO.
- **Issued Certificate:** A certificate that has completed internal Projects approvals/signatures and has been published to the supplier workspace as an immutable commercial record.
- **Invoiceable Entitlement:** The net monetary value of an issued certificate against which a supplier is legally authorized to raise an invoice.
- **Commercial Lineage:** The unbroken bi-directional audit link connecting BOQ $\leftrightarrow$ PO $\leftrightarrow$ Site $\leftrightarrow$ Certificate $\leftrightarrow$ Invoice $\leftrightarrow$ Payment Transaction.
- **Supply Chain Review:** The commercial gatekeeping process wherein Supply Chain verifies invoice compliance against issued certificates and supporting documents.
- **Payment Ledger:** An immutable append-only transaction record tracking discrete disbursements posted against approved supplier invoices.
- **Outstanding Balance:** The remaining unpaid monetary liability on an approved invoice ($Invoiced\,Total - Cumulative\,Valid\,Payments$).
- **Final Settlement:** The terminal commercial state reached when an invoice has zero remaining outstanding balance ($Paid = Invoiced$).

---

## 6. Business Rule Classification System

To maintain absolute rigor, every requirement throughout CLMS is explicitly categorized under one of five authority tiers:

| Tier Code | Classification | Meaning & Implementation Mandate |
|:---|:---|:---|
| **[CONFIRMED]** | **Confirmed Business Rule** | Locked rule. Must be implemented exactly as written. Zero agent discretion. |
| **[CONFIGURABLE]**| **Configurable Business Rule** | Business logic is confirmed, but thresholds, labels, or periods are managed via administrative settings rather than hardcoded in source code. |
| **[AWAITING]** | **Awaiting Business Confirmation** | Rule is pending executive/legal confirmation. **Agents must not invent rules.** Systems must support structural placeholders while enforcing baseline financial safeguards. |
| **[FUTURE]** | **Future Capability** | Explicitly out of scope for initial core delivery, but architecture must not preclude future addition. |
| **[OUT_OF_SCOPE]**| **Out of Scope** | Explicitly forbidden from implementation. |

---

## 7. Actors, Roles & Workspaces

CLMS operates as a single unified enterprise platform featuring role-delineated workspaces. Users do not log into separate applications; access to views, data, and actions is governed by capabilities assigned to their active roles.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLMS PLATFORM INSTANCE                          │
├───────────────────────────────────┬────────────────────────────────────┤
│ Workspace                         │ Primary Actor Group                │
├───────────────────────────────────┼────────────────────────────────────┤
│ Projects Workspace                │ Project Engineers, Leads, HoP      │
│ Supplier Workspace                │ Authorized Supplier Personnel      │
│ Supply Chain Workspace            │ SCM Specialists, Category Managers │
│ Finance Workspace                 │ Financial Controllers, AP Officers │
│ Management Workspace              │ Directors, C-Suite, ExCo           │
│ Administration Workspace          │ System Administrators              │
└───────────────────────────────────┴────────────────────────────────────┘
```

### 7.1 Separation of Role from Capability `[CONFIRMED]`
- A **Role** is a logical container assigned to a user (e.g., `PROJECT_LEAD`).
- A **Capability** is a granular permission string (e.g., `certificate.approve.lead`).
- Business logic and UI gates must evaluate **Capabilities**, never hardcoded role names alone. This enables flexible enterprise delegation without code refactoring.

### 7.2 Actor Profiles & Workspace Responsibilities

#### 1. Projects Workspace (`PROJECTS`)
- Ingests approved BOQ and PO commercial packages.
- Reviews data extraction results and resolves import diagnostics.
- Discovers commercial records via Commercial Explorer and global search.
- Selects eligible sites and authors certifications (FAC / PAC / DPC).
- Enforces non-over-certification checks.
- Routes certificates through internal multi-stage signoff.
- Issues finalized, signed certificates to suppliers.

#### 2. Supplier Workspace (`SUPPLIER`)
- **Strictly isolated:** Accesses only records, documents, certificates, and invoices belonging to the user's bound Supplier organization.
- Inspects newly issued certificates.
- Generates compliant supplier invoices directly from issued certificates (auto-populating commercial data).
- Enters invoice-specific tax/invoice numbers and uploads mandatory supporting evidence.
- Previews, signs (or uploads signed version), and submits invoices.
- Tracks invoice status through Supply Chain, Finance, and payment stages.
- Resolves and resubmits invoices returned by Supply Chain.

#### 3. Supply Chain Workspace (`SUPPLY_CHAIN`)
- Ingests submitted invoices into the verification queue.
- Cross-examines invoice claims against parent certificates, POs, BOQs, site lists, and supporting attachments.
- **Returns** deficient invoices to the supplier with mandatory structured reasons.
- **Approves** compliant invoices, digitally transmitting them to the Finance processing queue.
- Audits historical review metrics and vendor compliance.

#### 4. Finance Workspace (`FINANCE`)
- Ingests Supply Chain-approved invoices into the financial processing queue.
- Validates commercial alignment, payment terms, and statutory details.
- Manages invoice processing statuses (Verification, Approved for Payment, Scheduled).
- Records discrete payment transactions (partial and full disbursements).
- Monitors invoice due dates, aging, and cash-flow obligations.
- Reconciles payments to achieve terminal settlement.

#### 5. Management Workspace (`MANAGEMENT`)
- Accesses strategic, read-only enterprise portfolio summaries.
- Monitors portfolio KPIs: Authorized PO Commitment, Total Certified, Invoiced Liability, Paid Cash, Outstanding Exposure, and DPC Exposure.
- Analyzes payment aging buckets, vendor exposure, and regional commitments.
- Audits commercial bottlenecks, processing cycle times, and exception frequencies.

#### 6. Administration Workspace (`ADMIN`)
- Configures master data: Suppliers, Project Types, Regions.
- Manages users, roles, and capability assignments.
- Configures numbering sequence rules, approval hierarchies, and document templates.
- Monitors system-wide audit logs, parser health, and security exceptions.

---

## 8. Capability Matrix

| Domain Capability | Projects | Supplier | Supply Chain | Finance | Management | Admin |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| `package.import` | **X** | | | | | **X** |
| `package.confirm` | **X** | | | | | |
| `explorer.view` | **X** | *(Scoped)* | **X** | **X** | **X** | **X** |
| `certificate.create` | **X** | | | | | |
| `certificate.approve.lead` | **X** | | | | | |
| `certificate.approve.hop` | **X** | | | | | |
| `certificate.issue` | **X** | | | | | |
| `certificate.void` | **X** | | | | | **X** |
| `invoice.create` | | **X** | | | | |
| `invoice.submit` | | **X** | | | | |
| `invoice.review.sc` | | | **X** | | | |
| `invoice.approve.sc` | | | **X** | | | |
| `invoice.return.sc` | | | **X** | | | |
| `finance.process` | | | | **X** | | |
| `payment.post` | | | | **X** | | |
| `payment.reverse` | | | | **X** | | |
| `report.view.executive`| | | | | **X** | **X** |
| `config.manage` | | | | | | **X** |
| `audit.view.all` | | | | | **X** | **X** |

---

## 9. Commercial Domain Model

The conceptual domain entities underpinning CLMS are structured as follows:

```
┌──────────────┐       1:M      ┌─────────────────────┐       1:M      ┌──────────────┐
│ Project Type │───────────────>│       Project       │───────────────>│  Commercial  │
└──────────────┘                └─────────────────────┘                │   Package    │
                                                                       └──────┬───────┘
                                                                              │ 1:1
                                        ┌─────────────────────────────────────┴────────┐
                                        │                                              │
                                        ▼ 1:1                                          ▼ 1:1
                             ┌─────────────────────┐                        ┌─────────────────────┐
                             │   Purchase Order    │                        │  Bill of Quantities │
                             └──────────┬──────────┘                        └──────────┬──────────┘
                                        │ 1:M                                          │ 1:M
                                        ▼                                              ▼
                             ┌─────────────────────┐                        ┌─────────────────────┐
                             │       PO-Site       │◄───────────────────────┤      BOQ-Line       │
                             │     Allocation      │      reconciles        └─────────────────────┘
                             └──────────┬──────────┘
                                        │ 1:M
                                        ▼
                             ┌─────────────────────┐
                             │  Certificate Site   │
                             │     Allocation      │
                             └──────────┬──────────┘
                                        │ M:1
                                        ▼
                             ┌─────────────────────┐       1:1 (Default)    ┌─────────────────────┐
                             │     Certificate     │───────────────────────>│       Invoice       │
                             │  (FAC / PAC / DPC)  │                        └──────────┬──────────┘
                             └─────────────────────┘                                   │ 1:M
                                                                                       ▼
                                                                            ┌─────────────────────┐
                                                                            │ Payment Transaction │
                                                                            └─────────────────────┘
```

### 9.1 Entity Catalog & Definitions

1. **User Profile:** Represents an authenticated individual, carrying profile metadata and mapping to active role assignments.
2. **Supplier:** Master commercial organization holding a unique Tax ID, corporate name, vendor code, and operational status.
3. **Project Type:** High-level operational classification (e.g., *Site Build*, *Modernization*, *Fibre Rollout*, *Maintenance*).
4. **Project:** Specific named corporate initiative or roll-out campaign tied to a Project Type.
5. **Commercial Package:** The authoritative aggregate pairing one approved BOQ and one approved PO.
6. **BOQ (Bill of Quantities):** The digitized representation of the approved scope schedule, tracking raw file provenance, template version, and line items.
7. **Purchase Order:** The commercial commitment record capturing PO Number, Supplier ID, Currency, Authorized Amount, and Payment Terms.
8. **Site:** Master telecommunications asset record identified by unique `site_id`, `site_name`, and `region`.
9. **PO-Site Allocation:** The join record establishing the exact authorized monetary value and scope allocated to a specific site under a specific PO.
10. **Certificate:** The commercial instrument certifying milestone completion (FAC, PAC, or DPC), capturing certificate number, approval state, and issued timestamp.
11. **Certificate Site Allocation:** Discrete record detailing the Previous, Current, and Cumulative certified amount for each site on a certificate.
12. **Certificate Approval Step:** Sequential signoff records capturing approver identity, role, timestamp, decision, and digital stamp metadata.
13. **Invoice:** The supplier claim document capturing CLMS reference, legal supplier invoice number, net amount, tax, and review state.
14. **Invoice Allocation:** The financial mapping of an invoice to its originating certificate entitlement.
15. **Invoice Review:** Audit log of reviews performed by Supply Chain, capturing approvals or rejection reasons.
16. **Payment Transaction:** An immutable record of actual funds disbursed, capturing reference number, payment date, amount, currency, and evidence.
17. **Audit Event:** Append-only system log capturing actor, timestamp, entity, action, pre-state, post-state, and correlation ID.
18. **Commercial Document:** Versioned metadata record tracking stored physical files (raw uploads, generated PDFs, signed attachments).
19. **System Setting / Configuration:** Key-value repository of administrative rules (e.g., reminder intervals, sequence patterns).

---

## 10. Core Entity Relationships & Cardinalities `[CONFIRMED]`

1. **Project to Commercial Packages:** One Project may contain **Many** Commercial Packages ($1:M$).
2. **BOQ to Purchase Order:** In the initial confirmed workflow, exactly **One BOQ corresponds to One Purchase Order** ($1:1$).
3. **Purchase Order to Sites:** One Purchase Order may cover **Many Sites** ($1:M$).
4. **Supplier to Commercial Entities:** A Supplier may be associated with **Many POs, Many Certificates, and Many Invoices** ($1:M$).
5. **Certificate to Purchase Order:** A Certificate is bound to exactly **One Purchase Order** ($M:1$). Mixing sites from different POs onto a single certificate is strictly prohibited.
6. **Certificate to Sites:** A Certificate may include **One or Many Sites** belonging to its parent Purchase Order ($1:M$).
7. **Invoice to Certificate:** In the confirmed default workflow, an Invoice originates from exactly **One Certificate** ($1:1$). The architecture retains underlying allocation records to support future split or consolidated invoicing without structural breaking changes.
8. **Invoice to Payment Transactions:** One Invoice may have **Many Payment Transactions** ($1:M$), supporting partial settlements over time.

---

## 11. Project Types & BOQ Template Strategy `[CONFIRMED]`

### 11.1 Template Polymorphism
The organization executes diverse infrastructure works. Each Project Type may utilize distinct BOQ spreadsheet layouts:

```
Project Type (e.g., Site Build) ───> BOQ Template (e.g., Master Build v1) ───> Parser Adapter v1.0
Project Type (e.g., Power Upgrade) ──> BOQ Template (e.g., Power Modernization v2) ──> Parser Adapter v2.1
```

### 11.2 Architectural Phasing
- **Phase 1 Delivery:** Focuses on proving end-to-end ingestion and lifecycle integrity using **one authoritative Master BOQ template**.
- **Extensibility Guarantee:** The domain layer isolates template-specific column lookups into versioned adapter schemas. Ingesting future project layouts requires registering a new parser schema, never modifying core commercial entities or financial calculation engines.

---

## 12. Commercial Package Ingestion Pipeline

Ingestion is the initial digital touchpoint in CLMS. Projects users import an approved BOQ and approved PO together as a unified Commercial Package.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMMERCIAL PACKAGE INGESTION PIPELINE                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. INITIATION: User selects Project and Project Type.                       │
│ 2. UPLOAD: User uploads approved BOQ (.xlsx) and approved PO (.pdf/.xlsx).  │
│ 3. FILE INTEGRITY: MIME type, file size, and SHA-256 hash generation.       │
│ 4. TEMPLATE RESOLUTION: System inspects headers against registered versions. │
│ 5. EXTRACTION: Headless server parser extracts commercial structures.       │
│ 6. NORMALIZATION: Data coerced into standard schema (Dates, Currencies).    │
│ 7. CROSS-VALIDATION: System reconciles PO values against BOQ site totals.   │
│ 8. DIAGNOSTIC REVIEW: Preview UI highlights extracted rows & discrepancies. │
│ 9. HUMAN CONFIRMATION: User explicitly verifies and confirms package.       │
│ 10. ATOMIC COMMIT: Transaction writes records and archives raw source files.│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 12.1 Source Provenance Retention `[CONFIRMED]`
- The raw source files (BOQ spreadsheet and PO document) are **never discarded or overwritten**.
- They are encrypted, stored in private object storage, and permanently linked to the resulting `commercial_package` record.
- Every extracted line item maintains traceability back to the source file name, sheet, and row offset.

---

## 13. Parser Safety & Integrity Invariants

The ingestion parser must adhere to the highest standard of commercial conservatism.

### 13.1 Non-Fabrication Rules `[CONFIRMED]`
1. **Rule PS-01 (No Synthetic Identifiers):** The parser must **never invent, assume, or synthesize** Site IDs, Site Names, PO Numbers, or Supplier Names. Generating fallback IDs such as `SITE-001` or `UNKNOWN_VENDOR` is strictly prohibited.
2. **Rule PS-02 (No Value Imputation):** If a financial cell or quantity is empty, corrupted, or unreadable, the parser must **never impute zero or average values**. It must flag the field as `MISSING_MANDATORY_VALUE`.
3. **Rule PS-03 (No Silent Row Dropping):** Unparsed or structurally malformed rows must not be silently omitted. Every row in the source file must be accounted for as parsed, ignored-by-rule (e.g., blank spacers), or flagged as an error.
4. **Rule PS-04 (No Fallback to Sample Data):** Under zero circumstances may a parser failure fall back to pre-packaged demo or mock datasets.

### 13.2 Parser Exception Classification `[CONFIRMED]`
- **BLOCKING:** Invalid document format, unreadable sheet, unresolvable template version, missing PO number, or corrupted currency values. Ingestion is completely halted.
- **REVIEW_REQUIRED:** Minor variance between PO total and BOQ aggregate sum, unrecognized column header, or duplicate site ID within same BOQ. The user is prompted to resolve or acknowledge before confirmation.

---

## 14. BOQ & PO Cross-Validation Rules `[CONFIRMED]`

Prior to commercial package confirmation, CLMS executes automatic cross-validation between the uploaded BOQ and PO:

1. **Supplier Consistency:** The supplier identified on the PO must match the supplier listed on the BOQ header.
2. **Commercial Value Alignment:** The gross authorized value on the Purchase Order must match the sum of all site line totals in the BOQ ($\sum Site\,Totals == PO\,Total$). A tolerance threshold (e.g., $\le 1.00$ TZS for rounding) may be configured, but discrepancies beyond tolerance raise a `COMMERCIAL_VALUE_MISMATCH` blocking exception.
3. **Currency Parity:** The currency code on the PO must match the BOQ currency. Multi-currency packages require explicit confirmation.
4. **PO Number Corroboration:** If the BOQ contains an embedded PO reference, it must match the uploaded PO document identifier.

---

## 15. Package Duplication & Versioning Rules `[CONFIRMED]`

- **Rule DP-01 (Unique PO Ingestion):** A Purchase Order Number cannot be ingested twice into active commercial packages. Attempting to upload an existing PO number prompts a duplicate alert.
- **Rule DP-02 (Superseding Revisions):** If an authorized commercial amendment occurs upstream (e.g., an amended PO or revised BOQ scope), the new package must be imported using an explicit **Supersede** action.
- **Rule DP-03 (Downstream Protection):** A Commercial Package that has already generated issued certificates or submitted invoices **cannot be deleted or superseded** without an administrative governance override that formally preserves all downstream audit links.

---

## 16. Commercial Explorer & Discovery Engine

Commercial Explorer is the primary navigation and search interface for Projects, Supply Chain, and Finance users, eliminating the need to memorize PO-to-site relationships.

### 16.1 Search Capabilities `[CONFIRMED]`
Users can search across the entire corporate portfolio using partial or exact queries against:
- **Site Identifier:** `TZ-DAR-1042`, `NYA-012`
- **Site Name:** `Nyalaja`, `Tabora Main`, `Kilimanjaro Tower`
- **Region / Geography:** `Lake Zone`, `Dar es Salaam`, `Arusha`
- **Supplier Corporate Name:** `Prime Power Ltd`, `Camusat Tanzania`
- **Purchase Order Number:** `4500015358`
- **Commercial Package Ref:** `CP-2026-0042`
- **Certificate Reference:** `FAC-SI-26-0004`
- **Invoice Reference:** `INV-26-0012`

### 16.2 360° Commercial Detail View
Selecting any search result opens a comprehensive detail view displaying:
1. **Asset Master:** Site ID, Site Name, Region, Coordinates (if present).
2. **Commercial Alignment:** Bound Project, Project Type, Supplier, and PO Number.
3. **Commitment Position:** Authorized Commercial Value (TZS).
4. **Certification Position:** Total Previously Certified, Active Drafts, and Remaining Certifiable Value.
5. **Invoicing Position:** Total Invoiced, Pending Supply Chain Review, Approved by SCM.
6. **Settlement Position:** Total Paid, Payment Evidence Refs, and Outstanding Payable Balance.
7. **Lineage Timeline:** Direct clickable links to the parent BOQ row, original PO, issued certificates, invoices, and payment receipts.

### 16.3 Search Security & Tenant Isolation `[CONFIRMED]`
- Supplier users querying the Commercial Explorer or global search are strictly restricted to records bound to their authenticated Supplier ID.
- Searching for another supplier's site, PO, or invoice returns zero results. No metadata leaks (such as match counts) are permitted.

---

## 17. Site Physical Readiness vs. Commercial Eligibility

### 17.1 Separation of Concerns `[CONFIRMED]`
- **Physical Site Readiness:** The determination of whether physical civil, structural, or electrical works have completed on site is conducted by field supervisors and technical teams **outside CLMS**.
- **Commercial Eligibility:** CLMS evaluates **financial eligibility only**—verifying whether a site has unexhausted authorized value under an active PO and checking for conflicting pending draft certificates.
- **User Discretion:** The Projects user utilizes CLMS search and filters to locate sites known to be physically ready, selecting them for certification. CLMS guarantees that selected sites cannot be commercially certified beyond their contractual limits.

---

## 18. Certificate Types & Authoritative Terminology

CLMS formally recognizes exactly three certificate types. These names are immutable:

| Abbreviation | Authoritative Full Title | Commercial Purpose |
|:---|:---|:---|
| **FAC** | **Final Acceptance Certificate** | Final, complete commercial acceptance of works on designated sites. Certifies terminal remaining entitlement and unlocks final invoicing. |
| **PAC** | **Provisional Acceptance Certificate** | Milestone or interim acceptance of works. Certifies provisional completion, preserving remaining commercial balance for final closure. |
| **DPC** | **Down Payment Certificate** | Mobilization or advance commercial disbursement issued prior to physical site milestone completion. |

*Forbidden Terminology:* Under no circumstances may system copy, code, or documentation refer to "Partial Acceptance Certificate" or "Defects Period Certificate".

---

## 19. Certification Creation & Scope Rules

### 19.1 Scope Boundaries `[CONFIRMED]`
- **Single PO Invariant:** A Certificate must cover sites belonging to **exactly one Purchase Order**. Combining sites from different POs onto one certificate is prohibited.
- **Multi-Site Capability:** A single certificate may encompass multiple sites belonging to the same parent PO (e.g., certifying 10 sites under a 20-site rollout package).

### 19.2 Creation Workflow
1. User clicks **Create Certification** within Projects Workspace.
2. User selects the target **Purchase Order**.
3. User selects the **Certificate Type** (FAC, PAC, or DPC).
4. System displays all sites linked to the PO along with their Authorized Value and Remaining Certifiable Value.
5. User selects one or more **Eligible Sites**.
6. User inputs either a **Percentage** or a **Monetary Amount** for each selected site.
7. System calculates total certification value, performs real-time financial invariant checks, and displays the commercial calculation breakdown.

---

## 20. PAC & FAC Financial Principles & Invariants

Certification calculations are strictly cumulative against the authorized commercial value of each site.

### 20.1 The Core Non-Double-Certification Rule `[CONFIRMED]`
**Under no circumstances may previously certified value be certified a second time.**

#### Illustrative Commercial Proof:
- **Authorized Site Value:** TZS 10,000,000
- **Step 1 (First PAC):** Projects certifies 70% milestone.
  - *Current Certified Amount:* TZS 7,000,000
  - *Cumulative Certified:* TZS 7,000,000
  - *Remaining Certifiable Balance:* TZS 3,000,000
- **Step 2 (Subsequent FAC):** Projects certifies final completion.
  - *Eligible Current Amount:* TZS 3,000,000 (The remaining balance)
  - *New Cumulative Certified:* TZS 10,000,000 ($7,000,000 + 3,000,000$)
  - *Remaining Certifiable Balance:* TZS 0
- **Forbidden Error:** The system must reject any attempt to enter a Current FAC amount of TZS 10,000,000 following a TZS 7,000,000 PAC, which would errantly inflate cumulative claims to TZS 17,000,000.

---

## 21. Mathematical Formulas for Certification Calculations

For each site $i$ allocated to a certificate $C$:

$$\text{Authorized Value: } A_i$$

$$\text{Previously Certified Value: } P_i = \sum_{c \in \text{Issued Certificates}} \text{Current Certified}(c, i)$$

$$\text{Remaining Certifiable Value: } R_i = A_i - P_i$$

$$\text{Current Certified Value: } C_i \quad (\text{User Input, constrained by } 0 < C_i \le R_i)$$

$$\text{New Cumulative Certified Value: } K_i = P_i + C_i$$

$$\text{Total Certificate Value: } V_C = \sum_{i \in C} C_i$$

### Invariant Checks:
1. For every site $i$: $C_i \le R_i$
2. For the entire certificate: $V_C \le \sum_{i \in C} R_i$
3. Percentage Equivalent: $\text{Current } \%_i = \left(\frac{C_i}{A_i}\right) \times 100$
4. Cumulative Percentage: $\text{Cumulative } \%_i = \left(\frac{K_i}{A_i}\right) \times 100 \le 100.00\%$

---

## 22. DPC (Down Payment Certificate) Rules & Status

### 22.1 Confirmed DPC Behavior `[CONFIRMED]`
- DPC is supported as a first-class certificate type.
- DPC requires an authorized Purchase Order and assigned Supplier.
- Total DPC value cannot exceed the overall authorized PO value.
- All DPC issuances, invoices, and payments are tracked in real-time as an active financial liability (**DPC Exposure**).

### 22.2 Items Awaiting Business Confirmation `[AWAITING]`
The following business rules are explicitly pending formal executive approval and must **not be invented**:
- *DPC Eligibility Percentage Limit:* (e.g., whether DPC is capped at 10%, 20%, or 30% of PO value).
- *Automatic Amortization / Recovery Formula:* Whether DPC is deducted pro-rata from subsequent PAC invoices or recovered as a lump-sum against the initial PAC.
- *Retention Deductions:* Specific contractual withholding percentages.
- **Mandate:** Until confirmed, DPC certificates record authorized advance amounts, create transparent liability records, and require manual offset entry upon subsequent invoicing if applicable.

---

## 23. Certificate Approval & Multi-Stage Signature Workflow

Before a certificate can be issued to a supplier, it must progress through an internal sequential signoff workflow.

```
┌──────────────┐     1. Prepare     ┌──────────────┐     2. Review      ┌──────────────┐     3. Sign & Issue ┌──────────────┐
│ DRAFT        │───────────────────>│ PENDING      │───────────────────>│ PENDING      │──────────────────>│ ISSUED       │
│ Prepared by  │                    │ PROJECT LEAD │                    │ HEAD OF      │                   │ Published to │
│ Project Eng  │                    │ APPROVAL     │                    │ PROJECTS     │                   │ Supplier     │
└──────────────┘                    └──────────────┘                    └──────────────┘                   └──────────────┘
                                           │                                   │
                                           │ Reject                            │ Reject
                                           ▼                                   ▼
                                    ┌──────────────┐                    ┌──────────────┐
                                    │ REJECTED     │                    │ REJECTED     │
                                    │ (Returns to  │                    │ (Returns to  │
                                    │ Draft State) │                    │ Draft State) │
                                    └──────────────┘                    └──────────────┘
```

### 23.1 Configurable Approval Routing `[CONFIGURABLE]`
- The standard approval hierarchy consists of **Project Lead** followed by **Head of Projects**.
- The number of approval gates, designated capabilities, and financial escalation thresholds (e.g., certificates $> 500M$ TZS requiring Director approval) are stored in configuration settings, not hardcoded.

### 23.2 Approval Audit Record & Visual Stamp `[CONFIRMED]`
Each signoff action captures:
- Authenticated User ID, Name, and Corporate Role.
- Action decision (`APPROVED` or `REJECTED`).
- Exact timestamp (UTC with local offset).
- Structured comments (mandatory on rejection).
- **Visual Stamp:** The generated certificate document embeds a formal digital signature block displaying the officer's name, role, and verification timestamp. *(Note: This stamp represents an internal enterprise commercial authorization and does not claim statutory electronic signature status unless formally accredited).*

---

## 24. Certificate Issuance & Immutability

### 24.1 Issuance Action `[CONFIRMED]`
Upon final signoff by the Head of Projects, the action **Issue Certificate** executes:
1. Certificate state shifts to `ISSUED`.
2. The generated certificate document (PDF) is finalized and marked **IMMUTABLE**.
3. Issued timestamp is recorded.
4. Real-time notification is transmitted to authorized Supplier users.
5. Certificate appears immediately in the supplier's **My Certificates** queue.

### 24.2 Correction of Issued Certificates `[CONFIRMED]`
- An `ISSUED` certificate **can never be directly modified or silently overwritten**.
- If a commercial error is identified post-issuance:
  1. The certificate must be formally **Voided** by an authorized Projects Lead or Admin (with mandatory justification logged).
  2. A certificate can only be voided if **no supplier invoice has been submitted against it**.
  3. Voiding immediately releases certified values back to the site's Remaining Certifiable balance.
  4. A replacement certificate may then be created under a new unique sequence number.

---

## 25. Supplier Invoicing Workflow from Certificate

Supplier invoice generation is strictly derivative: it begins from an **Issued Certificate**.

```
PROJECTS ISSUES CERTIFICATE 
    ↓
SUPPLIER INSPECTS "MY CERTIFICATES"
    ↓
SUPPLIER SELECTS "CREATE INVOICE"
    ↓
CLMS AUTO-POPULATES COMMERCIAL DATA (Supplier, PO, BOQ, Sites, Certified Value, Currency)
    ↓
SUPPLIER ENTERS INVOICE DETAILS (Supplier Tax/Invoice No, Invoice Date, Notes)
    ↓
SUPPLIER ATTACHES MANDATORY SUPPORTING EVIDENCE (Tax Invoices, Delivery Notes, Test Reports)
    ↓
PREVIEW & EXPORT (For manual wet-ink signing / company stamp where required)
    ↓
UPLOAD SIGNED COPY & SUBMIT TO SUPPLY CHAIN
    ↓
INVOICE STATE BECOMES "SUBMITTED" (Locked against further supplier editing)
```

### 25.1 Commercial Data Auto-Population `[CONFIRMED]`
The invoice entry screen automatically locks and populates:
- Supplier Legal Name and Tax ID.
- Parent Purchase Order Reference and BOQ Reference.
- Source Certificate Reference Number and Type (FAC/PAC/DPC).
- Full list of certified sites with individual certified amounts.
- Total Invoiceable Entitlement (Net commercial amount).
- Contractual Currency.

*Result:* The supplier is physically unable to alter the commercial billing amount or claim uncertified site values.

### 25.2 Supplier-Entered Fields `[CONFIRMED]`
- **Supplier Commercial Invoice Number:** The legal tax invoice number issued from the supplier's external accounting/ERP system.
- **Supplier Invoice Date:** Legal date of invoice issuance.
- **Tax / VAT Breakdown:** Value Added Tax calculations where applicable.
- **Supporting Attachments:** Mandatory files confirming tax registration, delivery signoffs, or test certifications.

---

## 26. Invoice Supporting Documents & Signature Preservations

### 26.1 Document Retention Architecture `[CONFIRMED]`
- **Generated Invoice Draft:** CLMS generates a standard, formatted invoice summary sheet based on certified data.
- **Signed External Copy:** If business policy mandates physical company stamping and signature, the supplier downloads the draft, applies signatures/stamps, and uploads the signed PDF.
- **Immutability:** Both the system-generated draft and the supplier-uploaded signed PDF are preserved in private storage with independent cryptographic checksums. Neither file replaces the other.

---

## 27. Invoice Submission & Controlled Revision Lifecycle

### 27.1 Submission State Lock `[CONFIRMED]`
Clicking **Submit Invoice** transitions the invoice from `DRAFT` to `SUBMITTED`.
- The record and its attachments become completely **read-only** to the supplier.
- The invoice immediately enters the **Supply Chain Review Queue**.

### 27.2 Return & Resubmission Lifecycle `[CONFIRMED]`
If Supply Chain identifies a clerical or documentary deficiency:
1. Supply Chain officer selects **Return to Supplier**, inputting a mandatory structured return code and detailed explanatory reason.
2. Invoice status shifts to `RETURNED`.
3. Supplier receives an immediate notification detailing the rejection grounds.
4. In the Supplier Workspace, the invoice unlocks for controlled editing (e.g., replacing an invalid tax receipt attachment or correcting an invoice number).
5. Crucially, the **commercial entitlement remains locked to the original certificate**.
6. When the supplier corrects the defect and clicks **Resubmit**, the status shifts to `RESUBMITTED`, logging an incremented submission version and returning to the Supply Chain queue.
7. The complete history of returns, comments, and resubmissions is permanently retained in the audit log.

---

## 28. Supply Chain Review & Approval

Supply Chain acts as the commercial gatekeeper before corporate funds are committed.

### 28.1 Review Workspace Context `[CONFIRMED]`
The Supply Chain review screen provides an integrated side-by-side inspection view:
- Submitted Supplier Invoice details and legal invoice number.
- Verified Issued Certificate, including Projects approval history.
- Original PO and BOQ line item allocations.
- Attached supporting documents rendered in an interactive viewer.
- Prior supplier invoice history on the same PO.

### 28.2 Authorized Decisions `[CONFIRMED]`
- **Approve Invoice:** SCM officer confirms full documentary compliance.
  - Status shifts to `SC_APPROVED`.
  - Reviewer ID, decision timestamp, and audit event are recorded.
  - The invoice is automatically transmitted to the **Finance Processing Queue**.
- **Return Invoice:** SCM officer returns invoice to supplier with mandatory comments (as detailed in Section 27.2).

---

## 29. Finance Processing & Payment Ledger

Finance is responsible for invoice settlement, managing payment terms, and posting disbursements.

### 29.1 Ingestion Gate `[CONFIRMED]`
**Finance receives only invoices that have achieved `SC_APPROVED` status.** Unapproved or returned invoices cannot be accessed for payment processing.

### 29.2 Finance Processing States `[CONFIRMED]`
1. `SC_APPROVED`: Ingested into Finance queue; awaiting controller review.
2. `UNDER_FINANCE_REVIEW`: Actively undergoing financial accounting verification.
3. `APPROVED_FOR_PAYMENT`: Vetted and scheduled for payment run.
4. `PARTIALLY_PAID`: One or more partial disbursements posted; outstanding balance remains.
5. `SETTLED`: Cumulative disbursements equal the total payable invoice amount.

---

## 30. Payment Transactions & Non-Overpayment Invariant

### 30.1 Immutable Payment Transactions `[CONFIRMED]`
Payments are never recorded as a simple mutable field on an invoice. Every disbursement is an immutable **Payment Transaction** record:
- Unique Transaction Reference (e.g., Bank EFT / TT Reference).
- Payment Date (Value date of bank transfer).
- Disbursed Amount and Currency.
- Paying Bank Account / Funding Source.
- Uploaded Bank Confirmation / Swift Evidence.
- Finance Officer ID and Timestamp.

### 30.2 Multi-Payment & Non-Overpayment Rules `[CONFIRMED]`
An invoice may be settled across multiple installments (partial payments).

#### Mathematical Payment Invariants:
For any invoice $I$:

$$\text{Total Payable: } T_I = \text{Invoiced Amount}$$

$$\text{Cumulative Paid: } P_I = \sum_{t \in \text{Valid Transactions}} \text{Amount}(t)$$

$$\text{Outstanding Balance: } O_I = T_I - P_I$$

$$\text{Disbursement Constraint: } \text{New Payment Amount } p \le O_I$$

**Core Invariant:** Under no circumstances may cumulative payments exceed the invoice payable total ($P_I \le T_I$). The database must reject any transaction attempting to disburse an amount greater than $O_I$.

---

## 31. Payment Terms, Due Dates & Aging Engine

### 31.1 Authoritative Term Sources `[CONFIRMED]`
Payment terms (e.g., Net 30, Net 45, Net 60) are derived directly from the **authoritative Purchase Order** ingested from SUP, or governed by master Finance configuration. They must never be manually typed or guessed.

### 31.2 Due Date Derivation `[CONFIRMED]`
$$\text{Due Date} = \text{Invoice Baseline Date} + \text{Payment Term Days}$$
*(The baseline date is typically the date of formal SC Approval or legal invoice date, as governed by Finance configuration).*

### 31.3 Aging Buckets `[CONFIGURABLE]`
Outstanding invoices are dynamically categorized into aging buckets based on days past due:
- Current (Not yet due)
- 1 – 30 Days Overdue
- 31 – 60 Days Overdue
- 61 – 90 Days Overdue
- 90+ Days Overdue

The day boundaries and bucket definitions are configurable via system settings.

---

## 32. Commercial Flow & 360° Lineage

Commercial Flow is an interactive horizontal visualization rendering the complete commercial trajectory of an asset:

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ PURCHASE     │─────>│ CERTIFICATE  │─────>│ SUPPLIER     │─────>│ PAYMENT      │
│ ORDER        │      │ (FAC/PAC/DPC)│      │ INVOICE      │      │ TRANSACTIONS │
│ 4500015358   │      │ FAC-26-0004  │      │ INV-26-0012  │      │ EFT-8839201  │
│ TZS 250.0M   │      │ TZS 75.0M    │      │ TZS 75.0M    │      │ TZS 75.0M    │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
       │                     │                     │                     │
       ▼                     ▼                     ▼                     ▼
[Source BOQ Ref]      [Signoff Audit]       [SC Review Log]       [Bank Evidence]
```

- **Dynamic Derivation:** Commercial Flow is not a static diagram; it is rendered in real-time from verified database foreign keys and transaction logs.
- **Drill-Through:** Clicking any node in the flow exposes the complete metadata, audit records, and source documents for that milestone.

---

## 33. Management & Portfolio Visibility

The Management Workspace aggregates real-time commercial commitments across the entire corporate portfolio. All figures are derived directly from transactional ledger entries—**never from static or manually entered metrics**.

### 33.1 Strategic Portfolio Metrics `[CONFIRMED]`
1. **Total Authorized Commitment:** $\sum \text{Authorized Value of all active Commercial Packages}$
2. **Total Certified Value:** $\sum \text{Value of all Issued Certificates}$
3. **Total Invoiced Liability:** $\sum \text{Value of all Submitted/Approved Invoices}$
4. **Total Paid Outflow:** $\sum \text{Value of all Valid Payment Transactions}$
5. **Outstanding Financial Liability:** $\text{Total Invoiced} - \text{Total Paid}$
6. **Total Uncertified Commitment:** $\text{Total Authorized} - \text{Total Certified}$
7. **Total DPC Exposure:** Net outstanding Down Payment disbursements awaiting operational liquidation.
8. **Operational Cycle Times:** Mean time from Certificate Issue to Invoice Submission; Mean time from SCM Review to Finance Settlement.

---

## 34. In-App Notifications & Alerting Rules

### 34.1 In-App Notification Model `[CONFIRMED]`
- Notifications are first-class database entities with attributes: `id`, `user_id`, `type`, `title`, `message`, `entity_type`, `entity_id`, `read_status`, and `created_at`.
- Mark as Read updates status; notifications are **never permanently deleted** from historical logs.

### 34.2 Core Trigger Events `[CONFIRMED]`
- `CERTIFICATE_ISSUED`: Sent to Supplier when Projects issues a certificate.
- `INVOICE_SUBMITTED`: Sent to Supply Chain queue when Supplier submits an invoice.
- `INVOICE_RETURNED`: Sent to Supplier when SCM returns an invoice, including comments.
- `INVOICE_SC_APPROVED`: Sent to Finance and Supplier upon SCM signoff.
- `PAYMENT_POSTED`: Sent to Supplier upon posting of a payment transaction.
- `APPROVAL_REQUIRED`: Sent to Project Lead or HoP when a certificate awaits signature.

### 34.3 Reminder Rules `[CONFIGURABLE]`
- Automated alerts reminding suppliers of issued certificates awaiting invoicing.
- The reminder cadence (e.g., initial alert at 2 business days, secondary at 5 business days) is a configurable setting, not hardcoded.

---

## 35. Complete State Machines & Lifecycle Transition Tables

Every commercial entity in CLMS moves through an explicit, controlled state machine. Direct or unauthorized database status updates are strictly prohibited.

### 35.1 Commercial Package State Machine

| Current State | Action | Next State | Authorized Capability | Preconditions | Side Effects |
|:---|:---|:---|:---|:---|:---|
| *None* | `package.upload` | `UPLOADED` | `package.import` | Valid file types, hashes computed | Raw files archived in storage |
| `UPLOADED` | `package.parse` | `PARSED` | `package.import` | Template resolved | Structured rows extracted |
| `PARSED` | `package.flag` | `DIAGNOSTIC_REVIEW`| `package.import` | Reconciliation mismatch detected | Exception logs generated |
| `PARSED` | `package.verify`| `READY_FOR_CONFIRM`| `package.import` | Cross-validation passes 100% | Human confirmation button enabled |
| `READY_FOR_CONFIRM`| `package.confirm` | `ACTIVE` | `package.confirm` | Explicit user confirmation | Sites & allocations created; Audit event written |
| `ACTIVE` | `package.amend` | `SUPERSEDED` | `package.manage` | Upstream amendment approved | Successor package ID linked; Historical links preserved |

### 35.2 Certificate State Machine

| Current State | Action | Next State | Authorized Capability | Preconditions | Side Effects |
|:---|:---|:---|:---|:---|:---|
| *None* | `cert.create` | `DRAFT` | `certificate.create` | Active PO, eligible sites selected | Allocations verified $\le$ Remaining |
| `DRAFT` | `cert.submit_lead`| `PENDING_LEAD_APPROVAL`| `certificate.create`| All site values $> 0$ | Lead notified; Document draft rendered |
| `PENDING_LEAD_APPROVAL`| `cert.lead_approve`| `PENDING_HOP_APPROVAL`| `certificate.approve.lead`| Lead role verified | Lead stamp applied; HoP notified |
| `PENDING_LEAD_APPROVAL`| `cert.lead_reject` | `REJECTED` | `certificate.approve.lead`| Mandatory comment entered | Author notified; Returned to draft |
| `PENDING_HOP_APPROVAL` | `cert.hop_approve` | `APPROVED` | `certificate.approve.hop` | HoP role verified | HoP stamp applied; Ready for issuance |
| `PENDING_HOP_APPROVAL` | `cert.hop_reject` | `REJECTED` | `certificate.approve.hop` | Mandatory comment entered | Returned to draft |
| `APPROVED` | `cert.issue` | `ISSUED` | `certificate.issue` | Valid immutable PDF generated | Supplier notified; Available in supplier portal |
| `ISSUED` | `cert.void` | `VOIDED` | `certificate.void` | No submitted invoices exist | Certified balance released; Audit logged |

### 35.3 Invoice State Machine

| Current State | Action | Next State | Authorized Capability | Preconditions | Side Effects |
|:---|:---|:---|:---|:---|:---|
| *None* | `inv.create` | `DRAFT` | `invoice.create` | Issued certificate selected | Commercial data auto-populated |
| `DRAFT` | `inv.submit` | `SUBMITTED` | `invoice.submit` | Tax invoice no & docs attached | Form locked; SCM notified |
| `SUBMITTED` | `inv.sc_return`| `RETURNED` | `invoice.return.sc` | Mandatory rejection code & reason | Supplier notified; Form unlocked |
| `RETURNED` | `inv.resubmit` | `RESUBMITTED` | `invoice.submit` | Corrected data/docs | SCM notified; Version incremented |
| `SUBMITTED` / `RESUBMITTED`| `inv.sc_approve`| `SC_APPROVED` | `invoice.approve.sc` | Full documentary match | Transmitted to Finance queue |
| `SC_APPROVED` | `inv.finance_review`| `UNDER_FINANCE_REVIEW`| `finance.process`| Ingested by AP team | Controller assigned |
| `UNDER_FINANCE_REVIEW`| `inv.finance_approve`| `APPROVED_FOR_PAYMENT`| `finance.process`| Tax & GL coding confirmed | Scheduled for payment run |
| `APPROVED_FOR_PAYMENT`| `inv.post_payment` | `PARTIALLY_PAID` | `payment.post` | Valid transaction $< Outstanding$| Ledger updated; Outstanding recalculated |
| `APPROVED_FOR_PAYMENT` / `PARTIALLY_PAID`| `inv.finalize_payment`| `SETTLED` | `payment.post` | Cumulative payments $== Invoiced$ | Terminal settlement reached |

---

## 36. Authoritative Financial Invariants

The following 13 financial invariants represent non-negotiable mathematical laws of CLMS. They must be enforced at the deepest layer of the system:

1. **Cumulative Certification Ceiling:** For any site under any PO, the cumulative sum of all issued certificate allocations must never exceed the authorized PO site value:
   $$\sum \text{Current Certified}_i \le \text{Authorized Value}_i$$
2. **Prior Certification Deduplication:** An already certified milestone (PAC or FAC) can never be re-certified. Current certification must only claim uncertified, remaining eligible balance.
3. **Strict Certificate Partitioning:** A certificate cannot encompass sites from more than one Purchase Order.
4. **Invoice Entitlement Ceiling:** The total invoiced value raised against a certificate must never exceed the net invoiceable entitlement of that certificate:
   $$\text{Invoiced Total} \le \text{Certificate Certified Value}$$
5. **Submitted Invoice Immutability:** Once an invoice is in `SUBMITTED`, `SC_APPROVED`, or `SETTLED` status, its commercial amount cannot be modified.
6. **Payment Ceiling (Non-Overpayment):** The cumulative sum of all valid payment transactions posted against an invoice must never exceed the invoiced payable total:
   $$\sum \text{Payment Transactions} \le \text{Invoiced Total}$$
7. **Append-Only Payment Ledger:** Payments cannot be updated or overwritten. Any payment correction must occur through a formal, auditable payment reversal transaction.
8. **Transactional Atomicity:** All financial state transitions and ledger updates must execute within isolated database transactions.
9. **Zero Frontend Authority:** All financial calculations, remaining balances, and eligibility states displayed in the UI must be independently verified and re-computed server/database-side prior to transaction commit.
10. **Concurrency Safety:** Concurrent certification or payment attempts against the same site or invoice must be serialized via database row locks to prevent balance overdrafts.
11. **Concurrency-Safe Sequence Generation:** All official sequence numbers (Certificates, Invoices, Packages) must be generated by atomic database sequences, never via client-side `MAX() + 1` logic.
12. **Explicit ISO Currency Binding:** Every monetary value must store an explicit ISO currency code (e.g., `TZS`). Cross-currency operations require formal exchange-rate tracking.
13. **Centralized Rounding Policy:** All financial calculations must adhere to a standardized half-up rounding policy to the nearest currency minor unit (or integer for TZS), enforced consistently across domain models and database functions.

---

## 37. Concurrency & Idempotency Requirements

1. **Double-Click & Network Retry Protection:** All mutation endpoints (Certificate Issue, Invoice Submission, Payment Posting) must accept an `idempotency_key`. Retried requests with the same key must return the cached authoritative result without creating duplicate records.
2. **Double-Certification Race Condition:** If two Projects users concurrently prepare certificates claiming the remaining balance of the same site, the database commit must acquire an exclusive row lock (`FOR UPDATE`) on the `po_sites` record. The first transaction commits; the second fails with a `CONCURRENT_CERTIFICATION_CONFLICT` business error.
3. **Double-Payment Race Condition:** Concurrent payment postings against an invoice must lock the target `invoices` record to verify remaining balance atomically before inserting into the payment ledger.

---

## 38. Enterprise Authorization & Multi-Tenant Data Isolation

### 38.1 Tenant Isolation for Suppliers `[CONFIRMED]`
- **Mandate:** Supplier users are strictly isolated to their bound Supplier Organization.
- **Enforcement:** Enforced at the database layer via PostgreSQL Row Level Security (RLS) policies.
- **Guarantee:** A supplier user cannot read, query, discover, or mutate any PO, BOQ, site allocation, certificate, invoice, payment, or audit log belonging to another supplier.

### 38.2 Internal Role Segregation (Separation of Duties) `[CONFIRMED]`
- **Projects Officers** cannot approve their own certificates (separation of Author and Approver).
- **Projects Officers** cannot post payments or approve supplier invoices.
- **Supplier Users** cannot approve or alter certificates, nor review their own invoices.
- **Supply Chain Officers** cannot post disbursements or modify payment records.
- **Finance Officers** cannot alter issued certificate amounts or modify PO commitments.
- **Administrators** cannot mutate commercial ledger values without explicit auditable system maintenance procedures.

---

## 39. Audit Trail & Immutability Architecture

### 39.1 Append-Only Audit Log `[CONFIRMED]`
CLMS maintains a dedicated, append-only `audit_events` log. Audit records are immutable: they cannot be updated or deleted by any user, including administrators.

### 39.2 Audit Record Structure
Every material event captures:
- `event_id`: Unique UUID.
- `timestamp`: UTC timestamp with microsecond precision.
- `actor_id`: Authenticated user UUID.
- `actor_role`: Active role during action execution.
- `entity_type`: Target entity (`COMMERCIAL_PACKAGE`, `CERTIFICATE`, `INVOICE`, `PAYMENT`).
- `entity_id`: Target entity primary UUID.
- `action`: Specific verb (`PACKAGE_CONFIRMED`, `CERTIFICATE_ISSUED`, `INVOICE_RETURNED`, `PAYMENT_POSTED`).
- `pre_state`: JSON snapshot of entity state prior to action.
- `post_state`: JSON snapshot of entity state after action.
- `correlation_id`: Distributed request/transaction tracing identifier.
- `metadata`: Additional contextual details (e.g., client IP, user agent, return reasons).

---

## 40. Document Management & Private Storage

1. **Zero Public Access:** All commercial documents (source spreadsheets, purchase orders, generated certificate PDFs, supplier invoice scans, payment proofs) are stored in **strictly private** object storage buckets.
2. **Access Control:** Files are accessible solely via short-lived, authenticated signed URLs generated on-demand following capability checks.
3. **Cryptographic Provenance:** Every stored document record tracks:
   - File Name and MIME Type.
   - Storage Key / Path.
   - Byte Size.
   - SHA-256 Checksum (verified upon upload).
   - Uploading Actor ID and Timestamp.
4. **Version Preservation:** Replacing or correcting a document creates a new version record; historical file versions are permanently retained for audit lineage.

---

## 41. Concurrency-Safe Numbering Specifications `[CONFIRMED]`

All external-facing document identifiers must be generated via atomic database sequences. Format patterns are configurable:

| Document Type | Default Number Pattern | Example | Generation Rule |
|:---|:---|:---|:---|
| **Commercial Package** | `CP-{YY}-{SEQ:4}` | `CP-26-0042` | Atomic DB Sequence, Year reset |
| **Final Acceptance Cert**| `FAC-{PROJ_TYPE}-{YY}-{SEQ:4}` | `FAC-SI-26-0004` | Atomic DB Sequence by Type/Year |
| **Provisional Acceptance**| `PAC-{PROJ_TYPE}-{YY}-{SEQ:4}` | `PAC-SI-26-0018` | Atomic DB Sequence by Type/Year |
| **Down Payment Cert** | `DPC-{PROJ_TYPE}-{YY}-{SEQ:4}` | `DPC-SI-26-0001` | Atomic DB Sequence by Type/Year |
| **CLMS Internal Invoice** | `INV-{YY}-{SEQ:5}` | `INV-26-00104` | Atomic DB Sequence, Year reset |
| **Payment Voucher Ref** | `PV-{YY}-{SEQ:5}` | `PV-26-00089` | Atomic DB Sequence, Year reset |

---

## 42. Data Retention & Immutability Policies `[CONFIRMED]`

1. **Zero Hard Deletion:** Commercial records that have participated in downstream workflows (e.g., an active package, an issued certificate, a submitted invoice) can **never be hard-deleted** from the database.
2. **State-Based Invalidation:** Corrections must utilize formal state transitions (`SUPERSEDED`, `VOIDED`, `REVERSED`).
3. **Draft Cleanup Exception:** Unconfirmed package drafts or unsubmitted invoice drafts older than a configurable retention threshold (e.g., 30 days) may be purged via automated background administrative routines.

---

## 43. Catalog of Configurable Business Rules `[CONFIGURABLE]`

The following business rules must be managed through configuration tables rather than hardcoded in source code:
1. **Approval Routing Hierarchy:** Assignment of approval roles and escalation thresholds for certificates.
2. **Supplier Notification Reminder Intervals:** Cadence for reminder notifications on un-invoiced certificates.
3. **Financial Tolerance Threshold:** Minor variance allowance between PO total and BOQ sum (e.g., $\le 1.00$ TZS).
4. **Payment Aging Bucket Boundaries:** Day ranges defining aging brackets (e.g., 30, 60, 90 days).
5. **Numbering Sequence Prefixes:** Configurable prefixes for certificates, packages, and invoices.
6. **Mandatory Supporting Document Types:** List of required file attachment categories per invoice type.

---

## 44. Catalog of Items Awaiting Business Confirmation `[AWAITING]`

The following operational and legal criteria are pending formal executive confirmation:
1. **DPC Financial Amortization Formula:** Whether down payments are deducted pro-rata across subsequent PAC milestone invoices or recovered in full against the first invoice.
2. **DPC Maximum Threshold:** Statutory or policy cap on down payment percentages per project type.
3. **Statutory Legal Invoice Numbering:** Whether CLMS internal invoice numbers satisfy local tax authority e-invoicing standards or if external supplier tax invoice numbers remain solely authoritative.
4. **Consolidated Multi-Certificate Invoicing:** Whether a supplier may consolidate multiple issued certificates onto a single invoice claim (initially locked to $1:1$).
5. **Statutory Withholding Tax Rules:** Exact tax withholding deductions to be automated within Finance processing.

---

## 45. Future Capabilities `[FUTURE]`

The following capabilities are planned for subsequent platform phases:
- **Corporate Single Sign-On (SSO):** Integration with Microsoft Entra ID / Okta enterprise identity.
- **Physical Site Inspection Integration:** Direct telemetry feed from mobile site auditing and civil acceptance tools.
- **Automated SUP/ERP Connectors:** REST/SOAP data pipelines for automatic PO and BOQ ingestion from upstream enterprise ERP.
- **Automated Bank Payment Gateways:** Direct integration with corporate banking APIs for Host-to-Host (H2H) payment dispatch.

---

## 46. Out of Scope `[OUT_OF_SCOPE]`

The following functions are explicitly excluded from the CLMS core platform:
- Tender bidding, vendor pre-qualification, and contract negotiation.
- Purchase Order authoring, editing, or upstream executive signoff.
- Warehouse inventory tracking and materials logistics management.
- Civil construction daily task scheduling and contractor labor dispatch.
- Corporate general ledger accounting and enterprise payroll processing.

---

## 47. Comprehensive Acceptance Scenarios

### Scenario A: Commercial Package Import & Ingestion
- **Context:** Projects engineer uploads approved BOQ spreadsheet and approved matching PO document for Project *Dar Modernization*.
- **Execution:** System validates file hashes, detects *Build Template v1*, extracts 14 site lines totaling TZS 140,000,000, and verifies equality with PO authorized total of TZS 140,000,000.
- **Verification:** System displays extracted rows with zero diagnostics; user clicks Confirm; atomic transaction creates `commercial_package`, `purchase_order`, and 14 `po_sites` records. Source files archived in private storage.

### Scenario B: Site Commercial Discovery via Commercial Explorer
- **Context:** Projects officer does not know which PO covers site `Nyalaja`.
- **Execution:** Officer types `Nyalaja` into Commercial Explorer.
- **Verification:** System returns matching site record within 200ms, exposing parent PO `4500015358`, Supplier *Prime Power Ltd*, Authorized Value TZS 12,000,000, Previously Certified TZS 0, and Remaining Certifiable TZS 12,000,000.

### Scenario C: Geographical Search Filtering
- **Context:** SCM manager searches for all commitments across `Tabora` region.
- **Execution:** User filters Commercial Explorer by Region = `Tabora`.
- **Verification:** System displays all authorized sites, active certificates, and pending invoices situated within Tabora, respecting user permissions.

### Scenario D: Supplier-Specific Commercial Search
- **Context:** SCM officer inspects commitments for vendor *Camusat*.
- **Execution:** User filters by Supplier = *Camusat Tanzania*.
- **Verification:** System aggregates total PO commitments, active certificates, and outstanding balances across all packages bound to Camusat.

### Scenario E: Cumulative Certification (PAC followed by FAC)
- **Context:** Site authorized value is TZS 10,000,000.
- **Step 1:** Projects issues PAC for TZS 7,000,000 (70%). Remaining balance drops to TZS 3,000,000.
- **Step 2:** Projects later creates FAC for remaining scope.
- **Verification:** System sets maximum certifiable limit to TZS 3,000,000. Entering TZS 4,000,000 triggers immediate validation block. Entering TZS 3,000,000 succeeds; new cumulative certified equals TZS 10,000,000 (100%); remaining balance drops to TZS 0.

### Scenario F: Prevention of Concurrent Over-Certification
- **Context:** Two Projects engineers simultaneously attempt to certify the remaining balance of TZS 5,000,000 on site `TZ-KIL-009`.
- **Execution:** User 1 submits cert for TZS 3,000,000. User 2 submits cert for TZS 4,000,000.
- **Verification:** Database row locking serializes transactions. User 1's transaction commits (remaining drops to TZS 2,000,000). User 2's transaction aborts with server error: `CERTIFICATION_EXCEEDS_REMAINING_BALANCE`. Over-certification is impossible.

### Scenario G: Down Payment Certificate (DPC) Issuance
- **Context:** Commercial package of TZS 500,000,000 authorized.
- **Execution:** Projects creates DPC for advance mobilization of TZS 50,000,000.
- **Verification:** System records DPC as active financial liability; approval routes to HoP; issued certificate appears in Supplier portal with clear DPC designation; system does not apply fabricated amortization logic.

### Scenario H: Certificate Issuance & Supplier Notification
- **Context:** HoP signs off on certificate `FAC-SI-26-0004`.
- **Execution:** Projects user clicks *Issue Certificate*.
- **Verification:** Certificate state shifts to `ISSUED`; document is cryptographically locked; notification is dispatched; certificate appears in Supplier portal under *My Certificates*.

### Scenario I: Supplier Invoicing from Issued Certificate
- **Context:** Supplier receives issued certificate `PAC-SI-26-0012` for TZS 45,000,000.
- **Execution:** Supplier clicks *Create Invoice*.
- **Verification:** CLMS auto-populates Supplier, PO, Certificate Ref, Sites, and Net Amount (TZS 45,000,000). Supplier enters external tax invoice number `TAX-INV-992`, attaches VAT receipt, and submits. Invoiced value cannot deviate from TZS 45,000,000.

### Scenario J: Supply Chain Rejection & Resubmission
- **Context:** Supplier submits invoice with illegible VAT receipt attachment.
- **Execution:** Supply Chain officer selects *Return to Supplier*, entering reason: `ILLEGIBLE_TAX_DOCUMENT`.
- **Verification:** Invoice shifts to `RETURNED`; supplier receives notification with rejection reason; supplier uploads clear document and clicks *Resubmit*; state shifts to `RESUBMITTED`; audit history logs both iterations.

### Scenario K: Supply Chain Approval & Finance Ingestion
- **Context:** SCM officer reviews compliant invoice `INV-26-0084`.
- **Execution:** Officer clicks *Approve & Send to Finance*.
- **Verification:** State shifts to `SC_APPROVED`; invoice vanishes from SCM pending queue and appears immediately in Finance processing queue.

### Scenario L: Partial Payments Leading to Full Settlement
- **Context:** Approved invoice of TZS 100,000,000.
- **Step 1:** Finance posts Payment 1 of TZS 60,000,000 (EFT Ref `EFT-001`).
  - *Result:* Invoice status shifts to `PARTIALLY_PAID`; Outstanding balance updates to TZS 40,000,000.
- **Step 2:** Finance posts Payment 2 of TZS 40,000,000 (EFT Ref `EFT-002`).
  - *Result:* Cumulative paid equals TZS 100,000,000; Outstanding balance reaches TZS 0; Invoice status shifts to `SETTLED`.

### Scenario M: Server-Side Block of Overpayment Attempt
- **Context:** Approved invoice with outstanding balance of TZS 25,000,000.
- **Execution:** Finance officer attempts to record payment transaction of TZS 30,000,000.
- **Verification:** Server-side transaction validation blocks execution with error: `PAYMENT_EXCEEDS_OUTSTANDING_BALANCE`. No ledger record is created; outstanding balance remains TZS 25,000,000.

### Scenario N: Multi-Tenant Supplier Data Isolation
- **Context:** Authenticated user belongs to *Supplier A*.
- **Execution:** User attempts to query API endpoint for invoice `INV-26-0099` belonging to *Supplier B*, or searches for Supplier B's site ID.
- **Verification:** PostgreSQL RLS policy filters query; system returns `404 Not Found` or empty dataset. Zero cross-tenant data exposure.

### Scenario O: Duplicate Commercial Ingestion Prevention
- **Context:** Projects user inadvertently attempts to import PO `4500015358` a second time.
- **Execution:** File validation parses PO number and checks against active database records.
- **Verification:** System immediately halts ingestion with error: `DUPLICATE_PURCHASE_ORDER_DETECTED`. No duplicate commercial records are created.

### Scenario P: End-to-End Audit Trail Traceability
- **Context:** Internal auditor inspects settled invoice `INV-26-0045`.
- **Execution:** Auditor views *Commercial Flow & Audit History*.
- **Verification:** System displays complete chronological provenance:
  $$\text{BOQ Line} \rightarrow \text{PO Commitment} \rightarrow \text{Site Allocation} \rightarrow \text{Certificate Preparation} \rightarrow \text{Lead Signoff} \rightarrow \text{HoP Signoff} \rightarrow \text{Issuance} \rightarrow \text{Supplier Submission} \rightarrow \text{SCM Approval} \rightarrow \text{Finance Ingestion} \rightarrow \text{Payment Transactions}$$
  Every step displays exact actor name, role, timestamp, and immutable source document links.

---

## 48. Definition of Done for Product Behavior

A product feature within CLMS is considered commercially and operationally complete **only** when all of the following criteria are satisfied:

1. **Constitutional Fidelity:** Full compliance with `PRODUCT.md` business rules and `DESIGN.md` visual tokens.
2. **Double-Layered Validation:** Validated client-side for immediate user feedback and strictly re-validated server/database-side within an isolated transaction.
3. **Database Constraint Enforcement:** Financial ceilings, foreign keys, uniqueness, and check constraints enforced in the relational schema.
4. **Row Level Security (RLS):** All data access governed by tested RLS policies guaranteeing supplier isolation and role least privilege.
5. **Append-Only Audit Coverage:** Every state transition and financial mutation writes an immutable audit record.
6. **Concurrency Safety:** Multi-user race conditions handled via database locking or atomic operations.
7. **Document Integrity:** Physical files preserved in private storage with SHA-256 checksums and short-lived signed access URLs.
8. **Automated Test Verification:** 100% test pass rate covering happy paths, edge cases, financial boundary invariants, and permission violations.
9. **Zero Operational Mock Data:** Features operate against genuine database records, with robust handling of legitimate empty states.
