# Homepage Analytics (GA4) - “Fewer, Richer” Event Instrumentation

## Summary

Implement homepage analytics for the Price Guide using **a small set of rich GA4 events** with consistent parameters so reporting stays simple and stable.

## Status

**Completed** (implemented and verified via Tag Assistant on localhost) — **2026-01-18**.

## Goals

- Capture high-signal homepage interactions:
	- Category clicks (and “All categories”)
	- Settings modal open/close + interactions inside
	- Export modal open/close + interactions inside + export format click
	- View Mode + Layout toggles
	- Item name clicks (external wiki link)
- Add secondary search-term visibility without spamming GA:
	- Debounced “search intent” after the user pauses typing
- Ensure analytics behaves correctly in SPA navigation contexts (route changes).
- Respect consent (Termly) and avoid collecting sensitive data.

## Non-Goals

- Migrating to Google Tag Manager (GTM) (optional follow-up).
- Session replay/heatmaps (Clarity/Hotjar) (optional follow-up).
- Tracking PII (emails, Firebase UID).
- Per-keystroke search tracking (explicitly avoided).

## What Shipped (Code Pointers)

- **GA wrappers / event helpers**
	- `src/utils/analytics.js`
		- `homepage_interaction`
		- `modal_interaction`
		- `search` (debounced intent tracking)
		- SPA `page_view` helper
- **Modal close reasons**
	- `src/components/BaseModal.vue` now emits `close` with `x_button` or `backdrop`
- **SPA page views**
	- `src/router/index.js` emits `page_view` on path changes (query-only changes ignored)
- **Homepage instrumentation**
	- `src/views/HomeView.vue`
		- categories / clear all
		- view mode / layout toggles (with `from` → `to`)
		- Settings + Export open
		- debounced search (~700ms idle, deduped)
- **Modal instrumentation**
	- `src/components/SettingsModal.vue`
	- `src/components/ExportModal.vue`
- **External item link click**
	- `src/components/ItemTable.vue`

## Event Model (Few Names, Rich Params)

### Event 1: `homepage_interaction`

Use for homepage clicks/toggles (non-modal) and external item link clicks.

**Required parameters**
- `action`
- `page_path`
- `selected_version`
- `view_mode` (`categories|list`)
- `layout` (`comfortable|condensed`)

**Common optional parameters**
- `category`
- `categories_selected_count`
- `is_category_filters_visible`
- `from` / `to`
- `item_material_id`
- `item_name`
- `link_url`

### Event 2: `modal_interaction`

Use for Settings + Export modals: open/close, config changes, and CTA clicks.

**Required parameters**
- `modal` (`settings|export`)
- `action` (`open|close|change|cta_click|export_click`)
- `page_path`
- `selected_version`
- `view_mode`
- `layout`

**Common optional parameters**
- `close_reason` (`x_button|backdrop|cancel|save`)
- `field`
- `value`
- `auth_state` (`anonymous|signed_in_unverified|signed_in_verified`)
- Export-only:
	- `export_format` (`json|yml`)
	- `export_item_count`

### Event 3: `search` (GA4 recommended)

Debounced search intent.

**Parameters**
- `search_term`
- `results_count`
- `categories_selected_count`
- `term_count`
- plus the standard homepage context params (`page_path`, `selected_version`, `view_mode`, `layout`)

## Work Items

- [x] Add GA wrappers for rich events (`homepage_interaction`, `modal_interaction`, `search`)
- [x] Add SPA `page_view` tracking on path changes (ignore query-only changes)
- [x] Track categories, view mode, layout, and modal opens on homepage
- [x] Track Settings modal changes + close reasons (X, backdrop, cancel, save)
- [x] Track Export modal config changes + gated CTAs + export clicks + close reasons
- [x] Track external item wiki link clicks
- [x] Debounced, deduped search tracking (no per-keystroke spam)
- [ ] GA4 admin configuration (manual follow-up)
	- [ ] Register custom dimensions for high-value params (`action`, `modal`, `close_reason`, `selected_version`, etc.)
	- [ ] Create Explorations (Path + Funnel) for homepage usage

## Testing

### Local (recommended)

- Use **Tag Assistant → Troubleshoot tag** to verify events/hits and payload params.
- Note: if localhost traffic is excluded in GA4, **Realtime/DebugView won’t show localhost**, which is expected. Tag Assistant remains the source of truth for local validation.

### Production/Staging

- Use GA4 Realtime and Explorations after deploying.
- Confirm event names and key parameters are present and stable over time.

