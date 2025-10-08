# Crate Rewards View Separation Specification

## Overview

Split the monolithic `CrateRewardManagerView.vue` (2523 lines) into two focused components:

1. **CrateRewardManagerView.vue** - List/Dashboard view for managing multiple crate rewards
2. **CrateSingleView.vue** (new) - Detail view for managing a single crate reward's items

## Problem Statement

The current implementation has several issues:

-   **Size**: 2523 lines in a single component
-   **Complexity**: Handles two distinct UIs (list view and detail view)
-   **Validation Issues**: Difficult to validate if a crate ID exists when both views share the same component
-   **Maintainability**: Hard to navigate and modify features
-   **Routing**: Complex conditional rendering based on route params

## Goals

1. ✅ Separate concerns cleanly (list vs detail)
2. ✅ Implement proper 404 handling for invalid crate IDs
3. ✅ Reduce component size to manageable chunks (~500-800 lines each)
4. ✅ Maintain all existing functionality
5. ✅ Improve code maintainability and readability

---

## Component Breakdown

### CrateRewardManagerView.vue (List/Dashboard View)

**Purpose**: Display and manage the user's collection of crate rewards

**Responsibilities**:

-   Display list of all crate rewards (cards)
-   Create new crate rewards
-   Edit crate metadata (name, description, version)
-   Delete crate rewards
-   Navigate to individual crate detail views
-   Import YAML files (creates new crates from file)
-   Show item counts and total weights per crate

**What Stays**:

#### Data/State:

-   `crateRewards` - Collection of all user's crate rewards
-   `crateRewardsPending`, `crateRewardsError`
-   `allCrateRewardItems` - For calculating item counts
-   `crateItemCounts` - Computed counts per crate
-   `showCreateForm` - Create modal state
-   `showEditForm` - Edit metadata modal state
-   `showDeleteModal` - Delete confirmation modal
-   `showImportModal` - Import YAML modal
-   `showInfoModal` - Info/help modal
-   `crateForm` - Form data for create/edit
-   `createFormError`, `editFormError`, `importModalError`
-   `loading`, `error`
-   `importFile`, `importResult`, `isImporting`

#### Methods:

-   `createNewCrateReward()` - Creates new crate
-   `updateCrateRewardData()` - Updates crate metadata
-   `confirmDeleteCrateFromCard(crate)` - Delete from card
-   `executeDelete()` - Execute delete (when type === 'crate')
-   `startCreateCrate()` - Opens create modal
-   `startEditCrate()` - Opens edit modal (from card)
-   `startEditCrateFromCard(crate)` - Opens edit modal
-   `getCrateTotalWeight(crateId)` - Calculate weight for a crate
-   `importYamlFile()` - Import YAML functionality
-   `readFileContent(file)` - File reader helper
-   `closeImportModal()` - Close import modal

#### Template Sections:

-   Dashboard header with "New Crate" button
-   Info modal explaining the tool
-   Crate cards grid with:
    -   Crate name, description, version
    -   Item count and total weight
    -   Edit and Delete buttons
    -   Click to navigate to detail view
-   Create crate modal
-   Edit crate metadata modal
-   Delete crate confirmation modal
-   Import YAML modal

**Estimated Lines**: ~600-800 lines

---

### CrateSingleView.vue (Detail View - NEW)

**Purpose**: Manage items within a single crate reward

**Responsibilities**:

-   Display single crate's details and items
-   Add items to the crate
-   Edit existing items (quantity, weight, enchantments)
-   Delete items from the crate
-   Adjust item weights (increase/decrease)
-   Sort items by value/weight/chance
-   Search and filter available items
-   Export single crate to YAML
-   Copy reward list to clipboard
-   Simulate crate openings (test rewards)
-   Clear all items from crate
-   Validate crate existence (redirect if invalid)

**What Moves Here**:

#### Data/State:

-   `selectedCrateId` - ID from route params
-   `selectedCrate` - Single crate data (from `useCrateReward`)
-   `crateReward`, `crateRewardPending`, `crateRewardError`
-   `rewardItems`, `rewardItemsPending`, `rewardItemsError`
-   `showAddItemForm` - Add/edit item modal
-   `editingItem` - Item being edited
-   `itemForm` - Form data for items
-   `addItemFormError`
-   `searchQuery` - Item search
-   `highlightedIndex` - Keyboard navigation
-   `searchInput`, `dropdownContainer` - Refs
-   `editingWeightId`, `editingWeightValue`, `weightInputRefs` - Weight editing
-   `sortBy`, `sortDirection` - Sorting state
-   `simulationResults`, `isSimulating`, `showTestRewardsModal` - Simulation
-   `showEnchantmentModal`, `enchantmentForm` - Enchantments
-   `showDeleteModal`, `itemToDelete` - Delete confirmation
-   `showClearAllModal` - Clear all confirmation
-   `showYamlPreview` - YAML preview
-   `expandedReviewPanels` - Review panel state
-   `showCopyToast` - Copy feedback

#### Computed:

-   `currentVersion` - Version from crate
-   `totalValue` - Total crate value
-   `totalWeight` - Total weight
-   `sortedRewardItems` - Sorted items
-   `availableItems` - Items filtered by version
-   `filteredItems` - Search filtered
-   `itemsByCategory` - Grouped items
-   `flattenedItems` - Flattened for navigation
-   `selectedItem` - Currently selected item
-   `enchantmentItems` - Enchantment books

#### Methods:

-   `saveItem()` - Add or update item
-   `confirmRemoveItem(item)` - Delete confirmation
-   `executeDelete()` - Execute delete (when type === 'item')
-   `showClearAllConfirmation()` - Clear all modal
-   `clearAllRewards()` - Delete all items
-   `exportYaml()` - Export to YAML
-   `copyRewardList()` - Copy to clipboard
-   `startAddItem()` - Open add modal
-   `startEditItem(item)` - Open edit modal
-   `getItemById(id)` - Get item data
-   `getItemName(id)` - Get item name
-   `getItemValue(rewardItem)` - Calculate value
-   `getItemChance(rewardItem)` - Calculate chance
-   `startEditWeight(rewardItem)` - Start inline edit
-   `saveEditWeight()` - Save weight edit
-   `cancelEditWeight()` - Cancel weight edit
-   `increaseItemWeight(rewardItem)` - +10 weight
-   `decreaseItemWeight(rewardItem)` - -10 weight
-   `setSortBy(field)` - Set sort field
-   `simulateCrateOpen()` - Simulate one open
-   `testCrateRewards()` - Simulate multiple opens
-   `selectItem(item)` - Select from dropdown
-   `clearSelectedItem()` - Clear selection
-   `addEnchantment()` - Open enchantment modal
-   `removeEnchantment(ench)` - Remove enchantment
-   `saveEnchantment()` - Save enchantment
-   `onEnchantmentSelected()` - Enchantment selected
-   `cancelEnchantment()` - Cancel enchantment
-   `toggleReviewPanel(itemId)` - Expand/collapse review
-   `isReviewPanelExpanded(itemId)` - Check expanded
-   `getFormattedYamlForItem(item)` - Get YAML preview
-   `getEnchantmentDisplayName(id)` - Format enchantment name

#### Watchers:

-   Watch `route.params.id` to set `selectedCrateId`
-   **NEW**: Watch `[crateReward, crateRewardPending]` to redirect if crate doesn't exist

#### Template Sections:

-   Back button to dashboard
-   Crate header with name, description, version
-   Edit crate button
-   Stats cards (Total Value, Total Weight, Number of Items)
-   Action buttons (Add Item, Export YAML, Copy List, Test Rewards, Clear All)
-   Items table with:
    -   Item name, image, quantity
    -   Value, weight, chance %
    -   Inline weight editing
    -   Edit and delete buttons
    -   YAML preview (expandable)
-   Sorting controls
-   Add/Edit item modal with:
    -   Item search dropdown
    -   Quantity input
    -   Weight input
    -   Enchantments management
-   Enchantment modal
-   Test rewards modal (simulation results)
-   Delete item confirmation modal
-   Clear all confirmation modal

**Estimated Lines**: ~1400-1600 lines

---

## Router Configuration

### Current (router/index.js):

```javascript
{
	path: '/crate-rewards',
	name: 'crate-rewards',
	component: () => import('../views/CrateRewardManagerView.vue'),
	meta: {
		requiresAuth: true,
		requiresVerification: true,
		title: "Crate Rewards - verzion's economy price guide for Minecraft"
	}
},
{
	path: '/crate-rewards/:id',
	name: 'crate-reward-detail',
	component: () => import('../views/CrateRewardManagerView.vue'), // ❌ Same component
	meta: {
		requiresAuth: true,
		requiresVerification: true,
		title: "Crate Rewards - verzion's economy price guide for Minecraft"
	}
}
```

### New:

```javascript
{
	path: '/crate-rewards',
	name: 'crate-rewards',
	component: () => import('../views/CrateRewardManagerView.vue'),
	meta: {
		requiresAuth: true,
		requiresVerification: true,
		title: "Crate Rewards Manager - verzion's economy price guide for Minecraft"
	}
},
{
	path: '/crate-rewards/:id',
	name: 'crate-reward-detail',
	component: () => import('../views/CrateSingleView.vue'), // ✅ New component
	meta: {
		requiresAuth: true,
		requiresVerification: true,
		title: "Manage Crate Reward - verzion's economy price guide for Minecraft"
	}
}
```

---

## Validation & Error Handling

### CrateSingleView.vue - Invalid ID Handling

Add this watcher to redirect when crate doesn't exist:

```javascript
// Watch for crate data and redirect if not found
watch(
	[crateReward, crateRewardPending],
	([crate, pending]) => {
		// Only check after loading is complete
		if (!pending && route.params.id && !crate) {
			// Crate doesn't exist or user doesn't have access
			router.push('/crate-rewards')
		}
	},
	{ immediate: true }
)
```

This handles:

-   Non-existent crate IDs
-   Crates that belong to other users
-   Invalid/malformed IDs

---

## Shared Utilities (No Changes Needed)

The following utilities in `src/utils/crateRewards.js` will be used by both components:

-   `useCrateRewards(userId)` - Used by Manager view
-   `useCrateReward(crateId)` - Used by Single view
-   `useCrateRewardItems(crateId)` - Used by Single view
-   `createCrateReward()` - Used by Manager view
-   `updateCrateReward()` - Used by both views
-   `deleteCrateReward()` - Used by Manager view
-   `addCrateRewardItem()` - Used by Single view
-   `updateCrateRewardItem()` - Used by Single view
-   `deleteCrateRewardItem()` - Used by Single view
-   `calculateCrateRewardTotalValue()` - Used by Single view
-   `downloadCrateRewardYaml()` - Used by Single view
-   `formatRewardItemForYaml()` - Used by Single view
-   `importCrateRewardsFromYaml()` - Used by Manager view

---

## Implementation Steps

### Step 1: Create CrateSingleView.vue

-   Create new file `src/views/CrateSingleView.vue`
-   Copy all detail view logic from CrateRewardManagerView
-   Remove dashboard/list logic
-   Add validation watcher for invalid IDs

### Step 2: Update CrateRewardManagerView.vue

-   Remove all detail view logic
-   Remove template sections for detail view
-   Keep only dashboard/list view code
-   Remove route.params.id watcher
-   Remove selectedCrateId logic (no longer needed)

### Step 3: Update Router

-   Change `/crate-rewards/:id` route to use CrateSingleView component
-   Update route meta title

### Step 4: Test Navigation

-   Test creating new crate (should navigate to detail view)
-   Test clicking crate card (should navigate to detail view)
-   Test back button from detail (should go to list)
-   Test invalid crate ID (should redirect to list)
-   Test deleting crate from detail view (should redirect to list)

### Step 5: Test All Features

-   Create crate
-   Edit crate metadata
-   Delete crate
-   Add items to crate
-   Edit items
-   Delete items
-   Adjust weights
-   Sort items
-   Export YAML
-   Import YAML
-   Simulate rewards
-   Copy list

### Step 6: Update Navigation

-   Check SubNav or Nav components for any hardcoded routes
-   Ensure all internal links use proper route names

---

## Benefits

1. **Smaller Components**: ~700 lines (Manager) + ~1500 lines (Single) vs 2523 lines
2. **Clear Separation**: List management vs item management
3. **Better Routing**: Proper 404 handling for invalid crate IDs
4. **Easier Maintenance**: Find and modify features quickly
5. **Better Performance**: Only load data needed for current view
6. **Scalability**: Easier to add features to either view independently

---

## Risks & Mitigation

### Risk: Breaking existing functionality

**Mitigation**: Comprehensive testing of all features before deployment

### Risk: Navigation issues

**Mitigation**: Use route names consistently, test all navigation paths

### Risk: Data loading timing issues

**Mitigation**: Proper use of `pending` states and watchers

### Risk: Missing imports in new component

**Mitigation**: Carefully copy all necessary imports and utilities

---

## Success Criteria

-   ✅ All existing functionality works identically
-   ✅ Invalid crate IDs redirect to dashboard
-   ✅ Navigation between views is seamless
-   ✅ Both components are under 1600 lines
-   ✅ Code is more maintainable and readable
-   ✅ No performance regressions
-   ✅ All imports and exports work correctly

---

## Timeline Estimate

-   **Step 1**: Create CrateSingleView.vue - ~30 minutes
-   **Step 2**: Update CrateRewardManagerView.vue - ~20 minutes
-   **Step 3**: Update Router - ~5 minutes
-   **Step 4**: Test Navigation - ~15 minutes
-   **Step 5**: Test All Features - ~30 minutes
-   **Step 6**: Update Navigation - ~10 minutes

**Total**: ~2 hours

---

## Notes

-   Keep imports of icons, components, and utilities consistent
-   Maintain the same error handling patterns
-   Preserve all existing modal states and functionality
-   Keep the same styling classes and layout structure
-   Ensure authentication checks remain in place
