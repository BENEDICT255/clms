---
version: 1.0
name: CLMS-agents-discipline
product: Commercial Lifecycle Management System
status: active-constitution
authority: authoritative-for-implementation-discipline
governed-by: [PRODUCT.md, DESIGN.md, ARCHITECTURE.md]
---

# AGENTS.md — Implementation & Engineering Discipline

**Commercial Lifecycle Management System**  
*From commitment to settlement.*

---

## 0. MANDATORY INSTRUCTIONS BEFORE MODIFYING CLMS

Every coding agent, developer, and automated assistant operating on this repository must execute these steps before writing any code:

1. **Read `PRODUCT.md`** from start to finish to understand business behavior, domain models, workflows, calculations, and invariants.
2. **Read `DESIGN.md` (v1.2 frozen)** to understand visual hierarchy, tokens, typography, interaction models, and UI components.
3. **Read `ARCHITECTURE.md`** to understand system boundaries, clean modular layers, Supabase integrations, security models, and transaction patterns.
4. **Read `AGENTS.md`** to understand non-negotiable coding rules, database discipline, testing requirements, and completion criteria.

---

## 1. Document Authority & Precedence Model

When engineering or implementing features in CLMS, respect the four-tier authority hierarchy:

```
┌─────────────────────────────────────────────────────────────┐
│                    AUTHORITY PRECEDENCE                     │
├──────────────────────────┬──────────────────────────────────┤
│ Domain Area              │ Authoritative Document           │
├──────────────────────────┼──────────────────────────────────┤
│ Business Rules & Logic   │ PRODUCT.md wins                  │
│ Visual Design & UX       │ DESIGN.md wins                   │
│ Technical Architecture   │ ARCHITECTURE.md wins             │
│ Implementation Rules     │ AGENTS.md wins                   │
└──────────────────────────┴──────────────────────────────────┘
```

### Conflict Resolution Protocol
- If code requirements appear ambiguous, **do not silently guess or improvise**.
- If `DESIGN.md` shows an illustrative workflow or financial example that differs from `PRODUCT.md`, **`PRODUCT.md` governs business behavior** while `DESIGN.md` governs visual layout and styling.
- If a requirement is labeled `[AWAITING BUSINESS CONFIRMATION]` in `PRODUCT.md`, you are strictly forbidden from implementing permanent logic or fabricating rules to bridge the gap.

---

## 2. The 28 Non-Negotiable "NEVER" Rules

Violations of any of the following rules represent an immediate constitutional breach:

1. **NEVER invent business rules.** If an edge case or commercial formula is unspecified, document it and seek confirmation.
2. **NEVER convert items marked `[AWAITING BUSINESS CONFIRMATION]` into permanent code.** Provide transparent structural placeholders and defensive bounds only.
3. **NEVER modify or deviate from `DESIGN.md`** simply because an alternative approach is easier or quicker in CSS/React.
4. **NEVER introduce operational mock or demo data.** The application must boot into genuine empty states. Test fixtures belong strictly in isolated test directories.
5. **NEVER hide parser failures using sample or fallback records.** If a file cannot be parsed, fail loudly with `PARSING_FAILED` and diagnostic logs.
6. **NEVER fabricate commercial data.** Never generate synthetic Site IDs (e.g., `SITE-001`), fictitious suppliers, or estimated PO values.
7. **NEVER expose the Supabase `service_role` key in frontend code.** Only publishable anonymous keys (`VITE_SUPABASE_ANON_KEY`) may enter browser bundles.
8. **NEVER bypass PostgreSQL Row Level Security (RLS).** Every table containing multi-tenant or sensitive commercial data must have active RLS.
9. **NEVER treat frontend route guards as security.** UI checks are for user experience; authorization must be strictly enforced at the database/server layer.
10. **NEVER scatter raw Supabase SQL queries or client calls across React presentation components.** Route all data access through the defined application/repository layer.
11. **NEVER allow React components to act as the authoritative financial domain layer.** Core business formulas and state validations must reside in pure domain modules and database functions.
12. **NEVER generate official commercial sequence numbers in the browser.** All certificate, invoice, and package numbers must originate from atomic database sequences.
13. **NEVER use `MAX(id) + 1` or `SELECT COUNT(*) + 1` for numbering.** Concurrency race conditions will produce collisions.
14. **NEVER trust browser calculations as authoritative financial writes.** The database must independently recalculate and verify balances before committing.
15. **NEVER execute a financial state transition without server/database-side validation.** Ensure transitions strictly obey state machine transition tables.
16. **NEVER silently modify an `ISSUED` certificate.** Corrections require formal voiding or superseding workflows.
17. **NEVER silently modify a `SUBMITTED`, `SC_APPROVED`, or `SETTLED` invoice.** Revisions must pass through formal return/resubmission channels.
18. **NEVER overwrite signed documents or source files.** Generated drafts and signed external uploads must coexist with independent checksums.
19. **NEVER silently replace historical commercial documents.** Always preserve file provenance and version lineage.
20. **NEVER casually hard-delete commercial or financial records.** Void, supersede, or archive records to preserve complete audit trails.
21. **NEVER weaken or delete failing tests to make a build pass.** Fix the root cause or correct obsolete test logic with clear justification.
22. **NEVER disable RLS or grant `public` permissions to "resolve" an authorization bug.** Correct the RLS policy or session claims.
23. **NEVER put `service_role` keys into `VITE_*` environment variables.**
24. **NEVER commit secrets, credentials, or `.env.local` files into source control.**
25. **NEVER configure public read access on commercial document storage buckets.** All documents require authenticated, signed URLs.
26. **NEVER execute a material workflow transition without generating an immutable audit event.**
27. **NEVER ignore concurrency or idempotency on financial mutations.** Prevent double-clicks and concurrent race conditions via database locks.
28. **NEVER invent DPC recovery or amortization formulas.** DPC is recorded as an advance exposure until executive rules are confirmed.

---

## 3. Database & Migration Discipline

### 3.1 Migration Management
- Every schema modification, table creation, index addition, RLS policy, and stored function must be encapsulated within a versioned SQL file inside `supabase/migrations/`.
- Migration filenames must follow the pattern: `YYYYMMDDHHMMSS_descriptive_action_name.sql`.
- Direct manual alterations to the production database schema via the Supabase Dashboard are strictly prohibited. The repository migrations must remain the single source of truth capable of standing up a fresh environment from scratch.

### 3.2 Relational Integrity & Strong Constraints
- **Primary Keys:** Standardize on UUIDs (`gen_random_uuid()`) for all core entity primary keys.
- **Foreign Keys:** Every child-to-parent relationship must enforce explicit `REFERENCES` constraints. Default to `ON DELETE RESTRICT` for all financial and commercial relationships to prevent cascading data loss.
- **Check Constraints:** Enforce domain rules directly in PostgreSQL:
  ```sql
  -- Examples of mandatory check constraints
  CONSTRAINT chk_positive_authorized_val CHECK (authorized_value >= 0),
  CONSTRAINT chk_positive_certified_val CHECK (current_certified_value > 0),
  CONSTRAINT chk_valid_iso_currency CHECK (currency IN ('TZS', 'USD'))
  ```
- **Concurrency Safety:** Wrap all multi-row financial mutations (e.g., certificate issuance, invoice submission, payment posting) inside PostgreSQL functions (`SECURITY DEFINER`) utilizing row-level locking (`SELECT ... FOR UPDATE`) to prevent race conditions.

---

## 4. Row Level Security (RLS) & Multi-Tenant Discipline

1. **Default Deny:** Enable RLS on every created table immediately (`ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;`).
2. **Tenant Isolation:** For tables containing supplier-scoped data (`invoices`, `supplier_documents`, etc.), enforce strict RLS policies referencing the authenticated user's bound `supplier_id`:
   ```sql
   CREATE POLICY supplier_isolation_policy ON invoices
     FOR ALL
     TO authenticated
     USING (
       auth.uid() IN (
         SELECT user_id FROM user_profiles 
         WHERE supplier_id = invoices.supplier_id
       )
       OR auth_has_capability('invoice.review.sc')
     );
   ```
3. **Internal Least Privilege:** Internal staff (Projects, SCM, Finance) can only perform mutations if their active role holds the specific required **Capability** registered in the database.
4. **Audit Immutability:** The `audit_events` table must have an RLS policy permitting `INSERT` via authorized triggers/RPCs, `SELECT` to authorized audit roles, and **strictly zero `UPDATE` or `DELETE` permissions** for anyone.

---

## 5. Frontend & UI Engineering Discipline

### 5.1 Design Token Adherence (`DESIGN.md`)
- Use centralized CSS custom properties or theme tokens defined in `src/design-system/tokens/`.
- **Zero Arbitrary Values:** Never introduce ad-hoc hex colors, arbitrary border radii, or unapproved spacing values.
  - *Correct:* `var(--color-brand-primary)`, `var(--space-4)`, `var(--radius-sm)`
  - *Forbidden:* `#ff6600`, `padding: 17px`, `border-radius: 13px`
- **Single Typography Family:** Utilize **Inter** exclusively across the interface. Use tabular figures (`font-variant-numeric: tabular-nums`) for all monetary amounts, percentages, quantities, and dates.
- **Helios Orange Accent Restraint:** Helios Orange (`#F37021`) is reserved exclusively for primary interactive calls-to-action and active highlight accents. Never use orange for backgrounds, structural cards, or large banners.

### 5.2 Component & Architectural Separation
- Presentation components must remain **pure and declarative**. They receive data and callbacks via typed props.
- Keep components focused and compact. Never embed multi-step parsing logic or complex financial formulas directly inside JSX button click handlers.
- Delegate all server mutations to typed application use-case services or TanStack Query hooks.

### 5.3 Mandatory UI States
Every asynchronous view, table, drawer, and form must explicitly handle:
1. **Loading State:** Tailored skeleton loaders matching the exact table or card dimensions (no generic jarring spinners).
2. **Empty State:** Calm, informative illustrations or clean typography explaining why no records exist and what action is required.
3. **Error State:** Human-readable error alerts displaying clear recovery steps, omitting raw technical stack traces.
4. **Unauthorized State:** Polite access denial banners guiding users to request necessary capabilities.

### 5.4 Form & Input Rigor
- Client-side validation using **Zod** schemas for instant user feedback.
- Server-side validation executed in RPCs/Edge Functions as the final authority.
- Disable submit buttons and show active loading indicators during in-flight mutations to prevent accidental double-submissions.

---

## 6. Testing Discipline

CLMS requires a rigorous automated testing pyramid. A feature is incomplete without passing test suites.

### 6.1 Required Testing Layers

```
        ▲
       / \         E2E Tests (Playwright)
      /   \        Critical happy paths from Import to Settlement
     /─────\
    /       \      Integration & Database / RLS Tests (Vitest + pgTAP)
   /         \     Multi-user concurrency, RLS isolation, atomic RPCs
  /───────────\
 /             \   Unit Tests (Vitest)
/               \  Financial math, invariant assertions, parsers, state machines
─────────────────
```

### 6.2 Mandatory Test Coverage Areas
1. **Financial Calculation Invariants:** Tests verifying that cumulative certified value never exceeds authorized value, and that PAC + FAC calculations do not double-certify.
2. **Non-Overpayment Tests:** Tests asserting that partial payments sum correctly and that overpayments are blocked at the database boundary.
3. **Parser Safety Tests:** Tests verifying that corrupted, incomplete, or malicious BOQ spreadsheets fail safely with zero fabricated data.
4. **RLS & Multi-Tenant Tests:** Direct automated queries simulating Supplier A attempting to read or manipulate records belonging to Supplier B.
5. **State Machine Integrity:** Tests verifying that unauthorized state jumps (e.g., jumping an invoice directly from `DRAFT` to `SC_APPROVED`) are rejected.
6. **Atomic Sequence Generation:** Concurrency tests executing rapid parallel requests to ensure certificate numbering never generates duplicate values.

### 6.3 Test Fixture Isolation
- All tests must operate against dedicated, isolated test fixtures.
- Test fixtures must be purged or sandboxed per run.
- **Never insert test fixtures into production databases or use mock operational records.**

---

## 7. Operational Cleanliness & Secrets Management

1. **Zero Secret Leaks:** Never log, print, or commit API keys, database connection strings, or JWT tokens.
2. **Environment Separation:** Keep development, UAT, and production configurations strictly isolated.
3. **Git Hygiene:** Maintain clean, atomic commits with conventional commit prefixes:
   - `feat:` New capability or domain workflow
   - `fix:` Correction of a bug or invariant violation
   - `docs:` Documentation, specifications, or architectural updates
   - `refactor:` Code restructuring without functional changes
   - `test:` Addition or modification of automated tests
   - `chore:` Tooling, dependency, or configuration updates

---

## 8. Definition of Complete (Completion Discipline)

An agent must **never** claim a task, prompt, or user story is "Done" or "Complete" unless the entire vertical stack is verified:

```
┌─────────────────────────────────────────────────────────────┐
│                    DEFINITION OF COMPLETE                   │
├─────────────────────────────────────────────────────────────┤
│ [ ] Relational schema migrations defined with constraints   │
│ [ ] PostgreSQL RLS policies configured and tested           │
│ [ ] Pure TypeScript domain logic & invariants implemented   │
│ [ ] Server-side RPC / validation functions committed        │
│ [ ] UI components adhere 100% to DESIGN.md tokens & layouts │
│ [ ] Loading, Empty, Error, and Unauthorized states handled  │
│ [ ] Material state changes logged to append-only audit log  │
│ [ ] Concurrency & idempotency protections implemented       │
│ [ ] Unit, integration, and security tests passing 100%      │
│ [ ] Documentation updated to reflect changes                │
│ [ ] Zero operational mock data introduced                   │
└─────────────────────────────────────────────────────────────┘
```

If any layer remains unbuilt, stubbed, or mocked, the agent must **report the limitations honestly and transparently** in the final completion report.
