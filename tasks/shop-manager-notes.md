---
title: Shop Manager Notes
description: Scratchpad for observations, bugs, and follow-ups while reviewing the Shop Manager experience.
created_at: 2025-11-11
---

## Open Questions

-

## Bugs / Issues

### Open

_(None currently)_

### Completed

-   ~~In the shop page, adding notes using the inline editing is buggy. Doesn't save always and just results in a long dash.~~ ✅ Fixed: Added check in `handleBlur()` to skip saving if edit mode was cancelled, preventing blur handler from overwriting saved notes with empty string.
-   ~~When using keyboard in the item search results (when adding items to the shop), it needs to scroll with the up and down keyboard. Now, when you key down, you go below and can't see what you're selecting.~~ ✅ Fixed: Keyboard navigation now properly scrolls highlighted items into view using the correct CSS selector.
-   ~~For the item search result, the categories should be in the same order as on the main price guide.~~ ✅ Fixed: Categories in shop item form dropdown now match main price guide order. Items within each category are sorted by subcategory and name.

## Enhancements / Ideas

### Open

-   Inline price editing on the market overview would be great.
-   Would be good to see starred items only.
-   Being able to click on an icon in the item row to set it as out of stock (instead of having to go into edit item).
-   Being able to add custom items (e.g. chest organiser, which is a wooden hoe) that aren’t in the main price guide.

### Completed

-   ~~Require server version selector to support minor versions (e.g., 1.21.4 instead of only 1.21).~~ ✅ Implemented: Two-dropdown version selector with major.minor (required) and patch (optional, defaults to 0). Full version stored in metadata, major.minor extracted for filtering.
-   ~~The server cards aren't working so well for managing a lot of shops. It gets very long and there's little space to have sorting and such. Considering that a table might be better.~~ ✅ Implemented: Table view for multiple shops now available.
-   ~~Being able to add multiple items at once would be great. It could be a checkbox in the item selector and you can check many items. They'd all share the same other values (buy, sell, notes).~~ ✅ Implemented: Added "Enable multiple selection" checkbox below the search label. When enabled, checkboxes appear in the dropdown and users can select multiple items that share the same buy/sell prices and notes.
-   ~~Add a reset button for the search on market overview.~~ ✅ Implemented: Reset button for search on market overview now available.
-   ~~Would be good to be able to mark or star or favorite items. When you found the cheapest option, marking it would be good.~~ ✅ Implemented: Starring functionality added to both ShopItemsView and MarketOverviewView. Items can be starred/unstarred with outline/solid star icons. Starred status persists and doesn't update last_updated timestamp. Works with both small (≤30) and large (>30) shop arrays.
-   ~~Need a way to mark when a player shop is fully added so all of its items are accounted for.~~ ✅ Implemented: "Shop is fully cataloged" checkbox in ShopItemsView (simplified to boolean in 2025-12-04)
-   ~~In shop, the categories view needs to be ordered as on the price guide.~~ ✅ Fixed: Category ordering in shop manager category view now matches price guide order (using `enabledCategories` from constants).
-   ~~Would be good to archive shops when they disappear from the pshops. They might return so I'd rather not delete them fully.~~ ✅ Implemented: Shop archiving feature added. Users can archive shops via checkbox in ShopItemsView. Archived shops are filtered out from Market Overview but visible in Shop Manager with "(Archived)" label. Archive status persists and shops can be unarchived.
-   ~~Opportunities need to take into account out of stock.~~ ✅ Implemented: Opportunities feature now filters out items that are out of stock. Buy prices are only included if `stock_quantity !== 0`, and sell prices are only included if `!stock_full`. Additional filtering ensures out-of-stock shops don't appear in opportunities.
-   ~~You need to be able to add the same item more than once (e.g. weapons and swords with different enchantments). A little indicator in the add item modal would work, just telling you that item has already been added.~~ ✅ Implemented: Removed filter that hid items already in shop from add-item dropdown. Added NotificationBanner (info, compact) in add-item modal when selected item(s) are already in the shop, placed below "Select different item" / "Clear all selections".

## Notes

-   **2025-12-04**: Simplified `fully_cataloged` field from a complex map structure (with `at`, `by`, `by_label`, `notes`) to a simple boolean. The catalog checkbox in ShopItemsView now sets `fully_cataloged: true/false` directly. Removed all catalog metadata helpers and UI elements that displayed catalog dates/notes.
-   **2025-12-05**: Implemented multiple item selection feature. Added "Enable multiple selection" checkbox that appears below the "Search and Select Item(s)" label. When enabled, checkboxes appear next to each item in the dropdown, and users can select multiple items that will all share the same buy price, sell price, and notes when submitted. Removed all console.log statements from shop manager, shop components, and useShopItems utility.
-   **2025-12-14**: Fixed category ordering in shop item form dropdown. Categories now appear in the same order as the main price guide (using `enabledCategories` array), and items within each category are sorted by subcategory and name to match HomeView ordering.
-   **2025-12-19**: Fixed category ordering in shop manager category view to match price guide order (using `enabledCategories` from constants).
-   **2025-12-14**: Implemented optional patch version support for server Minecraft versions. Added two-dropdown UI (major.minor required, patch optional with default 0). Full versions stored in metadata, major.minor extracted for filtering. Fixed keyboard navigation scrolling in item search dropdown by using correct CSS selector (`.bg-norway`).
-   **2025-12-16**: Fixed inline notes editing bug where notes would show "—" after saving. The issue was caused by the blur handler overwriting saved notes with an empty string after edit mode was cancelled. Added check in `handleBlur()` to skip saving if edit mode is no longer active.
-   **2025-12-16**: Implemented starring functionality for shop items. Added star icons (outline when unstarred, solid when starred) to item columns in both ShopItemsView and MarketOverviewView. Starring doesn't update last_updated timestamp. Added updateItem method to useServerShopItems composable to handle optimistic updates for large shop arrays (>30 shops) that don't have real-time listeners.
-   **2025-12-17**: Implemented shop archiving feature. Added archive checkbox in ShopItemsView to mark shops as archived. Archived shops are filtered out from Market Overview opportunities but remain visible in Shop Manager with "(Archived)" label. Archive status stored in shop document and can be toggled on/off.
