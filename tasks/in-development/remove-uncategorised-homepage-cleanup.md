# Remove Uncategorised Functionality and Clean Up Homepage

## Overview

Remove the complex uncategorised item handling from the homepage and implement proper database-level filtering to ensure only complete, ready-to-use items are displayed to public users.

## Problem Statement

Currently, the homepage has complex client-side logic for handling uncategorised items that are in mixed states (some ready for public viewing, others incomplete with missing prices/images). This creates confusion and maintenance overhead. The goal is to clean up the homepage to only show properly categorized items with valid prices.

## Current State Analysis

### Uncategorised Logic in HomeView.vue

-   **Lines 230-259**: Computed properties for uncategorised items
-   **Lines 482-488**: Logic adding uncategorised items to visible items (admin-only)
-   **Lines 842-853**: Toggle button for uncategorised items (visible to all logged-in users)
-   **Lines 969-983**: Template rendering uncategorised items as separate tables
-   **Lines 536-538**: URL parameter handling for `uncat` query parameter
-   **Lines 558-560**: URL updating to preserve uncategorised filter state
-   **Lines 580-596**: Watcher hiding uncategorised by default for non-logged-in users

### Current Filtering Logic

-   **Category filtering**: Already implemented at database level (lines 72-79)
-   **Price filtering**: Currently client-side (lines 183-195)
-   **Image filtering**: Client-side for public users (lines 176-181)

## Requirements

### 1. Remove Uncategorised Functionality

-   [ ] Remove all uncategorised-related computed properties from HomeView.vue
-   [ ] Remove uncategorised toggle button from UI
-   [ ] Remove URL parameter handling for `uncat` parameter
-   [ ] Remove uncategorised item tables from categories view template
-   [ ] Remove `showUncategorised` reactive variable and related functions

### 2. Implement Database-Level Filtering

-   [ ] Add price filtering to database query (`where('price', '>', 0)`)
-   [ ] Add category validation to database query (exclude items without valid categories)
-   [ ] Ensure only items with valid categories from `enabledCategories` are fetched
-   [ ] Remove client-side price filtering logic

### 3. Update Other Views

-   [ ] Update MarketOverviewView.vue to handle items without categories gracefully
-   [ ] Update ShopItemsView.vue to handle items without categories gracefully
-   [ ] Update CrateSingleView.vue to handle items without categories gracefully
-   [ ] Update ShopItemForm.vue to handle items without categories gracefully

### 4. Preserve Admin Functionality

-   [ ] Ensure BulkUpdateItemsView.vue can still access uncategorised items for admin work
-   [ ] Verify admin users can still see zero-priced items if needed
-   [ ] Maintain admin-only features for working with incomplete items

## Technical Implementation

### Database Query Changes

```javascript
// Current query (lines 60-87)
const itemsQuery = computed(() => {
	const baseQuery = collection(db, 'items')
	const filters = []

	// Version filtering
	const enabledVersionsUpToSelected = enabledVersions.value.filter((v) =>
		isVersionLessOrEqual(v, selectedVersion.value)
	)
	filters.push(where('version', 'in', enabledVersionsUpToSelected))

	// Category filtering (existing)
	if (
		visibleCategories.value.length < enabledCategories.length &&
		visibleCategories.value.length > 0
	) {
		filters.push(where('category', 'in', visibleCategories.value))
	}

	// NEW: Add price filtering
	filters.push(where('price', '>', 0))

	// NEW: Add category validation (exclude null/empty categories)
	filters.push(where('category', '!=', null))
	filters.push(where('category', '!=', ''))

	// Ordering
	filters.push(orderBy('version', 'asc'))
	filters.push(orderBy('category', 'asc'))
	filters.push(orderBy('name', 'asc'))

	return query(baseQuery, ...filters)
})
```

### Code Removal Checklist

-   [ ] Remove `uncategorizedItems` computed property (lines 230-234)
-   [ ] Remove `uncategorizedItemsByVersion` computed property (lines 236-250)
-   [ ] Remove `uncategorizedItemsFlat` computed property (lines 252-259)
-   [ ] Remove `filteredUncategorizedItemsByVersion` computed property (lines 438-449)
-   [ ] Remove `uncategorizedVersions` computed property (lines 451-460)
-   [ ] Remove `filteredUncategorizedItems` computed property (lines 462-468)
-   [ ] Remove `showUncategorised` reactive variable (line 498)
-   [ ] Remove `toggleUncategorised()` function (lines 639-641)
-   [ ] Remove uncategorised logic from `allVisibleItems` computed (lines 482-488)
-   [ ] Remove uncategorised button from template (lines 842-853)
-   [ ] Remove uncategorised item tables from template (lines 969-983)
-   [ ] Remove `uncat` parameter handling from `initializeFromQuery()` (lines 536-538)
-   [ ] Remove `uncat` parameter from `updateQuery()` (lines 558-560)
-   [ ] Remove `showUncategorised` from watcher (lines 573-578)
-   [ ] Remove user watcher for uncategorised (lines 580-596)

### Other Views Updates

-   [ ] Update fallback category logic in MarketOverviewView.vue (line 101)
-   [ ] Update fallback category logic in ShopItemsView.vue (line 128)
-   [ ] Update fallback category logic in CrateSingleView.vue (line 283)
-   [ ] Update fallback category logic in ShopItemForm.vue (line 139)

## Testing Requirements

-   [ ] Verify homepage only shows items with valid categories and prices > 0
-   [ ] Verify uncategorised toggle button is completely removed
-   [ ] Verify URL parameters no longer include `uncat`
-   [ ] Verify other views handle missing categories gracefully
-   [ ] Verify admin bulk update page still works with uncategorised items
-   [ ] Verify public users cannot access incomplete items
-   [ ] Verify logged-in users see same filtered results as public users

## Success Criteria

-   [ ] Homepage is cleaner and more predictable
-   [ ] No client-side filtering for price/category validation
-   [ ] Database only returns complete, ready-to-use items
-   [ ] Admin tools remain functional for working with incomplete items
-   [ ] Reduced code complexity and maintenance overhead
-   [ ] Better performance (less data transfer and processing)

## Dependencies

-   None - this is a cleanup task that doesn't require external changes

## Estimated Effort

-   **Development**: 4-6 hours
-   **Testing**: 2-3 hours
-   **Total**: 6-9 hours

## Notes

-   This change will make the homepage more predictable and performant
-   Admin users will need to use the bulk update page to work with uncategorised items
-   The change aligns with the goal of having a clean, public-ready homepage
-   Consider adding a database index on `price` and `category` fields for better query performance
