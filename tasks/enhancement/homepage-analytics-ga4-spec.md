# Homepage Analytics (GA4) - “Fewer, Richer” Event Instrumentation

## Summary

Instrument the homepage (Price Guide) to understand what users click and how they navigate key UI controls, using **a small set of rich GA4 events** with consistent parameters (so reporting stays simple and stable).

Yes, we’re “data mining” the Minecraft app. Responsibly.

## Goals

- Capture high-signal homepage interactions:
	- Category clicks (and “All categories”)
	- Settings modal open/close + interactions inside
	- Export modal open/close + interactions inside + export format click
	- View Mode + Layout toggles
	- Item name clicks (external wiki link)
- Add secondary search-term visibility without spamming GA:
	- Debounced “search intent” event for settled query
- Ensure analytics behaves correctly in SPA navigation contexts (route changes, query changes).
- Keep event names few and reporting-friendly; rely on parameters for detail.
- Respect consent (Termly) and avoid collecting sensitive data.

## Non-Goals

- Migrating to Google Tag Manager (GTM) (can be a follow-up).
- Full session replay/heatmaps (Clarity/Hotjar) (optional separate effort).
- Tracking PII (emails, user IDs, freeform content beyond search terms).
- Perfect per-keystroke search telemetry (we explicitly avoid this).

## Current State (Relevant Code)

- GA4 is loaded via `gtag.js` in `index.html` and uses measurement ID `G-SSX50N22YP`.
- There is a GA helper utility at `src/utils/analytics.js` that calls `gtag('event', ...)` and adds `device_type`.
- Navigation click tracking exists in `src/components/Nav.vue` using `navigationHandlers` from `src/utils/analytics.js`.
- Homepage UI is composed primarily of:
	- `src/views/HomeView.vue`
	- `src/components/SearchBar.vue`
	- `src/components/CategoryFilters.vue`
	- `src/components/ViewControls.vue`
	- `src/components/SettingsModal.vue`
	- `src/components/ExportModal.vue`
	- `src/components/ItemTable.vue`
	- `src/components/BaseModal.vue`

## Event Model (Few Names, Rich Params)

### Event 1: `homepage_interaction`

Use for homepage clicks/toggles (non-modal) and external item link clicks.

**Required parameters**
- `action` (string enum; see below)
- `page_path` (e.g. `/`)
- `selected_version` (e.g. `1.21`)
- `view_mode` (`categories|list`)
- `layout` (`comfortable|condensed`)

**Optional parameters (only when relevant)**
- `category` (e.g. `ores`)
- `categories_selected_count` (number)
- `is_category_filters_visible` (boolean; mobile)
- `from` / `to` (for toggles)
- `item_material_id` (e.g. `diamond`)
- `item_name` (optional; keep short)
- `link_url` (optional; external wiki URL)

**Actions**
- `category_click`
- `categories_clear_all`
- `category_filters_visibility_toggle`
- `view_mode_change`
- `layout_change`
- `settings_open`
- `export_open`
- `item_wiki_click`

### Event 2: `modal_interaction`

Use for Settings + Export modals: open/close, config changes, and CTA clicks (including gated states).

**Required parameters**
- `modal` (`settings|export`)
- `action` (`open|close|change|cta_click|export_click`)
- `page_path`
- `selected_version`
- `view_mode`
- `layout`

**Optional parameters**
- `close_reason` (`x_button|backdrop|cancel|save`)
- `field` (e.g. `currencyType`, `priceMultiplier`, `sortField`, `includeMetadata`)
- `value` (normalized string/number/bool; avoid long blobs)
- `export_format` (`json|yml`)
- `export_item_count` (number)
- `auth_state` (`anonymous|signed_in_unverified|signed_in_verified`)

**Notes**
- Prefer `action=change` only when the value *settles* (blur/change) for text/number inputs; immediate toggles (checkbox/radio/button) can fire instantly.
- For external navigation actions inside modals (sign in/up/verify flows), use `action=cta_click` and a `field`/`value` indicating which CTA.

### Event 3 (Secondary): `search` (GA4 recommended)

Track search intent after a short debounce (e.g. 500–800ms idle) to avoid flooding GA4.

**Required parameters**
- `search_term` (string; trimmed)
- `page_path`
- `selected_version`
- `view_mode`
- `layout`

**Recommended parameters**
- `results_count` (number; total visible items)
- `categories_selected_count` (number)
- `term_count` (number; split on commas)

**Guardrails**
- Only send when:
	- search term length >= 2 (or contains a comma term), and
	- value differs from last sent term (dedupe), and
	- the user has paused typing for the debounce duration.

## SPA Page View Tracking (Needed for Good “User Flow”)

GA4 loaded in `index.html` will generally only capture initial load unless we emit page views on route changes.

### Requirements

- Add router-based page view tracking via `router.afterEach` (or equivalent) so GA4 “Path exploration” reflects real SPA navigation.
- Include query string in the reported page path where it matters (e.g. `?cat=...&version=...`) but avoid unbounded noise:
	- Option A: track `page_path` as `to.path` and send query params separately (recommended).
	- Option B: track a normalized URL (path + whitelisted query keys `cat`, `version`) and omit everything else.

## Implementation Outline

### 1) Extend analytics helper to support a consistent payload

- [ ] Add a “core context” helper that builds:
	- `page_path` (from router)
	- `selected_version`, `view_mode`, `layout` (from HomeView state)
- [ ] Add two wrapper functions (or one generic one):
	- `trackHomepageInteraction(action, params)`
	- `trackModalInteraction(modal, action, params)`
- [ ] Ensure external-link click events use beacon-friendly transport (do not block navigation).
- [ ] Add a consistent way to determine `close_reason` for modals:
	- Option A (preferred): update `src/components/BaseModal.vue` to emit `close` with a reason (`x_button|backdrop`), and keep CTA buttons emitting their own reason (`cancel|save`)
	- Option B: emit explicit close events from CTA buttons and treat BaseModal `@close` as `x_button|backdrop` (with a local flag to distinguish)

### 2) Homepage: wire `homepage_interaction` events

- [ ] Categories:
	- Source: `src/components/CategoryFilters.vue` events handled in `src/views/HomeView.vue`
	- Fire: `category_click`, `categories_clear_all`, `category_filters_visibility_toggle`
- [ ] View controls:
	- Source: `src/components/ViewControls.vue` events handled in `HomeView.vue`
	- Fire: `view_mode_change`, `layout_change` with `from/to`
- [ ] Modal opens:
	- Fire: `settings_open`, `export_open` on button click in `HomeView.vue`
- [ ] Item wiki link:
	- Source: `src/components/ItemTable.vue` external `<a>`
	- Fire: `item_wiki_click` with item identifiers and URL

### 3) Settings modal: wire `modal_interaction`

- [ ] Modal open/close:
	- `action=open` when modal becomes visible
	- `action=close` with `close_reason`
- [ ] Settings changes:
	- Version select (desktop pills + mobile dropdown)
	- Currency type radio
	- Buy multiplier input
	- Sell % input
	- Round-to-whole checkbox
	- Show full numbers checkbox
	- Show stack size checkbox
	- Hide sell prices checkbox
- [ ] Save/Cancel:
	- `action=cta_click` for Save and Cancel
	- Ensure `close_reason` reflects the actual exit path (`cancel|save|x_button|backdrop`)

### 4) Export modal: wire `modal_interaction`

- [ ] Modal open/close with `close_reason`
- [ ] Config changes:
	- Version select
	- Category checkbox toggles + reset
	- Sort field/direction
	- Price field toggles
	- Round-to-whole
	- Include metadata
- [ ] Export clicks:
	- `action=export_click` with `export_format` and `export_item_count`
- [ ] Gated flows:
	- Unauthed: Create Account, Sign in
	- Signed-in unverified: Resend verification email, Sign in

### 5) Debounced search

- [ ] Implement a debounced watcher on `searchQuery` (source: `SearchBar.vue` → `HomeView.vue`)
- [ ] Fire GA4 `search` event after idle threshold with:
	- `search_term`
	- `results_count`
	- current homepage context

## GA4 Configuration (Reporting)

- [ ] Register custom dimensions for:
	- `action`
	- `modal`
	- `close_reason`
	- `selected_version`
	- `view_mode`
	- `layout`
	- `category`
	- `export_format`
- [ ] Create GA4 Explorations:
	- Homepage path exploration starting from `/`
	- Funnel exploration:
		- `homepage_interaction (settings_open|export_open|category_click|item_wiki_click)` →
		- `modal_interaction (export_click)` →
		- Auth routes (if relevant)

## Privacy / Consent

- Confirm Termly consent gating: analytics events should only fire when GA is available/allowed.
- Do not send PII:
	- Avoid user email
	- Avoid Firebase UID
- Search terms:
	- Treat as potentially sensitive; keep debounced + optional sampling if volume becomes large.

## Testing Checklist

- [ ] **Local manual**:
	- Verify `homepage_interaction` fires for:
		- category click / clear all
		- view mode change / layout change
		- settings open / export open
		- item wiki click (external)
	- Verify `modal_interaction` fires for:
		- open/close with correct `close_reason`
		- key setting changes (one event per “settled” change)
		- export click includes `export_format` + `export_item_count`
	- Verify `search` fires only after idle debounce and dedupes
- [ ] **SPA navigation**:
	- Route changes create page views (no “only first pageview” issue)
- [ ] **Consent**:
	- With analytics blocked, no errors and no events

## Success Metrics (What “Good” Looks Like)

- [ ] We can answer, from GA4, for the homepage:
	- What categories are most clicked?
	- What % of sessions use Settings? Which settings are changed most?
	- What % of sessions open Export? Which format is used? How many items exported?
	- Do users prefer List vs Categories? Comfortable vs Compact?
	- Which items get the most wiki clicks?
	- What are the top search terms (debounced)?

## Open Questions

- Should we include `cat` and `version` query params in page view URLs, or keep them as event params only?
- For search terms, do we want:
	- full raw term, or
	- normalized (lowercase/trim), or
	- sampled, or
	- first-term-only (before comma)

