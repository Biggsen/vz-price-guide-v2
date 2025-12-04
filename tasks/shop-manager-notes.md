---
title: Shop Manager Notes
description: Scratchpad for observations, bugs, and follow-ups while reviewing the Shop Manager experience.
created_at: 2025-11-11
---

## Open Questions

-

## Bugs / Issues

-   In the shop page, adding notes using the inline editing is buggy. Doesn't save always and just results in a long dash.
-   When using keyboard in the item search results (when adding items to the shop), it needs to scroll with the up and down keyboard. Now, when you key down, you go below and can't see what you're selecting.
-   For the item search result, the categories should be in the same order as on the main price guide.

## Enhancements / Ideas

-   Require server version selector to support minor versions (e.g., 1.21.4 instead of only 1.21).
-   The server cards aren't working so well for managing a lot of shops. It gets very long and there's little space to have sorting and such. Considering that a table might be better.
-   Inline price editing on the market overview would be great.
-   Being able to add multiple items at once would be great. It could be a checkbox in the item selector and you can check many items. They'd all share the same other values (buy, sell, notes).
-   Add a reset button for the search on market overview.
-   Would be good to be able to mark or star or favorite items. When you found the cheapest option, marking it would be good.
-   ~~Need a way to mark when a player shop is fully added so all of its items are accounted for.~~ ✅ Implemented: "Shop is fully cataloged" checkbox in ShopItemsView (simplified to boolean in 2025-12-04)

## Notes

- **2025-12-04**: Simplified `fully_cataloged` field from a complex map structure (with `at`, `by`, `by_label`, `notes`) to a simple boolean. The catalog checkbox in ShopItemsView now sets `fully_cataloged: true/false` directly. Removed all catalog metadata helpers and UI elements that displayed catalog dates/notes.
