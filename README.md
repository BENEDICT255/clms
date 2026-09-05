# Commercial Lifecycle Management System (CLMS)

> *"From commitment to settlement."*

CLMS is the authoritative commercial and financial enterprise platform for Helios Towers, governing the digital commercial lifecycle from approved Bill of Quantities (BOQ) and Purchase Order (PO) ingestion through site certification, supplier invoicing, Supply Chain verification, Finance processing, payment ledger execution, and final settlement.

---

## 1. Constitutional Authority

The architecture, business behavior, visual design, and engineering rules of CLMS are governed by four authoritative constitutional documents:

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

- [PRODUCT.md](file:///c:/Users/surface%20laptop/Downloads/CLMSS/PRODUCT.md) — Scope, glossary, state machines, financial calculation invariants, and acceptance criteria.
- [DESIGN.md](file:///c:/Users/surface%20laptop/Downloads/CLMSS/DESIGN.md) — Frozen visual design system, design tokens, typography, component behaviors, and accessibility standards.
- [ARCHITECTURE.md](file:///c:/Users/surface%20laptop/Downloads/CLMSS/ARCHITECTURE.md) — Modular monolith structure, Supabase/PostgreSQL design, RLS, storage, and transaction patterns.
- [AGENTS.md](file:///c:/Users/surface%20laptop/Downloads/CLMSS/AGENTS.md) — Non-negotiable engineering prohibitions ("28 NEVER Rules"), migration discipline, testing requirements, and completion criteria.

---

## 2. Technology Stack

- **Frontend Core:** React 18+ & TypeScript (Strict Mode)
- **Build & Dev Tooling:** Vite
- **Styling Architecture:** Pure CSS Custom Properties implementing `DESIGN.md` v1.2 tokens
- **Data Fetching & Cache:** TanStack Query (React Query)
- **Tables & Forms:** TanStack Table, React Hook Form, Zod
- **Icons:** Lucide React (Stroke icon system matching design specifications)
- **Backend Platform:** Supabase
  - **Database:** PostgreSQL 15+ with native Row Level Security (RLS)
  - **Authentication:** Supabase Auth (extensible to Microsoft Entra ID)
  - **Storage:** Private S3-compatible Object Storage with short-lived signed URLs
- **Testing Pyramid:** Vitest, React Testing Library, Playwright E2E

---

## 3. Critical Security Mandates

> [!CAUTION]
> **READ BEFORE MODIFYING OR RUNNING CODE:**
> 1. **Zero Secret Leaks:** NEVER commit `.env.local` or credentials to source control.
> 2. **No Service Role in Frontend:** The Supabase `service_role` key must NEVER enter client code or `VITE_*` environment variables. Only `VITE_SUPABASE_ANON_KEY` is permitted in the browser.
> 3. **Row Level Security (RLS):** Every commercial table enforces active PostgreSQL RLS policies guaranteeing supplier tenant isolation and internal capability least-privilege.
> 4. **Private Storage Only:** Commercial documents (contracts, certificates, tax invoices, bank proofs) are stored in strictly private buckets accessible solely via 300-second authenticated signed URLs.
> 5. **Zero Fake Operational Data:** The application boots into genuine empty states. Synthetic records and mock datasets belong strictly in isolated automated test fixtures.

---

## 4. Local Development Setup

### 4.1 Prerequisites
- **Node.js:** `>= 20.0.0 LTS`
- **npm:** `>= 10.0.0`
- **Supabase CLI:** Recommended for migration management

### 4.2 Installation
```bash
# Clone the repository and install dependencies
npm install
```

### 4.3 Configure Environment Variables
Copy the environment template:
```bash
cp .env.example .env.local
```

Open `.env.local` and populate your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4.4 Run Development Server
```bash
npm run dev
```
The application will boot at `http://localhost:3000`.

---

## 5. Database Migrations & Reproducibility

CLMS schemas are maintained as versioned SQL files inside `supabase/migrations/`. To apply migrations to your Supabase project:

```bash
# Link your remote Supabase project (one-time setup)
supabase link --project-ref your-project-ref

# Apply pending migrations to your database
supabase db push
```

### Initial Administrator Bootstrap
To bootstrap the first administrator user in development:
1. Sign up a new user via Supabase Auth (or the `/login` interface).
2. Execute the following administrative SQL query in the Supabase SQL Editor:
```sql
-- Replace with the UUID of your created user
INSERT INTO public.user_role_assignments (user_id, role_id)
SELECT 'YOUR_AUTH_USER_UUID', id FROM public.roles WHERE code = 'SYSTEM_ADMIN'
ON CONFLICT DO NOTHING;
```

---

## 6. Verification & Quality Gates

Run all automated quality checks before committing:

```bash
# Verify TypeScript strict type-checking
npm run typecheck

# Run code linter
npm run lint

# Run automated unit and component test suites
npm run test

# Build production bundle
npm run build

# Run end-to-end browser journeys (requires local dev server running)
npm run test:e2e
```

---

## 7. Implementation Roadmap & Phase Status

| Phase | Description | Status |
|:---|:---|:---|
| **Super Prompt 1** | Constitution (PRODUCT.md, DESIGN.md, ARCHITECTURE.md, AGENTS.md) | **Complete** |
| **Super Prompt 2** | Platform Foundation (Design system, Auth, RLS, Storage, App Shell) | **Complete** |
| **Super Prompt 3** | Commercial Core (BOQ/PO Ingestion, Certification, Supplier Portal) | *Pending* |
| **Super Prompt 4** | Control & Settlement (Supply Chain, Finance Ledger, Aging, Hardening) | *Pending* |
