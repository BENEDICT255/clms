---
version: 1.0
name: CLMS-technical-architecture
product: Commercial Lifecycle Management System
status: active-constitution
authority: authoritative-for-technical-architecture
governed-by: [PRODUCT.md, DESIGN.md, AGENTS.md]
---

# CLMS Technical Architecture Specification

**Commercial Lifecycle Management System**  
*From commitment to settlement.*

---

## 1. Document Status & Authority Model

### 1.1 Scope & Purpose
`ARCHITECTURE.md` defines the end-to-end technical system architecture for CLMS. It establishes the technology stack, system boundaries, domain partitioning, database design, transaction boundaries, Row Level Security (RLS) architecture, storage design, document processing pipelines, security posture, and deployment topologies.

### 1.2 Constitutional Alignment
- Technical implementations governed by this document must realize the business behaviors defined in **`PRODUCT.md`** without omitting safeguards or adding unsanctioned business logic.
- Presentation layers must strictly mirror the visual language, design tokens, and interaction models defined in **`DESIGN.md` (v1.2 frozen)**.
- Engineering procedures must obey the implementation discipline and prohibitions defined in **`AGENTS.md`**.

---

## 2. Architectural Goals

1. **Absolute Financial Integrity:** Guarantee through mathematical invariants, transactional boundaries, and database check constraints that double-certification, over-invoicing, and overpayment are technically impossible.
2. **Zero-Trust Multi-Tenant Isolation:** Strictly isolate supplier data at the database layer (PostgreSQL RLS) such that compromised client code or API manipulation cannot breach tenant boundaries.
3. **Auditability & Provenance:** Provide 100% cryptographic and chronological traceability from payment transactions back through invoices, certificates, site allocations, POs, and original uploaded BOQ spreadsheets.
4. **Operational Simplicity (Modular Monolith):** Maximize developer velocity, transaction safety, and deployment reliability by avoiding distributed microservice complexity in early lifecycle phases.
5. **Portability & Enterprise Extensibility:** Maintain clean architectural boundaries between core commercial domain logic and platform infrastructure (Supabase, Auth, Storage) to permit future migration to corporate enterprise identity (Microsoft Entra ID) and ERP connectors.

---

## 3. Core Architectural Principles

- **Principle 1: Defense in Depth.** Validation must occur on three distinct tiers: (1) optimistic validation in React for immediate UI feedback, (2) structural and business invariant validation in the application domain layer, and (3) authoritative constraint and state machine enforcement inside PostgreSQL transactions.
- **Principle 2: Untrusted Client Boundary.** The web browser is an untrusted presentation surface. No client request containing raw user-supplied financial limits, roles, or claims is trusted without server-side validation.
- **Principle 3: Append-Only Financial Ledgers.** Monetary movements, status transitions, and audit events are strictly append-only. Modifying or deleting historic financial transactions is forbidden; corrections require explicit reversal transactions.
- **Principle 4: Explicit State Transitions.** State transitions are atomic business operations executed through validated remote procedure calls (RPCs), never raw client-driven SQL `UPDATE` queries.
- **Principle 5: Zero Synthetic Data in Production.** Production and development environments operate against genuine empty states and authenticated uploads. Mock datasets are strictly confined to automated unit/integration test harnesses.

---

## 4. System Context & Boundaries

```
                             UPSTREAM PROCUREMENT
                             ┌───────────────────┐
                             │     SUP / ERP     │
                             │ (Approved BOQ/PO) │
                             └─────────┬─────────┘
                                       │ Raw Files (.xlsx, .pdf)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLMS BOUNDARY                                     │
│                                                                             │
│  ┌───────────────────────┐             ┌──────────────────────────────────┐ │
│  │     Client Tier       │             │       Backend Platform           │ │
│  │   (React / Vite SPA)  │  HTTP/WSS   │          (Supabase)              │ │
│  │                       │<───────────>│                                  │ │
│  │ - Projects Workspace  │  JWT Auth   │ - Supabase Auth (Identity)       │ │
│  │ - Supplier Workspace  │             │ - PostgREST API (Data Access)    │ │
│  │ - SCM Workspace       │             │ - PostgreSQL 15+ (DB Engine)     │ │
│  │ - Finance Workspace   │             │   - Row Level Security (RLS)     │ │
│  │ - Management View     │             │   - Transactional RPCs           │ │
│  │ - Admin Console       │             │   - Append-Only Audit Log        │ │
│  └───────────────────────┘             │ - Supabase Storage (Private)     │ │
│                                        │ - Edge Functions (Headless Tasks)│ │
│                                        └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼ External Integrations (Future)
                             ┌───────────────────┐
                             │ Microsoft Entra ID│
                             │ Corporate Banking │
                             │ Email Delivery    │
                             └───────────────────┘
```

---

## 5. Trust Boundaries & Security Enclaves

```
[ UNTRUSTED ZONE ]                   [ TRUSTED APPLICATION ZONE ]           [ ISOLATED DATA ENCLAVE ]
┌────────────────┐                   ┌───────────────────────────┐          ┌───────────────────────┐
│ Browser Client │  HTTPS / TLS 1.3  │   Supabase Edge Network   │  pgproto │   PostgreSQL Engine   │
│ React SPA      │──────────────────>│   - API Gateway / Auth    │─────────>│   - RLS Enforcement   │
│ Local Storage  │   Anon Key + JWT  │   - Edge Functions        │  SSL     │   - Atomic RPC Locks  │
└────────────────┘                   │   - Storage Policy Engine │          │   - Encrypted Vault   │
                                     └───────────────────────────┘          └───────────────────────┘
```

- **Untrusted Zone:** The browser runtime. Holds only temporary access tokens and user profile state. Cannot bypass RLS or execute unauthorized RPCs.
- **Trusted Zone:** Supabase Edge runtime. Executes headless parsing, cryptographically signs PDF documents, and generates short-lived storage access tokens.
- **Data Enclave:** PostgreSQL database. Evaluates all data access against session claims, executes ACID transaction blocks, and logs append-only audit events.

---

## 6. Technology Stack

| Layer | Technology | Rationale & Selection Criteria |
|:---|:---|:---|
| **Frontend Framework** | **React 18+ (TypeScript)** | Industry standard, strong type safety, mature ecosystem. |
| **Build & Tooling** | **Vite** | Extremely fast HMR, optimized production rollup, clean ESM support. |
| **Styling & Tokens** | **CSS Custom Properties** | Zero-runtime CSS strictly implementing `DESIGN.md` v1.2 tokens. |
| **Server State & Cache**| **TanStack Query (React Query)**| Declarative caching, optimistic UI, automatic refetching, query deduplication. |
| **Client Routing** | **React Router v6+** | Declarative nested routing, role-based layout boundaries. |
| **Form Management** | **React Hook Form + Zod** | High performance, zero unnecessary re-renders, runtime schema validation. |
| **Icons** | **Lucide React** | Consistent, light-weight, clean enterprise iconography matching `DESIGN.md`. |
| **Database Engine** | **PostgreSQL 15+** | Uncompromising ACID compliance, native JSONB, rich indexing, enterprise RLS. |
| **Backend as a Service**| **Supabase** | Instant REST API, built-in Auth, S3-compatible private storage, edge execution. |
| **Document Processing** | **ExcelJS / SheetJS + PDFKit**| Robust binary spreadsheet parsing and server-side PDF generation. |
| **Testing Suite** | **Vitest + Testing Library + Playwright**| Blazing fast unit testing, resilient component testing, deterministic E2E. |

---

## 7. Modular Monolith Strategy & Domain Boundaries

CLMS avoids microservice fragmentation by adopting a **Modular Monolith** architecture. Domains are isolated through logical module boundaries within a single deployable unit:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLMS MODULAR MONOLITH                           │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ Module            │ Primary Domain    │ Key Responsibilities           │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ `identity`        │ Identity & Access │ Profiles, Roles, Capabilities  │
│ `commercial`      │ Ingestion & Scope │ Packages, BOQs, POs, Sites     │
│ `certification`   │ Acceptance & Ent. │ FAC, PAC, DPC, Approvals       │
│ `invoicing`       │ Billing & SCM     │ Claims, Supporting Docs, SCM   │
│ `settlement`      │ Finance & Ledger  │ Payments, Aging, Settlement    │
│ `documents`       │ Vault & Storage   │ Private Files, Checksums, URLs │
│ `audit`           │ Governance & Log  │ Append-Only Event Trail        │
│ `notifications`   │ Alerts & Comms    │ In-App Inbox, Email Adapters   │
└───────────────────┴───────────────────┴────────────────────────────────┘
```

- Modules communicate through explicit domain interfaces and service methods.
- Cross-domain database joins are permissible for performant queries, but cross-domain mutations must invoke domain application services.

---

## 8. Target Repository Structure

```
clms/
├── .github/                      # CI/CD workflows and quality gates
├── supabase/
│   ├── migrations/               # Canonical versioned SQL migrations
│   ├── tests/                    # Database pgTAP and RLS tests
│   └── functions/                # Supabase Edge Functions (Headless parsers)
├── src/
│   ├── app/                      # Application entry, router, and providers
│   │   ├── routing/              # Route definitions and role guards
│   │   └── providers/            # Auth, QueryClient, and Toast providers
│   ├── design-system/            # Strict realization of DESIGN.md v1.2
│   │   ├── tokens/               # CSS variables (colors, spacing, typography)
│   │   └── components/           # Base primitives (Button, Table, Drawer, etc.)
│   ├── domain/                   # Pure business logic (Framework-agnostic)
│   │   ├── commercial/           # Package and site calculation formulas
│   │   ├── certification/        # Cumulative certification invariant rules
│   │   ├── invoicing/            # Entitlement checks, status transitions
│   │   └── settlement/           # Payment balances, aging bucket logic
│   ├── application/              # Use cases and command orchestrators
│   │   ├── commercial/           # ImportCommercialPackageUseCase
│   │   ├── certification/        # IssueCertificateUseCase
│   │   ├── invoicing/            # SubmitInvoiceUseCase, SCMReviewUseCase
│   │   └── settlement/           # PostPaymentUseCase
│   ├── infrastructure/           # External adapters and Supabase clients
│   │   ├── supabase/             # Typed Supabase client and query helpers
│   │   ├── repositories/         # Concrete data repositories
│   │   ├── storage/              # Private S3/Storage bucket adapter
│   │   ├── parsers/              # Excel and PO parser adapters
│   │   └── generators/           # PDF document generation adapters
│   ├── features/                 # Role-based presentation workspaces
│   │   ├── commercial-packages/  # Ingestion wizards, preview screens
│   │   ├── commercial-explorer/  # Global search and 360° asset views
│   │   ├── certification/        # Certificate authoring, signoff, and detail
│   │   ├── supplier-portal/      # Supplier certificate inbox, invoice authoring
│   │   ├── supply-chain/         # SCM review queue, side-by-side inspection
│   │   ├── finance/              # Finance processing, payment modal, aging
│   │   ├── management/           # Executive portfolio metrics and charts
│   │   └── admin/                # Master data, configuration, user roles
│   └── shared/                   # Shared utilities, types, and constants
│       ├── types/                # Database generated types and domain DTOs
│       ├── errors/               # Standardized error hierarchy
│       └── utils/                # Date, currency, and string formatters
├── tests/                        # Unit, integration, and E2E test suites
│   ├── unit/                     # Domain and utility unit tests
│   ├── integration/              # Use-case and repository integration tests
│   └── e2e/                      # Playwright end-to-end browser journeys
├── PRODUCT.md                    # Authoritative business specification
├── DESIGN.md                     # Authoritative UI/UX design specification
├── ARCHITECTURE.md               # This technical architecture document
└── AGENTS.md                     # Non-negotiable implementation discipline
```

---

## 9. Frontend Architecture

### 9.1 Clean Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 PRESENTATION LAYER (React)                  │
│    Workspaces, Features, Screens, Components, Drawers       │
└──────────────────────────────┬──────────────────────────────┘
                               │ Invokes Use Cases / Hooks
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  APPLICATION LAYER (Hooks)                  │
│    TanStack Query Mutations, Form Schemas, Use Cases        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Coordinates Domain & Repos
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    DOMAIN LAYER (Pure TS)                   │
│   Entities, Value Objects, Financial Invariants, Math Rules │
└──────────────────────────────┬──────────────────────────────┘
                               │ Calls Storage & DB Adapters
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER (Data)                 │
│      Supabase Repositories, Edge Functions, Storage API     │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 State Management Paradigm
- **Server State:** Managed exclusively via **TanStack Query**. All remote records (POs, sites, certificates, invoices) are cached, invalidated, and refetched through structured query keys (e.g., `['certificates', { poId }]`).
- **Local Interactive State:** Handled via standard React `useState` or `useReducer` for transient UI states (e.g., open drawers, active table filters, pagination offsets).
- **Global Session State:** Minimal React Context providing the current authenticated user, assigned capabilities, and active workspace profile.

---

## 10. Design System Implementation Architecture

### 10.1 Centralized Token System
`DESIGN.md` v1.2 tokens are translated into a centralized root CSS stylesheet (`src/design-system/tokens/index.css`):
- **Colors:** Neutral canvas (`--color-surface-canvas: #FAFAFA`), card surface (`--color-surface-card: #FFFFFF`), ink (`--color-text-primary: #1A1D21`), borders (`--color-border-hairline: #E5E7EB`), and the controlled brand accent (`--color-brand-primary: #F37021`).
- **Typography:** Inter 400/500/600 with explicit tracking (`letter-spacing: -0.01em` on headings) and tabular numerals on all monetary columns (`font-variant-numeric: tabular-nums`).
- **Grid & Spacing:** 4px base scale (`--space-1: 4px`, `--space-2: 8px`, `--space-4: 16px`, etc.).

### 10.2 Component Primitives
A dedicated library of atomic primitives encapsulates token usage:
- `Button`: Compact heights (32px / 36px / 40px), hairline borders, brand-orange primary treatment.
- `Table`: Hairline borders, sticky header, right-aligned tabular financial values.
- `Drawer`: Linear-inspired contextual inspection panels sliding from the right, preserving search context.
- `StatusBadge`: Semantic color badges reflecting authoritative lifecycle states.
- `MoneyDisplay`: Standardized currency formatter ensuring currency code precedes tabular numbers with zero precision loss.

---

## 11. Application & Domain Layer

### 11.1 Pure Domain Logic
All financial arithmetic and boundary validations are written in pure TypeScript with **zero external dependencies** or React hooks:
- `calculateCumulativeCertified(previous: Money, current: Money): Money`
- `assertValidCertification(authorized: Money, cumulative: Money): void`
- `calculateOutstandingBalance(invoiced: Money, paid: Money): Money`
- `assertNonOverpayment(outstanding: Money, disbursement: Money): void`

### 11.2 Application Use Cases
Command handlers orchestrate multi-step business transactions:
```typescript
export class IssueCertificateUseCase {
  constructor(
    private certRepo: CertificateRepository,
    private docGenerator: DocumentGenerator,
    private auditRepo: AuditRepository,
    private notificationService: NotificationService
  ) {}

  async execute(command: IssueCertificateCommand): Promise<IssuedCertificateResult> {
    // 1. Verify capability and authorization
    // 2. Fetch certificate and check current state == APPROVED
    // 3. Re-verify financial ceiling against live database
    // 4. Generate official immutable PDF
    // 5. Commit state transition to ISSUED atomically
    // 6. Record append-only audit event
    // 7. Dispatch supplier notification
  }
}
```

---

## 12. Supabase & Relational Database Architecture

### 12.1 Schema Design Philosophy
- **Surrogate Keys:** `id UUID DEFAULT gen_random_uuid() PRIMARY KEY` for all relational joins.
- **Natural Business Keys:** Unique, human-readable numbers (`po_number`, `certificate_number`, `invoice_reference`) indexed for high-speed lookup.
- **Temporal Tracking:** `created_at TIMESTAMPTZ DEFAULT now()` and `updated_at TIMESTAMPTZ DEFAULT now()` on all mutable records.
- **Relational Integrity:** Strict foreign key constraints with `ON DELETE RESTRICT` to prevent orphaned commercial records.

### 12.2 Relational Entity Schema Overview

```
users (id, email, full_name, role_id, supplier_id, created_at)
suppliers (id, vendor_code, name, tax_id, is_active, created_at)
project_types (id, code, name, default_boq_template_id)
projects (id, project_type_id, name, code, created_at)
commercial_packages (id, project_id, package_ref, status, boq_doc_id, po_doc_id, confirmed_by, created_at)
purchase_orders (id, package_id, po_number, supplier_id, currency, authorized_amount, payment_terms_days)
boqs (id, package_id, template_version, total_amount, raw_file_path)
sites (id, site_id_ext, site_name, region, created_at)
po_sites (id, po_id, site_id, authorized_amount, scope_description)
certificates (id, po_id, certificate_number, cert_type, status, total_amount, issued_at)
certificate_site_allocations (id, certificate_id, po_site_id, previous_amount, current_amount, cumulative_amount)
certificate_approvals (id, certificate_id, approver_id, stage, decision, comments, created_at)
invoices (id, certificate_id, supplier_id, clms_reference, supplier_invoice_number, invoice_date, amount, status)
payment_transactions (id, invoice_id, reference_number, payment_date, amount, currency, evidence_doc_id, created_at)
audit_events (id, entity_type, entity_id, actor_id, action, pre_state, post_state, correlation_id, created_at)
commercial_documents (id, storage_bucket, storage_path, file_name, file_size, mime_type, sha256_hash, uploaded_by)
```

---

## 13. Row Level Security (RLS) Architecture

Row Level Security is the primary defense safeguarding multi-tenant supplier isolation and internal capability enforcement.

### 13.1 Helper Functions
```sql
-- Extracts active supplier_id from authenticated session
CREATE OR REPLACE FUNCTION auth.get_user_supplier_id() 
RETURNS UUID AS $$
  SELECT supplier_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Evaluates granular capability
CREATE OR REPLACE FUNCTION auth.has_capability(cap_name TEXT) 
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.role_capabilities rc
    JOIN public.users u ON u.role_id = rc.role_id
    WHERE u.id = auth.uid() AND rc.capability = cap_name
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### 13.2 Concrete RLS Policies

```sql
-- 1. Invoices Isolation Policy
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_read_policy ON public.invoices
FOR SELECT TO authenticated
USING (
  (auth.get_user_supplier_id() IS NOT NULL AND supplier_id = auth.get_user_supplier_id())
  OR auth.has_capability('invoice.review.sc')
  OR auth.has_capability('finance.process')
  OR auth.has_capability('report.view.executive')
);

CREATE POLICY invoices_supplier_insert ON public.invoices
FOR INSERT TO authenticated
WITH CHECK (
  auth.get_user_supplier_id() IS NOT NULL 
  AND supplier_id = auth.get_user_supplier_id()
  AND auth.has_capability('invoice.create')
);

-- 2. Audit Events Immutability Policy
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_read_policy ON public.audit_events
FOR SELECT TO authenticated
USING (auth.has_capability('audit.view.all'));

-- Strictly no UPDATE or DELETE policies defined for audit_events
```

---

## 14. Transaction Boundaries & Atomic RPC Operations

All operations involving state changes, financial calculations, or sequence generation execute within PostgreSQL functions marked `SECURITY DEFINER` and wrapped in ACID transactions.

### 14.1 Certificate Issuance RPC Pattern
```sql
CREATE OR REPLACE FUNCTION rpc_issue_certificate(
  p_certificate_id UUID,
  p_idempotency_key TEXT
) RETURNS JSONB AS $$
DECLARE
  v_cert RECORD;
  v_alloc RECORD;
  v_current_remaining NUMERIC;
BEGIN
  -- Acquire row lock to prevent concurrent modification
  SELECT * INTO v_cert FROM public.certificates 
  WHERE id = p_certificate_id FOR UPDATE;

  IF v_cert.status != 'APPROVED' THEN
    RAISE EXCEPTION 'Certificate is not in APPROVED state' USING ERRCODE = 'P0001';
  END IF;

  -- Verify each site allocation against live remaining balance
  FOR v_alloc IN 
    SELECT * FROM public.certificate_site_allocations WHERE certificate_id = p_certificate_id
  LOOP
    SELECT (ps.authorized_amount - COALESCE(SUM(csa.current_amount), 0))
    INTO v_current_remaining
    FROM public.po_sites ps
    LEFT JOIN public.certificate_site_allocations csa ON csa.po_site_id = ps.id
    LEFT JOIN public.certificates c ON c.id = csa.certificate_id AND c.status = 'ISSUED'
    WHERE ps.id = v_alloc.po_site_id
    GROUP BY ps.authorized_amount;

    IF v_alloc.current_amount > v_current_remaining THEN
      RAISE EXCEPTION 'Allocation exceeds remaining balance on site %', v_alloc.po_site_id USING ERRCODE = 'P0002';
    END IF;
  END LOOP;

  -- Transition state
  UPDATE public.certificates 
  SET status = 'ISSUED', issued_at = now() 
  WHERE id = p_certificate_id;

  -- Record audit event
  INSERT INTO public.audit_events (entity_type, entity_id, actor_id, action, post_state)
  VALUES ('CERTIFICATE', p_certificate_id, auth.uid(), 'CERTIFICATE_ISSUED', row_to_json(v_cert));

  RETURN jsonb_build_object('success', true, 'status', 'ISSUED');
END;
$$ LANGUAGE plpgsql;
```

---

## 15. Private Storage Architecture

- **Bucket Strategy:** Exactly one strictly private bucket named `commercial-documents`.
- **Directory Structure:** Organised by domain and entity:
  - `commercial-packages/{packageId}/{filename}`
  - `certificates/{certificateId}/issued_{certNumber}.pdf`
  - `invoices/{invoiceId}/signed_{invoiceRef}.pdf`
  - `supporting-docs/{invoiceId}/{docType}_{hash}.pdf`
  - `payments/{transactionId}/receipt_{ref}.pdf`
- **Access Control:** The storage bucket is inaccessible via public HTTP. The client requests a signed download URL (`supabase.storage.from(...).createSignedUrl(path, 300)`) valid for exactly 300 seconds, granted only after verifying that the requester has read access to the parent commercial entity.

---

## 16. Parser Architecture (Ingestion Engine)

```
                       UPLOAD RAW SPREADSHEET (.xlsx)
                                     │
                                     ▼
                       ┌───────────────────────────┐
                       │  File Integrity & Hash    │
                       └─────────────┬─────────────┘
                                     │
                                     ▼
                       ┌───────────────────────────┐
                       │   Template Detector       │
                       │   (Inspects Row/Cols)     │
                       └─────────────┬─────────────┘
                                     │ Resolves Adapter Version
                                     ▼
                       ┌───────────────────────────┐
                       │  BOQParserAdapter (v1.0)  │
                       │  - Extracts Site IDs      │
                       │  - Extracts Scopes/Rates  │
                       │  - Computes Line Totals   │
                       └─────────────┬─────────────┘
                                     │ Emits Structured DTO
                                     ▼
                       ┌───────────────────────────┐
                       │  Cross-Validation Engine  │
                       │  - Compares PO vs BOQ Sum │
                       │  - Verifies Supplier Code │
                       └─────────────┬─────────────┘
                                     │ Emits Clean DTO + Diagnostics
                                     ▼
                       HUMAN VERIFICATION & CONFIRMATION
```

- **Execution Context:** Headless parsing is executed in a secure server-side context (Edge Function or background worker) to guarantee deterministic memory safety and eliminate browser performance bottlenecks.
- **Fail-Safe Mechanism:** Any corrupted cell, missing site ID, or formula parse failure immediately aborts processing and returns structured diagnostic line numbers. No synthetic data is ever generated.

---

## 17. Document Generation Architecture (FAC / PAC / DPC / Invoice)

- **Headless PDF Engine:** Server-side document rendering utilizing versioned HTML/CSS templates compiled via a headless renderer.
- **Authoritative Data Injection:** Document generators consume verified database entity snapshots, injecting:
  - Official Certificate Sequence Number.
  - Helios Towers corporate header and formal document styling.
  - Complete tabular site schedule and certified monetary values.
  - Digital approval signature block displaying approver names, roles, and signoff timestamps.
- **Immutability Lock:** Once rendered, the PDF binary is committed to private storage, its SHA-256 hash is stored in `commercial_documents`, and the document is locked against mutation.

---

## 18. Notification Architecture

```
┌─────────────────────────┐
│ Commercial Domain Event │ (e.g., Certificate Issued)
└────────────┬────────────┘
             │ Writes to DB
             ▼
┌─────────────────────────┐      Realtime (WSS)      ┌─────────────────────────┐
│   notifications Table   │─────────────────────────>│  React Notification Bell│
└────────────┬────────────┘                          │  (In-App Inbox)         │
             │ Background Worker / Trigger           └─────────────────────────┘
             ▼
┌─────────────────────────┐
│  Email Channel Adapter  │ (Resilient queue, retries, deliverability tracking)
└─────────────────────────┘
```

- In-app notification records are authoritative and persistent.
- External delivery (Email, Teams) operates asynchronously via a background worker queue with built-in retry backoff, ensuring external delivery failures do not block database transactions.

---

## 19. Concurrency & Idempotency Architecture

1. **Idempotency Keys:** Client requests invoking mutations transmit a UUID `Idempotency-Key` header. An `idempotency_keys` table tracks execution state and caches responses, preventing duplicated actions caused by network timeouts.
2. **Pessimistic Locking:** State transitions that verify remaining financial limits use `SELECT ... FOR UPDATE` row-level locks on parent commitments (`purchase_orders`, `po_sites`, `invoices`).
3. **Database Sequences:** Sequence numbers use PostgreSQL `CREATE SEQUENCE` constructs wrapped in thread-safe formatting functions, guaranteeing zero collision under high-concurrency loads.

---

## 20. Error Handling & Standardized Error Hierarchy

```
ApplicationError (Base)
├── ValidationError (400 - Invalid user input, schema failure)
├── AuthenticationError (401 - Expired token, invalid session)
├── AuthorizationError (403 - Missing capability, tenant mismatch)
├── NotFoundError (404 - Entity does not exist)
├── ConflictError (409 - Concurrency collision, duplicate unique key)
├── FinancialInvariantError (422 - Over-certification, overpayment attempt)
├── ParserError (422 - Corrupted spreadsheet, template mismatch)
└── InternalServerError (500 - Unhandled runtime exception)
```

- Error responses return a uniform JSON schema: `{ code: string, message: string, details?: any, correlationId: string }`.
- Technical stack traces and internal database errors are stripped before reaching the client.

---

## 21. Environment & Deployment Architecture

```
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│     DEVELOPMENT (Dev)     │      │   USER ACCEPTANCE (UAT)   │      │     PRODUCTION (Prod)     │
├───────────────────────────┤      ├───────────────────────────┤      ├───────────────────────────┤
│ - Isolated Supabase DB    │      │ - Isolated Supabase DB    │      │ - Production Supabase DB  │
│ - Local / Test Storage    │      │ - Staging Private Storage │      │ - Prod Encrypted Storage  │
│ - Fast Schema Iteration   │      │ - Real-World Test Data    │      │ - Strict Governance & RLS │
│ - Debug Logging Active    │      │ - User Acceptance Testing │      │ - Full Audit & Alerting   │
└───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
```

- **Environment Separation:** Dev, UAT, and Prod reside in completely segregated Supabase projects with distinct connection strings and encryption keys.
- **Configuration Hygiene:** Environment variables are strictly partitioned:
  - Browser Client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - Server Edge: `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_SECRET`

---

## 22. Testing Strategy & Quality Assurance

```
┌─────────────────────────────────────────────────────────────┐
│                    TEST SUITE STRUCTURE                     │
├───────────────────┬───────────────────┬─────────────────────┤
│ Test Type         │ Target Layer      │ Tooling             │
├───────────────────┼───────────────────┼─────────────────────┤
│ Unit Tests        │ Domain & Utils    │ Vitest              │
│ Component Tests   │ Design System/UI  │ React Testing Lib   │
│ Integration Tests │ Application / DB  │ Vitest + Test DB    │
│ Security Tests    │ PostgreSQL RLS    │ pgTAP / Supabase CLI│
│ E2E Journeys      │ Full Lifecycle    │ Playwright          │
└───────────────────┴───────────────────┴─────────────────────┘
```

- **Mandatory CI Verification:** PR merges are blocked unless all test tiers achieve 100% pass rates.
- **RLS Penetration Testing:** Dedicated test suites authenticate as Supplier A and explicitly execute SQL statements attempting to select, update, or delete records belonging to Supplier B.

---

## 23. Technical Architecture Decision Records (ADRs)

### ADR 001: Architecture Pattern — Modular Monolith over Microservices
- **Decision:** Build CLMS as a single, modular TypeScript and PostgreSQL codebase.
- **Rationale:** Minimizes operational complexity, allows ACID transactions across commercial and financial boundaries, and eliminates distributed network failure modes.

### ADR 002: Backend Platform — Supabase & PostgreSQL
- **Decision:** Leverage Supabase for PostgreSQL, authentication, storage, and serverless edge functions.
- **Rationale:** Accelerates delivery while providing enterprise-grade PostgreSQL RLS and relational integrity out of the box.

### ADR 003: Multi-Tenancy Strategy — Row Level Security (RLS)
- **Decision:** Enforce supplier data isolation directly within the database via PostgreSQL RLS policies rather than application-layer filtering.
- **Rationale:** Guarantees zero data leakage even if application code contains defects or API routes are bypassed.

### ADR 004: Financial Calculation Authority — Database Revalidation
- **Decision:** Re-calculate and assert all financial limits (cumulative certification, outstanding balances) inside database transactions prior to commit.
- **Rationale:** Ensures financial invariants cannot be compromised by manipulated client-side states or network race conditions.

### ADR 005: Sequence Number Generation — PostgreSQL Sequences
- **Decision:** Generate official numbers (FAC, PAC, DPC, INV) using atomic database sequences.
- **Rationale:** Eliminates concurrency race collisions inherent in client-side calculation or `MAX() + 1` queries.

### ADR 006: Document Storage — Strictly Private Object Storage
- **Decision:** Disallow all public bucket access. Serve files exclusively via short-lived signed URLs.
- **Rationale:** Protects sensitive commercial contracts, tax invoices, and bank receipts from unauthorized access.

### ADR 007: UI Design Implementation — Pure CSS Variables matching DESIGN.md
- **Decision:** Translate `DESIGN.md` v1.2 tokens directly into centralized CSS variables without heavy UI frameworks.
- **Rationale:** Guarantees pixel-perfect compliance with Helios Towers brand restraint and eliminates UI dependency bloat.

---

## 24. Future Implementation Sequence

Implementation of the CLMS platform is formally structured across three sequential phases:

```
┌─────────────────────────────────────────────────────────────┐
│                 SUPER PROMPT 2: FOUNDATION                  │
│                                                             │
│ 1. Initialize React / TypeScript / Vite application shell.  │
│ 2. Implement DESIGN.md v1.2 tokens & core UI primitives.    │
│ 3. Setup Supabase project, core migrations, and Auth.       │
│ 4. Implement users, roles, capabilities, and RLS baselines. │
│ 5. Setup private Storage buckets and access helpers.        │
│ 6. Implement append-only audit log & numbering sequences.   │
│ 7. Establish unit and integration testing harnesses.        │
│ 8. Guarantee zero operational mock data.                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPER PROMPT 3: COMMERCIAL CORE                │
│                                                             │
│ 1. Commercial Package ingestion pipeline (BOQ + PO).        │
│ 2. Authoritative Excel BOQ parser & PO validation engine.   │
│ 3. Commercial Explorer & 360° global asset search.          │
│ 4. Certification engine (FAC / PAC / DPC creation).         │
│ 5. Multi-stage Projects approval & digital stamp workflow.  │
│ 6. Immutable certificate PDF generation & issuance.         │
│ 7. Supplier Workspace: Certificate inbox & invoice builder. │
│ 8. Supporting document attachments & invoice submission.    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│         SUPER PROMPT 4: CONTROL, FINANCE & HARDENING        │
│                                                             │
│ 1. Supply Chain review queue & structured return workflow.  │
│ 2. Finance processing queue & payment term management.      │
│ 3. Payment Ledger: Partial payments & non-overpayment rules.│
│ 4. Aging engine & terminal settlement reconciliation.       │
│ 5. Management Workspace: Transaction-backed portfolio KPIs. │
│ 6. Administration Console: Master data & system settings.   │
│ 7. Commercial Flow interactive visualization.               │
│ 8. Concurrency stress testing, RLS penetration, E2E audit.  │
└─────────────────────────────────────────────────────────────┘
```
