# CrateSingleView Refactoring Specification

## Overview

Refactor `CrateSingleView.vue` (currently 2,853 lines) by extracting reusable components, composables, and utilities to improve maintainability, testability, and code organization.

## Current State

- **File**: `src/views/CrateSingleView.vue`
- **Lines**: 2,853
- **Status**: Largest view file in the project
- **Complexity**: High - handles multiple concerns (display, editing, modals, calculations, simulations)

## Goals

1. Reduce main view file to under 1,500 lines
2. Extract reusable UI components
3. Create composables for complex logic
4. Move utility functions to dedicated files
5. Improve testability through separation of concerns
6. Maintain all existing functionality
7. Preserve current UX and styling

## Component Extraction Opportunities

### 1. CrateHeader Component
**Location**: Lines ~1617-1660  
**Purpose**: Display crate information and metadata  
**Extract**:
- Crate name with edit button
- Description
- Version, total value, reward count, created date
- Total weight display

**Props**:
- `crate` - Crate data object
- `totalValue` - Computed total value
- `totalWeight` - Computed total weight
- `rewardCount` - Number of rewards
- `onEdit` - Edit handler function

**Estimated Size**: ~80 lines

---

### 2. CrateActionButtons Component
**Location**: Lines ~1665-1701  
**Purpose**: Action buttons for crate operations  
**Extract**:
- Import YAML button
- Export YAML button
- Copy List button
- Test Rewards button

**Props**:
- `hasRewards` - Boolean for disabled states
- `onImport` - Import handler
- `onExport` - Export handler
- `onCopy` - Copy handler
- `onTest` - Test handler

**Estimated Size**: ~50 lines

---

### 3. ItemSortControls Component
**Location**: Lines ~1711-1796  
**Purpose**: Sorting controls for reward items  
**Extract**:
- Sort by value/weight/chance/none buttons
- Sort direction indicators
- Add Item button

**Props**:
- `sortBy` - Current sort field
- `sortDirection` - Current sort direction
- `onSortChange` - Sort change handler
- `onAddItem` - Add item handler

**Estimated Size**: ~100 lines

---

### 4. RewardItemRow Component
**Location**: Lines ~1814-2042  
**Purpose**: Display individual reward item with actions  
**Extract**:
- Item image and name display
- Value, weight, and chance display
- Inline weight editing controls
- Edit and delete buttons
- Multi-item reward indicator
- Commands display
- YAML preview toggle

**Props**:
- `rewardDoc` - Reward document data
- `itemData` - Item data from catalog
- `value` - Calculated value
- `chance` - Calculated chance percentage
- `totalWeight` - Total weight for chance calculation
- `currentVersion` - Minecraft version
- `canEdit` - Whether item can be edited
- `isEditingWeight` - Whether weight is being edited
- `editingWeightValue` - Current weight edit value
- `onEditWeight` - Start weight editing
- `onSaveWeight` - Save weight changes
- `onCancelWeight` - Cancel weight editing
- `onIncreaseWeight` - Increase weight by 10
- `onDecreaseWeight` - Decrease weight by 10
- `onEdit` - Edit item handler
- `onDelete` - Delete item handler
- `onToggleYamlPreview` - Toggle YAML preview

**Estimated Size**: ~200 lines

---

### 5. EditCrateModal Component
**Location**: Lines ~2080-2176  
**Purpose**: Modal for editing crate metadata  
**Extract**:
- Name input with validation
- Description textarea
- Version select
- Form validation and error display

**Props**:
- `isOpen` - Modal open state
- `crate` - Current crate data
- `enabledVersions` - Available versions
- `loading` - Loading state
- `error` - Error message
- `nameValidationError` - Name validation error
- `isCheckingName` - Name checking state
- `onClose` - Close handler
- `onSave` - Save handler

**Estimated Size**: ~120 lines

---

### 6. AddEditItemModal Component
**Location**: Lines ~2178-2600+  
**Purpose**: Complex modal for adding/editing reward items  
**Extract**:
- Item search with dropdown
- Selected item display
- Quantity input with stack size button
- Weight input
- Value source selection (catalog/custom)
- Custom value input
- Enchantments management
- Form validation

**Props**:
- `isOpen` - Modal open state
- `isEditing` - Whether editing existing item
- `itemForm` - Form data object
- `selectedItem` - Currently selected item
- `searchQuery` - Search query string
- `filteredItems` - Filtered items for dropdown
- `itemsByCategory` - Items grouped by category
- `highlightedIndex` - Keyboard navigation index
- `error` - Error message
- `allItems` - All available items
- `onClose` - Close handler
- `onSave` - Save handler
- `onItemSelect` - Item selection handler
- `onClearSelection` - Clear selection handler
- `onSetStackSize` - Set quantity to stack size
- `onAddEnchantment` - Add enchantment handler
- `onRemoveEnchantment` - Remove enchantment handler
- `onSearchInput` - Search input handler
- `onKeyDown` - Keyboard navigation handler

**Estimated Size**: ~350 lines

---

### 7. ItemSearchDropdown Component
**Location**: Lines ~2217-2258 (within AddEditItemModal)  
**Purpose**: Searchable item dropdown with categories  
**Extract**:
- Category headers
- Item list with images
- Keyboard navigation highlighting
- Click to select

**Props**:
- `itemsByCategory` - Items grouped by category
- `highlightedIndex` - Currently highlighted index
- `onItemSelect` - Item selection handler
- `getItemVisualIndex` - Function to get visual index

**Estimated Size**: ~80 lines

---

### 8. EnchantmentModal Component
**Location**: Lines ~2600+ (estimated)  
**Purpose**: Modal for selecting enchantments  
**Extract**:
- Enchantment search/selection
- Enchantment list display
- Add/remove functionality

**Props**:
- `isOpen` - Modal open state
- `enchantmentItems` - Available enchantment books
- `selectedEnchantments` - Currently selected enchantments
- `onClose` - Close handler
- `onAdd` - Add enchantment handler
- `onRemove` - Remove enchantment handler

**Estimated Size**: ~150 lines

---

### 9. DeleteConfirmationModal Component
**Location**: Lines ~2700+ (estimated)  
**Purpose**: Generic delete confirmation modal  
**Extract**:
- Confirmation message
- Item/crate name display
- Confirm and cancel buttons

**Props**:
- `isOpen` - Modal open state
- `type` - Type of deletion ('item', 'crate', 'all')
- `itemName` - Name of item being deleted
- `loading` - Loading state
- `onClose` - Close handler
- `onConfirm` - Confirm handler

**Estimated Size**: ~60 lines

---

### 10. TestRewardsModal Component
**Location**: Lines ~2750+ (estimated)  
**Purpose**: Display simulation results  
**Extract**:
- Simulation controls (number of opens)
- Results display
- Statistics summary

**Props**:
- `isOpen` - Modal open state
- `simulationResults` - Array of results
- `isSimulating` - Simulation in progress
- `onClose` - Close handler
- `onSimulate` - Run simulation handler
- `onClear` - Clear results handler

**Estimated Size**: ~150 lines

---

### 11. ImportYamlModal Component
**Location**: Lines ~2800+ (estimated)  
**Purpose**: YAML import functionality  
**Extract**:
- File input
- File validation
- Import results display
- Error handling

**Props**:
- `isOpen` - Modal open state
- `isImporting` - Import in progress
- `importResult` - Import result data
- `error` - Error message
- `onClose` - Close handler
- `onImport` - Import handler

**Estimated Size**: ~120 lines

---

## Composable Extraction Opportunities

### 1. useCrateRewardData Composable
**Location**: Lines ~162-185, ~188-204  
**Purpose**: Manage crate reward data and computed values  
**Extract**:
- `selectedCrateId` from route
- `crateReward`, `crateRewardPending`, `crateRewardError`
- `rewardDocuments`, `rewardItemsPending`, `rewardItemsError`
- `selectedCrate` computed
- `currentVersion` computed
- `totalValue` computed
- `totalWeight` computed
- Route watcher for crate ID changes

**Returns**:
```javascript
{
  selectedCrateId,
  crateReward,
  crateRewardPending,
  crateRewardError,
  rewardDocuments,
  rewardItemsPending,
  rewardItemsError,
  selectedCrate,
  currentVersion,
  totalValue,
  totalWeight
}
```

**Estimated Size**: ~100 lines

---

### 2. useItemSearch Composable
**Location**: Lines ~117-120, ~239-313, ~1094-1485  
**Purpose**: Item search and selection logic  
**Extract**:
- `searchQuery` state
- `highlightedIndex` state
- `searchInput` ref
- `dropdownContainer` ref
- `availableItems` computed
- `filteredItems` computed
- `itemsByCategory` computed
- `flattenedItems` computed
- `selectedItem` computed
- `selectItem()` function
- `clearSelectedItem()` function
- `handleSearchInput()` function
- `handleKeyDown()` function
- `getItemVisualIndex()` function

**Returns**:
```javascript
{
  searchQuery,
  highlightedIndex,
  searchInput,
  dropdownContainer,
  availableItems,
  filteredItems,
  itemsByCategory,
  flattenedItems,
  selectedItem,
  selectItem,
  clearSelectedItem,
  handleSearchInput,
  handleKeyDown,
  getItemVisualIndex
}
```

**Estimated Size**: ~200 lines

---

### 3. useRewardItemSorting Composable
**Location**: Lines ~128-129, ~207-238, ~1360-1371  
**Purpose**: Sorting logic for reward items  
**Extract**:
- `sortBy` state
- `sortDirection` state
- `sortedRewardDocuments` computed
- `setSortBy()` function

**Returns**:
```javascript
{
  sortBy,
  sortDirection,
  sortedRewardDocuments,
  setSortBy
}
```

**Estimated Size**: ~60 lines

---

### 4. useWeightEditing Composable
**Location**: Lines ~123-125, ~577-613  
**Purpose**: Inline weight editing logic  
**Extract**:
- `editingWeightId` state
- `editingWeightValue` state
- `weightInputRefs` ref object
- `startEditWeight()` function
- `saveWeight()` function
- `cancelEditWeight()` function
- `increaseRewardWeight()` function
- `decreaseRewardWeight()` function

**Returns**:
```javascript
{
  editingWeightId,
  editingWeightValue,
  weightInputRefs,
  startEditWeight,
  saveWeight,
  cancelEditWeight,
  increaseRewardWeight,
  decreaseRewardWeight
}
```

**Estimated Size**: ~120 lines

---

### 5. useCrateSimulation Composable
**Location**: Lines ~132-134, ~1372-1427  
**Purpose**: Crate opening simulation logic  
**Extract**:
- `simulationResults` state
- `isSimulating` state
- `showTestRewardsModal` state
- `simulateCrateOpen()` function
- `simulateMultipleOpens()` function
- `clearSimulationResults()` function

**Returns**:
```javascript
{
  simulationResults,
  isSimulating,
  showTestRewardsModal,
  simulateCrateOpen,
  simulateMultipleOpens,
  clearSimulationResults
}
```

**Estimated Size**: ~100 lines

---

### 6. useEnchantmentManagement Composable
**Location**: Lines ~137-140, ~1147-1181  
**Purpose**: Enchantment selection and management  
**Extract**:
- `showEnchantmentModal` state
- `enchantmentForm` state
- `enchantmentItems` computed
- `addEnchantment()` function
- `removeEnchantment()` function
- `saveEnchantment()` function
- `onEnchantmentSelected()` function
- `cancelEnchantment()` function

**Returns**:
```javascript
{
  showEnchantmentModal,
  enchantmentForm,
  enchantmentItems,
  addEnchantment,
  removeEnchantment,
  saveEnchantment,
  onEnchantmentSelected,
  cancelEnchantment
}
```

**Estimated Size**: ~80 lines

---

## Utility Function Extraction

### 1. Crate Reward Value Utilities
**Location**: Lines ~469-517  
**File**: `src/utils/crateRewardCalculations.js`  
**Extract**:
- `getRewardDocValue(rewardDoc, allItems, currentVersion)`
- `getRewardDocChance(rewardDoc, totalWeight)`
- `getValueDisplay(rewardDoc)`

**Estimated Size**: ~60 lines

---

### 2. Crate Reward Display Utilities
**Location**: Lines ~519-536, ~461-465, ~707-712  
**File**: `src/utils/crateRewardDisplay.js`  
**Extract**:
- `getDisplayItemImageFromDoc(rewardDoc, allItems)`
- `getItemName(itemId, rewardItem, allItems)`
- `isMultiItemReward(rewardDoc)`
- `canEditReward(rewardDoc)`
- `stripColorCodes(text)`

**Estimated Size**: ~50 lines

---

### 3. Enchantment Utilities
**Location**: Lines ~990-1091  
**File**: `src/utils/enchantments.js`  
**Extract**:
- `formatEnchantmentName(enchantmentId, allItems)`
- `extractEnchantmentsFromMaterialId(materialId)`
- `getEnchantmentIds(enchantments)`

**Estimated Size**: ~120 lines

---

### 4. YAML Utilities (Already Extracted)
**Location**: Already in `src/utils/crateRewards.js`  
**Status**: ✅ Already extracted  
**Functions**:
- `downloadCrateRewardYaml()`
- `formatRewardItemForYaml()`
- `importCrateRewardsFromYaml()`
- `validateYamlForMultipleItems()`

---

## Implementation Plan

### Phase 1: Utility Functions (Low Risk)
1. Extract value calculation utilities
2. Extract display utilities
3. Extract enchantment utilities
4. Update imports in CrateSingleView

**Estimated Reduction**: ~230 lines  
**Risk**: Low

---

### Phase 2: Composables (Medium Risk)
1. Extract `useCrateRewardData`
2. Extract `useItemSearch`
3. Extract `useRewardItemSorting`
4. Extract `useWeightEditing`
5. Extract `useCrateSimulation`
6. Extract `useEnchantmentManagement`
7. Update CrateSingleView to use composables

**Estimated Reduction**: ~660 lines  
**Risk**: Medium (requires careful testing)

---

### Phase 3: Simple Components (Medium Risk)
1. Extract `CrateHeader`
2. Extract `CrateActionButtons`
3. Extract `ItemSortControls`
4. Extract `DeleteConfirmationModal`
5. Update CrateSingleView to use components

**Estimated Reduction**: ~290 lines  
**Risk**: Medium

---

### Phase 4: Complex Components (High Risk)
1. Extract `RewardItemRow`
2. Extract `EditCrateModal`
3. Extract `ItemSearchDropdown`
4. Extract `AddEditItemModal`
5. Extract `EnchantmentModal`
6. Extract `TestRewardsModal`
7. Extract `ImportYamlModal`
8. Update CrateSingleView to use components

**Estimated Reduction**: ~1,070 lines  
**Risk**: High (complex interactions)

---

## Expected Results

### Before Refactoring
- **CrateSingleView.vue**: 2,853 lines

### After Refactoring
- **CrateSingleView.vue**: ~600 lines (estimated)
- **New Components**: ~1,400 lines (11 components)
- **New Composables**: ~660 lines (6 composables)
- **New Utilities**: ~230 lines (3 utility files)

### Benefits
1. **Maintainability**: Easier to locate and modify specific features
2. **Testability**: Components and composables can be tested in isolation
3. **Reusability**: Components can be reused in other views
4. **Readability**: Main view file focuses on orchestration
5. **Performance**: Smaller components can be optimized individually

---

## Testing Strategy

### Unit Tests
- Test each composable independently
- Test utility functions with various inputs
- Test component props and events

### Integration Tests
- Test component interactions
- Test data flow between composables
- Test modal open/close flows

### E2E Tests
- Test complete user flows (add item, edit item, delete item)
- Test sorting functionality
- Test import/export functionality
- Test simulation functionality

---

## Migration Notes

1. **Preserve Data Attributes**: Maintain all `data-cy` attributes for Cypress tests
2. **Maintain Styling**: Keep all Tailwind classes and styling consistent
3. **Error Handling**: Preserve all error handling patterns
4. **Loading States**: Maintain all loading state logic
5. **Validation**: Preserve all form validation logic

---

## Risks & Mitigation

### Risk: Breaking Existing Functionality
**Mitigation**: 
- Comprehensive testing at each phase
- Maintain feature parity
- Test all user flows

### Risk: Performance Regression
**Mitigation**:
- Monitor component render times
- Use Vue's reactivity efficiently
- Avoid unnecessary re-renders

### Risk: Increased Bundle Size
**Mitigation**:
- Use tree-shaking effectively
- Lazy load modals where possible
- Monitor bundle size changes

---

## Success Criteria

- [ ] CrateSingleView.vue reduced to under 1,500 lines
- [ ] All existing functionality preserved
- [ ] All Cypress tests pass
- [ ] No performance regressions
- [ ] All components properly typed (if using TypeScript)
- [ ] Code review approved
- [ ] Documentation updated

---

## Timeline Estimate

- **Phase 1**: 2-3 hours
- **Phase 2**: 4-6 hours
- **Phase 3**: 3-4 hours
- **Phase 4**: 6-8 hours
- **Testing**: 4-6 hours
- **Total**: 19-27 hours

---

## Future Enhancements

After refactoring, consider:
1. Adding TypeScript for better type safety
2. Creating a design system for shared components
3. Adding Storybook for component documentation
4. Implementing virtual scrolling for large item lists
5. Adding keyboard shortcuts for common actions
6. Creating a command palette for quick actions

---

_Generated: January 2025_

