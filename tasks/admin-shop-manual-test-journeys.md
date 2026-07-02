---
title: Admin Shop — Manual Test Journeys
description: Three happy-path manual test journeys for reviewing the admin / server shop feature end to end.
created_at: 2026-06-30
related:
  - tasks/server-shop-feature-spec.md
  - tasks/admin-shop-notes.md
  - tasks/testing/admin-shop-testing-spec.md
---

# Admin Shop — Manual Test Journeys

Use these journeys to review the admin shop feature (`server_shop: true`, UI label **Admin Shop**) from setup through import, price changes, and export.

**Spec:** `tasks/server-shop-feature-spec.md`  
**Review scratchpad:** `tasks/admin-shop-notes.md`  
**Planned Cypress coverage:** `tasks/testing/admin-shop-testing-spec.md`

---

## Local emulator setup (this repo)

Use this stack for manual review unless noted otherwise.

| Item | Value |
|------|--------|
| Auth / Firestore | Local Firebase emulators (`npm run seed:emu` or your usual seed flow) |
| Test user | **Test Admin 1** — `admin@example.com` / `passWORD123` (`test-admin-1` in seed) |
| Shop Manager access | Granted when `emailVerified === true` (seed sets this for Test Admin 1) |
| Seeded server | **Test Server 1** (MC **1.20**) — has player shops only; seed does **not** set `user_manages_server`, so it behaves as **Player** (no **Add Admin Shop**) |
| Seeded shops on Test Server 1 | `TestPlayer1's Shop` (my shop), `Competitor Shop` (player shop) — neither is an admin shop |
| Admin shop work | Create a **new** server in the UI with **Yes – I manage this server** (do not rely on Test Server 1 for admin shop creation) |
| ESGUI fixtures | `reference/EconomyShopGUI/minimalist-shop/` (7 categories) and `reference/EconomyShopGUI/default-shop/` (marketplace downloads) |
| Import format note | Admin shop **Import** accepts **one `.yml` / `.yaml` file** per upload — ESGUI shop YAML (`pages:`) or VZ price guide YAML (`material_id` keys + `unit_buy` / `unit_sell`). **Not** JSON, folders, or ZIP |

**Preconditions below** are setup requirements checked **before** you start a journey (not pass/fail steps inside the journey).

---

## Shared preconditions

| # | Precondition | Pass | Fail | Notes |
|---|--------------|------|------|-------|
| P1 | Signed in as **Test Admin 1** on local emulators | ☐ | ☐ | Shop Manager unlocked for any verified user |
| P2 | Email verified | ☐ | ☐ | Auto via seed for `test-admin-1` |
| P3 | **Managed server** ready for admin shop (new server, **Yes – I manage this server**, MC **1.20** recommended) | ☐ | ☐ | Seeded Test Server 1 is for player-shop / Market Overview checks only |
| P4 | **EconomyShopGUI import file(s)** ready — Journey 1 only | ☐ | ☐ | e.g. `reference/EconomyShopGUI/minimalist-shop/shops/Blocks.yml` (one file per import; all 7 shop files optional) |
| P5 | **VZ price guide import file** ready — Journey 2 only | ☐ | ☐ | **`.yml` / `.yaml` only** (material keys + `unit_buy` / `unit_sell`). Export from homepage or a prior admin shop **Standard YAML** export — **not** ESGUI reference folder; JSON exports are valid for sharing but **cannot** be re-imported today |

### Cross-cutting checks (watch on every journey)

| # | Check | Pass | Fail | Notes |
|---|-------|------|------|-------|
| X1 | No persistent **Unknown item** after table finishes loading | ☐ | ☐ | Fixed: **Loading…** while catalog resolves |
| X2 | Recipe rows with missing ingredients show clear copy (not vague **No prices**) | ☐ | ☐ | **Not in shop** / **No buy price** / **No sell price** badges |
| X3 | Admin shop **excluded** from Market Overview | ☐ | ☐ | |
| X4 | Admin shop settings: no **Archive**; no **Location** on edit | ☐ | ☐ | |
| X5 | **Pricing** and **Profit %** columns readable on narrow viewport | ☐ | ☐ | Responsive table: below **800px** — **Actions**, **Last updated** hidden; **Buy** / **Sell** shorten (drop “Price”). Below **600px** — **Notes**, **Profit %** hidden; pricing type icons hidden (label text remains). Pass if **Buy**, **Sell**, **Pricing** readable |

### Permission smoke (5 min, optional)

Use seeded **Test Server 1** (player role) or any server with **No – I play on this server**:

| # | Step | Expected | Pass | Fail | Notes |
|---|------|----------|------|------|-------|
| S1 | Open **Test Server 1** panel | Badge **Player**; no **Add Admin Shop** | ☐ | ☐ | |
| S2 | If admin shop already exists on that server | **Manage Admin Shop** still navigates correctly (confirm intent) | ☐ | ☐ | |

---

## Journey 1 — EconomyShopGUI migration

**Persona:** Server owner migrating an existing EconomyShopGUI config into VZ, tweaking prices, then exporting back to the plugin.

**Goal:** EconomyShopGUI import → inline edits → EconomyShopGUI ZIP export.

**Requires:** P1–P4 (not P5).

**Suggested import data:** `reference/EconomyShopGUI/minimalist-shop/shops/*.yml` — start with one file (e.g. `Blocks.yml`) or import all seven categories one file at a time (`Blocks`, `Farming`, `Food`, `Mobs`, `Ores`, `Redstone`, `Spawners`).

| # | Step | Expected result | Pass | Fail | Notes |
|---|------|-----------------|------|------|-------|
| 1.1 | Shop Manager → **Add server** (new managed server, not Test Server 1) | Server created | ☐ | ☐ | MC **1.20** to match seed guide data |
| 1.2 | Set **Yes – I manage this server** | Badge shows **Owner/Manager** | ☐ | ☐ | |
| 1.3 | **Admin shop** section visible | **Add Admin Shop** shown | ☐ | ☐ | |
| 1.4 | Click **Add Admin Shop** | Form opens; name prefilled **Admin Shop** | ☐ | ☐ | |
| 1.5 | Save | Redirects to shop detail | ☐ | ☐ | |
| 1.6 | Shop header | Name, server, version, **0/N items** | ☐ | ☐ | |
| 1.7 | Empty state | **Add items** + **Import**; no Market Overview link | ☐ | ☐ | |
| 1.8 | **Import** → select one ESGUI shop YAML (e.g. `minimalist-shop/shops/Blocks.yml`) | File accepted | ☐ | ☐ | One file per import |
| 1.9 | Run import | Results banner (added / couldn't be added / already in shop) | ☐ | ☐ | Repeat 1.8–1.9 for more category files if desired |
| 1.10 | Inventory | Items in categories view; **Pricing** column visible | ☐ | ☐ | |
| 1.11 | Pricing labels | Mix of **Base** and **Custom** as expected | ☐ | ☐ | Simple materials often **Base**; crafted/import overrides often **Custom**. Pencil beside label is decorative; circular arrow switches Custom → Recipe (Journey 3) |
| 1.12 | Toggle **List** view | Items and counts correct | ☐ | ☐ | **View as** / **Layout** persist in browser `localStorage` across shops (not per shop) |
| 1.13 | Search + category filters | Filtered counts correct | ☐ | ☐ | |
| 1.14 | Inline edit buy/sell on 3–5 items | Values save; **Last Updated** changes | ☐ | ☐ | |
| 1.15 | Profit % | Recalculates after price edits | ☐ | ☐ | |
| 1.16 | **Settings** | No **Archive this shop**; admin-appropriate options only | ☐ | ☐ | Admin shop: **Hide enchantments** only under Items list. **Categories ↔ List** and **Comfortable ↔ Compact** are on the main toolbar, not in Settings |
| 1.17 | **Export** → **EconomyShopGUI** tab → download | ZIP downloads | ☐ | ☐ | |
| 1.18 | ZIP contents | `shops/` and `sections/` YAML present | ☐ | ☐ | |
| 1.19 | Spot-check export | Edited prices appear on changed materials | ☐ | ☐ | |
| 1.20 | Refresh page | Edits and item count persist | ☐ | ☐ | |

**Journey 1 result:** ☐ Pass &nbsp; ☐ Fail

---

## Journey 2 — VZ price guide bootstrap

**Persona:** Owner aligning the admin shop with a VZ price guide export, then adjusting prices before sharing.

**Goal:** VZ YAML import → manual tuning → Standard export (JSON/YAML).

**Requires:** P1–P3 and **P5** (VZ import YAML — export from the main price guide site before starting, or use **Standard YAML** from step 2.11 for step 2.12).

Use a **different managed server** than Journey 1, or clear all items from Journey 1's admin shop.

| # | Step | Expected result | Pass | Fail | Notes |
|---|------|-----------------|------|------|-------|
| 2.1 | Create server + admin shop (manage = Yes) | Same as Journey 1 setup | ☐ | ☐ | |
| 2.2 | **Import** → VZ price guide **YAML** (P5) | Parser accepts; not "Unrecognized YAML" | ☐ | ☐ | Not an ESGUI `pages:` file. File picker is `.yml` / `.yaml` only |
| 2.3 | Import summary | Banner accurate; items populate with guide categories | ☐ | ☐ | Categories view default; **List** ok if carried over from another shop via `localStorage` |
| 2.4 | **Pricing** column | Mix of **Base**, **Custom** as expected | ☐ | ☐ | |
| 2.5 | Edit 5 items (2 raw, 2 crafted, 1 enchanted if available) | Inline or form edit saves | ☐ | ☐ | |
| 2.6 | Add **note** on one item | Note persists after refresh | ☐ | ☐ | |
| 2.7 | **Categories ↔ List** and **Comfortable ↔ Compact** | Layout and counts correct | ☐ | ☐ | |
| 2.8 | Narrow viewport | **Buy**, **Sell**, **Pricing** usable | ☐ | ☐ | See **X5** — **Profit %** hidden below 600px by design |
| 2.9 | **Export** → **Standard** tab → **Preview** | Shows `material_id` keys with prices | ☐ | ☐ | Preview shows **first 3 items** plus “N more items” (shape check, not full list) |
| 2.10 | **Export JSON** | File downloads with edited values | ☐ | ☐ | Includes `stack_buy` / `stack_sell` (derived from unit × stack), same shape as homepage standard export |
| 2.11 | **Export YAML** (optional) | File downloads with same data | ☐ | ☐ | Use this file for step 2.12 if testing round-trip |
| 2.12 | Round-trip (optional): clear shop → re-import **YAML** export | Items return with same prices | ☐ | ☐ | **YAML only** — JSON from 2.10 cannot be imported. Skip if not testing round-trip |
| 2.13 | Second import of same file | "Already in shop" behaviour sensible | ☐ | ☐ | e.g. **Imported: 0**, **Skipped: N** (all already in shop) |

**Journey 2 result:** ☐ Pass &nbsp; ☐ Fail

---

## Journey 3 — Recipe-driven economy

**Persona:** Owner building economy from scratch: manual base ingredients, recipe-derived crafted prices, recalculate, dual export.

**Goal:** Manual base items → Recipe pricing → recalculate cascade → Standard + EconomyShopGUI export.

Do **not** import at the start of this journey.

**Requires:** P1–P3 only.

| # | Step | Expected result | Pass | Fail | Notes |
|---|------|-----------------|------|------|-------|
| 3.1 | Create server + admin shop (or reuse a managed server with empty admin shop) | Empty shop ready | ☐ | ☐ | |
| 3.2 | **Add items** → 4–6 raw materials with buy/sell | Rows have buy/sell set | ☐ | ☐ | Mix of **Base** and **Custom** is normal (recipe-capable materials often **Custom**). e.g. iron ingot, gold ingot, stick, coal |
| 3.3 | Pricing type selector | Appears after item chosen (single-select) | ☐ | ☐ | |
| 3.4 | Add crafted item (e.g. iron pickaxe) with all ingredients in shop | **Recipe** pricing computes buy/sell | ☐ | ☐ | |
| 3.5 | Add crafted item **without** an ingredient in shop | Clear validation error (not vague "No Prices") | ☐ | ☐ | Ingredient rows use **Not in shop** / **No buy price** / **No sell price** |
| 3.6 | Add missing ingredient with price | Recipe can be satisfied | ☐ | ☐ | |
| 3.7 | **Custom → Recipe** switch in Pricing column | Switch succeeds; prices populate | ☐ | ☐ | |
| 3.8 | Change a base ingredient price | Saves correctly | ☐ | ☐ | |
| 3.9 | **Recalculate recipe prices** | Results modal with updated count / errors | ☐ | ☐ | |
| 3.10 | Dependent crafted items | Prices updated after recalc | ☐ | ☐ | |
| 3.11 | On **same server** as admin shop: ensure at least one **My Shop** and one **Player Shop** exist | Player shops present | ☐ | ☐ | Or use seeded **Test Server 1** shops if admin shop is on that server |
| 3.12 | **Market Overview** for that server | Admin shop **not** listed; player shops included | ☐ | ☐ | Seeded Test Server 1 already has my + competitor shops |
| 3.13 | Admin shop → **Export Standard YAML** | Downloads; recipe items have resolved prices | ☐ | ☐ | |
| 3.14 | Admin shop → **Export EconomyShopGUI ZIP** | Downloads; recipe items have resolved prices | ☐ | ☐ | |

**Journey 3 result:** ☑ Pass &nbsp; ☐ Fail &nbsp; *(2026-07-02: step 3.5 re-tested and confirmed after ingredient copy fix)*

---

## Recommended review order

| Order | Journey | Rationale |
|-------|---------|-----------|
| 1 | Journey 1 (EconomyShopGUI) | Most common real-world path; import/export plumbing |
| 2 | Journey 2 (VZ) | Second import format + Standard export |
| 3 | Journey 3 (Recipe) | Deepest admin-only logic; small known dataset |

---

## Session log

| Date | Tester | Journey | Result | Bugs filed / notes |
|------|--------|---------|--------|-------------------|
| 2026-07-01 | Manual (local emu) | 1 | Pass | Import modal stuck on “Importing…” fixed; ESGUI `Blocks.yml` |
| 2026-07-01 | Manual (local emu) | 2 | Pass | 2.11–2.12 skipped; import YAML-only; second import Skipped: 21 |
| 2026-07-01 | Manual (local emu) | 3 | Pass (3.5 fail) | Recipe recalc + dual export OK; **3.5 / X2**: “No prices” for missing ingredient (deferred) |
| 2026-07-02 | Manual (local emu) | 3.5 | Pass | Re-test after ingredient copy fix: **Not in shop** / **No buy price** / **No sell price** badges confirmed |
