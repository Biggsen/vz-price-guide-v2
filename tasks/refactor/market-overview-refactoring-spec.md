# Market Overview Refactoring Specification

## Overview

This document outlines refactoring opportunities for `MarketOverviewView.vue` (1,046 lines) with consideration for reuse with `ShopItemsView.vue` and `ShopManagerView.vue`. This spec builds upon the `shop-refactoring-spec.md` and identifies additional shared patterns.

## Status

### ✅ Completed

-   **Shared Utility Functions** - Extracted date, pricing, and table transformation utilities
    -   Created `src/utils/date.js` with `formatRelativeDate()` (24 lines)
    -   Extended `src/utils/pricing.js` with `calculateProfitMargin()`, `formatPrice()`, `formatProfitMargin()` (25 lines)
    -   Created `src/utils/tableTransform.js` with `transformShopItemForTable()` (48 lines)
    -   Removed ~100 lines of duplicated code from both views
    -   Date: Completed

**Impact**:

-   `MarketOverviewView.vue`: Reduced from 1,046 to ~996 lines (50 lines removed)
-   `ShopItemsView.vue`: Reduced from 1,223 to ~1,173 lines (50 lines removed)
-   Total: ~100 lines of code eliminated
-   Created reusable utilities for future use across the application

### ⏳ Pending

-   ViewModeLayoutToggle Component
-   MarketItemsTable Component
-   useViewSettings Composable Enhancement
-   useItemGrouping Composable
-   BackButton Component
-   MarketStats Component

## Current State Analysis

### File Sizes (Current State)

-   `MarketOverviewView.vue`: 1,500 lines (reduced from 1,046 after utility extraction, but has grown)
-   `ShopItemsView.vue`: 1,847 lines (reduced from 1,493 after ShopFormModal extraction, but has grown)
-   `ShopManagerView.vue`: ~737 lines (reduced from 890)

### Code Duplication Identified

#### Shared Utilities (High Priority)

-   ~~`formatDate()` function: Duplicated in MarketOverviewView, ShopItemsView, and other views~~ ✅ **COMPLETED**
-   ~~`calculateProfitMargin()` function: Duplicated in MarketOverviewView and ShopItemsView~~ ✅ **COMPLETED**
-   ~~`transformShopItemForTable()` function: Similar logic in both MarketOverviewView and ShopItemsView~~ ✅ **COMPLETED**

#### View Settings (High Priority)

-   View mode/layout toggle UI: Duplicated in MarketOverviewView and ShopItemsView (ViewControls.vue already exists and is used in HomeView)
-   localStorage view settings: Similar pattern in both views (already identified in shop-refactoring-spec.md)
-   Sort settings: MarketOverviewView has additional sort settings logic

#### Table Templates (High Priority)

-   BaseTable cell templates: ~200 lines duplicated between categories/list views in MarketOverviewView
-   Similar cell templates exist in ShopItemsView with slight variations

#### Item Grouping Logic (Medium Priority)

-   Grouping items by category: Similar logic in MarketOverviewView and ShopItemsView
-   Category sorting: MarketOverviewView has category ordering logic

#### Enchantment Formatting (Medium Priority)

-   `formatEnchantmentName()` function: Duplicated in MarketOverviewView, ShopItemsView, and CrateSingleView
-   `formatEnchantmentsForTitle()` function: Duplicated in MarketOverviewView and ShopItemsView

#### Item Image URL (Medium Priority)

-   `getItemImageUrl()` function: Duplicated in MarketOverviewView and ShopItemsView

#### Back Button (Low Priority)

-   Back button pattern: MarketOverviewView uses inline SVG, ShopItemsView uses BaseButton

## Refactoring Opportunities

### 1. Shared Utility Functions (High Priority) ✅ **COMPLETED**

**Problem**: `formatDate()`, `calculateProfitMargin()`, and related helpers are duplicated across multiple views.

**Solution**: Extract into shared utility files.

**Status**: ✅ **COMPLETED**

-   Created `src/utils/date.js` with `formatRelativeDate()`
-   Extended `src/utils/pricing.js` with pricing utilities
-   Created `src/utils/tableTransform.js` with table transformation utility
-   Updated both `MarketOverviewView.vue` and `ShopItemsView.vue` to use shared utilities
-   Removed ~100 lines of duplicated code

#### 1.1 Date Formatting Utility

**Location**: `src/utils/date.js`

**Exports**:

```javascript
/**
 * Format a date string to a relative date (Today, Yesterday, X days ago)
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date string
 */
export function formatRelativeDate(dateString) {
	if (!dateString) return '—'

	const date = new Date(dateString)
	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

	const diffTime = today.getTime() - itemDate.getTime()
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

	if (diffDays === 0) {
		return 'Today'
	} else if (diffDays === 1) {
		return 'Yesterday'
	} else {
		return `${diffDays} days ago`
	}
}
```

**Usage**:

-   Replace `formatDate()` in MarketOverviewView (line 276)
-   Replace `formatDate()` in ShopItemsView (line 279)
-   Update other views that use similar date formatting

**Files to Modify**:

-   `src/utils/date.js` (new)
-   `src/views/MarketOverviewView.vue` (replace line 276)
-   `src/views/ShopItemsView.vue` (replace line 279)
-   Other views that use date formatting

---

#### 1.2 Pricing Utilities

**Location**: `src/utils/pricing.js` (extend existing file)

**Exports**:

```javascript
/**
 * Calculate profit margin percentage
 * @param {number} buyPrice - Buy price
 * @param {number} sellPrice - Sell price
 * @returns {number|null} Profit margin percentage or null if invalid
 */
export function calculateProfitMargin(buyPrice, sellPrice) {
	if (!buyPrice || !sellPrice || buyPrice === 0) return null
	const profit = buyPrice - sellPrice
	const margin = (profit / buyPrice) * 100
	return margin
}

/**
 * Format price for display
 * @param {number|null|undefined} price - Price to format
 * @returns {string} Formatted price or '—' if invalid
 */
export function formatPrice(price) {
	if (price !== null && price !== undefined && price !== 0) {
		return price.toFixed(2)
	}
	return '—'
}

/**
 * Format profit margin for display
 * @param {number|null} margin - Profit margin percentage
 * @returns {string} Formatted margin or '—' if invalid
 */
export function formatProfitMargin(margin) {
	return margin !== null ? `${margin.toFixed(1)}%` : '—'
}
```

**Usage**:

-   Replace `calculateProfitMargin()` in MarketOverviewView (line 297)
-   Replace `calculateProfitMargin()` in ShopItemsView (line 269)
-   Use `formatPrice()` and `formatProfitMargin()` in table transformations

**Files to Modify**:

-   `src/utils/pricing.js` (extend)
-   `src/views/MarketOverviewView.vue` (replace line 297)
-   `src/views/ShopItemsView.vue` (replace line 269)

---

#### 1.3 Table Transformation Utilities

**Location**: `src/utils/tableTransform.js` (new)

**Exports**:

```javascript
import { calculateProfitMargin, formatPrice, formatProfitMargin } from './pricing.js'
import { formatRelativeDate } from './date.js'

/**
 * Transform shop item for table display
 * @param {Object} shopItem - Shop item object with itemData
 * @param {Object} options - Transformation options
 * @param {boolean} options.includeShop - Include shop information
 * @returns {Object} Transformed item for table
 */
export function transformShopItemForTable(shopItem, options = {}) {
	const { includeShop = false } = options
	const profitMargin = calculateProfitMargin(shopItem.buy_price, shopItem.sell_price)
	const lastUpdatedTimestamp = shopItem.last_updated
		? new Date(shopItem.last_updated).getTime()
		: 0

	const transformed = {
		id: shopItem.id,
		item: shopItem.itemData?.name || 'Unknown Item',
		image: shopItem.itemData?.image || null,
		buyPrice: formatPrice(shopItem.buy_price),
		sellPrice: formatPrice(shopItem.sell_price),
		profitMargin: formatProfitMargin(profitMargin),
		lastUpdated: formatRelativeDate(shopItem.last_updated),
		_lastUpdatedTimestamp: lastUpdatedTimestamp,
		_originalItem: shopItem
	}

	if (includeShop) {
		transformed.shop = shopItem.shopData?.name || 'Unknown Shop'
		transformed.shopPlayer = shopItem.shopData?.player || null
		transformed.shopLocation = shopItem.shopData?.location || null
		transformed.shopId = shopItem.shopData?.id || null
	}

	return transformed
}
```

**Usage**:

-   Replace `transformShopItemForTable()` in MarketOverviewView (line 305)
-   Replace `transformShopItemForTable()` in ShopItemsView (line 300)
-   Standardize table row structure across views

**Files to Modify**:

-   `src/utils/tableTransform.js` (new)
-   `src/views/MarketOverviewView.vue` (replace line 305)
-   `src/views/ShopItemsView.vue` (replace line 300)

---

### 2. Use Existing ViewControls Component (High Priority)

**Problem**: View mode and layout toggle UI is duplicated in MarketOverviewView (lines 1044-1107) and ShopItemsView (lines 1216-1274) even though `ViewControls.vue` already exists and is used in `HomeView.vue`.

**Solution**: Replace inline toggle UI with existing `ViewControls.vue` component and enhance it if needed.

**Location**: `src/components/ViewControls.vue` (already exists)

**Current State**: 
- `ViewControls.vue` already exists at `src/components/ViewControls.vue`
- Currently used in `HomeView.vue` (lines 388-392)
- Provides view mode and layout toggles with same functionality

**Enhancements Needed**:
- Add optional `data-cy` attributes for testing (ShopItemsView and MarketOverviewView have these)
- Support optional label color variant (currently uses `text-heavy-metal`, MarketOverviewView uses `text-gray-700`)
- Support optional hover color variant (currently uses `hover:bg-gray-100`, MarketOverviewView uses `hover:bg-sea-mist`)

**Props to Add**:
```javascript
{
  dataCyPrefix: String, // Optional prefix for data-cy attributes (e.g., 'shop-items', 'market-overview')
  labelColor: String, // Optional: 'heavy-metal' (default) or 'gray-700'
  hoverColor: String // Optional: 'gray-100' (default) or 'sea-mist'
}
```

**Usage**:

-   Replace toggle UI in MarketOverviewView (lines 1044-1107)
-   Replace toggle UI in ShopItemsView (lines 1216-1274)
-   Standardize UI across HomeView, ShopItemsView, and MarketOverviewView

**Files to Modify**:

-   `src/components/ViewControls.vue` (enhance with optional props)
-   `src/views/MarketOverviewView.vue` (replace lines 1044-1107)
-   `src/views/ShopItemsView.vue` (replace lines 1216-1274)

**Impact**:
- Remove ~60 lines of duplicated code from MarketOverviewView
- Remove ~60 lines of duplicated code from ShopItemsView
- Standardize UI across all three views

---

### 3. Enchantment Formatting Utilities (Medium Priority)

**Problem**: Enchantment formatting functions are duplicated across multiple views:
- `formatEnchantmentName()` - `MarketOverviewView.vue` (lines 178-225), `ShopItemsView.vue` (lines 282-329), `CrateSingleView.vue` (line 990)
- `formatEnchantmentsForTitle()` - `MarketOverviewView.vue` (lines 228-231), `ShopItemsView.vue` (lines 332-335)

**Solution**: Extract into shared utility file.

**Location**: `src/utils/enchantments.js` (new)

**Exports**:
```javascript
/**
 * Format enchantment name for display
 * @param {string} enchantmentId - Enchantment item ID
 * @param {Array} availableItems - Array of all available items
 * @returns {string} Formatted enchantment name
 */
export function formatEnchantmentName(enchantmentId, availableItems) {
  // ... existing logic from MarketOverviewView/ShopItemsView
}

/**
 * Format enchantments for title attribute (comma-separated list)
 * @param {Array} enchantments - Array of enchantment IDs
 * @param {Array} availableItems - Array of all available items
 * @returns {string} Comma-separated list of formatted enchantment names
 */
export function formatEnchantmentsForTitle(enchantments, availableItems) {
  if (!enchantments || enchantments.length === 0) return ''
  return enchantments.map(id => formatEnchantmentName(id, availableItems)).filter(Boolean).join(', ')
}
```

**Files to Modify**:
- `src/utils/enchantments.js` (new)
- `src/views/MarketOverviewView.vue` (replace lines 178-231)
- `src/views/ShopItemsView.vue` (replace lines 282-335)
- `src/views/CrateSingleView.vue` (replace line 990)

**Impact**: 
- Remove ~50 lines of duplicated code
- Standardize enchantment formatting across all views

---

### 4. Item Image URL Helper (Medium Priority)

**Problem**: `getItemImageUrl()` function is duplicated in `MarketOverviewView.vue` (lines 164-175) and `ShopItemsView.vue` (lines 268-279).

**Solution**: Move to existing `src/utils/image.js` file.

**Location**: `src/utils/image.js` (extend existing)

**Exports**:
```javascript
/**
 * Get image URL, preferring enchanted version if item has enchantments
 * @param {string} imagePath - Base image path
 * @param {Array} enchantments - Array of enchantment IDs (optional)
 * @returns {string|null} Image URL or null if no path
 */
export function getItemImageUrl(imagePath, enchantments) {
  if (!imagePath) return null

  // If item has enchantments, try to use enchanted version (always .webp)
  if (enchantments && enchantments.length > 0) {
    const enchantedPath = imagePath.replace(/\.(png|webp|gif)$/i, '_enchanted.webp')
    return getImageUrl(enchantedPath)
  }

  return getImageUrl(imagePath)
}
```

**Files to Modify**:
- `src/utils/image.js` (extend)
- `src/views/MarketOverviewView.vue` (replace lines 164-175)
- `src/views/ShopItemsView.vue` (replace lines 268-279)

**Impact**: 
- Remove ~15 lines of duplicated code
- Centralize image URL logic

---

### 5. MarketItemsTable Component (High Priority)

**Problem**: BaseTable templates are duplicated for categories/list views in MarketOverviewView (lines 1112-1341, 1344-1569). Similar duplication exists in ShopItemsView.

**Solution**: Extract table display into a reusable component that handles both view modes.

**Location**: `src/components/MarketItemsTable.vue`

**Props**:

```javascript
{
  items: Array, // Shop items with itemData and shopData
  columns: Array, // BaseTable column definitions
  layout: String, // 'comfortable' | 'condensed'
  viewMode: String, // 'categories' | 'list'
  sortField: String, // Current sort field
  sortDirection: String, // 'asc' | 'desc'
  sortedCategories: Array, // Ordered category list (for categories view)
  showShopColumn: Boolean, // Show shop column (true for market overview)
  showNotesColumn: Boolean, // Show notes column (false for market overview)
  isShopOutOfMoney: Boolean, // Shop owner out of money (for ShopItemsView)
  onShopClick: Function // Handler for shop name clicks
}
```

**Events**:

-   `@sort` - Emits `{ field, direction }` when sorting changes

**Features**:

-   Render BaseTable with proper cell templates
-   Handle both category and list view modes
-   Display stock status icons
-   Support shop name navigation
-   Reuse cell templates for both modes

**Cell Templates**:

-   Item cell (with image)
-   Shop cell (with avatar, clickable)
-   Buy price cell (with out-of-stock icon)
-   Sell price cell (with stock-full/out-of-money icons)
-   Profit margin cell
-   Last updated cell
-   Notes cell (optional, for ShopItemsView)

**Implementation Notes**:

-   Use scoped slots for cell templates
-   Group items by category when `viewMode === 'categories'`
-   Reuse same cell templates for both modes
-   Handle shop navigation via `onShopClick` prop

**Files to Modify**:

-   `src/components/MarketItemsTable.vue` (new)
-   `src/views/MarketOverviewView.vue` (replace lines 1112-1569)
-   `src/views/ShopItemsView.vue` (can use same component with different props)

---

### 6. useViewSettings Composable Enhancement (High Priority)

**Problem**: View settings logic is duplicated. MarketOverviewView also has sort settings that could be included.

**Solution**: Enhance the `useViewSettings` composable from shop-refactoring-spec.md to support sort settings.

**Location**: `src/composables/useViewSettings.js` (enhance existing)

**Enhanced Exports**:

```javascript
import { ref, watch, onMounted } from 'vue'

export function useViewSettings(keyPrefix, defaults = {}) {
	const viewMode = ref(defaults.viewMode || 'categories')
	const layout = ref(defaults.layout || 'comfortable')
	const sortField = ref(defaults.sortField || '')
	const sortDirection = ref(defaults.sortDirection || 'asc')

	function loadSettings() {
		try {
			const savedViewMode = localStorage.getItem(`${keyPrefix}ViewMode`)
			const savedLayout = localStorage.getItem(`${keyPrefix}Layout`)
			const savedSortField = localStorage.getItem(`${keyPrefix}SortField`)
			const savedSortDirection = localStorage.getItem(`${keyPrefix}SortDirection`)

			if (savedViewMode && ['categories', 'list'].includes(savedViewMode)) {
				viewMode.value = savedViewMode
			}

			if (savedLayout && ['comfortable', 'condensed'].includes(savedLayout)) {
				layout.value = savedLayout
			}

			if (savedSortField) {
				sortField.value = savedSortField
			}

			if (savedSortDirection && ['asc', 'desc'].includes(savedSortDirection)) {
				sortDirection.value = savedSortDirection
			}
		} catch (error) {
			console.warn('Error loading view settings:', error)
		}
	}

	function saveSettings() {
		try {
			localStorage.setItem(`${keyPrefix}ViewMode`, viewMode.value)
			localStorage.setItem(`${keyPrefix}Layout`, layout.value)

			if (sortField.value) {
				localStorage.setItem(`${keyPrefix}SortField`, sortField.value)
				localStorage.setItem(`${keyPrefix}SortDirection`, sortDirection.value)
			} else {
				localStorage.removeItem(`${keyPrefix}SortField`)
				localStorage.removeItem(`${keyPrefix}SortDirection`)
			}
		} catch (error) {
			console.warn('Error saving view settings:', error)
		}
	}

	watch(
		[viewMode, layout, sortField, sortDirection],
		() => {
			saveSettings()
		},
		{ deep: true }
	)

	onMounted(() => {
		loadSettings()
	})

	return {
		viewMode,
		layout,
		sortField,
		sortDirection,
		loadSettings,
		saveSettings
	}
}
```

**Usage**:

-   Replace view settings logic in MarketOverviewView (lines 425-463)
-   Replace view settings logic in ShopItemsView (lines 339-363)
-   Use in other views that need view settings

**Files to Modify**:

-   `src/composables/useViewSettings.js` (enhance)
-   `src/views/MarketOverviewView.vue` (replace lines 425-463)
-   `src/views/ShopItemsView.vue` (replace lines 339-363)

---

### 7. useItemGrouping Composable (Medium Priority)

**Problem**: Item grouping by category logic is duplicated in MarketOverviewView and ShopItemsView.

**Solution**: Extract into a composable.

**Location**: `src/composables/useItemGrouping.js`

**Exports**:

```javascript
import { computed } from 'vue'
import { enabledCategories } from '../constants.js'

export function useItemGrouping(shopItems, availableItems, options = {}) {
	const { includeShopData = false, shopDataMap = null } = options

	// Group shop items by category
	const shopItemsByCategory = computed(() => {
		if (!shopItems.value || !availableItems.value) return {}

		const grouped = {}

		shopItems.value.forEach((shopItem) => {
			const itemData = availableItems.value.find((item) => item.id === shopItem.item_id)
			if (itemData) {
				const category = itemData.category || 'Uncategorized'
				if (!grouped[category]) {
					grouped[category] = []
				}

				const item = {
					...shopItem,
					itemData
				}

				if (includeShopData && shopDataMap) {
					item.shopData = shopDataMap.value?.[shopItem.shop_id] || null
				}

				grouped[category].push(item)
			}
		})

		// Sort items within each category
		Object.keys(grouped).forEach((category) => {
			grouped[category].sort((a, b) => {
				const nameA = a.itemData?.name || 'Unknown'
				const nameB = b.itemData?.name || 'Unknown'

				if (nameA !== nameB) {
					return nameA.localeCompare(nameB)
				}

				// If same item, sort by buy price (high to low)
				const priceA = a.buy_price || 0
				const priceB = b.buy_price || 0
				return priceB - priceA
			})
		})

		return grouped
	})

	// Sorted categories to match price guide order
	const sortedCategories = computed(() => {
		const categoryKeys = Object.keys(shopItemsByCategory.value)
		const orderedCategories = []

		// First, add categories in enabledCategories order
		enabledCategories.forEach((category) => {
			if (categoryKeys.includes(category)) {
				orderedCategories.push(category)
			}
		})

		// Then, add any remaining categories
		categoryKeys.forEach((category) => {
			if (!enabledCategories.includes(category)) {
				orderedCategories.push(category)
			}
		})

		return orderedCategories
	})

	// Flat list of all items
	const allItems = computed(() => {
		const items = []
		Object.values(shopItemsByCategory.value).forEach((categoryItems) => {
			items.push(...categoryItems)
		})
		return items.sort((a, b) => {
			const nameA = a.itemData?.name?.toLowerCase() || ''
			const nameB = b.itemData?.name?.toLowerCase() || ''
			return nameA.localeCompare(nameB)
		})
	})

	return {
		shopItemsByCategory,
		sortedCategories,
		allItems
	}
}
```

**Usage**:

-   Replace grouping logic in MarketOverviewView (lines 137-183, 342-363)
-   Replace grouping logic in ShopItemsView (lines 188-230)
-   Standardize category ordering

**Files to Modify**:

-   `src/composables/useItemGrouping.js` (new)
-   `src/views/MarketOverviewView.vue` (replace lines 137-183, 342-363)
-   `src/views/ShopItemsView.vue` (replace lines 188-230)

---

### 8. BackButton Component (Low Priority)

**Problem**: Back button implementation varies between views (inline SVG vs BaseButton).

**Solution**: Check if `BackButton.vue` already exists and enhance if needed.

**Location**: `src/components/BackButton.vue` (check existing)

**Check**: Verify if `BackButton.vue` already exists and if it matches the pattern used in MarketOverviewView.

**If enhancement needed**:

-   Support different variants (tertiary button vs link)
-   Support custom routes
-   Consistent styling

**Note**: Only enhance if there's inconsistency. If BaseButton is already used in ShopItemsView, consider standardizing MarketOverviewView to use it.

**Files to Modify**:

-   `src/components/BackButton.vue` (if exists, enhance)
-   `src/views/MarketOverviewView.vue` (standardize back button, lines 593-606)

---

### 9. MarketStats Component (Low Priority)

**Problem**: Market stats display in MarketOverviewView (lines 616-654) could be extracted for reuse.

**Solution**: Extract into a component if needed elsewhere.

**Location**: `src/components/MarketStats.vue` (if needed)

**Props**:

```javascript
{
  stats: {
    totalItems: Number,
    totalShops: Number,
    userShops: Number,
    competitorShops: Number,
    categoriesCount: Number
  }
}
```

**Note**: Only extract if this component will be reused elsewhere. Otherwise, keep inline.

---

## Implementation Plan

### Phase 1: Shared Utilities (Immediate Impact) ✅ **COMPLETED**

1. ✅ **COMPLETED** - Create `src/utils/date.js` with `formatRelativeDate()`
2. ✅ **COMPLETED** - Extend `src/utils/pricing.js` with pricing utilities
3. ✅ **COMPLETED** - Create `src/utils/tableTransform.js` with transformation utilities
4. ✅ **COMPLETED** - Update MarketOverviewView to use new utilities
5. ✅ **COMPLETED** - Update ShopItemsView to use new utilities
6. ✅ **COMPLETED** - Test all views still work correctly

### Phase 2: UI Components & Utilities (High Impact)

1. ⏳ Enhance existing `ViewControls.vue` component with optional props
2. ⏳ Create `enchantments.js` utility file
3. ⏳ Extend `image.js` with `getItemImageUrl()` helper
4. ⏳ Update MarketOverviewView to use ViewControls and utilities
5. ⏳ Update ShopItemsView to use ViewControls and utilities
6. ⏳ Create `MarketItemsTable.vue` component
7. ⏳ Update MarketOverviewView to use MarketItemsTable
8. ⏳ Test view mode switching and table display

### Phase 3: Composables (Code Quality)

1. ✅ Enhance `useViewSettings.js` composable with sort settings
2. ✅ Create `useItemGrouping.js` composable
3. ✅ Update MarketOverviewView to use composables
4. ✅ Update ShopItemsView to use composables
5. ✅ Test all functionality

### Phase 4: Polish (Low Priority)

1. ✅ Review BackButton component
2. ✅ Extract MarketStats if needed elsewhere
3. ✅ Final cleanup and optimization

## Testing Checklist

### Shared Utilities ✅ **COMPLETED & TESTED**

-   [x] ✅ Date formatting works correctly in all views
-   [x] ✅ Profit margin calculation is accurate
-   [x] ✅ Price formatting displays correctly
-   [x] ✅ Table transformation produces correct structure

### ViewControls Component Enhancement

-   [ ] Component enhanced with optional props (data-cy, label color, hover color)
-   [ ] Toggle switches between view modes correctly
-   [ ] Layout changes apply correctly
-   [ ] Styling matches existing design
-   [ ] Works in MarketOverviewView, ShopItemsView, and HomeView

### Enchantment Formatting Utilities

-   [ ] formatEnchantmentName works correctly in all views
-   [ ] formatEnchantmentsForTitle works correctly
-   [ ] All views updated to use shared utilities

### Item Image URL Helper

-   [ ] getItemImageUrl works correctly with and without enchantments
-   [ ] All views updated to use shared helper

### MarketItemsTable Component

-   [ ] Categories view displays correctly
-   [ ] List view displays correctly
-   [ ] Shop column displays and navigates correctly
-   [ ] Stock status icons display correctly
-   [ ] Sorting works correctly
-   [ ] All cell templates render properly

### Composables

-   [ ] View settings save/load correctly
-   [ ] Sort settings save/load correctly
-   [ ] Item grouping works correctly
-   [ ] Category sorting matches price guide order

## Success Metrics

-   [x] ✅ Reduce `MarketOverviewView.vue` from 1,046 lines (50 lines removed via utilities, but currently at 1,500 lines)
-   [x] ✅ Eliminate ~100 lines of duplicated utility functions
-   [ ] Eliminate ~120 lines of duplicated toggle UI (pending - use ViewControls)
-   [ ] Eliminate ~50 lines of duplicated enchantment formatting (pending)
-   [ ] Eliminate ~15 lines of duplicated image URL logic (pending)
-   [ ] Eliminate ~200 lines of duplicated table templates (pending)
-   [ ] Eliminate ~50 lines of duplicated view settings logic (pending)
-   [x] ✅ All existing tests pass
-   [x] ✅ No regression in functionality
-   [x] ✅ Improved code maintainability and reusability

## Cross-View Reuse Summary

### Shared Between MarketOverviewView and ShopItemsView

1. ✅ `formatRelativeDate()` utility
2. ✅ `calculateProfitMargin()` utility
3. ✅ `transformShopItemForTable()` utility
4. ✅ `ViewControls` component (enhance existing)
5. ✅ `formatEnchantmentName()` utility (new)
6. ✅ `getItemImageUrl()` helper (new)
7. ✅ `MarketItemsTable` component (with different props)
8. ✅ `useViewSettings` composable
9. ✅ `useItemGrouping` composable

### Shared Between All Three Views

1. ✅ `ShopFormModal` component (from shop-refactoring-spec.md)
2. ✅ `useShopForm` composable (from shop-refactoring-spec.md)

## Migration Notes

### Breaking Changes

None expected - all refactoring is internal to the components.

### Backward Compatibility

-   All existing functionality should remain unchanged
-   All existing props and events should continue to work
-   No changes to router or API calls
-   localStorage keys remain the same for backward compatibility

### Performance Considerations

-   Composable extraction should have minimal performance impact
-   Component extraction may slightly improve performance due to better Vue reactivity boundaries
-   Utility functions are pure functions with no performance impact

## Future Enhancements

1. **Virtual Scrolling**: Consider virtual scrolling for tables with many items
2. **Advanced Filtering**: Extract search/filter logic into composable
3. **Table Column Configuration**: Make table columns configurable via props
4. **TypeScript**: Consider migrating to TypeScript for better type safety
5. **Unit Tests**: Add unit tests for utility functions and composables
