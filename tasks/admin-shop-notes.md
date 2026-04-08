---
title: Admin Shop — Manual Review Notes
description: Scratchpad while manually reviewing the admin / server shop feature. Things to fix, verify, or follow up.
created_at: 2026-04-02
---

## Open questions

-

## Bugs / fixes needed

### Open

-   Shop items table briefly shows **Unknown item** (or similar) while rows are still loading—use a loading/skeleton state or defer the item label until data is ready so users don’t see a false “unknown” state.
-   In recipe pricing, when an ingredient/item is missing from the shop, the UI currently says **No Prices**—replace this with clearer copy so users understand the item is missing from the shop (not just missing a value).

### Done

-   Admin shop create action is now owner/manager-only. If user selects **No — I play on this server**, they no longer see **Add Admin Shop**.
-   Hidden the **Admin shop** section label when no admin-shop action is available to the current user.
-   **Edit shop** for admin shops no longer shows the **Location** field.
-   Removed **Archive this shop** from settings for admin shops.
-   In settings modal, **Shop settings** heading is hidden when no shop-level settings apply, and spacing above **Items list** collapses correctly.
-   **Pricing** vs **Profit %** column overlap: `BaseTable` always uses `table-auto` instead of conditional `table-fixed` when columns have width hints, so columns can size from content. Re-check narrow viewports for regressions.
-   List view: `BaseTable` caption **All Items (n)** (same labeling as homepage list view).
-   **Add Shop Item** (server shop): **Pricing type** hidden until an item is chosen in single-select mode; hidden entirely when **Enable multiple selection** is on (batch add uses shared buy/sell fields only).
-   **Recipe price recalculation** results: summary uses `NotificationBanner` (same pattern as shop import) instead of side-by-side stat boxes.
-   **Recipe price recalculation** modal footer: removed extra inner `p-4` so `BaseModal` footer padding is not doubled (matches import modal footer).
-   Server shop **Pricing type**: long hint moved into `FieldHelpTooltip` (info icon); copy covers **Base**, **Custom**, and **Recipe**.

## UX / copy / polish

-   **Inline price editing (table):** When editing buy/sell in the table, **Tab** should move focus to the next column (e.g. buy → sell, then next row or next logical cell) so prices can be entered with less mouse use. (Not implemented—note only.)

## Security / auth / data

-

## Follow-ups (non-blocking)

-
