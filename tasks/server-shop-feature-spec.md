# Server Shop Feature – Spec

## 1. Overview

### 1.1 Purpose

Introduce **Server Shop** as a first-class concept within the existing Shop Manager. A server shop represents the server’s actual economy—the prices the server owner sets and runs—as opposed to a “price guide” (reference only) or player shops (owned by players for comparison). The feature is implemented by extending the current shop model with a `server_shop` boolean and customising the shop management UI when that flag is set.

### 1.2 Rationale

- **No separate “Custom Price Guide”**: The server owner’s need is to manage their **server shop** (real prices), not a separate “guide.” Building a parallel “custom price guide” would duplicate what Shop Manager already does.
- **One place for all shop types**: A user can be both server owner and player. Under one server they can manage: (1) the server shop, (2) their own player shop(s), (3) other players’ shops. All live in Shop Manager.
- **Clear naming**: “Price guide” implies suggestion/reference; “server shop” implies the actual economy. This spec uses “server shop” for the thing being managed.

### 1.3 Three Shop Types

| Type | Description | Data | UI |
|------|-------------|------|-----|
| **Server Shop** | The server’s economy; prices the owner sets and may derive from recipes. | `is_own_shop: true`, `server_shop: true` | Single “Server Shop” entry point per server (button). |
| **Server Owner’s Player Shop(s)** | Shops the logged-in user runs as a player on the same server. | `is_own_shop: true`, `server_shop: false` (or absent) | “My Shops” table. |
| **Other Players’ Shops** | Shops owned by other players (e.g. for comparison). | `is_own_shop: false` | “Player Shops” table. |

Market Overview includes only **player** shops (owner’s player shops + other players’ shops). It **excludes** shops where `server_shop === true`.

---

## 2. Data Model

### 2.1 Shops Collection – New Field

- **Field:** `server_shop` (boolean)
- **Default:** `false` (or absent) for existing and new shops unless explicitly set.
- **Semantics:**
  - `true` → This shop is the **server shop** for that server (at most one per server in practice).
  - `false` / absent → Normal shop (owner’s player shop or other player’s shop, distinguished by `is_own_shop`).

### 2.2 Relationship to Existing Field

- **`is_own_shop`** remains unchanged. Existing behaviour (e.g. Market Overview, “my vs others”) continues to use it.
- **`server_shop`** is additive: it further qualifies shops where `is_own_shop === true` into “server shop” vs “owner’s player shop(s).”
- **Migration:** No migration of existing data required. New server shops set `server_shop: true` at creation. Existing “my” shops remain `server_shop: false` or undefined.

### 2.3 Future Consideration

Later, the two booleans could be replaced by a single `shop_type` (or `kind`) enum, e.g. `'server' | 'owner_player' | 'other_player'`, with a one-time migration. This spec does not require that change.

---

## 3. Server / Shop List Page (Shop Manager)

### 3.1 Access to Server Shop

- **No new table.** There is at most one server shop per server; a full table would be excessive.
- **Add a button** in the server panel (alongside “+ Add My Shop”, “+ Add Player Shop”, “Market Overview”):
  - Label: e.g. **“Server Shop”** or **“Manage Server Shop”**.
  - Action: Navigate to the server shop’s detail view (shop items, prices, settings). If no server shop exists yet, either navigate to an empty state that allows creating one, or open a flow to create a shop with `server_shop: true`.

### 3.2 Creating the Server Shop

- When the user creates a shop that will act as the server shop, the create flow must set `server_shop: true` (and `is_own_shop: true`). This may be done via a dedicated “Create Server Shop” path or by a checkbox/option in the existing add-shop flow when adding “my” shop.
- Business rule: Only one shop per server should have `server_shop: true`. The UI can enforce this (e.g. when creating a server shop, clear `server_shop` on any other shop for that server, or prevent creating a second server shop).

### 3.3 Market Overview

- **Scope:** Market Overview must **ignore** shops where `server_shop === true`.
- **Implementation:** When loading or aggregating data for Market Overview, filter out shops with `server_shop === true`. Only “player” shops (owner’s player shops and other players’ shops) are included.
- **Naming/placement (optional):** To avoid “Market Overview” sounding like it includes the server shop, consider:
  - Renaming to something like “Player market overview” or “Player shops overview”, or
  - Showing the Market Overview control only in a context that is clearly about player shops, or
  - Adding a short subtitle/tooltip: e.g. “Compare prices across player shops”.

---

## 4. Shop Detail Page (Shop Management)

The same shop detail page is used for all shop types. Behaviour is **customised using the `server_shop` flag**: when `server_shop === true`, show and enable Server Shop–specific features; when `server_shop === false` (or absent), keep the current, simpler behaviour.

### 4.1 When `server_shop === true` (Server Shop)

#### 4.1.1 Export

- **Visibility:** Show an **Export** control (e.g. button in the header or inside Settings).
- **Behaviour:** Export this shop’s price list (items, buy price, sell price, category, notes, and optionally pricing type) in one format (e.g. CSV or JSON) for use in plugins, spreadsheets, or other tools.
- **Scope:** One format is sufficient for MVP (e.g. CSV or JSON). No need for multiple formats or templates in MVP.

#### 4.1.2 Recipe-Based Pricing and Recalculation

- **Per item:** Allow the owner to set a **pricing type** for the relevant price(s):
  - **Manual** – user enters the price (current behaviour).
  - **From recipe** – price is computed from the item’s recipe using only ingredients that exist in **this** shop with a price. The computed value is shown (read-only) and used as the item’s price.
- **Validation:** When “From recipe” is selected, require that all recipe ingredients exist in this shop and have a price. If any ingredient is missing or has no price, show a single clear error, e.g. “Add [Iron Ingot] to this shop with a price first.” Do not update the price until the condition is met. MVP does not require an “Add all missing ingredients” bulk action.
- **Recalculation:** Provide a **“Recalculate recipe prices”** (or “Recalculate”) action (e.g. in the header or Settings). On trigger, recompute all items that use “From recipe” from the current shop ingredient prices and update the table/stored values. If a recalculation fails (e.g. missing ingredient, circular dependency), show a clear message per failure.
- **Table:** In the items table, add a column or indicator showing whether each item’s price(s) are **Manual** or **From recipe** (e.g. icon or short label).

#### 4.1.3 Add/Edit Item Messaging

- When adding or editing an item in a server shop, the UI must explain and support:
  - Choosing manual vs from-recipe pricing.
  - The rule that ingredients must exist in this shop with a price for from-recipe to work.
  - Any validation errors (“Add [X] to this shop first”) in relation to recipes.

### 4.2 When `server_shop === false` (Player Shops)

- **Export:** Do not show the Export control (or hide it for non–server shops). MVP does not require export for player shops.
- **Recipe pricing and recalc:** Do not show the “From recipe” option, the “Recalculate recipe prices” button, or recipe-related validation/messaging. Add/edit item remains: set buy/sell prices (and notes, etc.) only.
- **Table:** No need for a “Manual / From recipe” column for player shops (or column can be hidden).

### 4.3 Shared Behaviour

- All other shop detail behaviour (back to Shop Manager, shop name/description, server/version/location, add item, categories/list view, layout, buy/sell columns, profit %, notes, last updated, edit/delete) is unchanged and shared. Only the presence of Export, recipe-based pricing, recalc, and recipe-related add/edit messaging is conditional on `server_shop`.

---

## 5. MVP Scope Summary

| Capability | In scope for MVP |
|------------|-------------------|
| `server_shop` boolean on shops | Yes |
| Server/Shop list: button to access Server Shop | Yes |
| Server/Shop list: create server shop (set `server_shop: true`) | Yes |
| Market Overview excludes `server_shop` shops | Yes |
| Shop detail: Export (when server shop) | Yes, one format (CSV or JSON) |
| Shop detail: Manual vs From-recipe pricing (when server shop) | Yes |
| Shop detail: Recalculate recipe prices (when server shop) | Yes |
| Shop detail: Recipe-related validation and messaging (when server shop) | Yes |
| “Add all missing ingredients” bulk action | No |
| Calculation breakdown UI (ingredient list, quantities) | No (optional later) |
| Profit/loss or economy analytics | No (later) |
| Export for player shops | No (MVP: server shop only) |
| Rename “Market Overview” / scope clarification | Optional |

---

## 6. Technical Notes

### 6.1 Recipe-Derived Pricing (Implementation Hooks)

- **Data:** Shop items need a way to store pricing type and, when “from recipe,” a reference to the recipe (e.g. main guide recipe id) so the backend or frontend can compute price from ingredients in the same shop.
- **Recalc order:** Resolve “from recipe” items in dependency order (or iterate until no changes). If a cycle or missing ingredient is detected, fail with a clear error.
- **Ingredients:** “In this shop” means: ingredient item exists as a shop item in the same shop with a defined price (manual or recipe-derived). Circular dependencies must be detected and reported.

### 6.2 Naming Conventions in Code

- The codebase uses `is_own_shop` (snake_case) for the existing ownership flag. Use the same convention for the new field in persistence (e.g. `server_shop`). In UI copy and this spec, “Server Shop” (title case) is used for the concept and button label.

### 6.3 Permissions and Ownership

- Only the server owner (or users with equivalent permission) should be able to create or edit a shop with `server_shop: true`. Existing Shop Manager permission rules apply; no new permission model is specified here.

---

## 7. Out of Scope / Later

- **Server-specific price guide:** A separate, reference-only “price guide adjusted to this server’s economy” is a possible future feature; it is not part of this spec.
- **Multiple server shops per server:** The UI is optimised for one server shop per server. Supporting multiple would require a different layout (e.g. a table) and possibly validation rules.
- **Migration to `shop_type` enum:** Replacing `is_own_shop` + `server_shop` with a single enum is a possible future refactor; not required for this feature.

---

## 8. Related Documents

- `tasks/idea/custom-price-guide-vs-shop-manager-analysis.txt` – Analysis that led to extending Shop Manager instead of building a separate Custom Price Guide.
- `tasks/idea/user-price-guide-feature.md` – Original “User Price Guide” spec; superseded by this Server Shop approach for the server-owner use case.
- `tasks/completed/shop-manager-feature.md` – Current Shop Manager data model and behaviour.
