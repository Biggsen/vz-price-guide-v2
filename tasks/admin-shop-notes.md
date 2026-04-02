---
title: Admin Shop — Manual Review Notes
description: Scratchpad while manually reviewing the admin / server shop feature. Things to fix, verify, or follow up.
created_at: 2026-04-02
---

## Open questions

-

## Bugs / fixes needed

### Open

-   Admin shop is only for server owners. If the user selects **No — I play on this server**, do not show the add admin shop option.
-   **Edit shop** for an admin shop: do not show the **Location** field.
-   For admin shop, remove **Archive this shop** from settings.
-   **Add Shop Item** modal: do not show **Pricing Type** until at least one item is selected. On open, no items are selected—that is the default state.
-   At some viewport widths, **Pricing** column content overlaps into the **Profit** column (layout / overflow).

### Done

-

## UX / copy / polish

-   Add a **?** tooltip component (or pattern) for long field hints instead of always showing them inline—e.g. **Pricing Type** and similar fields.
-   **Pricing Type** hint: include **Base** in the explanation (alongside the other types).

## Security / auth / data

-

## Follow-ups (non-blocking)

-
