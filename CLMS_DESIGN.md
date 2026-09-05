---
version: 1.2
name: CLMS-design-system
product: Commercial Lifecycle Management System
tagline: "From commitment to settlement."
status: frozen
description: >
  CLMS is a light-theme enterprise commercial and financial workflow platform
  built for long-duration daily use. The design language synthesizes IBM's
  enterprise information architecture and grid discipline, Linear's interaction
  precision and command-surface philosophy, Revolut's financial hierarchy and
  numerical typography, and Mastercard's institutional trust and controlled
  restraint — unified under the Helios Towers corporate identity. The result is
  a calm, data-dense, border-driven interface where white and off-white surfaces
  carry charcoal type, hairline borders define structure, and Helios Orange
  appears only as a controlled brand accent on primary actions and intentional
  highlights. Typography runs Inter at weight 400/500/600 with tabular numerals
  for all financial values. Navigation is a compact left sidebar with a slim
  topbar. The system is optimized for 1366×768 at 100% browser zoom and scales
  gracefully to 1920×1080 and beyond.
---

# CLMS Design System

**Commercial Lifecycle Management System**

*From commitment to settlement.*

---

## 0. Governance

### DESIGN.md vs PRODUCT.md

This specification defines **how CLMS looks** and **how CLMS interacts**. It is the authoritative reference for:

- Visual hierarchy
- Component styling and behavior
- Typography, color, spacing, and layout
- Responsive behavior
- Accessibility requirements
- Interaction patterns
- Animation and motion
- Interface microcopy conventions

A separate **PRODUCT.md** (not yet written) will define **what CLMS does**:

- Business workflows and process rules
- Certificate eligibility, financial treatment, and calculation logic
- FAC / PAC / DPC commercial accounting rules
- Approval sequences and authorization rules
- Invoice submission and validation rules
- Payment rules and settlement logic
- Role capabilities and permissions
- Document relationships and lifecycle rules
- Payment terms and commercial policies

**If an illustrative example in DESIGN.md conflicts with PRODUCT.md, PRODUCT.md always wins for business behavior. DESIGN.md remains authoritative for visual and interaction behavior.**

A future **AGENTS.md** will instruct coding agents to read both DESIGN.md and PRODUCT.md before implementation.

### Certificate Terminology

Certificate terminology in DESIGN.md exists for **interface labeling and visual presentation only**. Certificate eligibility, financial treatment, calculation rules, and workflow rules are defined by PRODUCT.md.

The authoritative certificate type names are:

| Abbreviation | Full Name |
|--------------|-----------|
| FAC | Final Acceptance Certificate |
| PAC | Provisional Acceptance Certificate |
| DPC | Down Payment Certificate |

### Illustrative Examples

All business names, PO numbers, site IDs, project names, payment terms, certificate numbers, invoice numbers, supplier names, and financial values shown in DESIGN.md examples are **illustrative UI content** unless explicitly marked as an authoritative product rule. These examples must never become seed data, production defaults, business rules, payment-term defaults, or financial formulas. Business logic, including payment terms and commercial policies, will be defined by PRODUCT.md.

### Provisional Design Decisions

Certain design decisions in this specification are marked **[PROVISIONAL]**. These are informed judgments made from available information that should be updated when authoritative sources (such as an official Helios Towers brand manual or finalized PRODUCT.md) are provided. All provisional decisions are implemented via semantic design tokens so that a single token change propagates throughout the system.

---

## 1. Design Research Synthesis

### IBM — Enterprise Foundation (40% Influence)

**USE:**

- Enterprise information architecture: structured page anatomy with clear context → header → content → detail hierarchy
- Carbon's 4px base grid and disciplined spacing system for consistent vertical and horizontal rhythm
- Data-table philosophy: hairline borders, sticky headers, precise column alignment, accessible contrast
- Form patterns: visible labels above inputs, bottom-rule focus treatment, clear error states with helper text
- Surface hierarchy via background color shifts (`canvas` → `surface`) rather than shadow
- Predictable navigation: persistent sidebar with grouped sections, clear active states
- Flat geometry: minimal border-radius (0–4px), no decorative rounding on functional components
- Accessibility rigor: IBM's 48px reference touch-target principle, semantic HTML structure, and WCAG AA contrast as baseline (adapted in CLMS for enterprise desktop density with expanded hit areas where touch is used)
- Letter-spacing precision on body text (subtle positive tracking aids mechanical readability)
- Charcoal ink on white canvas for maximum daily-use comfort

**AVOID:**

- IBM Blue as the CLMS accent (replaced by Helios Orange)
- IBM Plex Sans (replaced by Inter for broader availability and variable-weight support)
- 0px border-radius on all components (CLMS uses 2–6px for slight softening)
- Weight 300 display headlines (too light for enterprise data UI at compact sizes)
- Marketing-page patterns (hero bands, CTA banners, customer logos)
- Carbon's exact component API names

---

### Linear — Precision & Interaction (25% Influence)

**USE:**

- Command surface / global search: `Ctrl+K` trigger, grouped results, keyboard navigation, recent searches
- Hairline border hierarchy: thin borders (`1px`) as the primary structural device
- Surface-ladder thinking: elevation via subtle background shifts, not shadow
- Compact button padding (8–14px) for dense enterprise controls
- Drawer-based contextual inspection: preserve parent context while drilling into detail
- Focus-ring precision: 2px brand-colored outline on focused elements
- Status badges: small pills with semantic background + text
- Negative letter-spacing on larger headings for editorial density
- Progressive disclosure: show summary first, expand on demand
- Keyboard-first interaction: arrow keys in lists, Escape to close, Enter to confirm

**AVOID:**

- Dark-canvas aesthetic (CLMS is primarily light-theme)
- Near-black (#010102) surfaces
- Lavender-blue accent color
- Product-screenshot-driven page layouts
- Custom proprietary typefaces (use Inter instead)
- 12–16px border-radius on cards (too consumer-app for enterprise)

---

### Revolut — Financial Clarity (20% Influence)

**USE:**

- Financial hierarchy: hero values at display size, secondary values at heading size, tertiary in body
- Strong numerical typography: tabular numerals, right-aligned amounts, clear thousands separators
- Currency-first presentation: currency code/symbol always precedes or accompanies the value
- Positive letter-spacing on UI labels (0.1–0.2px) for mechanical precision
- Two-weight body system: 400 for default body, 600 for emphasis (never 500 for body)
- Financial summary strips: compact horizontal arrangement of key metrics
- Inter as the body typeface at weight 400 with controlled tracking
- Generous input heights (48–56px) for critical financial fields
- Transaction-clarity patterns: each line item clearly states actor, amount, status, date

**AVOID:**

- Consumer fintech aesthetics (giant account cards, banking app chrome)
- True-black (#000000) canvases
- Pill-shaped buttons on enterprise controls
- 136px display headlines
- Aeonik Pro or other proprietary display fonts
- Full-bleed product mockup sections
- Eight-color accent palettes

---

### Mastercard — Trust & Restraint (15% Influence)

**USE:**

- Institutional confidence: the design communicates "this organization has been here a long time"
- Controlled accent usage: one accent color used sparingly, never as section backgrounds
- Warm near-black ink (#1A1D21) instead of pure black for softer daily-use reading
- Editorial whitespace in appropriate contexts (login, document preview, management dashboards)
- Moderate heading weight: Mastercard's principle of confident, understated headings rather than heavy bold displays (adapted in CLMS as authoritative Inter 600 for primary headings, avoiding aggressive 700+ weights while maintaining clear hierarchy)
- Tight negative tracking (-1% to -2%) on page titles and section headers
- Shadow as atmospheric cushioning when used: large radius, low opacity, not hard-edged
- Single-font-family system: hierarchy via size, weight, and spacing rather than family changes

**AVOID:**

- Cream/putty canvas (#F3F0EE) — CLMS uses clean white and cool off-white
- Extreme border-radius (40px, 999px stadium pills)
- Circular image masking, orbital decorative lines
- Ghost watermark text treatments
- Floating pill-shaped navigation
- Weight 450 (not reliably available in Inter; use 400 instead)
- MarkForMC proprietary typeface

---

### Helios Towers Corporate Identity

**USE:**

- Blue RGB logo variant as the primary CLMS application logo on light surfaces
- Off-White logo variant on dark/inverse surfaces where genuinely needed
- Off-Black logo variant for monochrome/print contexts
- Orange/Full Colour logo as alternate corporate variant for formal documents and certificates
- Brand orange derived from the logo as the CLMS controlled accent **[PROVISIONAL]**
- Clean horizontal wordmark proportions: logo sits comfortably in sidebar header and document headers

**AVOID:**

- Making the entire interface orange because the logo is orange
- Using orange as page backgrounds, section backgrounds, or large surface fills
- Recreating, distorting, stretching, rotating, or stylizing the logo
- Adding gradients, effects, or decorative shapes to the logo
- Using the logo as a background watermark across operational screens
- Recoloring the logo to match UI states
- Cropping, extracting, or reconstructing any part of the logo (including the tower element) as a standalone mark unless an officially approved standalone icon is supplied
- Making the logo excessively large inside the authenticated application

---

### Synthesis → CLMS

These four references converge into one enterprise design language:

| Layer | Primary Source | CLMS Expression |
|-------|---------------|-----------------|
| Information architecture | IBM | Structured sidebar + topbar + workspace; consistent page anatomy |
| Grid & spacing | IBM | 4px base grid; disciplined spacing scale |
| Table design | IBM | Hairline borders, sticky headers, precise alignment |
| Form patterns | IBM | Visible labels, structured validation, calm layout |
| Interaction model | Linear | Command search, drawers, keyboard navigation, focus precision |
| Search experience | Linear | Ctrl+K overlay, grouped results, fast keyboard traversal |
| Surface hierarchy | IBM + Linear | Background-color shifts + hairline borders (no heavy shadows) |
| Financial typography | Revolut | Tabular numerals, right-aligned money, display-size hero values |
| Financial hierarchy | Revolut | Summary strips, metric groups, transaction clarity |
| Trust & tone | Mastercard | Institutional confidence, controlled restraint, editorial calm |
| Accent discipline | Mastercard | One brand color used sparingly; semantic colors remain independent |
| Brand identity | Helios Towers | Logo placement, brand orange as controlled accent |
| Typeface | Revolut + Linear | Inter: widely available, variable-weight, professional |

---

## 2. CLMS Product Identity

### Names & Marks

| Element | Value |
|---------|-------|
| Product name | CLMS |
| Full title | Commercial Lifecycle Management System |
| Tagline | From commitment to settlement. |
| Corporate parent | Helios Towers |

### Identity Hierarchy

```
┌─────────────────────────────────────────┐
│  Helios Towers (corporate identity)     │
│  ┌───────────────────────────────────┐  │
│  │  CLMS (product identity)          │  │
│  │  Commercial Lifecycle Management  │  │
│  │  System                           │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### In-Application Identity

- **Sidebar header (expanded)**: Official Helios Towers Blue RGB logo (compact, ≤120px wide) above "CLMS" product identity text
- **Sidebar header (collapsed)**: A restrained typographic **"CLMS"** product mark (not a cropped or reconstructed tower icon — see §4 Logo Restrictions)
- **Full title** ("Commercial Lifecycle Management System") does NOT appear on every authenticated screen
- **Topbar**: May show current workspace/role name; does not repeat the full product title or the logo
- **Login screen**: Full identity — logo + CLMS + full title + tagline

---

## 3. Design Principles

1. **Information before decoration.** Every pixel serves a commercial purpose. If it doesn't help the user make a decision, find a record, or complete a workflow, remove it.

2. **Hierarchy before color.** Size, weight, position, and spacing establish importance. Color is reserved for semantic meaning and the single brand accent.

3. **Alignment before cards.** Use alignment, whitespace, and borders to organize content. Not everything needs a card container. Use cards only where they provide meaningful grouping.

4. **Tables before tile grids.** When data is naturally tabular (sites, POs, invoices), present it in tables. Cards are for summary views only.

5. **Progressive disclosure before overwhelm.** Show the summary first. Let users drill down on demand via drawers, expandable sections, and detail pages.

6. **Contextual actions before permanent clutter.** Actions appear near the data they affect. Toolbars and bulk actions appear when relevant, not always.

7. **Search before deep navigation.** Users should find any commercial record in under 3 actions: open search → type query → select result.

8. **Numbers before charts.** Exact financial values are more useful than decorative visualizations. Use charts only when they answer a specific business question.

9. **Exceptions before vanity metrics.** Dashboards answer "What needs my attention?" not "What statistics can we display?"

10. **Consistency before novelty.** Every screen should feel related to every other screen. A user moving from Projects to Finance should never feel they've entered a different application.

---

## 4. Brand Integration & Logo Usage

### Logo Variants

| Variant | Primary Use |
|---------|-------------|
| Blue RGB | Primary CLMS application logo on light surfaces |
| Off-White | Logo on dark/inverse surfaces (login dark panel, rare inverse headers) |
| Off-Black | Monochrome/print contexts, generated documents |
| Orange/Full Colour | Formal corporate documents, certificates, reports |

These are the four officially supplied logo files. Do not create additional variants.

### Sizing

| Context | Max Width | Min Width |
|---------|-----------|-----------|
| Sidebar header (expanded) | 120px | 100px |
| Login screen | 180px | 140px |
| Generated documents (header) | 160px | 120px |
| Generated documents (footer) | 100px | 80px |
| Print/PDF header | 140px | 100px |

### Clear Space

**CLMS application rule:** Preserve generous clear space around the official logo — minimum **12px** application-level clear space on all sides. This is a CLMS implementation specification. Formal Helios Towers corporate clear-space rules defer to official brand guidelines when supplied.

### Placement Rules

| Context | Logo Variant | Position |
|---------|-------------|----------|
| Sidebar (expanded) | Blue RGB | Top-left, within sidebar header area |
| Sidebar (collapsed) | None — use **"CLMS"** typographic product mark | Centered in collapsed header |
| Login screen | Blue RGB | Centered above login form |
| Topbar | None | Logo does not appear in topbar |
| FAC/PAC/DPC certificates | Orange/Full Colour or Off-Black | Top-left of document header |
| PDF export | Off-Black | Top-left of first page |
| Mobile (authenticated) | **"CLMS"** typographic mark | Left side of mobile topbar |

### Logo Restrictions

- **Never** recolor, rotate, distort, stretch, or stylize the logo
- **Never** crop, extract, or reconstruct any part of the logo (including the tower element) as a standalone icon
- **Never** derive a favicon or app icon by modifying the official logo artwork unless an approved standalone asset is supplied
- **Never** animate the logo or apply visual effects
- **Never** place the logo on backgrounds that compromise contrast or clear space
- **Never** use the logo as a decorative watermark across operational screens
- **Never** place the logo inside colored shapes, badges, or containers

If an official standalone Helios Towers icon mark is supplied in the future, DESIGN.md may be updated to reference it for collapsed navigation and mobile contexts.

---

## 5. Theme

### Primary Theme: Light

CLMS is a **light-theme enterprise application**. The vast majority of the interface uses white and off-white surfaces with dark text.

| Property | Value |
|----------|-------|
| Primary canvas | `#FFFFFF` (white) |
| Secondary surface | `#F8F9FA` (cool off-white) |
| Tertiary surface | `#F1F3F5` (subtle gray) |
| Primary text | `#1A1D21` (warm charcoal) |
| Design-target viewport | 1366×768 at 100% browser zoom |
| Optimal viewport | 1920×1080 |

### Dark Theme

A dark theme is **not in scope** for the initial specification. The only inverse surfaces are the login screen (optional branded panel) and tooltips. If a dark theme is later required, define it as a separate token layer mapping the same semantic tokens to dark-appropriate values.

### Zoom

The interface **must** look correct and usable at **100% browser zoom**. Do not design screens that require users to zoom out to 75% or 80% to function.

---

## 6. Color Token System

### Background Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--color-bg-canvas` | `#FFFFFF` | Primary page background, main workspace |
| `--color-bg-surface` | `#F8F9FA` | Sidebar background, card backgrounds, panel fills |
| `--color-bg-subtle` | `#F1F3F5` | Table headers, alternate rows, input backgrounds, toolbar |
| `--color-bg-elevated` | `#FFFFFF` | Modals, drawers, dropdowns, popovers (used with shadow) |
| `--color-bg-backdrop` | `rgba(0, 0, 0, 0.5)` | Modal and drawer backdrop scrim (`--color-bg-overlay` maintained as alias) |
| `--color-bg-inverse` | `#1A1D21` | Inverse surfaces (login panel, tooltips) |
| `--color-bg-inverse-subtle` | `#2C3038` | Inverse surface one step lighter |

### Text Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--color-text-primary` | `#1A1D21` | Headlines, primary body text, table body, form values |
| `--color-text-secondary` | `#495057` | Descriptions, secondary labels, page descriptions |
| `--color-text-tertiary` | `#5F6B7A` | Helper text, metadata, timestamps, captions, breadcrumbs |
| `--color-text-disabled` | `#ADB5BD` | Disabled controls and disabled placeholder text **only** |
| `--color-text-inverse` | `#FFFFFF` | Text on inverse/dark surfaces |
| `--color-text-inverse-secondary` | `#CED4DA` | Secondary text on inverse surfaces |

**Critical rule:** `--color-text-disabled` must **never** be used for normal informational content such as helper text, timestamps, captions, metadata, or visible placeholder text. Those contexts require `--color-text-tertiary` which meets WCAG AA contrast requirements. `--color-text-disabled` is intentionally low-contrast to indicate non-interactivity and does not meet normal-text contrast requirements.

### Border Tokens

| Token | Value | Use |
|-------|-------|-----|
| `--color-border-default` | `#DEE2E6` | Standard borders: cards, dividers, table grid lines |
| `--color-border-subtle` | `#E9ECEF` | Subtle dividers, internal section separators |
| `--color-border-strong` | `#ADB5BD` | Emphasized borders, input borders on hover |
| `--color-border-focus` | `#C25012` | Focus rings (brand accent) |
| `--color-border-inverse` | `rgba(255, 255, 255, 0.16)` | Borders on inverse surfaces |

### Brand Tokens

**[PROVISIONAL]** — The brand accent `#C25012` is a provisional CLMS design token derived from the supplied corporate artwork and adjusted for WCAG AA compliance. When official Helios Towers digital brand color specifications are provided, replace this token centrally rather than changing individual components. All components consume semantic tokens; no component should contain a hardcoded orange hex value.

| Token | Value | Use |
|-------|-------|-----|
| `--color-brand-primary` | `#C25012` | Primary CTA background, selected nav marker, focus ring, icon accent |
| `--color-brand-hover` | `#A84510` | Primary CTA hover |
| `--color-brand-active` | `#8E3A0D` | Primary CTA active/pressed |
| `--color-brand-subtle` | `#FEF3EC` | Subtle brand background (selected filter chip, active nav background) |
| `--color-brand-subtle-hover` | `#FDE8D8` | Hover on subtle brand surfaces |
| `--color-brand-text` | `#B94005` | Brand-colored text on light backgrounds |

### Semantic — Success

| Token | Value | Use |
|-------|-------|-----|
| `--color-success-bg` | `#ECFDF5` | Success alert background, approved row highlight |
| `--color-success-border` | `#A7F3D0` | Success alert border |
| `--color-success-text` | `#065F46` | "Approved", "Paid", "Settled", "Signed", "Fully Certified" |
| `--color-success-icon` | `#059669` | Success icon, status dot |

### Semantic — Warning

| Token | Value | Use |
|-------|-------|-----|
| `--color-warning-bg` | `#FFFBEB` | Warning alert background, attention row highlight |
| `--color-warning-border` | `#FDE68A` | Warning alert border |
| `--color-warning-text` | `#92400E` | "Awaiting Signature", "Pending", "Partially Paid", "Partially Invoiced" |
| `--color-warning-icon` | `#D97706` | Warning icon, status dot |

### Semantic — Danger

| Token | Value | Use |
|-------|-------|-----|
| `--color-danger-bg` | `#FEF2F2` | Error alert background, blocked row highlight |
| `--color-danger-border` | `#FECACA` | Error alert border |
| `--color-danger-text` | `#991B1B` | "Blocked", "Rejected", "Overdue", "Returned" |
| `--color-danger-icon` | `#DC2626` | Error icon, status dot, destructive button |

### Semantic — Info

| Token | Value | Use |
|-------|-------|-----|
| `--color-info-bg` | `#EFF6FF` | Info alert background, processing row highlight |
| `--color-info-border` | `#BFDBFE` | Info alert border |
| `--color-info-text` | `#1E40AF` | "Processing", "In Review", "Issued" |
| `--color-info-icon` | `#2563EB` | Info icon, status dot |

### Semantic Color Assignment Rules

Semantic colors represent **states**, not **entity types**.

- **GREEN** → approved / successful / paid / settled / completed / signed / fully certified
- **AMBER** → pending / awaiting action / warning / attention / partially complete
- **RED** → blocked / rejected / failed / overdue / returned / destructive action
- **BLUE** → informational / processing / in review / issued
- **BRAND ORANGE** → primary action / brand emphasis (never for status indication)

Certificate types (FAC, PAC, DPC) are **not** semantic states. A DPC that is approved should display the **approved** (green) status. A FAC that is rejected should display the **rejected** (red) status. Certificate type must never override certificate status in the visual hierarchy.

### Accessible Contrast Matrix

All text/background pairings used for normal-size informational content must meet **WCAG AA** (4.5:1 for normal text, 3:1 for large text ≥18px regular or ≥14px bold).

| Text Token | Value | On `bg-canvas` (#FFF) | On `bg-surface` (#F8F9FA) | On `bg-subtle` (#F1F3F5) |
|------------|-------|----------------------|--------------------------|--------------------------|
| `text-primary` | `#1A1D21` | ✅ 16.2:1 | ✅ 15.1:1 | ✅ 13.8:1 |
| `text-secondary` | `#495057` | ✅ 8.5:1 | ✅ 7.9:1 | ✅ 7.3:1 |
| `text-tertiary` | `#5F6B7A` | ✅ 5.4:1 | ✅ 5.2:1 | ✅ 4.8:1 |
| `brand-text` | `#B94005` | ✅ 5.5:1 | ✅ 5.1:1 | ✅ 4.7:1 |
| `success-text` | `#065F46` | ✅ 9.5:1 | — | — |
| `warning-text` | `#92400E` | ✅ 6.8:1 | — | — |
| `danger-text` | `#991B1B` | ✅ 7.8:1 | — | — |
| `info-text` | `#1E40AF` | ✅ 7.2:1 | — | — |
| `text-disabled` | `#ADB5BD` | ⛔ 2.3:1 | — | — |

`--color-text-disabled` intentionally fails normal-text contrast because it communicates non-interactivity. It must **never** be used for informational content that users need to read.

| Background Token | White text contrast |
|-----------------|---------------------|
| `brand-primary` (#C25012) | ✅ 4.7:1 |
| `brand-hover` (#A84510) | ✅ 6.1:1 |
| `danger-icon` (#DC2626) | ✅ 4.6:1 |
| `bg-inverse` (#1A1D21) | ✅ 16.2:1 |

---

## 7. Typography

### Font Family

| Role | Family | Fallback Stack |
|------|--------|---------------|
| Primary (all UI) | Inter | `Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` |
| Monospace (optional utility) | JetBrains Mono | `'JetBrains Mono', 'SF Mono', 'Cascadia Code', Consolas, monospace` |

**Inter** is the default typeface for the entire CLMS interface — including commercial identifiers such as PO numbers, site IDs, and certificate references. Monospace (`JetBrains Mono`) is an **optional utility style** that may be used selectively when character-level distinction, copying precision, or technical readability materially benefits the user. Monospace is **not mandatory** for commercial identifiers. CLMS must not look like a developer tool or database administration application.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|-------|------|--------|-------------|----------------|-----|
| `--type-product-identity` | 16px | 700 | 1.25 | -0.2px | "CLMS" product name in sidebar |
| `--type-page-title` | 24px | 600 | 1.25 | -0.3px | Page titles: "Commercial Explorer", "PO Control" |
| `--type-page-description` | 14px | 400 | 1.5 | 0 | Page subtitle / description text |
| `--type-section-title` | 18px | 600 | 1.33 | -0.2px | Section headers within a page |
| `--type-subsection-title` | 14px | 600 | 1.4 | 0 | Subsection headers, card titles |
| `--type-financial-hero` | 28px | 600 | 1.2 | -0.3px | Primary financial display value (e.g., PO authorized total) |
| `--type-financial-secondary` | 20px | 600 | 1.3 | -0.2px | Secondary financial values in summary strips |
| `--type-financial-tertiary` | 16px | 600 | 1.4 | 0 | Tertiary financial values in detail sections |
| `--type-body` | 14px | 400 | 1.5 | 0 | Default body text |
| `--type-body-emphasis` | 14px | 600 | 1.5 | 0 | Emphasized body text |
| `--type-body-small` | 13px | 400 | 1.46 | 0 | Compact body, table cell text |
| `--type-table-header` | 12px | 600 | 1.33 | 0.4px | Table column headers (uppercase) |
| `--type-table-body` | 13px | 400 | 1.38 | 0 | Table cell content |
| `--type-table-body-numeric` | 13px | 400 | 1.38 | 0 | Table cell — numeric (`font-variant-numeric: tabular-nums`) |
| `--type-field-label` | 12px | 500 | 1.33 | 0.2px | Form field labels |
| `--type-helper-text` | 12px | 400 | 1.33 | 0.2px | Form helper text, validation messages |
| `--type-metadata` | 12px | 400 | 1.33 | 0.2px | Timestamps, audit metadata, captions |
| `--type-button` | 14px | 500 | 1.14 | 0.1px | Button labels |
| `--type-button-small` | 12px | 500 | 1.17 | 0.1px | Small button labels, compact actions |
| `--type-status` | 12px | 500 | 1.33 | 0.2px | Status badge text |
| `--type-nav-item` | 14px | 400 | 1.29 | 0.1px | Sidebar navigation items |
| `--type-nav-item-active` | 14px | 600 | 1.29 | 0.1px | Active sidebar navigation item |
| `--type-nav-group` | 11px | 600 | 1.27 | 0.8px | Navigation group labels (uppercase) |
| `--type-breadcrumb` | 13px | 400 | 1.38 | 0 | Breadcrumb links |

All typography tokens use the Inter font family. `text-transform: uppercase` applies only to `--type-table-header` and `--type-nav-group`. All other tokens use sentence case.

### Numeric Behavior

| Context | `font-variant-numeric` | Alignment |
|---------|------------------------|-----------|
| Financial values (all sizes) | `tabular-nums` | Right-aligned |
| Table numeric columns | `tabular-nums` | Right-aligned |
| PO numbers, Site IDs, cert refs | `tabular-nums` | Left-aligned |
| Percentages | `tabular-nums` | Right-aligned |
| Body text with incidental numbers | `proportional-nums` (default) | Left-aligned |

### Typography Principles

- **No decorative display fonts.** Inter carries the entire hierarchy via size, weight, and spacing.
- **Enterprise scale stays compact.** The largest element in the authenticated UI is 28px (`--type-financial-hero`). No marketing-style headings inside the application.
- **Tabular numerals are mandatory** for all financial values, table columns, and numeric comparison contexts.
- **Inter is the default for commercial identifiers.** PO numbers, site IDs, and certificate references use Inter with `tabular-nums`. Monospace is an optional enhancement, not a requirement.
- **Weight 600 is the authoritative primary heading weight.** It reads as confident and structured without shouting. Inter 500 is used for field labels, buttons, selected control-level labels, status badges, and other medium-emphasis interface text. Inter 400 is the standard body text weight. Weight 700 is reserved for the "CLMS" product identity mark in the sidebar header only.
- **Do not use weight 300 or 450.** Light-weight display belongs to IBM's consumer identity, not CLMS, and weight 450 is not reliably cross-platform.

---

## 8. Spacing System

### Rhythm

**Layout spacing uses the 4px rhythm.** All primary spacing values are multiples of 4px. The `2px` micro value exists solely for optical alignment adjustments such as status-dot gaps, hairline offsets, and icon alignment within components.

### Spacing Scale

| Token | Value | Use |
|-------|-------|-----|
| `--space-0` | 2px | Micro only: optical alignment, status dot gap, border offset |
| `--space-1` | 4px | Tight internal padding, gap between status dot and label |
| `--space-2` | 8px | Button icon gap, input vertical padding, table cell vertical padding |
| `--space-3` | 12px | Form field gap, sidebar item padding, topbar element gap |
| `--space-4` | 16px | Default component spacing, sidebar horizontal padding |
| `--space-5` | 20px | Page content horizontal padding, card padding (comfortable) |
| `--space-6` | 24px | Section spacing, drawer padding, modal padding |
| `--space-7` | 32px | Large section spacing, page vertical padding |
| `--space-8` | 40px | Major section breaks |
| `--space-9` | 48px | Page-level vertical breathing room |
| `--space-10` | 64px | Hero section spacing (login screen) |

### Application-Level Spacing

| Context | Token | Value |
|---------|-------|-------|
| Page content top padding | `--space-6` | 24px |
| Page content side padding | `--space-6` | 24px |
| Page content bottom padding | `--space-7` | 32px |
| Section vertical gap | `--space-6` | 24px |
| Form field vertical gap | `--space-3` | 12px |
| Form field-to-label gap | `--space-1` | 4px |
| Table cell horizontal padding | `--space-3` | 12px |
| Table cell vertical padding | `--space-2` | 8px |
| Sidebar item vertical padding | `--space-2` | 8px |
| Sidebar item horizontal padding | `--space-3` | 12px |
| Sidebar group gap | `--space-6` | 24px |
| Topbar horizontal padding | `--space-4` | 16px |
| Drawer body padding | `--space-6` | 24px |
| Modal body padding | `--space-6` | 24px |
| Card internal padding | `--space-5` | 20px |
| Button padding (default) | `8px 16px` | — |
| Button padding (small) | `4px 12px` | — |
| Button padding (large) | `12px 24px` | — |

---

## 9. Grid & Layout

### Application Grid

```
┌───────────────┬──────────────────────────────────────────────┐
│               │  TOPBAR (48px)                                │
│   SIDEBAR     ├──────────────────────────────────────────────┤
│   (240px)     │                                              │
│               │  MAIN WORKSPACE                              │
│               │                                              │
│               │  ┌──────────────────────────────────────┐    │
│               │  │  Page Content                        │    │
│               │  │                                      │    │
│               │  └──────────────────────────────────────┘    │
│               │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

### Layout Dimensions

| Element | Value |
|---------|-------|
| Sidebar width (expanded) | 240px |
| Sidebar width (collapsed) | 64px |
| Topbar height | 48px |
| Sidebar header height | 56px |
| Page content max-width (form pages) | 960px |
| Page content max-width (data pages) | None (full available width) |
| Drawer width (standard) | 480px |
| Drawer width (large/document) | 640px |
| Modal width (small/confirmation) | 400px |
| Modal width (medium) | 560px |
| Modal width (large/wizard) | 720px |

### Content Grid

| Breakpoint (workspace width) | Columns | Gutter | Margin |
|------------------------------|---------|--------|--------|
| ≥1440px | 12 | 24px | 24px |
| 1024–1439px | 12 | 20px | 20px |
| 768–1023px | 8 | 16px | 16px |
| <768px | 4 | 16px | 16px |

### Data Page Layout

Data-heavy screens (Commercial Explorer, PO Sites, Invoice Queue) use the **full available workspace width** to maximize data density. They do not use a centered narrow container.

### Detail Page Layout

Two-column detail layouts (Site Details, PO Control) use a primary (8 cols) / secondary (4 cols) split. Below 1024px workspace width, the layout stacks to single column.

### Responsive Breakpoints

| Name | Viewport Width | Sidebar | Key Changes |
|------|---------------|---------|-------------|
| Desktop XL | ≥1920px | Expanded (240px) | Maximum data density |
| Desktop | 1440–1919px | Expanded (240px) | Default layout |
| Desktop Compact | 1366–1439px | Expanded (240px) | Slightly tighter margins |
| Laptop | 1024–1365px | Collapsed (64px) | Sidebar auto-collapses |
| Tablet | 768–1023px | Hidden (overlay) | 8-col grid |
| Mobile | <768px | Hidden (overlay) | Single column; tables scroll horizontally |

---

## 10. Elevation / Borders / Radius

### Border Thickness

| Token | Value | Use |
|-------|-------|-----|
| `--border-width-default` | `1px` | Standard borders: cards, dividers, tables, inputs |
| `--border-width-strong` | `2px` | Focus rings, active tab indicator, selected item border |

### Focus Rings

All interactive elements share a consistent focus ring:

```css
box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 4px var(--color-border-focus);
```

This double-ring (white inner + brand outer) ensures visibility on both light and dark backgrounds. This rule applies uniformly to buttons, inputs, navigation items, table rows, search results, and all other focusable elements.

### Shadow Scale

| Token | Value | Use |
|-------|-------|-----|
| `--shadow-none` | `none` | Default for most surfaces |
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.06)` | Sticky table headers |
| `--shadow-md` | `0 2px 8px rgba(0, 0, 0, 0.08)` | Dropdowns, popovers |
| `--shadow-lg` | `0 4px 16px rgba(0, 0, 0, 0.10)` | Drawers |
| `--shadow-xl` | `0 8px 32px rgba(0, 0, 0, 0.14)` | Modals |

### When to Use Elevation

| Surface | Elevation |
|---------|-----------|
| Page content | None (sits on canvas) |
| Cards within page | 1px `--color-border-default` border (no shadow) |
| Sidebar | 1px right border `--color-border-subtle` |
| Topbar | 1px bottom border `--color-border-subtle` |
| Dropdown/popover | `--shadow-md` + 1px `--color-border-default` |
| Drawer | `--shadow-lg` |
| Modal | `--shadow-xl` + backdrop scrim (`--color-bg-backdrop` at `--z-backdrop: 300`) |
| Tooltip | `--shadow-md` + `--color-bg-inverse` background |
| Sticky table header | `--shadow-sm` |

### Border Radius Scale

| Token | Value | Use |
|-------|-------|-----|
| `--radius-none` | `0px` | Table cells, application shell edges |
| `--radius-sm` | `2px` | Micro elements: status dots |
| `--radius-md` | `4px` | Default: buttons, inputs, cards, dropdowns, badges |
| `--radius-lg` | `6px` | Modals, drawers, panels |
| `--radius-xl` | `8px` | Login card, command palette |
| `--radius-full` | `9999px` | Status dots (circular), avatars |

---

## 11. Application Shell

### Sidebar Specification

| Property | Expanded | Collapsed |
|----------|----------|-----------|
| Width | 240px | 64px |
| Background | `--color-bg-surface` | `--color-bg-surface` |
| Right border | 1px `--color-border-subtle` | 1px `--color-border-subtle` |
| Padding left/right | 12px | 12px |
| Logo area height | 56px | 56px |
| Logo content | Helios Towers Blue RGB logo (≤120px) + "CLMS" text | **"CLMS"** typographic product mark (centered) |

### Sidebar Navigation Items

| Property | Value |
|----------|-------|
| Height | 36px |
| Padding | 8px 12px |
| Border radius | `--radius-md` (4px) |
| Font | `--type-nav-item` (14px / 400) |
| Icon size | 18px |
| Icon-to-text gap | 8px |
| Group label font | `--type-nav-group` (11px / 600 / uppercase / 0.8px tracking) |
| Group label color | `--color-text-tertiary` |
| Group top spacing | 24px |

### Sidebar Navigation States

| State | Background | Text Color | Indicator |
|-------|------------|------------|-----------|
| Default | Transparent | `--color-text-secondary` | None |
| Hover | `--color-bg-subtle` | `--color-text-primary` | None |
| Active (current page) | `--color-brand-subtle` | `--color-brand-text` | 3px left bar in `--color-brand-primary` |
| Focus (keyboard) | Focus ring (see §10) | `--color-text-primary` | None |
| Disabled | Transparent | `--color-text-disabled` | None |

### Topbar Specification

| Property | Value |
|----------|-------|
| Height | 48px |
| Background | `--color-bg-canvas` |
| Bottom border | 1px `--color-border-subtle` |

**Topbar content (left to right):** Breadcrumb → Spacer → Global Search Trigger → Notifications Bell → User Avatar (32px)

### Role/Workspace Behavior

Projects, Supplier, Supply Chain, Finance, Management, and Admin workspaces all share the **same visual shell**. Role determines authorized navigation items and permissions. Role does **not** change the visual theme, color scheme, or component styling.

---

## 12. Navigation

### Navigation Groups

Navigation items are organized into logical groups with uppercase group labels.

### Navigation Behavior

| Behavior | Rule |
|----------|------|
| Expand/collapse sidebar | Toggle at sidebar bottom; persists across sessions |
| Active indicator | 3px brand left bar + subtle brand background |
| Hover | Subtle gray background, 100ms (`--duration-fast`) ease transition |
| Keyboard | Tab through items; Enter to navigate; arrows between items |
| Collapsed state | Icons only; tooltip shows item label |
| Mobile (<768px) | Sidebar becomes left-edge overlay with backdrop |

### Breadcrumbs

| Property | Value |
|----------|-------|
| Font | `--type-breadcrumb` (13px / 400) |
| Separator | `/` in `--color-text-tertiary` |
| Current page | `--color-text-primary`, not a link |
| Parent pages | `--color-text-secondary`, underline on hover |
| Max depth | 3 levels; truncate middle levels with `...` |

---

## 13. Global Search — Flagship Experience

### Trigger

| Trigger | Behavior |
|---------|----------|
| `Ctrl+K` / `Cmd+K` | Opens search overlay |
| Click search field in topbar | Opens search overlay |
| `/` key (optional, when not in a text input) | Opens search overlay |

### Search Overlay (Command Palette)

| Property | Value |
|----------|-------|
| Width | 560px (centered horizontally) |
| Max height | 480px |
| Background | `--color-bg-elevated` with `--shadow-xl` |
| Border | 1px `--color-border-default` |
| Border radius | `--radius-xl` (8px) |
| Backdrop | `--color-bg-backdrop` (at `--z-backdrop: 300`) |
| Input height | 48px |
| Input font | `--type-body` (14px / 400) |
| Result group label | `--type-table-header` (12px / 600 / uppercase) |
| Result item height | 40px |
| Result item padding | 8px 16px |
| Result item hover | `--color-bg-subtle` background |
| Result item active (keyboard) | `--color-bg-subtle` + 2px left `--color-brand-primary` bar |
| Search debounce | 200ms |
| No results | "No results for '[query]'" centered, `--color-text-tertiary` |

### Search Result Groups

| Group | Primary | Secondary | Tertiary |
|-------|---------|-----------|----------|
| Sites | Site Name | Site ID | Region / Supplier |
| Purchase Orders | PO Number | Supplier | Site count |
| Certificates | Cert Reference | Site Name | Status badge |
| Invoices | Invoice Number | Supplier | Amount / Status |
| Suppliers | Supplier Name | — | PO count |
| Projects | Project Name | — | Site count |

### Keyboard Interaction

| Key | Behavior |
|-----|----------|
| `↓` / `↑` | Move between results |
| `Enter` | Open selected result |
| `Esc` | Close search overlay |
| `Tab` | Move to next result group |

---

## 14. Commercial Explorer — Flagship Data Screen

### Purpose

Commercial Explorer allows users to search and explore all commercial records without knowing the hierarchy beforehand. A user may search by Site ID, Site Name, Region, Supplier, PO, BOQ, Project, Certificate, or Invoice and discover the correct record.

### Page Structure

```
┌────────────────────────────────────────────────────────────────┐
│ Commercial Explorer                     [Create Certification] │
│ Search and explore all commercial records across projects      │
├────────────────────────────────────────────────────────────────┤
│ 🔍 Search sites, POs, suppliers...   [Filters ▾]  [Export ▾]  │
├────────────────────────────────────────────────────────────────┤
│ Active Filters:  Supplier: [illustrative] ×  |  Clear all     │
├────────────────────────────────────────────────────────────────┤
│ 2,847 sites  •  Sorted by Site Name ↑                        │
├────────────────────────────────────────────────────────────────┤
│ [Full-width data table with sticky header]                     │
├────────────────────────────────────────────────────────────────┤
│ ← 1 2 3 ... 142 →         Showing 1–20 of 2,847             │
└────────────────────────────────────────────────────────────────┘
```

### Filter Controls

| Filter | Type |
|--------|------|
| Search | Free text across Site ID, Site Name, PO Number, Supplier |
| Project | Multi-select dropdown |
| Project Type | Multi-select dropdown |
| Supplier | Multi-select dropdown |
| Region | Multi-select dropdown |
| PO | Multi-select dropdown |
| Certification Status | Multi-select dropdown |
| Certificate Type | Multi-select dropdown (FAC, PAC, DPC) |
| Invoice Status | Multi-select dropdown |
| Payment Status | Multi-select dropdown |

Active filters appear as removable chips below the toolbar. Filter state is preserved in the URL for shareability. Result count updates as filters change.

---

## 15. Tables

### Table Specification

| Property | Value |
|----------|-------|
| Header background | `--color-bg-subtle` (#F1F3F5) |
| Header text | `--type-table-header` (12px / 600 / uppercase) in `--color-text-secondary` |
| Header height | 40px |
| Header border-bottom | 1px `--color-border-default` |
| Row height (comfortable) | 44px |
| Row height (compact) | 36px |
| Row background (default) | `--color-bg-canvas` |
| Row background (hover) | `--color-bg-subtle` |
| Row background (selected) | `--color-brand-subtle` |
| Row background (focused) | `--color-bg-subtle` + 2px left `--color-brand-primary` bar |
| Row border-bottom | 1px `--color-border-subtle` |
| Cell padding | 8px 12px |
| Cell text | `--type-table-body` (13px / 400) |
| Cell numeric | `--type-table-body-numeric` (13px / 400 / tabular-nums / right-aligned) |
| Sticky header | Yes, with `--shadow-sm` when scrolled |

### Column Alignment

| Data Type | Alignment |
|-----------|-----------|
| Text | Left |
| Identifiers (Site ID, PO Number) | Left |
| Dates | Left |
| Status | Left (dot + text) |
| Currency / financial values | Right (tabular-nums) |
| Percentages | Right |
| Actions | Right (icon buttons) |
| Checkbox | Center |

### Table States

| State | Treatment |
|-------|-----------|
| Loading | 8 skeleton rows matching column widths |
| Empty (no data) | Centered: icon + "No [entity] found." + optional action |
| Empty (no results) | "No matching sites found. Try adjusting your filters." |
| Error | Inline alert above table: icon + message + "Retry" |

### Bulk Actions Bar

When rows are selected, a bulk action bar appears above the table:

| Property | Value |
|----------|-------|
| Background | `--color-brand-subtle` |
| Height | 44px |
| Border | 1px `--color-brand-primary` at 20% opacity |
| Border radius | `--radius-md` (4px) |

### Zebra Striping

CLMS does **not** use alternating row colors by default. Row separation uses 1px bottom borders. If an implementation context demands striping for very wide tables, alternate rows may use `--color-bg-surface`.

---

## 16. Forms

### Input Specification

| Property | Value |
|----------|-------|
| Height | 40px (default), 36px (compact), 48px (financial/important) |
| Background | `--color-bg-canvas` |
| Border | 1px `--color-border-default` |
| Border radius | `--radius-md` (4px) |
| Padding | 8px 12px |
| Font | `--type-body` (14px / 400) |

### Input States

| State | Border | Background | Additional |
|-------|--------|------------|------------|
| Default | 1px `--color-border-default` | `--color-bg-canvas` | — |
| Hover | 1px `--color-border-strong` | `--color-bg-canvas` | — |
| Focus | 2px `--color-brand-primary` | `--color-bg-canvas` | Focus ring |
| Error | 2px `--color-danger-icon` | `--color-bg-canvas` | Error message in `--color-danger-text` |
| Disabled | 1px `--color-border-subtle` | `--color-bg-subtle` | Text in `--color-text-disabled` |
| Read-only | 1px `--color-border-subtle` | `--color-bg-subtle` | Text in `--color-text-primary`; not editable |

### Label Rules

- Labels are **always visible** above the input using `--type-field-label`
- Required fields show `*` in `--color-danger-icon` after the label
- **Never** use placeholder text as the sole label
- Placeholder text is supplementary: "e.g., TZTB1217"

### Helper Text

- Below input in `--type-helper-text` (12px / 400) using `--color-text-tertiary`
- Error state replaces helper text with error message in `--color-danger-text`
- Helper text slot is always present for layout stability

### Form Field Types

Text input, Search input (with icon), Select, Multi-select (chips + dropdown), Date picker, Currency (code prefix + tabular-nums + right-align), Percentage (% suffix), Textarea (min-height 80px), File upload (drag-drop zone), Checkbox (18×18px, `--radius-sm`), Radio (18×18px circle), Switch (36×20px).

---

## 17. Financial Presentation

### Currency Format

| Rule | Example |
|------|---------|
| Currency code precedes the value | TZS 1,234,567.89 |
| Thousands separator | Comma `,` |
| Decimal separator | Period `.` |
| Decimal places | 2 (always: TZS 1,000.00) |
| Negative values | Parentheses: (TZS 1,234.00) — sign communicated via parentheses; semantic color is context-dependent (see below) |
| Zero values | TZS 0.00 in `--color-text-tertiary` |

### Financial Display Precision

| Context | Format | Example | Rule |
|---------|--------|---------|------|
| Tables | Exact | TZS 123,512,849.93 | Always exact; tabular-nums; right-aligned |
| Calculations | Exact | TZS 123,512,849.93 | Always exact; no rounding |
| Certificates / invoices | Exact | TZS 123,512,849.93 | Always exact; formal documents |
| Payment posting | Exact | TZS 123,512,849.93 | Always exact |
| Exports / print | Exact | TZS 123,512,849.93 | Always exact |
| Financial summary strips | Exact | TZS 123,512,849.93 | Default exact |
| Dashboard hero values | Compact permitted | TZS 4.57B | Only for high-level summaries |
| Management portfolio | Compact permitted | TZS 234.6M | Only for strategic overview |

**Compact display rules:**

1. Permitted only in dashboard summaries, portfolio-level management views, and high-level visualizations
2. The exact value must always be accessible via tooltip or drill-down
3. Never use compact values in financial input, calculation, or reconciliation interfaces
4. Never use compact values in formal certificates, invoices, or payment posting
5. Compact format: `TZS 4.57B`, `TZS 234.6M`, `TZS 48.7K` — one decimal place

### Financial Typography Hierarchy

| Level | Token | Use |
|-------|-------|-----|
| Hero | `--type-financial-hero` (28px/600) | Primary display value |
| Secondary | `--type-financial-secondary` (20px/600) | Key metrics in summary strips |
| Tertiary | `--type-financial-tertiary` (16px/600) | Supporting financial details |
| Table | `--type-table-body-numeric` (13px/400/tabular-nums) | Table cells |
| Inline | `--type-body-emphasis` (14px/600) | Financial values in body text |

### Financial Summary Strip

A horizontal strip of key metrics:

| Property | Value |
|----------|-------|
| Background | `--color-bg-canvas` or `--color-bg-surface` |
| Border | 1px `--color-border-default` |
| Border radius | `--radius-md` (4px) |
| Padding | 20px |
| Metric label | `--type-metadata` in `--color-text-tertiary` |
| Metric value | `--type-financial-secondary` in `--color-text-primary` |
| Separator | 1px `--color-border-subtle` vertical divider or 24px gap |

Financial summary strips are **not** giant KPI cards. They are compact, horizontally-arranged exact values. Avoid stacking six or more oversized metric cards across the top of a page.

### Financial Table Rules

- All currency columns right-aligned with `tabular-nums`
- Totals row: `--type-body-emphasis` with 2px top border `--color-border-strong`
- Outstanding balances > 0: `--color-text-primary`; overdue: `--color-danger-text`
- Fully settled (0.00 remaining): `--color-text-tertiary`

### Treatment of Negative Financial Values

Negative financial values use parentheses to communicate sign:

```
(TZS 1,234.00)
```

Negative does **not** automatically mean:
- error;
- danger;
- overdue;
- rejected.

Semantic color depends strictly on the commercial and business context defined by PRODUCT.md:
- **Legitimate credit / reversal / retainage / balance adjustment:** Neutral presentation (`--color-text-primary` or `--color-text-secondary`).
- **Adverse financial exception / unauthorized overrun / unapproved deficit:** Danger presentation (`--color-danger-text`).

DESIGN.md specifies the visual and numerical formatting rules and must not assume every negative financial number is adverse.

---

## 18. Site Experience

### Site Quick View (Drawer)

Triggered by clicking a site row in Commercial Explorer. Opens a right-side drawer (480px) preserving the explorer context.

**Drawer content:** Site name + ID → metadata (supplier, PO, project) → commercial position (authorized/certified/remaining) → source documents → certificates list → invoices list → primary action footer.

### Site Quick View Specification

| Property | Value |
|----------|-------|
| Width | 480px |
| Shadow | `--shadow-lg` |
| Header height | 56px with 1px bottom border |
| Footer height | 56px with 1px top border (if actions present) |
| Body padding | 24px |
| Section gap | 24px |
| Section divider | 1px `--color-border-subtle` |

### Full Site Details Page

Tabs: Overview | Commercial Position | Certificates | Invoices | Payments | Activity

Active tab: 2px bottom border in `--color-brand-primary`.

---

## 19. PO Experience

### PO Control Page — "Commercial Control Room"

| Element | Style |
|---------|-------|
| PO Number | `--type-page-title` (24px / 600) |
| Metadata line | `--type-body` (14px / 400) in `--color-text-secondary`, items separated by ` • ` |
| Status badge | Status dot + text (semantic color based on PO state, not certificate type) |
| Financial summary strip | As defined in §17 |

**Tabs:** Overview | Sites | Documents | Commercial Flow | Activity

Note: Payment terms, approval rules, and supplier-specific commercial rules shown in the PO view are defined by PRODUCT.md, not by DESIGN.md. Illustrative examples (such as payment terms) in wireframes are not authoritative business defaults.

---

## 20. Certification Wizard

### Wizard Steps

```
Step 1: Type & PO  →  Step 2: Sites  →  Step 3: Certification  →  Step 4: Review  →  Step 5: Generate
```

### Certificate Types (Visual Treatment)

| Type | Label | Full Name |
|------|-------|-----------|
| FAC | FAC | Final Acceptance Certificate |
| PAC | PAC | Provisional Acceptance Certificate |
| DPC | DPC | Down Payment Certificate |

Certificate types use **neutral visual presentation**: clear text labels, type codes, and consistent styling. They do **not** use semantic colors (green, blue, amber) as type identifiers. Semantic colors are reserved for the certificate's **status** (Draft, Issued, Approved, etc.), not its type.

If visual differentiation between certificate types is needed beyond the text label, use subtle non-semantic treatments such as small neutral icon variations or consistent typographic formatting — never semantic color coding.

### Stepper Component

| Property | Value |
|----------|-------|
| Stepper height | 48px |
| Step number (completed) | `--color-brand-primary` circle + white checkmark, 24px |
| Step number (current) | `--color-brand-primary` circle + white number, 24px |
| Step number (future) | `--color-border-default` circle + `--color-text-tertiary` number, 24px |
| Step label (current) | `--type-body-emphasis` (14px / 600) |
| Step label (future) | `--color-text-tertiary` |
| Connector line | 1px; completed: `--color-brand-primary`; future: `--color-border-default` |

### Wizard Actions

| Action | Position | Style |
|--------|----------|-------|
| Back | Bottom-left | Secondary button |
| Continue | Bottom-right | Primary button |
| Save Draft | Top-right or bottom-center | Tertiary button |
| Exit | Top-right ✕ | Triggers confirmation modal |

### Exit Behavior

If unsaved changes exist:

> **Leave certification wizard?**
> Your progress will be saved as a draft.
>
> [Cancel] [Save & Leave]

Certificate eligibility rules, financial calculation logic, and approval workflow rules are defined by PRODUCT.md.

---

## 21. Certification Calculation Table

### Table Columns (Illustrative)

| Column | Alignment | Editable |
|--------|-----------|----------|
| Site | Left | No |
| Authorized | Right (currency) | No |
| Previously Certified | Right (currency) | No |
| Remaining | Right (currency) | No (calculated) |
| Current % | Right (percentage) | **Yes** |
| Current Amount | Right (currency) | **Yes** |
| After Certification | Right (currency) | No (calculated) |

The exact column set, calculation formulas, and business rules for previous certification breakdown (by type) are defined by PRODUCT.md. The columns shown above are illustrative of the visual pattern.

### Editable Cell

| Property | Value |
|----------|-------|
| Default | Value as text; subtle edit affordance on hover |
| Editing | Input with 1px `--color-brand-primary` border; auto-select on focus |
| Changed | `--color-brand-subtle` background indicates unsaved change |

### Validation (Visual Only)

| Condition | Visual Treatment |
|-----------|-----------------|
| Value exceeds remaining | Cell border `--color-danger-icon`; tooltip with message |
| Percentage > 100% | Cell border `--color-danger-icon` |

The threshold rules, validation conditions, and over-certification business logic are defined by PRODUCT.md. DESIGN.md specifies only how validation states appear visually.

### Totals Row

| Property | Value |
|----------|-------|
| Background | `--color-bg-subtle` |
| Top border | 2px `--color-border-strong` |
| Font | `--type-body-emphasis` (14px / 600) |

---

## 22. Commercial Flow — Signature Component

### Mental Model: Horizontal Commercial Relationship Explorer

This is a **structured commercial relationship explorer** showing financial lineage and document lineage. It is NOT a generic workflow chart, BPMN diagram, React Flow canvas, bubble diagram, or organizational chart.

```
PURCHASE ORDER        CERTIFICATION              INVOICE

4500015358 ───────── PAC-... ───────────────── INV-...
TZS 123.5M           TZS 48.7M                 TZS 48.7M
47 sites              Issued                    Finance Review

         ├────────── FAC-... ───────────────── INV-...
                     TZS 69.5M                 TZS 69.5M
                     Approved                  Paid
                                                └── Payment: TZS 69.5M

         └────────── DPC-... ───────────────── (Not invoiced)
                     TZS 5.4M
                     Draft
```

### Node Specification

| Node Type | Background | Border | Content | Width |
|-----------|------------|--------|---------|-------|
| PO | `--color-bg-surface` | 1px `--color-border-default` | Reference, Supplier, Sites, Total | 200px |
| Certificate | `--color-bg-canvas` | 1px `--color-border-default` | Reference, Type label (FAC/PAC/DPC), Amount, Status | 200px |
| Invoice | `--color-bg-canvas` | 1px `--color-border-default` | Reference, Amount, Status | 180px |
| Payment (expandable) | `--color-bg-subtle` | 1px `--color-border-subtle` | Date, Amount, Reference | 160px |

Certificate type labels (FAC, PAC, DPC) appear as plain text within nodes. Status (Draft, Issued, Approved, etc.) uses the standard status dot + text with semantic color. The certificate **type** does not receive a semantic color.

### Node States

| State | Treatment |
|-------|-----------|
| Default | Standard border and background |
| Hover | `--color-border-strong` border; subtle background shift |
| Selected | 2px `--color-brand-primary` border; `--color-brand-subtle` background |
| Focused | Standard focus ring |

### Connector Lines

| Property | Value |
|----------|-------|
| Color | `--color-border-default` |
| Width | 1px |
| Style | Straight horizontal + right-angle bends (not curves, not decorative arcs) |

### Visual Restraint

- Use precise alignment and subtle connector lines
- Show financial values, status, and document references on each node
- Avoid large circles, bright connector colors, floating bubbles
- Avoid drag-and-drop node behavior or decorative animation
- Avoid gimmicky node-graph libraries or presentation-diagram aesthetics
- This is financial traceability, not a presentation diagram

### Responsive Fallback

Below 1024px workspace width, collapse to a **vertical nested list**:

```
▾ PO 4500015358
  ├── PAC-...  TZS 48.7M  Issued
  │   └── INV-...  TZS 48.7M  Finance Review
  ├── FAC-...  TZS 69.5M  Approved
  │   └── INV-...  TZS 69.5M  Paid
  │       └── Payment  TZS 69.5M  Posted
  └── DPC-...  TZS 5.4M  Draft
```

### Interaction

| Action | Behavior |
|--------|----------|
| Click node | Opens quick view drawer for that entity |
| Expand payment | Toggles payment details below invoice |
| Keyboard | Tab between nodes; Enter opens detail |

---

## 23. Documents

### Document Card

| Property | Value |
|----------|-------|
| Background | `--color-bg-canvas` |
| Border | 1px `--color-border-default` |
| Border radius | `--radius-md` (4px) |
| Padding | 16px |
| Filename | `--type-body-emphasis` (14px / 600) |
| Metadata | `--type-metadata` (12px / 400) in `--color-text-tertiary` |

### Upload Experience

| State | Treatment |
|-------|-----------|
| Drop zone | Dashed 2px `--color-border-default`; "Drag files here or Browse" |
| Drag over | Dashed 2px `--color-brand-primary`; `--color-brand-subtle` background |
| Uploading | Progress bar + filename + percentage |
| Complete | Success icon + "Upload complete" in `--color-success-text` |
| Failed | Error icon + message in `--color-danger-text` + "Retry" |

### Document Preview

| Property | Value |
|----------|-------|
| Document canvas | `--color-bg-subtle` background; document on white with `--shadow-sm` |
| Toolbar | 48px height, `--color-bg-canvas`, 1px bottom border |
| Controls | Zoom, page navigation, download, print |

---

## 24. Buttons

### Button Hierarchy

| Variant | Background | Text | Use |
|---------|------------|------|-----|
| Primary | `--color-brand-primary` | `#FFFFFF` | High-intent: "Create Certification", "Issue Certificate", "Post Payment" |
| Secondary | `--color-bg-canvas` | `--color-text-primary` | Secondary: "Save Draft", "Export", "Cancel" |
| Tertiary / Ghost | Transparent | `--color-text-secondary` | Low-emphasis: "Clear filters", "View all" |
| Destructive | `--color-danger-icon` | `#FFFFFF` | Destructive: "Void Document", "Delete Draft" |
| Destructive Secondary | `--color-bg-canvas` | `--color-danger-text` | Less-critical destructive: "Return Invoice" |

### Button Sizes

| Size | Height | Padding | Font |
|------|--------|---------|------|
| Small | 32px | 4px 12px | `--type-button-small` |
| Default | 36px | 8px 16px | `--type-button` |
| Large | 44px | 12px 24px | `--type-button` |

### Button States

| State | Primary | Secondary |
|-------|---------|-----------|
| Default | `--color-brand-primary` | White bg, `--color-border-default` |
| Hover | `--color-brand-hover` | `--color-bg-subtle`, `--color-border-strong` |
| Active | `--color-brand-active` | `--color-bg-subtle` |
| Focus | Default + focus ring | Default + focus ring |
| Disabled | 40% opacity | 40% opacity |
| Loading | Spinner replacing label; width maintained | Same |

### Button Rules

- Border radius: `--radius-md` (4px) for all buttons
- Icon-to-label gap: 8px; icon size: 16px (default), 14px (small)
- Max one primary button per visible viewport section
- Icon-only buttons: 36×36px default; tooltip required

---

## 25. Status System

### Status Pattern

Default: **semantic dot (8px) + text label**

Badge variant (for table cells where scanning is improved):

| Property | Value |
|----------|-------|
| Background | Semantic color at 10% opacity |
| Border radius | `--radius-md` (4px) |
| Padding | 2px 8px |
| Font | `--type-status` (12px / 500) |

### Status Mapping

| Status | Dot Color | Text Color | Category |
|--------|-----------|------------|----------|
| Draft | `#868E96` | `--color-text-secondary` | Neutral |
| Awaiting Signature | `#D97706` | `--color-warning-text` | Warning |
| Signed | `#059669` | `--color-success-text` | Success |
| Issued | `#2563EB` | `--color-info-text` | Info |
| Returned | `#DC2626` | `--color-danger-text` | Danger |
| Approved | `#059669` | `--color-success-text` | Success |
| Processing | `#2563EB` | `--color-info-text` | Info |
| Paid | `#059669` | `--color-success-text` | Success |
| Partially Paid | `#D97706` | `--color-warning-text` | Warning |
| Overdue | `#DC2626` | `--color-danger-text` | Danger |
| Blocked | `#DC2626` | `--color-danger-text` | Danger |
| Void | `#868E96` | `--color-text-tertiary` | Neutral (muted) |
| Not Invoiced | `#868E96` | `--color-text-secondary` | Neutral |
| Partially Invoiced | `#D97706` | `--color-warning-text` | Warning |
| Fully Invoiced | `#059669` | `--color-success-text` | Success |

### Status Rules

- **Never use color alone** to communicate status. Always pair the colored dot with a text label.
- Status colors represent **states**, not entity types. Certificate types (FAC/PAC/DPC) do not receive semantic status colors.
- Do not use brand orange for status indication. Brand color and semantic status colors have separate responsibilities.
- Avoid rainbow interfaces: limit visible status indicators per row.

---

## 26. Notifications

### Notification Bell

| Property | Value |
|----------|-------|
| Icon | Bell outline, 20px |
| Unread badge | `--color-brand-primary` circle, 18px, white number |
| Click | Opens notification panel (380px dropdown, `--shadow-lg`) |

### Notification Row

| Property | Value |
|----------|-------|
| Min height | 56px |
| Padding | 12px 16px |
| Unread indicator | 8px `--color-brand-primary` dot |
| Timestamp | `--type-metadata` in `--color-text-tertiary` |
| Hover | `--color-bg-subtle` background |

---

## 27. Dashboards

### Dashboard Philosophy

Dashboards answer **"What needs my attention?"** — not "What statistics can we display?"

**Priority order:**

1. Attention queue — items requiring user action
2. Financial summary — compact, exact values (summary strip, not giant cards)
3. Exceptions — commercial mismatches, overdue items, blocked workflows
4. Recent activity — last 5–10 relevant actions
5. Trends — only if they answer a specific business question

**Explicitly prohibited:**

- Walls of KPI cards (six or more oversized metric tiles across the top)
- Decorative charts added merely to fill space
- Giant colorful summary cards as the primary dashboard content
- Charts that duplicate information already shown as exact values

Use compact **financial summary strips** and **attention queues** rather than card grids.

### Role-Specific Dashboard Focus

| Role | Financial Summary | Attention Focus |
|------|-------------------|-----------------|
| Projects | Active PO value, Certified, Invoiced, Paid | Certs awaiting signature; import exceptions |
| Supplier | New certificates | Certificates awaiting invoice; returned invoices |
| Supply Chain | Invoices awaiting review | Returned; oldest pending; exceptions |
| Finance | Payment queue, Outstanding liability | Due soon; overdue; partial payments |
| Management | Authorized, Certified, Invoiced, Paid, Outstanding | DPC exposure; exceptions; bottlenecks |

Dashboard content reflects role-authorized data. Dashboard **styling** is identical across all roles.

---

## 28. Drawers

### Drawer Purpose

Drawers are for **contextual inspection and lightweight actions** that benefit from preserving the user's current page context.

**Drawers SHOULD contain:**

- Site quick view
- PO quick view
- Certificate quick view
- Invoice quick view
- Search result detail
- Record inspection with summary data and navigation links

**Drawers SHOULD NOT contain:**

- Multi-step certification creation workflows
- Commercial package import processes
- Complex payment posting workflows
- Large data-entry forms
- Full certification calculation tables

Major workflows belong on **dedicated pages or focused workflow surfaces**, not inside drawers.

### Drawer Specification

| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Width | 480px / 640px | 80% viewport | 100% (full screen) |
| Background | `--color-bg-elevated` | Same | Same |
| Shadow | `--shadow-lg` | Same | None |
| Border radius | `--radius-lg` on inner edge | Same | None |
| Animation | Slide from right, 200ms (`--duration-normal`) `--ease-out` | Same | Slide up, 200ms (`--duration-normal`) |

### Anatomy

Header (56px, border-bottom) → Scrollable body (24px padding) → Optional footer (56px, border-top, actions)

### Nested Drawers

Maximum **one level** of nesting. Parent drawer shifts left and dims. Avoid deeper nesting; navigate to a full page instead.

---

## 29. Modals

### Sizes

| Size | Width | Use |
|------|-------|-----|
| Small | 400px | Confirmations, simple inputs |
| Medium | 560px | Standard dialogs with forms |
| Large | 720px | Complex dialogs |

### Specification

| Property | Value |
|----------|-------|
| Background | `--color-bg-elevated` |
| Border radius | `--radius-lg` (6px) |
| Shadow | `--shadow-xl` |
| Backdrop | `--color-bg-backdrop` (at `--z-backdrop: 300`) |
| Animation | Fade + scale 98%→100%, 300ms (`--duration-slow`) `--ease-out` |

Do not place entire complex workflows inside modals. Modals are for focused decisions: confirmations, simple inputs, destructive acknowledgments.

---

## 30. Empty States

Professional and brief. No cartoons, mascots, or excessive illustrations.

| Property | Value |
|----------|-------|
| Icon size | 40px in `--color-text-disabled` |
| Message | `--type-body` in `--color-text-tertiary` |
| Action | Tertiary button or link (optional) |
| Position | Centered in content area |

---

## 31. Loading States

### Skeleton Loading

| Property | Value |
|----------|-------|
| Base color | `--color-bg-subtle` |
| Shimmer | `--color-bg-surface` highlight sweep |
| Animation | 1.5s horizontal sweep, `--ease-in-out`, infinite |
| Border radius | `--radius-sm` on skeleton bars |

### Other Patterns

| Context | Treatment |
|---------|-----------|
| Button loading | Spinner (16px) replaces label |
| Search loading | Spinner replaces search icon |
| Long operations | Progress bar with percentage + descriptive text |

### Progress Bar

4px height, `--color-bg-subtle` track, `--color-brand-primary` fill, `--radius-full`.

---

## 32. Errors & Exceptions

### Alert Banner

| Property | Value |
|----------|-------|
| Padding | 12px 16px |
| Border radius | `--radius-md` (4px) |
| Left border | 3px in semantic icon color |
| Background | Semantic background color |

### Commercial Exceptions (Visual Treatment)

| Exception | Severity | Presentation |
|-----------|----------|-------------|
| Value mismatch | Warning | Row icon + section alert |
| Supplier mismatch | Warning | Row icon + section alert |
| Duplicate PO | Warning | Page-level alert |
| Over-certification | Error (blocking) | Cell-level error / blocking modal |
| Invoice exceeds entitlement | Error (blocking) | Blocking modal |
| Payment exceeds invoice | Error (blocking) | Blocking modal |
| Missing signed document | Warning | Section alert |

Exception business rules, thresholds, and validation conditions are defined by PRODUCT.md. DESIGN.md specifies only how each severity level appears visually.

### Error Message Content

Every error must answer: (1) What happened, (2) What is affected, (3) Is the action blocked, (4) What can the user do.

---

## 33. Activity / Audit Timeline

### Timeline Specification

| Property | Value |
|----------|-------|
| Timeline line | 1px `--color-border-default`, vertical |
| Event dot | 8px circle |
| Event padding-left | 24px from line |
| Timestamp | `--type-metadata` in `--color-text-tertiary` |
| Action text | `--type-body` in `--color-text-primary` |
| Actor | `--type-body` in `--color-text-secondary` |
| Event spacing | 24px between events |

---

## 34. Aging

### Visual Severity Scale (Illustrative)

| Bucket (Illustrative) | Text Color Token | Status Icon / Dot | Weight | Background / Row Treatment |
|-----------------------|------------------|-------------------|--------|----------------------------|
| Not Due | `--color-text-secondary` | Neutral dot (`#868E96`) | 400 | None |
| Due Soon | `--color-warning-text` | Warning dot (`--color-warning-icon`) | 400 | None |
| 1–30 overdue | `--color-warning-text` | Warning icon (`--color-warning-icon`) | 500 | None |
| 31–60 overdue | `--color-danger-text` | Danger icon (`--color-danger-icon`) | 500 | None |
| 61–90 overdue | `--color-danger-text` | Alert icon (`--color-danger-icon`) | 600 | None |
| 90+ overdue | `--color-danger-text` | Urgent alert icon (`--color-danger-icon`) | 600 | `--color-danger-bg` subtle row highlight |

### Aging Accessibility & Presentation Rules

- **Strict prohibition on opacity-reduced text:** Do not define aging severity using reduced-opacity danger text (such as danger at 70%). Opacity-based text treatments create serious accessibility and contrast failures.
- **Direct semantic tokens:** All aging text must use solid semantic tokens (`--color-warning-text`, `--color-danger-text`) directly, ensuring full WCAG AA contrast compliance against canvas and surface backgrounds.
- **Multidimensional severity escalation:** Visual severity increases through:
  - Font weight (400 → 500 → 600);
  - Status icon (dot → warning triangle → alert circle);
  - Background or border treatment (subtle alert container or row tint);
  - Explicit textual age label (e.g., "45 days overdue" in `--type-metadata`);
  rather than reducing text opacity.
- **Authority boundary:** Actual aging bucket definitions, thresholds, grace periods, and commercial business rules remain illustrative and are strictly defined by PRODUCT.md. DESIGN.md defines the visual severity hierarchy and accessible presentation rules only.

---

## 35. Data Visualization

### Philosophy

Charts are **secondary** to exact commercial values.

### Approved Chart Types

Horizontal bar, stacked horizontal bar, line chart, spark line.

### Prohibited

3D charts, pie/donut as primary presentation, rainbow palettes, decorative gradients, excessive animation, charts where a table would be more precise.

### Visualization Palette

| Token | Value |
|-------|-------|
| `--chart-1` | `#C25012` |
| `--chart-2` | `#2563EB` |
| `--chart-3` | `#059669` |
| `--chart-4` | `#D97706` |
| `--chart-5` | `#7C3AED` |
| `--chart-6` | `#DC2626` |
| `--chart-neutral` | `#ADB5BD` |

All charts must have exact values accessible via tooltip or inline label.

---

## 36. Accessibility

### Contrast Requirements

| Standard | Minimum Ratio |
|----------|---------------|
| Normal text (<18px or <14px bold) | 4.5:1 (WCAG AA) |
| Large text (≥18px or ≥14px bold) | 3:1 |
| UI components / graphical objects | 3:1 |
| Focus indicators | Clearly visible |

### Keyboard Navigation

- All interactive elements reachable via Tab
- Focus order follows visual reading order
- Consistent focus ring across all components (see §10)
- Skip-to-main-content link (visually hidden until focused)

### Screen Reader

- Descriptive `alt` text on images; `aria-label` on icon-only buttons
- Table headers: `<th scope="col">` / `<th scope="row">`
- Notifications: `aria-live="polite"`
- Modals: `role="dialog"` with `aria-modal="true"`

### Pointer vs. Touch Target Specifications

CLMS balances high enterprise information density with rigorous accessibility:

- **Desktop Pointer-Oriented Controls:** Visual controls may be **36px** (or 32px for compact table utilities and secondary actions) where enterprise data density requires it.
- **Touch-Capable Use:** For touch-capable devices and hybrid touchscreens, interactive hit targets must be at least **44×44px** (exceeding WCAG 2.2 Level AA target size requirements and supporting ergonomic touch interaction).
- **Expanded Invisible Hit Areas:** A visually compact 36px control achieves a 44×44px effective touch target by utilizing an expanded invisible hit area (e.g., via transparent padding, negative margins, or pseudo-elements `::before` / `::after`), preserving enterprise visual density without degrading touch accessibility.
- **Component Hit Target Rules:**
  - **Buttons:** 36px visual height (pointer); minimum 44×44px effective hit target on touch interfaces.
  - **Icon-Only Buttons:** 36×36px visual boundary; minimum 44×44px effective hit target.
  - **Checkboxes & Radios:** 18×18px visual control embedded in a 44×44px transparent interactive hit boundary.
  - **Sidebar Navigation Items:** 36px visual height spanning full sidebar width (240px / 64px), providing generous horizontal hit area exceeding touch requirements.
  - **Table Rows & Interactive Cells:** 44px comfortable row height meets touch targets directly; 36px compact rows use expanded hit areas when touch input is detected.

### Reduced Motion

When `prefers-reduced-motion: reduce`: disable shimmer, slide animations, and hover transitions. Keep essential state indicators.

### Color Independence

Never use color alone to convey information. Always pair with:
- Text label (status badges and lifecycle states);
- Icon + message (form errors and system alerts);
- Parentheses for sign (negative financial values `(TZS 1,234.00)`, where semantic color depends on commercial context defined by PRODUCT.md);
- Pattern + legend (charts and visualizations);
- Underline or distinct indicator (links and navigation items).

---

## 37. Responsive Design

### Breakpoint Behavior

| Breakpoint | Sidebar | Tables | Drawers |
|------------|---------|--------|---------|
| ≥1920px | Expanded | Full columns | 480px overlay |
| 1440–1919px | Expanded | Full columns | 480px overlay |
| 1366–1439px | Expanded | Priority columns | 480px overlay |
| 1024–1365px | Collapsed (64px) | Priority + scroll | 480px overlay |
| 768–1023px | Hidden (overlay) | Priority + scroll | 80% width |
| <768px | Hidden (overlay) | Horizontal scroll or cards | Full screen |

### 1366×768 Verification

At the minimum supported desktop resolution and 100% zoom:

- Navigation is fully usable
- Tables show at least 8–10 data rows without scrolling
- Financial summary strips fit without horizontal scroll
- Page headers are compact
- Primary actions are visible
- Commercial Explorer is practical for daily use

---

## 38. Motion

### Timing

| Token | Value | Use |
|-------|-------|-----|
| `--duration-instant` | `0ms` | Disabled motion |
| `--duration-fast` | `100ms` | Hover, focus, button press |
| `--duration-normal` | `200ms` | Drawer, dropdown, tab switch |
| `--duration-slow` | `300ms` | Modal |
| `--duration-skeleton` | `1500ms` | Skeleton shimmer cycle |

### Easing

| Token | Value | Use |
|-------|-------|-----|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Elements entering |
| `--ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Elements leaving |
| `--ease-in-out` | `cubic-bezier(0.45, 0, 0.55, 1)` | Continuous motion |

### Rules

- Motion communicates **state change**, not decoration
- All animations respect `prefers-reduced-motion`
- No bouncing, spring physics, or playful motion
- No auto-playing decorative animations
- No large page transitions (navigation is instant)

---

## 39. Iconography

### Icon Family

Use **one consistent stroke-based icon family** throughout. Recommended: **Lucide** (MIT, consistent, extensive). Choose ONE family and use it exclusively.

### Specification

| Context | Size | Stroke |
|---------|------|--------|
| Navigation | 18px | 1.5px |
| Buttons | 16px | 1.5px |
| Table actions | 16px | 1.5px |
| Empty states | 40px | 1.5px |

### Rules

- Do not mix icon families, styles (filled vs outline), or emoji
- Do not make every icon orange; icons use `--color-text-secondary` by default
- Icon-only buttons require tooltip and `aria-label`

---

## 40. Content & Microcopy

### Language Tone

| ✅ Do | ❌ Don't |
|-------|---------|
| "Import Approved BOQ & PO" | "Let's get started!" |
| "Create Certification" | "New Magic Certificate ✨" |
| "Issue Certificate" | "Send it!" |
| "Return to Supplier" | "Bounce back" |
| "Post Payment" | "Pay now" |
| "No matching sites found." | "Oops! Nothing here 🤷" |

Use clear, specific verbs. Destructive actions include the object name. Cancel is always "Cancel."

---

## 41. Standard Page Anatomy

### Layer Order

1. Context / Breadcrumb
2. Page Header (title + description + primary action)
3. Optional Financial Summary Strip
4. Toolbar / Search / Filters
5. Primary Content
6. Contextual Detail (drawer)
7. Activity / Secondary Information

### Page Header

| Element | Specification |
|---------|--------------|
| Breadcrumb | `--type-breadcrumb`, `--color-text-tertiary` |
| Title | `--type-page-title` (24px / 600), `--color-text-primary` |
| Description | `--type-page-description` (14px / 400), `--color-text-secondary` |
| Primary action | Primary button, right-aligned |
| Header bottom margin | 24px |

---

## 42. Authentication

### Login Screen

| Property | Value |
|----------|-------|
| Background | Flat `--color-bg-canvas` or `--color-bg-surface` (default). A very subtle neutral surface transition between canvas and surface is permissible but not required. No colorful gradients, patterns, or decorative graphics. |
| Card | 400px width, `--shadow-md`, `--radius-xl` (8px), `--color-bg-canvas` fill, 1px `--color-border-default` border |
| Logo | Blue RGB, 180px max, centered above form |
| "CLMS" | `--type-page-title` (24px / 600), centered |
| Full title | `--type-body` (14px / 400), `--color-text-secondary`, centered |
| Tagline | `--type-body` (14px / 400), `--color-text-tertiary`, italic, centered |
| Input height | 44px |
| Sign In | Full-width primary button, large (44px) |

Communicates: security, corporate ownership, product identity, and institutional trust. Authentication uses a clean, flat neutral background (`--color-bg-canvas` or `--color-bg-surface`). Do not use colorful gradients, decorative backgrounds, photographic imagery, or illustration collages.

---

## 43. Generated Documents

### Branding

| Document | Logo Variant |
|----------|-------------|
| FAC / PAC / DPC | Orange/Full Colour or Off-Black |
| Reports | Off-Black |

### Principles

Legibility first. Formal structure. Print quality (300dpi). No application UI elements in documents. Default A4 paper size.

---

## 44. Print / Export

Remove sidebar, topbar, buttons, hover states. Preserve data tables, financial values, status text, headers, logos. Force `color-adjust: exact`. `@page` margins: 15mm.

| Format | Content |
|--------|---------|
| PDF | Current page with formatting |
| Excel/CSV | Table data (all filtered data, not just visible page) |

---

## 45. Design Tokens Reference

### Colors

```css
/* Background */
--color-bg-canvas: #FFFFFF;
--color-bg-surface: #F8F9FA;
--color-bg-subtle: #F1F3F5;
--color-bg-elevated: #FFFFFF;
--color-bg-backdrop: rgba(0, 0, 0, 0.5);
--color-bg-overlay: rgba(0, 0, 0, 0.5);  /* backwards-compatible alias for --color-bg-backdrop */
--color-bg-inverse: #1A1D21;
--color-bg-inverse-subtle: #2C3038;

/* Text */
--color-text-primary: #1A1D21;
--color-text-secondary: #495057;
--color-text-tertiary: #5F6B7A;
--color-text-disabled: #ADB5BD;  /* disabled controls ONLY */
--color-text-inverse: #FFFFFF;
--color-text-inverse-secondary: #CED4DA;

/* Border */
--color-border-default: #DEE2E6;
--color-border-subtle: #E9ECEF;
--color-border-strong: #ADB5BD;
--color-border-focus: #C25012;
--color-border-inverse: rgba(255, 255, 255, 0.16);

/* Brand [PROVISIONAL] */
--color-brand-primary: #C25012;
--color-brand-hover: #A84510;
--color-brand-active: #8E3A0D;
--color-brand-subtle: #FEF3EC;
--color-brand-subtle-hover: #FDE8D8;
--color-brand-text: #B94005;

/* Semantic */
--color-success-bg: #ECFDF5;
--color-success-border: #A7F3D0;
--color-success-text: #065F46;
--color-success-icon: #059669;

--color-warning-bg: #FFFBEB;
--color-warning-border: #FDE68A;
--color-warning-text: #92400E;
--color-warning-icon: #D97706;

--color-danger-bg: #FEF2F2;
--color-danger-border: #FECACA;
--color-danger-text: #991B1B;
--color-danger-icon: #DC2626;

--color-info-bg: #EFF6FF;
--color-info-border: #BFDBFE;
--color-info-text: #1E40AF;
--color-info-icon: #2563EB;

/* Charts */
--chart-1: #C25012;
--chart-2: #2563EB;
--chart-3: #059669;
--chart-4: #D97706;
--chart-5: #7C3AED;
--chart-6: #DC2626;
--chart-neutral: #ADB5BD;
```

### Typography

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', 'Cascadia Code', Consolas, monospace;

--font-size-xs: 11px;
--font-size-sm: 12px;
--font-size-md: 13px;
--font-size-base: 14px;
--font-size-lg: 16px;
--font-size-xl: 18px;
--font-size-2xl: 20px;
--font-size-3xl: 24px;
--font-size-4xl: 28px;

--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

--line-height-tight: 1.14;
--line-height-snug: 1.25;
--line-height-normal: 1.38;
--line-height-relaxed: 1.5;

--letter-spacing-tight: -0.3px;
--letter-spacing-snug: -0.2px;
--letter-spacing-normal: 0;
--letter-spacing-wide: 0.1px;
--letter-spacing-wider: 0.2px;
--letter-spacing-widest: 0.4px;
--letter-spacing-caps: 0.8px;
```

### Spacing

```css
--space-0: 2px;   /* micro only */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-7: 32px;
--space-8: 40px;
--space-9: 48px;
--space-10: 64px;
```

### Radius

```css
--radius-none: 0px;
--radius-sm: 2px;
--radius-md: 4px;
--radius-lg: 6px;
--radius-xl: 8px;
--radius-full: 9999px;
```

### Shadows

```css
--shadow-none: none;
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.06);
--shadow-md: 0 2px 8px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.10);
--shadow-xl: 0 8px 32px rgba(0, 0, 0, 0.14);
```

### Layout

```css
--sidebar-width: 240px;
--sidebar-width-collapsed: 64px;
--topbar-height: 48px;
--sidebar-header-height: 56px;
--drawer-width: 480px;
--drawer-width-large: 640px;
--modal-width-sm: 400px;
--modal-width-md: 560px;
--modal-width-lg: 720px;
```

### Motion

```css
--duration-instant: 0ms;
--duration-fast: 100ms;
--duration-normal: 200ms;
--duration-slow: 300ms;
--duration-skeleton: 1500ms;
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in: cubic-bezier(0.7, 0, 0.84, 0);
--ease-in-out: cubic-bezier(0.45, 0, 0.55, 1);
```

### Breakpoints

```css
--breakpoint-mobile: 768px;
--breakpoint-tablet: 1024px;
--breakpoint-laptop: 1366px;
--breakpoint-desktop: 1440px;
--breakpoint-desktop-xl: 1920px;
```

### Z-Index

```css
--z-base: 0;
--z-sticky: 100;
--z-dropdown: 200;
--z-backdrop: 300;
--z-drawer: 400;
--z-modal: 500;
--z-popover: 600;
--z-tooltip: 700;
--z-notification: 800;
```

#### Stacking Order Guarantees

1. **Base (`--z-base: 0`):** Default page canvas, standard layout blocks, inline content.
2. **Sticky (`--z-sticky: 100`):** Sticky table headers and sticky section action bars stay above scrolled table rows.
3. **Dropdown (`--z-dropdown: 200`):** Select menus, filter dropdowns, and autocomplete menus float cleanly over sticky headers.
4. **Backdrop (`--z-backdrop: 300`):** Modal and drawer backdrop scrims darken the underlying page without ever rendering above the dialog or drawer they belong to.
5. **Drawer (`--z-drawer: 400`):** Contextual inspection drawers render above the backdrop scrim.
6. **Modal (`--z-modal: 500`):** Dialogs and confirmation modals render above backdrop scrims and drawers.
7. **Popover (`--z-popover: 600`):** Popovers, datepickers, and contextual flyouts spawn above modals without getting trapped.
8. **Tooltip (`--z-tooltip: 700`):** Micro-inspection tooltips float above interactive controls inside modals and popovers.
9. **Notification (`--z-notification: 800`):** Global system alerts, toast messages, and connection banners float at the highest level.

---

## 46. Component States

### State Matrix

| Component | Default | Hover | Focus | Active | Selected | Disabled | Loading | Error |
|-----------|---------|-------|-------|--------|----------|----------|---------|-------|
| Button (primary) | Brand bg | Brand hover | Focus ring | Brand active | — | 40% opacity | Spinner | — |
| Button (secondary) | White bg | Subtle bg | Focus ring | Subtle bg | — | 40% opacity | Spinner | — |
| Text input | Default border | Strong border | Brand focus ring | Brand focus | — | Subtle bg | — | Danger border + msg |
| Select | Default border | Strong border | Brand focus ring | Dropdown open | — | Subtle bg | — | Danger border + msg |
| Checkbox | Default border | Strong border | Focus ring | — | Brand fill + check | Subtle bg | — | Danger border |
| Radio | Default border | Strong border | Focus ring | — | Brand fill + dot | Subtle bg | — | Danger border |
| Switch | Gray track | — | Focus ring | — | Brand track | Subtle track | — | — |
| Table row | Canvas bg | Subtle bg | Left bar | — | Brand subtle bg | — | Skeleton | — |
| Nav item | Transparent | Subtle bg | Focus ring | — | Brand subtle + bar | Disabled text | — | — |
| Tab | No indicator | Text darkens | Focus ring | — | Brand bottom border | Disabled text | — | — |
| Search result | Transparent | Subtle bg | Subtle bg + bar | — | — | — | — | — |
| File upload | Dashed border | — | Focus ring | — | — | Subtle bg | Progress bar | Danger border + msg |

All focusable components use the same focus ring specification (§10).

---

## 47. Keyboard Interaction

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open global search |
| `Escape` | Close topmost overlay |

### Component Keyboard

| Component | Key | Action |
|-----------|-----|--------|
| Search | `↓`/`↑` | Navigate results |
| Search | `Enter` | Open result |
| Search | `Esc` | Close |
| Dropdown | `↓`/`↑` | Navigate options |
| Dropdown | `Enter`/`Space` | Select |
| Modal | `Tab`/`Shift+Tab` | Cycle (trapped) |
| Modal | `Esc` | Close |
| Drawer | `Esc` | Close |
| Table | `↓`/`↑` | Move rows |
| Table | `Enter` | Open detail |
| Table | `Space` | Toggle selection |
| Tabs | `←`/`→` | Switch tabs |

### Focus Management

Modal/drawer open → focus first focusable element. Close → return focus to trigger.

---

## 48. Performance Perception

| Pattern | Purpose |
|---------|---------|
| Skeleton loading | Preserve layout during fetch |
| Drawer inspection | Avoid page reload |
| Search debounce (200ms) | Prevent excessive requests |
| Pagination / virtualization | Handle large datasets |
| Context retention | Preserve scroll and filters on return |

For operations >5 seconds, show progress with descriptive text.

---

## 49. Density

### Comfortable (Default)

| Component | Value |
|-----------|-------|
| Table row | 44px |
| Nav item | 36px |
| Button | 36px |
| Input | 40px |

### Compact (Optional)

| Component | Value |
|-----------|-------|
| Table row | 36px |
| Nav item | 32px |
| Button | 32px |
| Input | 36px |

At 1366×768, comfortable density must show 8–10 data rows without scrolling (with header, filters, and pagination visible).

---

## 50. Do / Don't Guardrails

### ✅ DO

**Layout & Structure**
- Use whitespace intentionally to separate content groups
- Maintain disciplined grid alignment across all pages
- Use the standard page anatomy consistently
- Design for 100% browser zoom on 1366×768
- Allow data-heavy screens to use full available width
- Use drawers for contextual inspection, not complex workflows
- Use alignment, borders, and spacing before reaching for card containers

**Color & Brand**
- Use orange sparingly: primary CTA, active nav marker, focus ring
- Use semantic colors for states only (green=success, amber=warning, red=danger, blue=info)
- Keep the interface predominantly white, off-white, and neutral gray
- Consume design tokens; never hardcode brand hex values in components
- Ensure all text meets WCAG AA contrast on its permitted backgrounds

**Typography & Data**
- Use tabular numerals for all financial values and numeric columns
- Right-align currency and numeric table columns
- Use Inter for commercial identifiers (PO numbers, site IDs); mono is optional
- Use exact financial values in tables, calculations, and documents
- Reserve compact display (4.57B) for dashboard summaries only (with exact tooltip)

**Status & Semantics**
- Status colors represent states, never entity types
- Certificate types (FAC/PAC/DPC) use neutral labels, not semantic colors
- Always pair colored status dots with text labels

**Interaction**
- Use real empty states, loading skeletons, and error states
- Keep navigation consistent across all roles (same shell, different permissions)
- Make global search feel fast, precise, and professional
- Support keyboard navigation throughout

### ❌ DON'T

**Layout & Structure**
- Don't use giant orange gradients or orange backgrounds
- Don't wrap every section, table, or metric in a separate card
- Don't use walls of KPI cards on dashboards
- Don't use headings larger than 28px in the authenticated UI
- Don't invent different layouts for every page
- Don't design around 75% browser zoom
- Don't place complex multi-step workflows inside drawers

**Color & Brand**
- Don't create rainbow status interfaces
- Don't use orange for icons, headings, borders, or table headers indiscriminately
- Don't assign semantic colors to certificate types (FAC≠green, PAC≠blue, DPC≠amber)
- Don't use `--color-text-disabled` for normal informational text
- Don't use glassmorphism, blur effects, or decorative visual trends

**Brand & Identity**
- Don't crop the tower from the Helios logo as a standalone icon
- Don't claim provisional design tokens are official corporate brand values
- Don't introduce business rules, payment terms, or commercial logic in DESIGN.md
- Don't treat illustrative example data as product defaults

**Presentation**
- Don't copy IBM, Linear, Revolut, or Mastercard branding
- Don't make CLMS look like a consumer banking app
- Don't use marketing-site patterns inside operational screens
- Don't use decorative charts where exact values are more useful
- Don't make every action a primary (orange) button
- Don't use excessive or decorative animations
- Don't mix icon families or use emoji as UI elements

---

## Appendix A: Design Mental Test

Before implementing any screen, verify:

| Question | Required Answer |
|----------|-----------------|
| Does this feel like a serious commercial/financial platform? | Yes |
| Can users work in it for hours without visual fatigue? | Yes |
| Can it display thousands of sites professionally? | Yes |
| Can financial values be scanned quickly? | Yes |
| Does search feel like a first-class capability? | Yes |
| Do tables feel precise? | Yes |
| Does navigation remain calm? | Yes |
| Does Helios branding remain recognizable without overwhelming? | Yes |
| Can all roles use the same coherent system? | Yes |
| Would it look professional without any animation? | Yes |
| Would it look correct at 100% zoom on 1366×768? | Yes |
| Does it avoid looking AI-generated or template-based? | Yes |

If any answer is **No**, refine the component before shipping.

---

*CLMS Design System v1.2 — Frozen*

*Helios Towers — Commercial Lifecycle Management System*

*"From commitment to settlement."*

*Certificate types: FAC (Final Acceptance Certificate) · PAC (Provisional Acceptance Certificate) · DPC (Down Payment Certificate)*
