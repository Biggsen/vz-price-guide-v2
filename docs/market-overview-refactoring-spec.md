# Market Overview Refactoring Specification

## Overview

This document outlines refactoring opportunities for `MarketOverviewView.vue` (1,046 lines) with consideration for reuse with `ShopItemsView.vue` and `ShopManagerView.vue`. This spec builds upon the `shop-refactoring-spec.md` and identifies additional shared patterns.

## Current State Analysis

### File Sizes
- `MarketOverviewView.vue`: 1,046 lines
- `ShopItemsView.vue`: 1,493 lines
- `ShopManagerView.vue`: 890 lines

### Code Duplication Identified

#### Shared Utilities (High Priority)
- `formatDate()` function: Duplicated in MarketOverviewView, ShopItemsView, and other views
- `calculateProfitMargin()` function: Duplicated in MarketOverviewView and ShopItemsView
- `transformShopItemForTable()` function: Similar logic in both MarketOverviewView and ShopItemsView

#### View Settings (High Priority)
- View mode/layout toggle UI: Duplicated in MarketOverviewView and ShopItemsView
- localStorage view settings: Similar pattern in both views (already identified in shop-refactoring-spec.md)
- Sort settings: MarketOverviewView has additional sort settings logic

#### Table Templates (High Priority)
- BaseTable cell templates: ~200 lines duplicated between categories/list views in MarketOverviewView
- Similar cell templates exist in ShopItemsView with slight variations

#### Item Grouping Logic (Medium Priority)
- Grouping items by category: Similar logic in MarketOverviewView and ShopItemsView
- Category sorting: MarketOverviewView has category ordering logic

#### Back Button (Low Priority)
- Back button pattern: MarketOverviewView uses inline SVG, ShopItemsView uses BaseButton

## Refactoring Opportunities

### 1. Shared Utility Functions (High Priority)

**Problem**: `formatDate()`, `calculateProfitMargin()`, and related helpers are duplicated across multiple views.

**Solution**: Extract into shared utility files.

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
- Replace `formatDate()` in MarketOverviewView (line 276)
- Replace `formatDate()` in ShopItemsView (line 279)
- Update other views that use similar date formatting

**Files to Modify**:
- `src/utils/date.js` (new)
- `src/views/MarketOverviewView.vue` (replace line 276)
- `src/views/ShopItemsView.vue` (replace line 279)
- Other views that use date formatting

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
- Replace `calculateProfitMargin()` in MarketOverviewView (line 297)
- Replace `calculateProfitMargin()` in ShopItemsView (line 269)
- Use `formatPrice()` and `formatProfitMargin()` in table transformations

**Files to Modify**:
- `src/utils/pricing.js` (extend)
- `src/views/MarketOverviewView.vue` (replace line 297)
- `src/views/ShopItemsView.vue` (replace line 269)

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
- Replace `transformShopItemForTable()` in MarketOverviewView (line 305)
- Replace `transformShopItemForTable()` in ShopItemsView (line 300)
- Standardize table row structure across views

**Files to Modify**:
- `src/utils/tableTransform.js` (new)
- `src/views/MarketOverviewView.vue` (replace line 305)
- `src/views/ShopItemsView.vue` (replace line 300)

---

### 2. ViewModeLayoutToggle Component (High Priority)

**Problem**: View mode and layout toggle UI is duplicated in MarketOverviewView (lines 753-810) and ShopItemsView (lines 1007-1060).

**Solution**: Extract into a reusable component.

**Location**: `src/components/ViewModeLayoutToggle.vue`

**Props**:
```javascript
{
  viewMode: String, // 'categories' | 'list'
  layout: String, // 'comfortable' | 'condensed'
  showLabels: Boolean // Show "View as:" and "Layout:" labels
}
```

**Events**:
- `@update:viewMode` - Emits when view mode changes
- `@update:layout` - Emits when layout changes

**Features**:
- View mode toggle (Categories/List)
- Layout toggle (Comfortable/Compact)
- Consistent styling across views
- Optional labels for flexibility

**Template Structure**:
```vue
<template>
  <div class="flex flex-wrap items-center gap-6">
    <!-- View Mode -->
    <div>
      <span v-if="showLabels" class="text-sm font-medium text-gray-700 block">
        View as:
      </span>
      <div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden" :class="{ 'mt-1': showLabels }">
        <button
          @click="$emit('update:viewMode', 'categories')"
          :class="[...]">
          Categories
        </button>
        <button
          @click="$emit('update:viewMode', 'list')"
          :class="[...]">
          List
        </button>
      </div>
    </div>

    <!-- Layout -->
    <div>
      <span v-if="showLabels" class="text-sm font-medium text-gray-700 block">
        Layout:
      </span>
      <div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden" :class="{ 'mt-1': showLabels }">
        <button
          @click="$emit('update:layout', 'comfortable')"
          :class="[...]">
          Comfortable
        </button>
        <button
          @click="$emit('update:layout', 'condensed')"
          :class="[...]">
          Compact
        </button>
      </div>
    </div>
  </div>
</template>
```

**Usage**:
- Replace toggle UI in MarketOverviewView (lines 753-810)
- Replace toggle UI in ShopItemsView (lines 1007-1060)
- Use in other views that need view mode/layout controls

**Files to Modify**:
- `src/components/ViewModeLayoutToggle.vue` (new)
- `src/views/MarketOverviewView.vue` (replace lines 753-810)
- `src/views/ShopItemsView.vue` (replace lines 1007-1060)

---

### 3. MarketItemsTable Component (High Priority)

**Problem**: BaseTable templates are duplicated for categories/list views in MarketOverviewView (lines 815-1041). Similar duplication exists in ShopItemsView.

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
- `@sort` - Emits `{ field, direction }` when sorting changes

**Features**:
- Render BaseTable with proper cell templates
- Handle both category and list view modes
- Display stock status icons
- Support shop name navigation
- Reuse cell templates for both modes

**Cell Templates**:
- Item cell (with image)
- Shop cell (with avatar, clickable)
- Buy price cell (with out-of-stock icon)
- Sell price cell (with stock-full/out-of-money icons)
- Profit margin cell
- Last updated cell
- Notes cell (optional, for ShopItemsView)

**Implementation Notes**:
- Use scoped slots for cell templates
- Group items by category when `viewMode === 'categories'`
- Reuse same cell templates for both modes
- Handle shop navigation via `onShopClick` prop

**Files to Modify**:
- `src/components/MarketItemsTable.vue` (new)
- `src/views/MarketOverviewView.vue` (replace lines 812-1042)
- `src/views/ShopItemsView.vue` (can use same component with different props)

---

### 4. useViewSettings Composable Enhancement (High Priority)

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
  
  watch([viewMode, layout, sortField, sortDirection], () => {
    saveSettings()
  }, { deep: true })
  
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
- Replace view settings logic in MarketOverviewView (lines 425-463)
- Replace view settings logic in ShopItemsView (lines 339-363)
- Use in other views that need view settings

**Files to Modify**:
- `src/composables/useViewSettings.js` (enhance)
- `src/views/MarketOverviewView.vue` (replace lines 425-463)
- `src/views/ShopItemsView.vue` (replace lines 339-363)

---

### 5. useItemGrouping Composable (Medium Priority)

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
- Replace grouping logic in MarketOverviewView (lines 137-183, 342-363)
- Replace grouping logic in ShopItemsView (lines 188-230)
- Standardize category ordering

**Files to Modify**:
- `src/composables/useItemGrouping.js` (new)
- `src/views/MarketOverviewView.vue` (replace lines 137-183, 342-363)
- `src/views/ShopItemsView.vue` (replace lines 188-230)

---

### 6. BackButton Component (Low Priority)

**Problem**: Back button implementation varies between views (inline SVG vs BaseButton).

**Solution**: Check if `BackButton.vue` already exists and enhance if needed.

**Location**: `src/components/BackButton.vue` (check existing)

**Check**: Verify if `BackButton.vue` already exists and if it matches the pattern used in MarketOverviewView.

**If enhancement needed**:
- Support different variants (tertiary button vs link)
- Support custom routes
- Consistent styling

**Note**: Only enhance if there's inconsistency. If BaseButton is already used in ShopItemsView, consider standardizing MarketOverviewView to use it.

**Files to Modify**:
- `src/components/BackButton.vue` (if exists, enhance)
- `src/views/MarketOverviewView.vue` (standardize back button, lines 593-606)

---

### 7. MarketStats Component (Low Priority)

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

### Phase 1: Shared Utilities (Immediate Impact)
1. ✅ Create `src/utils/date.js` with `formatRelativeDate()`
2. ✅ Extend `src/utils/pricing.js` with pricing utilities
3. ✅ Create `src/utils/tableTransform.js` with transformation utilities
4. ✅ Update MarketOverviewView to use new utilities
5. ✅ Update ShopItemsView to use new utilities
6. ✅ Test all views still work correctly

### Phase 2: UI Components (High Impact)
1. ✅ Create `ViewModeLayoutToggle.vue` component
2. ✅ Create `MarketItemsTable.vue` component
3. ✅ Update MarketOverviewView to use new components
4. ✅ Update ShopItemsView to use new components (if applicable)
5. ✅ Test view mode switching and table display

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

### Shared Utilities
- [ ] Date formatting works correctly in all views
- [ ] Profit margin calculation is accurate
- [ ] Price formatting displays correctly
- [ ] Table transformation produces correct structure

### ViewModeLayoutToggle Component
- [ ] Toggle switches between view modes correctly
- [ ] Layout changes apply correctly
- [ ] Styling matches existing design
- [ ] Works in both MarketOverviewView and ShopItemsView

### MarketItemsTable Component
- [ ] Categories view displays correctly
- [ ] List view displays correctly
- [ ] Shop column displays and navigates correctly
- [ ] Stock status icons display correctly
- [ ] Sorting works correctly
- [ ] All cell templates render properly

### Composables
- [ ] View settings save/load correctly
- [ ] Sort settings save/load correctly
- [ ] Item grouping works correctly
- [ ] Category sorting matches price guide order

## Success Metrics

- [ ] Reduce `MarketOverviewView.vue` from 1,046 lines to <700 lines
- [ ] Eliminate ~150 lines of duplicated utility functions
- [ ] Eliminate ~200 lines of duplicated table templates
- [ ] Eliminate ~50 lines of duplicated view settings logic
- [ ] All existing tests pass
- [ ] No regression in functionality
- [ ] Improved code maintainability and reusability

## Cross-View Reuse Summary

### Shared Between MarketOverviewView and ShopItemsView
1. ✅ `formatRelativeDate()` utility
2. ✅ `calculateProfitMargin()` utility
3. ✅ `transformShopItemForTable()` utility
4. ✅ `ViewModeLayoutToggle` component
5. ✅ `MarketItemsTable` component (with different props)
6. ✅ `useViewSettings` composable
7. ✅ `useItemGrouping` composable

### Shared Between All Three Views
1. ✅ `ShopFormModal` component (from shop-refactoring-spec.md)
2. ✅ `useShopForm` composable (from shop-refactoring-spec.md)

## Migration Notes

### Breaking Changes
None expected - all refactoring is internal to the components.

### Backward Compatibility
- All existing functionality should remain unchanged
- All existing props and events should continue to work
- No changes to router or API calls
- localStorage keys remain the same for backward compatibility

### Performance Considerations
- Composable extraction should have minimal performance impact
- Component extraction may slightly improve performance due to better Vue reactivity boundaries
- Utility functions are pure functions with no performance impact

## Future Enhancements

1. **Virtual Scrolling**: Consider virtual scrolling for tables with many items
2. **Advanced Filtering**: Extract search/filter logic into composable
3. **Table Column Configuration**: Make table columns configurable via props
4. **TypeScript**: Consider migrating to TypeScript for better type safety
5. **Unit Tests**: Add unit tests for utility functions and composables

