# Shop View & Shop Manager Refactoring Specification

## Overview

This document outlines refactoring opportunities for `ShopItemsView.vue` and `ShopManagerView.vue` to reduce code duplication, improve maintainability, and enhance reusability.

## Status

### ✅ Completed
- **ShopFormModal Component** - Extracted shop form modal into reusable component
  - Created `src/components/ShopFormModal.vue` (323 lines)
  - Removed ~270 lines of duplicated code from both views
  - Updated both `ShopItemsView.vue` and `ShopManagerView.vue` to use the component
  - Supports both create and edit modes
  - Handles auto-focus, validation, error display, and loading states
  - Date: Completed

**Impact**: 
- `ShopItemsView.vue`: Reduced from 1,493 to ~1,223 lines (270 lines removed)
- `ShopManagerView.vue`: Reduced from 890 to ~737 lines (153 lines removed)
- Total: ~423 lines of code eliminated

### ⏳ Pending
- useShopForm Composable
- ShopItemsTable Component
- useInlineEditing Composable
- useViewSettings Composable
- Use existing ViewControls component (instead of duplicating toggle UI)
- Enchantment formatting utilities
- Item image URL helper
- Component Breakdown

## Current State Analysis

### File Sizes (Current State)
- `ShopItemsView.vue`: 1,847 lines (reduced from 1,493 after ShopFormModal extraction, but has grown)
- `ShopManagerView.vue`: ~737 lines (reduced from 890)

### Code Duplication
- ~~**Shop Form Modal**: ~150 lines duplicated between both views~~ ✅ **COMPLETED**
- **Shop Form State Management**: ~100 lines of similar logic
- **Table Templates**: ~200 lines duplicated for different view modes
- **View Mode/Layout Toggle UI**: ~60 lines duplicated (ViewControls.vue already exists but not used here)
- **Enchantment Formatting Functions**: ~50 lines duplicated across ShopItemsView, MarketOverviewView, and CrateSingleView
- **Item Image URL Logic**: ~15 lines duplicated between ShopItemsView and MarketOverviewView

## Refactoring Opportunities

### 1. ShopFormModal Component (High Priority) ✅ **COMPLETED**

**Problem**: The shop form modal is duplicated in both `ShopItemsView.vue` (lines 1303-1419) and `ShopManagerView.vue` (lines 623-775) with nearly identical code.

**Solution**: Extract into a reusable `ShopFormModal.vue` component.

**Status**: ✅ **COMPLETED**
- Component created at `src/components/ShopFormModal.vue`
- Supports both create and edit modes
- Handles auto-focus, validation, and error display
- Both views updated to use the component
- Removed ~270 lines of duplicated code

**Location**: `src/components/ShopFormModal.vue`

**Props**:
```javascript
{
  isOpen: Boolean,
  editingShop: Object | null,
  shopForm: Object, // Reactive form data
  loading: Boolean,
  errors: {
    name: String | null,
    player: String | null,
    server: String | null,
    create: String | null,
    edit: String | null
  },
  presetServerId: String | null, // For ShopManagerView context
  servers: Array, // Available servers for dropdown
  userProfile: Object | null // For own shop player name fallback
}
```

**Events**:
- `@submit` - Emits form data when submitted
- `@close` - Emits when modal should close
- `@update:shopForm` - Emits when form data changes

**Features**:
- Player name input (conditional on `is_own_shop`)
- Shop name input with "Use Player as Shop Name" checkbox
- Server selection dropdown (conditional on `presetServerId` and `editingShop`)
- Location input
- Description textarea
- Validation error display
- Loading states

**Implementation Notes**:
- Use `v-model` for `shopForm` prop with `@update:shopForm` event
- Handle auto-focus for first input field
- Support both create and edit modes
- Maintain existing validation logic

**Files to Modify**:
- `src/components/ShopFormModal.vue` (new)
- `src/views/ShopItemsView.vue` (replace lines 1303-1419)
- `src/views/ShopManagerView.vue` (replace lines 623-775)

---

### 2. useShopForm Composable (High Priority)

**Problem**: Shop form state management, validation, and helper functions are duplicated across both views.

**Solution**: Extract into a `useShopForm.js` composable.

**Location**: `src/composables/useShopForm.js`

**Exports**:
```javascript
export function useShopForm(initialShop = null, userProfile = null) {
  // Reactive state
  const shopForm = ref({...})
  const usePlayerAsShopName = ref(false)
  
  // Validation errors
  const errors = reactive({
    name: null,
    player: null,
    server: null,
    create: null,
    edit: null
  })
  
  // Methods
  function resetShopForm() {...}
  function initializeForm(shop) {...}
  function handleShopFundsInput(event) {...}
  function validateForm() {...}
  function getShopData() {...}
  
  // Watchers for "Use Player as Shop Name"
  watch(...)
  
  return {
    shopForm,
    usePlayerAsShopName,
    errors,
    resetShopForm,
    initializeForm,
    handleShopFundsInput,
    validateForm,
    getShopData
  }
}
```

**Features**:
- Initialize form from shop object
- Reset form to default state
- Handle funds input parsing
- Validate form fields
- Auto-sync shop name with player name when checkbox is checked
- Return cleaned form data for submission

**Usage Example**:
```javascript
const {
  shopForm,
  usePlayerAsShopName,
  errors,
  resetShopForm,
  initializeForm,
  validateForm,
  getShopData
} = useShopForm(editingShop.value, userProfile.value)
```

**Files to Modify**:
- `src/composables/useShopForm.js` (new)
- `src/views/ShopItemsView.vue` (replace shop form logic)
- `src/views/ShopManagerView.vue` (replace shop form logic)

---

### 3. ShopItemsTable Component (Medium Priority)

**Problem**: BaseTable template is duplicated for "categories" and "list" view modes in `ShopItemsView.vue` (lines 1067-1275). Only the data source differs.

**Solution**: Extract table cell templates into a reusable component or use computed properties to reduce duplication.

**Location**: `src/components/ShopItemsTable.vue`

**Props**:
```javascript
{
  items: Array, // Shop items with itemData
  columns: Array, // BaseTable column definitions
  layout: String, // 'comfortable' | 'condensed'
  viewMode: String, // 'categories' | 'list'
  editingPriceId: String | null,
  editingPriceType: String | null,
  savingPriceId: String | null,
  savingPriceType: String | null,
  editingNotesId: String | null,
  savingNotesId: String | null,
  showItemSavingSpinner: String | null,
  isShopOutOfMoney: Boolean
}
```

**Events**:
- `@edit-price` - Emits `{ itemId, priceType }`
- `@save-price` - Emits `{ row, priceType, newPrice }`
- `@cancel-price` - Emits when price edit cancelled
- `@edit-notes` - Emits `{ itemId }`
- `@save-notes` - Emits `{ row, newNotes }`
- `@cancel-notes` - Emits when notes edit cancelled
- `@edit-item` - Emits shop item object
- `@delete-item` - Emits shop item object

**Features**:
- Render BaseTable with proper cell templates
- Handle both category and list view modes
- Support inline price editing
- Support inline notes editing
- Display stock status icons
- Display saving spinners

**Implementation Notes**:
- Use scoped slots for cell templates
- Group items by category when `viewMode === 'categories'`
- Reuse same cell templates for both modes

**Files to Modify**:
- `src/components/ShopItemsTable.vue` (new)
- `src/views/ShopItemsView.vue` (replace lines 1064-1276)

---

### 4. useInlineEditing Composable (Medium Priority)

**Problem**: Complex inline editing state management in `ShopItemsView.vue` (lines 46-55, 669-760) is tightly coupled to the component.

**Solution**: Extract into a `useInlineEditing.js` composable.

**Location**: `src/composables/useInlineEditing.js`

**Exports**:
```javascript
export function useInlineEditing() {
  // Price editing state
  const editingPriceId = ref(null)
  const editingPriceType = ref(null) // 'buy' | 'sell'
  const savingPriceId = ref(null)
  const savingPriceType = ref(null)
  
  // Notes editing state
  const editingNotesId = ref(null)
  const savingNotesId = ref(null)
  
  // Item saving state
  const savingItemId = ref(null)
  const showItemSavingSpinner = ref(null)
  let itemSavingTimeout = null
  
  // Methods
  function startEditPrice(itemId, priceType) {...}
  function cancelEditPrice() {...}
  function setSavingPrice(itemId, priceType) {...}
  function clearSavingPrice() {...}
  
  function startEditNotes(itemId) {...}
  function cancelEditNotes() {...}
  function setSavingNotes(itemId) {...}
  function clearSavingNotes() {...}
  
  function setSavingItem(itemId) {...}
  function clearSavingItem() {...}
  
  // Cleanup
  onUnmounted(() => {
    if (itemSavingTimeout) {
      clearTimeout(itemSavingTimeout)
    }
  })
  
  return {
    // State
    editingPriceId,
    editingPriceType,
    savingPriceId,
    savingPriceType,
    editingNotesId,
    savingNotesId,
    savingItemId,
    showItemSavingSpinner,
    // Methods
    startEditPrice,
    cancelEditPrice,
    setSavingPrice,
    clearSavingPrice,
    startEditNotes,
    cancelEditNotes,
    setSavingNotes,
    clearSavingNotes,
    setSavingItem,
    clearSavingItem
  }
}
```

**Features**:
- Manage price editing state
- Manage notes editing state
- Manage item saving state with spinner delay
- Clean up timeouts on unmount

**Files to Modify**:
- `src/composables/useInlineEditing.js` (new)
- `src/views/ShopItemsView.vue` (replace inline editing logic)

---

### 5. Use Existing ViewControls Component (High Priority)

**Problem**: View mode and layout toggle UI is duplicated in `ShopItemsView.vue` (lines 1216-1274) even though `ViewControls.vue` already exists and is used in `HomeView.vue`.

**Solution**: Replace inline toggle UI with existing `ViewControls.vue` component.

**Location**: `src/components/ViewControls.vue` (already exists)

**Current Usage**: 
- `HomeView.vue` already uses `ViewControls.vue` (lines 388-392)

**Enhancements Needed**:
- Add optional `data-cy` attributes for testing
- Support optional label color variant (currently uses `text-heavy-metal`, MarketOverviewView uses `text-gray-700`)
- Support optional hover color variant (currently uses `hover:bg-gray-100`, MarketOverviewView uses `hover:bg-sea-mist`)

**Files to Modify**:
- `src/components/ViewControls.vue` (enhance with optional props for styling variants and data-cy)
- `src/views/ShopItemsView.vue` (replace lines 1216-1274 with ViewControls component)
- `src/views/MarketOverviewView.vue` (replace lines 1044-1107 with ViewControls component)

**Impact**: 
- Remove ~60 lines of duplicated code from ShopItemsView
- Remove ~60 lines of duplicated code from MarketOverviewView
- Standardize UI across HomeView, ShopItemsView, and MarketOverviewView

---

### 6. Enchantment Formatting Utilities (Medium Priority)

**Problem**: Enchantment formatting functions are duplicated across multiple views:
- `formatEnchantmentName()` - `ShopItemsView.vue` (lines 282-329), `MarketOverviewView.vue` (lines 178-225), `CrateSingleView.vue` (line 990)
- `formatEnchantmentsForTitle()` - `ShopItemsView.vue` (lines 332-335), `MarketOverviewView.vue` (lines 228-231)

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
  // ... existing logic from ShopItemsView/MarketOverviewView
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
- `src/views/ShopItemsView.vue` (replace lines 282-335)
- `src/views/MarketOverviewView.vue` (replace lines 178-231)
- `src/views/CrateSingleView.vue` (replace line 990)

**Impact**: 
- Remove ~50 lines of duplicated code
- Standardize enchantment formatting across all views

---

### 7. Item Image URL Helper (Medium Priority)

**Problem**: `getItemImageUrl()` function is duplicated in `ShopItemsView.vue` (lines 268-279) and `MarketOverviewView.vue` (lines 164-175).

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
- `src/views/ShopItemsView.vue` (replace lines 268-279)
- `src/views/MarketOverviewView.vue` (replace lines 164-175)

**Impact**: 
- Remove ~15 lines of duplicated code
- Centralize image URL logic

---

### 8. useViewSettings Composable (Low Priority)

**Problem**: View settings localStorage logic in `ShopItemsView.vue` (lines 474-505) could be reused elsewhere.

**Solution**: Extract into a `useViewSettings.js` composable.

**Location**: `src/composables/useViewSettings.js`

**Exports**:
```javascript
export function useViewSettings(keyPrefix, defaults = {}) {
  const viewMode = ref(defaults.viewMode || 'categories')
  const layout = ref(defaults.layout || 'comfortable')
  
  function loadSettings() {
    try {
      const savedViewMode = localStorage.getItem(`${keyPrefix}ViewMode`)
      const savedLayout = localStorage.getItem(`${keyPrefix}Layout`)
      
      if (savedViewMode && ['categories', 'list'].includes(savedViewMode)) {
        viewMode.value = savedViewMode
      }
      
      if (savedLayout && ['comfortable', 'condensed'].includes(savedLayout)) {
        layout.value = savedLayout
      }
    } catch (error) {
      console.warn('Error loading view settings:', error)
    }
  }
  
  function saveSettings() {
    try {
      localStorage.setItem(`${keyPrefix}ViewMode`, viewMode.value)
      localStorage.setItem(`${keyPrefix}Layout`, layout.value)
    } catch (error) {
      console.warn('Error saving view settings:', error)
    }
  }
  
  watch([viewMode, layout], () => {
    saveSettings()
  }, { deep: true })
  
  onMounted(() => {
    loadSettings()
  })
  
  return {
    viewMode,
    layout,
    loadSettings,
    saveSettings
  }
}
```

**Usage Example**:
```javascript
const { viewMode, layout } = useViewSettings('shopItems', {
  viewMode: 'categories',
  layout: 'comfortable'
})
```

**Files to Modify**:
- `src/composables/useViewSettings.js` (new)
- `src/views/ShopItemsView.vue` (replace lines 474-505)

---

### 9. Component Breakdown (Low Priority)

**Problem**: `ShopItemsView.vue` is 1,493 lines and handles multiple concerns.

**Solution**: Break down into smaller, focused components.

**New Components**:

#### ShopHeader.vue
**Location**: `src/components/ShopHeader.vue`

**Props**:
```javascript
{
  shop: Object,
  server: Object,
  servers: Array
}
```

**Features**:
- Display shop name with edit button
- Display player avatar and name
- Display shop description
- Display shop metadata (server, version, location, created date)

**Replaces**: `ShopItemsView.vue` lines 877-920

---

#### ShopItemActions.vue
**Location**: `src/components/ShopItemActions.vue`

**Props**:
```javascript
{
  shop: Object,
  server: Object,
  hasItems: Boolean
}
```

**Features**:
- "Out of Money" checkbox (for player shops)
- "Add Item" button
- "Market Overview" link button

**Replaces**: `ShopItemsView.vue` lines 963-1000

---

## Implementation Plan

### Phase 1: High Priority (Immediate Impact)
1. ✅ **COMPLETED** - Create `ShopFormModal.vue` component
2. ✅ **COMPLETED** - Refactor `ShopItemsView.vue` to use new component
3. ✅ **COMPLETED** - Refactor `ShopManagerView.vue` to use new component
4. ✅ **COMPLETED** - Test shop creation and editing flows
5. ⏳ Create `useShopForm.js` composable (deferred - component works without it)

### Phase 2: Medium Priority (Code Quality & Utilities)
1. ⏳ Enhance existing `ViewControls.vue` component with optional props
2. ⏳ Create `enchantments.js` utility file
3. ⏳ Extend `image.js` with `getItemImageUrl()` helper
4. ⏳ Update ShopItemsView to use ViewControls and utilities
5. ⏳ Create `ShopItemsTable.vue` component
6. ⏳ Create `useInlineEditing.js` composable
7. ⏳ Refactor `ShopItemsView.vue` to use new components
8. ⏳ Test inline editing functionality

### Phase 3: Low Priority (Polish)
1. ⏳ Create `useViewSettings.js` composable
2. ⏳ Create `ShopHeader.vue` component
3. ⏳ Create `ShopItemActions.vue` component
4. ⏳ Final refactoring of `ShopItemsView.vue`

## Testing Checklist

### Shop Form Modal ✅ **COMPLETED & TESTED**
- [x] ✅ Create new shop from ShopManagerView
- [x] ✅ Edit shop from ShopManagerView
- [x] ✅ Edit shop from ShopItemsView
- [x] ✅ Validation errors display correctly
- [x] ✅ "Use Player as Shop Name" checkbox works
- [x] ✅ Form resets correctly on cancel
- [x] ✅ Loading states work correctly

### Shop Form Composable
- [ ] Form initializes correctly from shop object
- [ ] Form resets to default state
- [ ] Validation works correctly
- [ ] Player name syncs with shop name when checkbox checked

### ViewControls Component
- [ ] Component enhanced with optional props (data-cy, label color, hover color)
- [ ] Toggle switches between view modes correctly
- [ ] Layout changes apply correctly
- [ ] Works in ShopItemsView, MarketOverviewView, and HomeView

### Enchantment Formatting Utilities
- [ ] formatEnchantmentName works correctly in all views
- [ ] formatEnchantmentsForTitle works correctly
- [ ] All views updated to use shared utilities

### Item Image URL Helper
- [ ] getItemImageUrl works correctly with and without enchantments
- [ ] All views updated to use shared helper

### Shop Items Table
- [ ] Categories view displays correctly
- [ ] List view displays correctly
- [ ] Inline price editing works
- [ ] Inline notes editing works
- [ ] Stock status icons display correctly
- [ ] Saving spinners display correctly

### Inline Editing Composable
- [ ] Price editing state management works
- [ ] Notes editing state management works
- [ ] Saving state with spinner delay works
- [ ] Timeouts cleaned up on unmount

## Migration Notes

### Breaking Changes
None expected - all refactoring is internal to the components.

### Backward Compatibility
- All existing functionality should remain unchanged
- All existing props and events should continue to work
- No changes to router or API calls

### Performance Considerations
- Composable extraction should have minimal performance impact
- Component extraction may slightly improve performance due to better Vue reactivity boundaries
- No additional re-renders expected

## Success Metrics

- [x] ✅ Reduce `ShopItemsView.vue` from 1,493 lines (270 lines removed via ShopFormModal, but currently at 1,847 lines)
- [x] ✅ Reduce `ShopManagerView.vue` from 890 lines to ~737 lines (153 lines removed)
- [x] ✅ Eliminate ~270 lines of duplicated shop form code
- [ ] Eliminate ~60 lines of duplicated toggle UI (pending - use ViewControls)
- [ ] Eliminate ~50 lines of duplicated enchantment formatting (pending)
- [ ] Eliminate ~15 lines of duplicated image URL logic (pending)
- [ ] Eliminate ~200 lines of duplicated table template code (pending)
- [x] ✅ All existing tests pass
- [x] ✅ No regression in functionality
- [x] ✅ Improved code maintainability and readability

## Future Enhancements

1. **Shop Form Validation**: Consider using a validation library (e.g., VeeValidate) for more robust validation
2. **Table Performance**: Consider virtual scrolling for shops with many items
3. **State Management**: Consider Pinia store for shop-related state if it grows more complex
4. **TypeScript**: Consider migrating to TypeScript for better type safety

