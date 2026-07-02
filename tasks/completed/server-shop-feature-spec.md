---
title: Admin Shop (Server Shop) — Feature Spec
description: Server-level economy workspace in Shop Manager. Shipped as Admin Shop (server_shop flag).
status: completed
completed_at: 2026-07-02
pr: 23
related:
  - tasks/completed/admin-shop-manual-test-journeys.md
  - tasks/admin-shop-notes.md
  - tasks/testing/admin-shop-testing-spec.md
  - tasks/completed/shop-manager-feature.md
---

# Admin Shop (Server Shop) — Feature Spec

## Status: ✅ Completed

**Shipped:** July 2026 · [PR #23](https://github.com/Biggsen/vz-price-guide-v2/pull/23)

**UI label:** **Admin Shop** (data flag: `server_shop: true`)

Manual test journeys 1–3 passed. Cypress coverage planned in `tasks/testing/admin-shop-testing-spec.md` (not implemented yet).

### Delivered beyond original MVP

| Area | Original MVP | Shipped |
|------|--------------|---------|
| Export | One format (CSV or JSON) | Standard **JSON + YAML** + **EconomyShopGUI ZIP** |
| Import | Not in MVP | **ESGUI shop YAML** + **VZ Price Guide YAML** (one file per upload) |
| Pricing types | Manual / From recipe | **Base**, **Custom**, **Recipe** |
| Access | Server owner | Gated on **`user_manages_server`** (Owner/Manager vs Player) |
| Shop Manager landing | Button only | Admin shop section, promo copy, onboarding |
| Launch | — | `updates.json` id 45, homepage announcement banner |

### Deferred / follow-up

- Tab navigation between inline buy/sell cells (`tasks/admin-shop-notes.md`)
- Firestore enforcement of `server_shop` creation (UI-gated only today)
- Cypress E2E automation (`tasks/testing/admin-shop-testing-spec.md`)
- Optional `shop_type` enum refactor (§2.3)

---

## 1. Overview

### 1.1 Purpose

Introduce **Server Shop** as a first-class concept within the existing Shop Manager. A server shop represents the server’s actual economy—the prices the server owner sets and runs—as opposed to a “price guide” (reference only) or player shops (owned by players for comparison). The feature is implemented by extending the current shop model with a `server_shop` boolean and customising the shop management UI when that flag is set.

In the UI this is branded **Admin Shop**.

### 1.2 Rationale

- **No separate “Custom Price Guide”**: The server owner’s need is to manage their **server shop** (real prices), not a separate “guide.” Building a parallel “custom price guide” would duplicate what Shop Manager already does.
- **One place for all shop types**: A user can be both server owner and player. Under one server they can manage: (1) the admin shop, (2) their own player shop(s), (3) other players’ shops. All live in Shop Manager.
- **Clear naming**: “Price guide” implies suggestion/reference; “server shop” / “admin shop” implies the actual economy.

### 1.3 Three Shop Types

| Type | Description | Data | UI |
|------|-------------|------|-----|
| **Admin Shop** (server shop) | The server’s economy; prices the owner sets and may derive from recipes. | `is_own_shop: true`, `server_shop: true` | **Add Admin Shop** / **Manage Admin Shop** per server (manager only). |
| **Server Owner’s Player Shop(s)** | Shops the logged-in user runs as a player on the same server. | `is_own_shop: true`, `server_shop: false` (or absent) | **My Shops** table. |
| **Other Players’ Shops** | Shops owned by other players (e.g. for comparison). | `is_own_shop: false` | **Player Shops** table. |

Market Overview includes only **player** shops. It **excludes** shops where `server_shop === true`. Market Overview is hidden when a server has only an admin shop (no player shops).

---

## 2. Data Model

### 2.1 Shops Collection – `server_shop` field ✅

- **Field:** `server_shop` (boolean)
- **Default:** `false` (or absent) for existing and new shops unless explicitly set.
- **Semantics:**
  - `true` → This shop is the **admin shop** for that server (at most one per server enforced in UI).
  - `false` / absent → Normal shop (owner’s player shop or other player’s shop).

Firestore rules validate `server_shop` as an optional boolean on create/update.

### 2.2 Shop items – `pricing_type` ✅

- **Field:** `pricing_type` — `'base' | 'manual' | 'from_recipe'` (UI: **Base**, **Custom**, **Recipe**)
- Recipe-derived prices computed via `src/utils/serverShopRecipes.js`
- Circular dependencies detected and reported on recalculate

### 2.3 Relationship to `is_own_shop` ✅

- **`is_own_shop`** unchanged. Market Overview and my vs player shops continue to use it.
- **`server_shop`** is additive for shops where `is_own_shop === true`.
- **Migration:** None required. Existing shops remain `server_shop: false` or undefined.

### 2.4 Future consideration

Replace `is_own_shop` + `server_shop` with a single `shop_type` enum — not required for this release.

---

## 3. Shop Manager (server / shop list) ✅

### 3.1 Access to Admin Shop

- At most one admin shop per server; no separate table.
- **Add Admin Shop** / **Manage Admin Shop** in the server panel when `user_manages_server === true`.
- Hidden when user selects **No – I play on this server** (Player badge).

### 3.2 Creating the Admin Shop ✅

- Dedicated create flow sets `server_shop: true` and `is_own_shop: true`.
- Name prefilled **Admin Shop**.
- UI clears `server_shop` on any other shop for that server when creating a new admin shop.

### 3.3 Market Overview ✅

- Filters out `server_shop === true`.
- Control hidden on admin shop detail page and on server panel when only admin shop exists.

---

## 4. Shop detail page (`ShopItemsView`) ✅

Behaviour customised when `server_shop === true`.

### 4.1 Admin shop features

#### 4.1.1 Import ✅

- **EconomyShopGUI** shop YAML — one `.yml` / `.yaml` file per upload (`pages:` shape).
- **VZ Price Guide** YAML — `material_id` keys with `unit_buy` / `unit_sell`.
- Auto-detect format. Results modal with added / couldn't be added / already in shop.
- Items reorganised into **Price Guide categories** (ESGUI sections not retained).
- Reference fixtures: `reference/EconomyShopGUI/`

#### 4.1.2 Export ✅

- **Standard:** JSON and YAML (homepage-compatible shape with stack prices).
- **EconomyShopGUI:** ZIP with `shops/` and `sections/` per guide category.
- Non-offered prices exported as ESGUI `-1`.

#### 4.1.3 Recipe-based pricing and recalculation ✅

- **Base** — no recipe or import default for simple materials.
- **Custom** — manual buy/sell.
- **Recipe** — computed from ingredients in the same shop.
- Validation: missing ingredients show **Not in shop** / **No buy price** / **No sell price**.
- **Recalculate recipe prices** — modal + `NotificationBanner` summary; multi-pass dependency resolution.
- Pricing column with inline Custom → Recipe toggle when recipe is valid.

#### 4.1.4 Admin-only UI differences ✅

- No **Location** on edit shop.
- No **Archive this shop** in settings.
- No out-of-stock / owner funds settings where not applicable.
- **Clear all items** with confirmation.
- Category filters (homepage-style chips), item search, batch add with limits.
- Back-to-top control.

### 4.2 Player shops ✅

- No Import / Export / Recalculate / recipe pricing.
- Existing player-shop behaviour unchanged.

---

## 5. Scope summary (as shipped)

| Capability | Status |
|------------|--------|
| `server_shop` boolean on shops | ✅ |
| `pricing_type` on shop items | ✅ |
| Admin shop create / manage (manager only) | ✅ |
| Market Overview excludes admin shop | ✅ |
| ESGUI YAML import | ✅ |
| VZ Price Guide YAML import | ✅ |
| Standard JSON/YAML export | ✅ |
| EconomyShopGUI ZIP export | ✅ |
| Base / Custom / Recipe pricing | ✅ |
| Recalculate recipe prices | ✅ |
| Ingredient validation messaging | ✅ |
| Homepage + updates launch copy | ✅ |
| “Add all missing ingredients” bulk action | ❌ Deferred |
| Calculation breakdown UI | ❌ Deferred |
| Profit/loss economy analytics | ❌ Deferred |
| Export for player shops | ❌ Out of scope |
| Cypress E2E tests | ❌ Planned (`admin-shop-testing-spec.md`) |

---

## 6. Technical notes

### 6.1 Key modules

| Module | Role |
|--------|------|
| `src/utils/serverShopRecipes.js` | Recipe price computation, recalc, circular dependency detection |
| `src/utils/economyShopGuiImport.js` | ESGUI YAML parse, enchanted book mapping |
| `src/utils/economyShopGuiExport.js` | ESGUI ZIP generation |
| `src/utils/vzPriceGuideImport.js` | VZ YAML import |
| `src/utils/shopVzPriceGuideExport.js` | Standard export from admin shop |
| `src/utils/guideItemMaterialPick.js` | Duplicate `material_id` resolution |
| `src/views/ShopItemsView.vue` | Admin shop detail (import, export, recalc, table) |
| `src/views/ShopManagerView.vue` | Landing, admin shop create/manage |

### 6.2 Naming in code

- Persistence: `server_shop`, `pricing_type` (`manual`, `from_recipe`, `base`)
- UI: **Admin Shop**, **Custom** / **Recipe** (maps to `manual` / `from_recipe`)

### 6.3 Permissions

- Create/manage admin shop: `user_manages_server === true` on the server document (UI enforced).
- Shop write access: existing shop owner rules.

---

## 7. Out of scope / later

- Server-specific reference price guide (separate from admin shop)
- Multiple admin shops per server
- `shop_type` enum migration
- JSON re-import for Standard export (YAML round-trip supported)

---

## 8. Related documents

- `tasks/completed/admin-shop-manual-test-journeys.md` — Manual test journeys (all passed)
- `tasks/admin-shop-notes.md` — Review scratchpad (no open bugs)
- `tasks/testing/admin-shop-testing-spec.md` — Planned Cypress coverage
- `tasks/idea/custom-price-guide-vs-shop-manager-analysis.txt` — Analysis leading to this approach
- `tasks/completed/shop-manager-feature.md` — Base Shop Manager feature
