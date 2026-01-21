# GA4 Reporting Setup Spec

## Status (progress tracker)

**Last updated:** 2026-01-21

### Completed

- [x] Step 0: Confirm correct GA4 property/stream (Realtime/DebugView shows events)
- [x] Step 1: Create custom definitions (at least the highest-value event-scoped dimensions)
	- [x] Device type → `device_type`
	- [x] Action → `action`
	- [x] Modal → `modal`
	- [x] Close reason → `close_reason`
	- [x] Selected version → `selected_version`
	- [x] View mode → `view_mode`
	- [x] Layout → `layout`
	- [x] Auth state → `auth_state`
- [x] Step 2: Create derived event
	- [x] `export_open` (from `modal_interaction` where `modal=export` and `action=open`)
	- [x] `export_download` (from `modal_interaction` where `modal=export` and `action=export_click`)
	- [x] `export_create_account_click` (from `modal_interaction` where `modal=export`, `action=cta_click`, `field=cta`, `value=create_account`)
- [x] Step 3: Mark key events
	- [x] `export_download` marked as a **Key event**
- [x] Step 4: Create Explorations (at least one)
	- [x] Funnel exploration: “Export funnel” (`page_view` for `/` → `export_open` → `export_download`)
	- [x] Path exploration: “Homepage usage” (starting point `page_view`, filter `Page path + query string = /`, breakdown by `Device type`)

### Remaining

- [ ] Step 1: Create any remaining custom definitions you want for reporting
	- [ ] Page path → `page_path`
	- [ ] Field → `field`
	- [ ] Optional: Category → `category`, Search active → `search_active`, Export format → `export_format`
	- [ ] Optional: event-scoped custom metrics (Integer) used in reports
- [ ] Step 2: Create additional derived events (recommended for a clean funnel)
	- [ ] Optional: `settings_open`, `settings_save`
	- [ ] Optional: `export_sign_in_click`, `export_verify_email_click`
- [ ] Step 4: Create additional Explorations (gate analysis)
	- [ ] Path exploration: “Export gate path” (starting point `export_create_account_click`, Step +1: page path)

## Goal

Turn existing GA4 instrumentation into usable reporting:

- Custom definitions so parameters are available in reports/explorations
- Derived events (“Create event”) so funnels and “key events” are easy
- A couple Explorations (Path + Funnel) that answer real questions

This spec intentionally focuses on **GA4 configuration**, not code changes.

## Current Implementation (Source of Truth)

Event/parameter names must match what the app sends:

- `src/utils/analytics.js`
	- `homepage_interaction` (single rich event)
	- `modal_interaction` (single rich event)
	- `search` (GA4 recommended event name)
	- adds `device_type` to **all events**
- `src/views/HomeView.vue`
	- `homepage_interaction` actions (category clicks, open settings/export, view/layout toggles)
	- `search` sent with debounce
- `src/components/SettingsModal.vue`
	- `modal_interaction` for settings open/close/change/cta
- `src/components/ExportModal.vue`
	- `modal_interaction` for export open/close/change/cta/export_click

## Naming Conventions

- **Event names**: use lowercase snake case (example: `export_download`)
- **Custom dimension names**: use human labels in Title Case (example: `Device type`)
- **Event parameter keys**: must match code exactly (example: `device_type`)

## Guardrails (Do Not Skip)

- **Do not register PII** as custom dimensions.
	- Avoid registering `search_term` as a custom dimension (users can paste emails/usernames/etc).
- Expect delays:
	- Custom dimensions/metrics can take time before showing in Explorations.
	- Derived events can take time before showing in Admin → Events for “key event” toggles.

## Step 0: Confirm You’re Editing the Right GA4 Property/Stream

- Open the production site and trigger one tracked action (open Settings/Export).
- In GA4, confirm it appears in **Reports → Realtime** or **Admin → DebugView**.

If Realtime shows nothing, check:

- Correct GA4 property selected
- Ad blockers / privacy settings / consent configuration

## Step 1: Create Custom Definitions

GA4: **Admin → Custom definitions**

Create the following **event-scoped custom dimensions** (labels can be changed; parameter keys cannot).

### Core context (recommended first)

- **Device type** → `device_type`
- **Page path** → `page_path`
- **Selected version** → `selected_version`
- **View mode** → `view_mode`
- **Layout** → `layout`

### Interaction structure (recommended next)

- **Action** → `action` (used by `homepage_interaction` and `modal_interaction`)
- **Modal** → `modal` (used by `modal_interaction`)
- **Close reason** → `close_reason` (modal closes)
- **Auth state** → `auth_state` (modal context)
- **Field** → `field` (settings/export changes)

### Optional (only if you’ll actually use them)

- **Category** → `category`
- **Search active** → `search_active`
- **Export format** → `export_format`

Create the following **event-scoped custom metrics** (Integer):

- **Categories selected count** → `categories_selected_count`
- **Results count** → `results_count`
- **Term count** → `term_count`
- **Export item count** → `export_item_count`
- **Selected categories count** → `selected_categories_count`
- **Selected price fields count** → `selected_price_fields_count`

## Step 2: Create Derived Events (GA4 “Create event”)

GA4: **Admin → Events → Create event**

Enable “Copy parameters from source event” where available.

### Export

- **`export_open`**
	- `event_name` equals `modal_interaction`
	- `modal` equals `export`
	- `action` equals `open`
- **`export_download`**
	- `event_name` equals `modal_interaction`
	- `modal` equals `export`
	- `action` equals `export_click`

### Settings (optional but useful)

- **`settings_open`**
	- `event_name` equals `modal_interaction`
	- `modal` equals `settings`
	- `action` equals `open`
- **`settings_save`**
	- `event_name` equals `modal_interaction`
	- `modal` equals `settings`
	- `action` equals `close`
	- `close_reason` equals `save`

## Step 3: Mark Key Events (formerly “Conversions”)

GA4 renamed conversions to **Key events**.

GA4: **Admin → Events**

When the derived events show up in the Events list:

- Mark `export_download` as a **Key event**
- Optional: mark `settings_save` as a **Key event**

If the derived event is not listed yet:

- Trigger the source behavior on production (do an export once)
- Wait for GA4 processing, then re-check Admin → Events

## Step 4: Create Explorations

GA4: **Explore → Explorations**

### Exploration A: Path (“Homepage usage”)

- **Start**: `page_view` filtered to `page_path = /`
- **Steps**: include events
	- `homepage_interaction`
	- `search`
	- `modal_interaction`
- **Breakdowns**:
	- `Device type`
	- `Selected version`
	- `View mode`
	- `Layout`
	- For `homepage_interaction`, break down by `Action`
	- For `modal_interaction`, break down by `Modal` then `Action`

### Exploration B: Funnel (“Export funnel”)

Preferred (uses derived events):

- Step 1: `page_view` where `page_path = /`
- Step 2: `export_open`
- Step 3: `export_download`

Break down by:

- `Auth state`
- `Device type`

## Verification Checklist

- **Realtime** shows `modal_interaction` when opening Export modal
- Derived event `export_download` fires after clicking export (may show later)
- Custom dimension `Device type` appears in Explorations as a usable breakdown

## Appendix: Known Event Parameters in Use

### `homepage_interaction`

Common:

- `action`
- `page_path`
- `selected_version`
- `view_mode`
- `layout`
- `device_type`

Sometimes:

- `category`
- `categories_selected_count`
- `search_active`
- `is_category_filters_visible`
- `from`, `to` (for view/layout changes)

### `modal_interaction`

Common:

- `modal`
- `action`
- `page_path`
- `selected_version`
- `view_mode`
- `layout`
- `auth_state`
- `device_type`

Sometimes:

- `field`, `value`
- `close_reason`
- `export_format`, `export_item_count`
- `selected_categories_count`
- `selected_price_fields_count`

