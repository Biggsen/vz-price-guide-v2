---
title: Admin Shop — Cypress E2E Testing Spec
description: Planned end-to-end test coverage for Admin Shop (server_shop) — import, export, recipe pricing, and access control. Not implemented yet.
status: not-started
created_at: 2026-07-02
related:
  - tasks/server-shop-feature-spec.md
  - tasks/admin-shop-manual-test-journeys.md
  - tasks/admin-shop-notes.md
  - tasks/completed/shop-manager-testing-spec.md
  - tasks/testing/cypress-testing.md
---

# Admin Shop — Cypress E2E Testing Spec

## Overview

Plan for Cypress coverage of **Admin Shop** (`server_shop: true`, UI label **Admin Shop**) inside Shop Manager. The feature shipped in PR #23; manual journeys in `tasks/admin-shop-manual-test-journeys.md` are the source of truth for happy paths until these specs exist.

**Status:** Not started — implement when ready.

### Goals

- Catch regressions in import/export, recipe pricing, and admin-only UI
- Automate the three manual journeys at a smoke level first
- Run against Firebase emulators with seeded data (`npm run test:e2e:emu:seeded`)

### Out of scope (for v1 automation)

- Full EconomyShopGUI ZIP content validation (spot-check structure only)
- Recipe dependency graphs with large crafted trees
- Visual regression of admin shop layouts
- Production Firestore / live EconomyShopGUI plugin round-trip

---

## Recommended spec files

| File | Purpose | Priority |
|------|---------|----------|
| `cypress/e2e/admin-shop-access.cy.js` | Permissions, create gates, admin-only settings | P0 |
| `cypress/e2e/admin-shop-smoke.cy.js` | Create admin shop → import one YAML → see items | P0 |
| `cypress/e2e/admin-shop-import.cy.js` | ESGUI + VZ YAML import, results modal, re-import | P1 |
| `cypress/e2e/admin-shop-export.cy.js` | Standard JSON/YAML + ESGUI ZIP download | P1 |
| `cypress/e2e/admin-shop-recipe.cy.js` | Recipe pricing, missing ingredients, recalculate | P1 |
| `cypress/e2e/admin-shop-integration.cy.js` | Full journeys 1–3 (longer, run nightly or pre-release) | P2 |

Extend existing shop-manager specs only where behaviour is shared (e.g. search, view mode). Admin-shop-specific flows belong in `admin-shop-*.cy.js` to keep files focused.

---

## Test environment

Same stack as existing Shop Manager tests — see `tasks/testing/cypress-testing.md`.

| Item | Value |
|------|--------|
| User | `admin@example.com` / `passWORD123` (seed `test-admin-1`) |
| Emulators | Firestore `8080`, Auth `9099` |
| Run command | `npm run test:e2e:emu:seeded` |
| Fixtures | `cypress/fixtures/admin-shop/` (create when implementing) |

### Fixture files to add

| Fixture | Source | Use |
|---------|--------|-----|
| `esgui-blocks.yml` | Copy or symlink from `reference/EconomyShopGUI/minimalist-shop/shops/Blocks.yml` | ESGUI import smoke |
| `vz-price-guide-small.yml` | Minimal hand-written export (5–10 materials) | VZ import smoke |
| `esgui-negative-prices.yml` | Snippet with `buy: -1` / `sell: -1` | Disabled price mapping |
| `vz-uncategorized.yml` | Item with missing/uncategorized guide row | Rejection / unmapped list |

### Seed enhancements (optional)

Current seed (`Test Server 1`) has player shops only and no `user_manages_server`. Tests can create a managed server in-ui, or seed could add:

- `managed-server` with `user_manages_server: true` and empty admin shop
- Prevents every spec repeating server creation

---

## Custom commands to add

Add to `cypress/support/e2e.js` when implementing:

```javascript
// Create managed server + admin shop; returns { serverId, shopId }
cy.createAdminShop({ serverName, version: '1.20' })

// Open admin shop items view for shopId
cy.navigateToAdminShop(shopId)

// Upload YAML in import modal (wraps file input + submit)
cy.importShopYaml(fixturePath)

// Open export modal, switch tab, trigger download (stub cy.window / anchor click)
cy.exportAdminShop({ format: 'standard-yaml' | 'standard-json' | 'esgui-zip' })
```

Reuse existing: `navigateToShopManagerAsAdmin`, `navigateToShopItems`, `signIn`, `acceptCookies`.

---

## 1. Access & permissions (`admin-shop-access.cy.js`) — P0

**Purpose:** Admin shop actions respect `user_manages_server` and admin-only UI is correct.

| # | Test case | Expected |
|---|-----------|----------|
| A1 | Seeded **Test Server 1** (player role) | Badge **Player**; no **Add Admin Shop** |
| A2 | Create server with **Yes – I manage this server** | Badge **Owner/Manager**; **Add Admin Shop** visible |
| A3 | Create server with **No – I play on this server** | No **Add Admin Shop** |
| A4 | **Add Admin Shop** → save | Redirects to shop items; empty state with Import |
| A5 | Admin shop settings modal | No **Archive**; no **Location** on edit shop |
| A6 | Admin shop empty state | No **Market Overview** link |
| A7 | Server with only admin shop (no player shops) | No Market Overview on Shop Manager server panel |
| A8 | Server with admin shop + player shops | Market Overview visible; admin shop **not** in overview |

**Selectors (existing):**

- `data-cy="server-shop-create-button"`
- `data-cy="server-shop-button"`
- `data-cy="shop-items-settings-modal"`
- `data-cy="shop-items-market-overview-button"` (should not exist on admin shop)
- `data-cy="shop-items-archive-checkbox"` (should not exist for admin shop)

**Selectors to add:**

- `data-cy="server-manage-yes-radio"` / `data-cy="server-manage-no-radio"` on `ServerFormModal`
- `data-cy="server-role-badge"` on server card (Player vs Owner/Manager)
- `data-cy="admin-shop-section"` on Shop Manager landing

---

## 2. Smoke (`admin-shop-smoke.cy.js`) — P0

**Purpose:** Fast confidence check — one path through create → import → table row visible.

| # | Test case | Expected |
|---|-----------|----------|
| S1 | Create managed server + admin shop | Shop detail loads, item count `0/N` |
| S2 | Open **Import** modal | Title **Import shop items**; compact info alert about Price Guide categories |
| S3 | Upload `esgui-blocks.yml` | Results banner shows added count; modal closes or shows success |
| S4 | Table shows imported items | At least one row; no persistent **Unknown item** |
| S5 | **Export** → EconomyShopGUI tab → download | ZIP download triggered (stub); no error banner |

Target runtime: under 60 seconds.

---

## 3. Import (`admin-shop-import.cy.js`) — P1

Maps to **Journey 1** (ESGUI) and **Journey 2** (VZ) in manual test doc.

| # | Test case | Expected |
|---|-----------|----------|
| I1 | Import ESGUI `Blocks.yml` | Items appear with **Pricing** column (Base/Custom mix) |
| I2 | Import results banner | Shows added / couldn't be added / already in shop counts |
| I3 | Re-import same file | **Skipped** / already-in-shop behaviour |
| I4 | Import VZ price guide YAML | Parser accepts; items use guide categories |
| I5 | Reject non-YAML (`.json`) | File input `accept` blocks or validation error |
| I6 | ESGUI `buy: -1` / `sell: -1` | Imported as not offered (null/0), not validation failure |
| I7 | Material newer than server MC version | Warning banner; unmapped block **Couldn't be added (N)** |
| I8 | Guide item without category | Listed in unmapped / not imported section |
| I9 | Import modal cancel | No partial import; modal closes cleanly |
| I10 | Import while items loading | No stuck **Importing…** state after completion |

**Selectors (existing):**

- `data-cy="shop-items-import-economyshopgui-button"`
- `data-cy="shop-items-yaml-import-file-input"`
- `data-cy="shop-items-yaml-import-submit-button"`
- `data-cy="shop-items-import-results-modal"`
- `data-cy="shop-items-import-results-banner"`
- `data-cy="shop-items-import-results-close-button"`

**Selectors to add:**

- `data-cy="shop-items-import-info-banner"` on compact category-mapping alert
- `data-cy="shop-items-import-unmapped-section"` on unmapped material lists

---

## 4. Export (`admin-shop-export.cy.js`) — P1

| # | Test case | Expected |
|---|-----------|----------|
| E1 | Standard tab → Preview | Shows `material_id` keys; first 3 + “N more” |
| E2 | Export JSON | Download with `stack_buy` / `stack_sell` fields |
| E3 | Export YAML | Valid YAML; round-trip import restores prices (optional P2) |
| E4 | EconomyShopGUI tab → ZIP | ZIP contains `shops/*.yml` and `sections/*.yml` |
| E5 | Edited inline price appears in export | Spot-check one material in downloaded YAML |
| E6 | Recipe-priced item in export | Resolved buy/sell values, not empty |

**Selectors (existing):**

- `data-cy="shop-items-export-button"`
- `data-cy="shop-items-export-modal"`
- `data-cy="shop-items-export-tab-standard"`
- `data-cy="shop-items-export-tab-economy-shop-gui"`
- `data-cy="shop-items-export-standard-preview"`
- `data-cy="shop-items-export-price-guide-json"`
- `data-cy="shop-items-export-price-guide-yaml"`
- `data-cy="shop-items-export-economy-shop-gui-zip"`

**Implementation note:** Use `cy.readFile` on downloaded file in `downloadsFolder`, or intercept blob URL. See patterns in homepage export tests if added later.

---

## 5. Recipe pricing (`admin-shop-recipe.cy.js`) — P1

Maps to **Journey 3** in manual test doc.

| # | Test case | Expected |
|---|-----------|----------|
| R1 | Add raw material with buy/sell | Row saves; **Base** or **Custom** label |
| R2 | Pricing type selector (single-select) | Hidden until item chosen; hidden in multi-select batch |
| R3 | Add crafted item with all ingredients priced | **Recipe** computes buy/sell |
| R4 | Add crafted item missing ingredient | **Not in shop** / **No buy price** / **No sell price** badge; save blocked |
| R5 | Add missing ingredient → recipe satisfied | Can save with Recipe pricing |
| R6 | Custom → Recipe toggle in table | Prices populate when valid |
| R7 | Recipe toggle hidden when recipe cannot compute | No switch for invalid dependency chain |
| R8 | **Recalculate recipe prices** | Results modal + banner with updated count |
| R9 | Change base ingredient → recalc | Dependent crafted prices update |
| R10 | Circular recipe dependency | Error in recalc results, no infinite loop |

**Selectors (existing):**

- `data-cy="shop-items-recalculate-button"`
- `data-cy="shop-items-recalculate-results-modal"`
- `data-cy="shop-items-recalculate-results-banner"`
- `data-cy="shop-item-pricing-type-help"`
- `data-cy="shop-item-buy-price-input"` / `data-cy="shop-item-sell-price-input"`

**Selectors to add:**

- `data-cy="shop-item-pricing-type-base"` / `custom` / `recipe` (or row-level toggle)
- `data-cy="shop-item-ingredient-status"` on ingredient rows in recipe preview
- `data-cy="shop-item-pricing-type-toggle"` for Custom → Recipe column control

---

## 6. Integration journeys (`admin-shop-integration.cy.js`) — P2

Longer specs mirroring manual journeys end-to-end. Run less frequently.

| Journey | Automate | Defer |
|---------|----------|-------|
| 1 — ESGUI migration | Create → import 7 category files → inline edit → ZIP export | Full ZIP content diff |
| 2 — VZ bootstrap | VZ import → edit → Standard export → optional round-trip | JSON re-import (unsupported) |
| 3 — Recipe economy | Manual bases → Recipe → recalc → dual export | Large recipe graphs |

---

## Cross-cutting checks

From manual doc **X1–X5** — fold into relevant specs:

| ID | Check | Spec |
|----|-------|------|
| X1 | No persistent **Unknown item** | Smoke S4, Import I10 |
| X2 | Clear ingredient copy | Recipe R4 |
| X3 | Admin shop excluded from Market Overview | Access A8 |
| X4 | No Archive / Location on admin shop | Access A5 |
| X5 | Narrow viewport table readable | Optional viewport test or manual-only |

### Homepage launch (optional)

| # | Test case | File |
|---|-----------|------|
| H1 | Announcement banner visible when not dismissed | `homepage.cy.js` or `admin-shop-launch.cy.js` |
| H2 | Dismiss persists in `localStorage` | Same |
| H3 | `/updates` id 45 bold rendering | `updates.cy.js` (if exists) |

---

## Selector gaps summary

Add these `data-cy` attributes before or during test implementation:

| Component | Suggested selector | Element |
|-----------|-------------------|---------|
| `ServerFormModal` | `server-manage-yes-radio`, `server-manage-no-radio` | Manage server radios |
| `ShopManagerView` | `server-role-badge` | Player / Owner/Manager badge |
| `ShopManagerView` | `admin-shop-section` | Admin shop block on server card |
| `ShopItemsView` | `shop-items-import-info-banner` | Compact import category alert |
| `ShopItemsView` | `shop-items-import-unmapped-section` | Unmapped materials list |
| `ShopItemForm` | `shop-item-ingredient-status` | Not in shop / No buy price badges |
| `ShopItemTable` / row | `shop-item-pricing-type-toggle` | Custom → Recipe control |
| `ShopItemTable` | `shop-item-pricing-label` | Base / Custom / Recipe label |

---

## Implementation phases

### Phase 1 — Infrastructure (≈ half day)

- [ ] Add fixture files under `cypress/fixtures/admin-shop/`
- [ ] Add `data-cy` gaps listed above (high-value only for P0)
- [ ] Add `cy.createAdminShop()` and `cy.importShopYaml()` commands
- [ ] Document download-stub approach for export tests

### Phase 2 — P0 smoke (≈ half day)

- [ ] `admin-shop-access.cy.js` (A1–A4 minimum)
- [ ] `admin-shop-smoke.cy.js` (S1–S5)

### Phase 3 — P1 core (1–2 days)

- [ ] `admin-shop-import.cy.js`
- [ ] `admin-shop-export.cy.js`
- [ ] `admin-shop-recipe.cy.js`

### Phase 4 — P2 integration (optional)

- [ ] `admin-shop-integration.cy.js`
- [ ] CI: run P0 on every PR; P1+ on `main` or nightly

---

## Success criteria

- [ ] P0 specs pass reliably on `npm run test:e2e:emu:seeded`
- [ ] Manual journeys 1–3 covered at smoke level by automated tests
- [ ] No flaky waits on Firestore — use `data-cy` assertions with reasonable timeouts
- [ ] New admin-shop specs documented in this file with ✅ as implemented
- [ ] PR template or `shop-manager-testing-enhancements.md` cross-links here

---

## Notes

- Prefer extending seed data over long `beforeEach` UI setup where it saves time without hiding integration bugs.
- Admin shop tests should **not** mutate seeded **Test Server 1** player shops; create isolated servers per spec or per `describe`.
- File upload: `cy.selectFile('cypress/fixtures/admin-shop/esgui-blocks.yml', { force: true })` on `shop-items-yaml-import-file-input`.
- Import/export modals use `data-cy="shop-items-import-results-modal"` — wait for banner, not arbitrary `cy.wait(ms)`.
- Deferred manual polish (Tab between buy/sell cells) does not need E2E coverage until implemented.
