# 📤 Price List Export Feature Specification

## 📌 Overview

Enable authenticated users to export the price list as JSON, YAML, and spreadsheet formats (CSV/XLSX). Users can choose which price fields to include (unit buy/sell, stack buy/sell), filter by categories, and target a specific Minecraft version. Keys in JSON/YAML exports are the Minecraft `material_id` for each item.

**Status**: 💡 IDEA (User-requested)

---

## 1) 🎯 Goals & User Story

-   As a server admin building an SMP economy (community request), I can download the price list as `yml` or `json`, keyed by `material_id`, with options to include `buy`, `sell`, `stack_buy`, `stack_sell` and filter by categories (e.g., ores, enchantments), so I can plug this into my in-house plugin/config.
-   Optionally download as a spreadsheet (CSV/XLSX) for manual review and sharing.
-   Feature should be gated to logged-in users.

---

## 2) ✅ Constraints & Rules

-   **Data Source**: Export from Firestore `items` collection only (live data), never from files in `/resource/`. Aligns with workspace rules.
-   **Versioning**: Use underscore version keys (e.g., `1_21`). When a version’s price is missing, fallback to the nearest previous version’s price per existing pricing logic.
-   **Keying**: The item key in JSON/YAML maps must be the item’s `material_id`.
-   **Rounding**: Apply project pricing rules: prices below 5 round up to one decimal; prices ≥ 5 round up to a whole number.
-   **Styling/UI**: Use Tailwind CSS and Heroicons in the UI.

---

## 3) 📦 Export Formats

-   **JSON**: Default machine-readable export, object keyed by `material_id`.
-   **YAML**: Human-friendly equivalent using same shape and keys.
-   **CSV**: Flat table with one row per item; columns configurable. Suitable for spreadsheets.
-   **XLSX**: Same data as CSV, but native Excel workbook (via SheetJS).

File naming: `prices_<versionKey>_<timestamp>.<ext>` (e.g., `prices_1_21_2025-01-15T12-30-00Z.json`).

---

## 4) ⚙️ Configuration Options (UI)

-   **Target Version**: Select from supported versions (`1.16` → `1.21`), internally mapped to underscore keys.
-   **Categories**: Multi-select from `src/constants.js` categories (e.g., ores, enchantments). If >10 selected, handle filtering client-side to avoid Firestore `in` limits.
-   **Price Fields**:
    -   `unit_buy`
    -   `unit_sell`
    -   `stack_buy`
    -   `stack_sell`
-   **Stack Size**: Default to each item’s `stack`; allow override (e.g., export all stacks as 64).
-   **Currency Format**: Toggle raw numbers vs formatted strings. JSON/YAML default raw numbers.
-   **Include Metadata**: Optional fields (e.g., `name`, `stack`, `category`). Keys remain `material_id` for JSON/YAML.
-   **Spreadsheet Columns** (CSV/XLSX): Choose included columns; default `material_id,name,unit_buy,unit_sell,stack_buy,stack_sell`.

---

## 5) 🧮 Pricing & Version Logic

-   Use `getEffectivePrice(item, version)` and existing fallback behavior to compute base unit price for the selected version.
-   Compute derived fields using `src/utils/pricing.js`:
    -   `unit_buy`: `buyUnitPrice` with price multiplier
    -   `unit_sell`: `sellUnitPrice` with `sellMargin`
    -   `stack_buy`: `buyStackPrice`
    -   `stack_sell`: `sellStackPrice`
-   Apply rounding rules consistently to all computed values.
-   Economy inputs (e.g., `sellMargin`, `priceMultiplier`) sourced from the current UI/server config; provide sensible defaults.

---

## 6) 📐 Data Shapes

### JSON/YAML (keyed by `material_id`)

```yaml
iron_ingot:
    name: 'Iron Ingot' # optional metadata when enabled
    category: 'ores' # optional
    unit_buy: 10
    unit_sell: 7
    stack_buy: 640
    stack_sell: 448
enchanted_book:
    unit_buy: 120
    unit_sell: 84
```

### CSV/XLSX (example columns)

```
material_id,name,category,unit_buy,unit_sell,stack_buy,stack_sell
iron_ingot,Iron Ingot,ores,10,7,640,448
```

---

## 7) 🖥️ UI/UX

-   New route: `/export`
-   Component: `ExportView.vue`
-   Sections:
    -   Version selector and economy inputs (sell margin, price multiplier)
    -   Categories multi-select
    -   Price fields checkboxes
    -   Advanced: stack override, include metadata, currency formatting
    -   Export buttons: JSON, YAML, CSV, XLSX
-   Use Tailwind and Heroicons; show an inline preview (first 10 items) before download.

---

## 8) 🔒 Access Control & Security

-   Require authentication: only logged-in users can access `/export` and trigger downloads.
-   Rate limit heavy exports (e.g., via Cloud Function path) per user (e.g., 1 request/minute, burst 3).
-   Log exports (user, version, options, count) for auditing.
-   Do not expose any non-public fields; only export item and computed pricing.

---

## 9) 🧱 Architecture & Implementation

### Phase 1: Client-Only Export (MVP)

-   Fetch items from Firestore with:
    -   `where('version', '<=', selectedVersion)` to exclude items introduced later
    -   Category filter: if ≤10 categories, use `in`; else fetch all then client-filter
-   Compute prices client-side using existing utils.
-   Generate files in-browser:
    -   JSON: `JSON.stringify`
    -   YAML: `js-yaml`
    -   CSV: build CSV manually or use lightweight helper
-   Trigger downloads via blob URLs.

### Phase 2: XLSX Support

-   Add SheetJS (`xlsx`) for workbook generation.
-   Produce a single worksheet named `prices_<versionKey>`.

### Phase 3: Optional Cloud Function Export (Large Datasets / Governance)

-   HTTPS function `exportPrices`:
    -   Input: `{ version: '1_21', categories: string[], fields: string[], stackOverride?: number, includeMetadata?: boolean, currencyFormat?: 'raw'|'formatted' }`
    -   Output: `application/json` or `text/yaml` depending on requested format
    -   Enforce auth, rate limiting, and input validation
-   Frontend calls function and downloads response; still keep client mode as fallback.

---

## 10) 🔧 Dependencies

-   `js-yaml` for YAML generation
-   `xlsx` (SheetJS) for Excel (Phase 2)

---

## 11) 🧪 Acceptance Criteria

-   Authenticated user can export JSON and YAML keyed by `material_id` with selected price fields and categories.
-   Version filter respects underscore keys and fallback pricing for missing versions.
-   Rounding rules applied consistently; stack prices reflect item stack or override.
-   CSV export opens correctly in spreadsheet tools; XLSX (Phase 2) contains expected columns.
-   No data is sourced from `/resource/`; only Firestore data is used.

---

## 12) 🚧 Edge Cases

-   Items missing price for target version: use fallback from previous versions; exclude if none found and user opts to omit missing.
-   Categories >10: avoid Firestore `in` limitation by client-side filtering.
-   Very large exports: advise Cloud Function path; show progress UI and completion toast.

---

## 13) 📈 Telemetry

-   Record export events with options and item counts for future optimization.

---

## 14) 🗺️ Out of Scope (for this spec)

-   Public, unauthenticated export endpoints.
-   Using `/resource/` JSON as a data source.
-   API access tokens for third-party integrations (future API spec).
