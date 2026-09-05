# CLMS Production Deployment & Infrastructure Runbook

**Product:** Commercial Lifecycle Management System (CLMS)  
**Document Classification:** Technical Operations & Deployment Guide  
**Status:** Architecture-Neutral / Production Promotion Plan  
**Governed By:** `ARCHITECTURE.md`, `AGENTS.md`, and `PRODUCT.md`.

---

## 1. Executive Summary & Environment Separation

CLMS maintains three strictly separated operational environments:
1. **CLMS-DEV (Development):** Day-to-day feature development, rapid schema iteration, and automated testing.
2. **CLMS-UAT (User Acceptance Testing):** Pre-production staging environment where business users execute validation scenarios against controlled non-production fixtures.
3. **CLMS-PROD (Production):** Authoritative commercial execution environment with enterprise SLAs, Microsoft Entra ID integration, and formal audit logging.

> [!IMPORTANT]
> **Strict Non-Reuse Rule:** Under no circumstances may the Development or UAT database instance be renamed or converted into Production. Production must be provisioned fresh and initialized exclusively through verified database migrations.

---

## 2. Infrastructure Architecture & Responsibility Boundaries

| Infrastructure Layer | Solution Architecture | Decision Status | Owner / Approver |
|:---|:---|:---:|:---|
| **Source Control** | GitHub Enterprise (`BENEDICT255/clms`) | `CONFIRMED` | Engineering Lead |
| **CI / CD Pipeline** | GitHub Actions (Lint, Typecheck, Test, Build) | `CONFIRMED` | DevOps / CI Admin |
| **Frontend Hosting** | Cloudflare Pages / AWS S3 + CloudFront / Azure Static Web Apps | `PENDING IT APPROVAL` | Infrastructure Lead |
| **Backend / Database** | Dedicated Enterprise Supabase Instance (PostgreSQL 15+) | `CONFIRMED` | Database Architect |
| **Identity / SSO** | Microsoft Entra ID (Azure AD SAML/OIDC) | `PENDING IT APPROVAL` | Enterprise Security |
| **Object Storage** | Supabase Private Storage (S3-compatible) | `CONFIRMED` | Platform Architect |
| **Domain & DNS** | Corporate sub-domain (e.g., `clms.heliostowers.com` - illustrative) | `PENDING IT APPROVAL` | Corporate IT / DNS Admin |
| **TLS / SSL** | Managed Automated TLS (Let's Encrypt / Cloudflare SSL) | `CONFIRMED` | Infrastructure Lead |
| **Email Gateway** | Corporate SMTP / Microsoft Graph API / SendGrid | `PENDING IT APPROVAL` | IT Operations |
| **Observability** | Sentry / Datadog / OpenTelemetry Adapter | `PENDING IT APPROVAL` | Platform Operations |

---

## 3. Microsoft Entra ID (Corporate SSO) Migration Plan

During development and initial UAT, authentication is managed via Supabase Auth (email/password with role bindings). For production enterprise deployment:

1. **Identity Provider Registration:** Register CLMS as an Enterprise Application in the corporate Microsoft Entra ID tenant.
2. **Adapter Architecture:** Supabase Auth natively supports Microsoft Entra (Azure AD) via OpenID Connect (OIDC).
3. **Identity Mapping Protocol:**
   - User authenticates via corporate Entra ID.
   - Entra ID returns signed token with corporate email and directory ID.
   - Supabase Auth maps the incoming directory identity to `public.users` via corporate email matching.
   - User roles and capabilities remain managed within the authoritative CLMS relational schema (`user_role_assignments`).
   - **Zero User Duplication:** Existing commercial associations (supplier bindings, approval histories) are preserved via immutable UUID matching.

---

## 4. Production Database Migration Runbook

### Step 1: Pre-Migration Safeguards
1. Verify all migrations in `supabase/migrations/` are reviewed and merged into `main`.
2. Take an automated full snapshot of the target database:
   ```bash
   pg_dump -h <prod_db_host> -U postgres -d postgres -F c -b -v -f "pre_deploy_backup_$(date +%Y%m%d%H%M%S).dump"
   ```

### Step 2: Migration Execution Order
Execute migrations in strict chronological sequence:
1. `20260905140000_clms_foundation.sql` (Tables, RLS foundation, audit logs, sequences)
2. `20260905150000_clms_commercial_core.sql` (Commercial Explorer, certification RPCs, invoice creation)
3. `20260905160000_clms_enterprise_completion.sql` (SCM review, payment ledger, aging views, portfolio summary)

### Step 3: Post-Migration Verification
Execute the following schema validation queries:
```sql
-- Verify table count and RLS activation
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verify sequences are initialized
SELECT sequence_name, last_value 
FROM information_schema.sequences 
WHERE sequence_schema = 'public';

-- Verify atomic functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('post_invoice_payment', 'approve_invoice_supply_chain', 'return_supplier_invoice');
```

---

## 5. Rollback Strategy & Incident Response

- **Forward-Fix Preference:** Because commercial financial schemas involve relational foreign keys and append-only ledgers, forward-fixing via an additive corrective migration is strongly preferred over rolling back schema versions.
- **Catastrophic Failure Recovery:** If a critical deployment failure occurs prior to live transactions:
  1. Terminate active application ingress.
  2. Restore database from pre-deployment snapshot:
     ```bash
     pg_restore -h <prod_db_host> -U postgres -d postgres -v -c "pre_deploy_backup.dump"
     ```
  3. Re-point application traffic to the prior stable release bundle.

---

## 6. Backup, Retention & Disaster Recovery Policy

- **Automated Continuous Backups:** Daily automated full database dumps retained for 35 days, coupled with PostgreSQL Point-in-Time Recovery (PITR) with write-ahead logs (WAL) archived every 15 minutes.
- **Storage Redundancy:** Object storage documents replicated cross-region to protect against cloud provider availability-zone loss.
- **Recovery Time Objective (RTO):** $< 2$ hours for full service restoration `[PENDING IT APPROVAL]`.
- **Recovery Point Objective (RPO):** $< 15$ minutes maximum data exposure `[PENDING IT APPROVAL]`.
- **Restore Testing:** Quarterly scheduled restore drills executed against an isolated staging sandbox.

---

## 7. Security Headers & Network Hardening

Production reverse-proxy / CDN must inject the following HTTP security headers:

```http
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co; frame-ancestors 'self';
```

---

## 8. Operational Support & Ownership Matrix

| Support Tier | Scope | Designated Ownership |
|:---|:---|:---|
| **Level 1 (Helpdesk)** | Supplier login queries, password resets, basic navigation | Corporate IT Service Desk |
| **Level 2 (Business Systems)** | Commercial review bottlenecks, template errors, return issues | SCM Systems Specialist / Projects Lead |
| **Level 3 (Engineering)** | Database conflicts, RPC errors, Edge Function bugs | Core CLMS Engineering Team |
| **Database Administrator** | PostgreSQL replication, connection pooling, RLS policies | Enterprise DBA Team |
