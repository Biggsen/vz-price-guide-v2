---
title: Admin Shop — Manual Review Notes
description: Scratchpad while manually reviewing the admin / server shop feature. Things to fix, verify, or follow up.
created_at: 2026-04-02
---

## Open questions

-

## Bugs / fixes needed

### Open

-   **Add Shop Item** modal: do not show **Pricing Type** until at least one item is selected. On open, no items are selected—that is the default state.
-   Shop items table briefly shows **Unknown item** (or similar) while rows are still loading—use a loading/skeleton state or defer the item label until data is ready so users don’t see a false “unknown” state.
-   In recipe pricing, when an ingredient/item is missing from the shop, the UI currently says **No Prices**—replace this with clearer copy so users understand the item is missing from the shop (not just missing a value).

### Done

-   Admin shop create action is now owner/manager-only. If user selects **No — I play on this server**, they no longer see **Add Admin Shop**.
-   Hidden the **Admin shop** section label when no admin-shop action is available to the current user.
-   **Edit shop** for admin shops no longer shows the **Location** field.
-   Removed **Archive this shop** from settings for admin shops.
-   In settings modal, **Shop settings** heading is hidden when no shop-level settings apply, and spacing above **Items list** collapses correctly.
-   **Pricing** vs **Profit %** column overlap: `BaseTable` always uses `table-auto` instead of conditional `table-fixed` when columns have width hints, so columns can size from content. Re-check narrow viewports for regressions.

## UX / copy / polish

-   **Recipe price recalculation modal:** When no prices were updated (empty “nothing changed” outcome), use a **smaller** modal layout instead of the same large shell as when there are updated items or errors to list.
-   **Inline price editing (table):** When editing buy/sell in the table, **Tab** should move focus to the next column (e.g. buy → sell, then next row or next logical cell) so prices can be entered with less mouse use. (Not implemented—note only.)
-   Add a **?** tooltip component (or pattern) for long field hints instead of always showing them inline—e.g. **Pricing Type** and similar fields.
-   **Pricing Type** hint: include **Base** in the explanation (alongside the other types).
-   **List view:** When **View as** is **List**, show a top table header row labeled **All items (n)** where **n** is the item count (match whatever pattern other views use for consistency).

## Security / auth / data

-

## Follow-ups (non-blocking)

-
