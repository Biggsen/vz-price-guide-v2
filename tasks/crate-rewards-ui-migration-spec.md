# Crate Rewards UI Migration Specification

## Overview

This specification outlines the migration from the current flattened `rewardItems` approach to a document-based `rewardDocuments` approach in the Crate Rewards UI. This change will improve performance, simplify the codebase, and provide better support for multi-item rewards.

## Current State

### Current Architecture (Flattened)

-   **Data Source**: `rewardItems` (flattened from `rewardDocuments`)
-   **Display**: One row per item (even for multi-item rewards)
-   **Structure**: Artificial flattening creates duplicate root data
-   **Performance**: Higher memory usage, more DOM elements
-   **Complexity**: Composite IDs, flattening/unflattening logic

### Target Architecture (Document-Based)

-   **Data Source**: `rewardDocuments` (original Firestore documents)
-   **Display**: One row per reward (natural grouping)
-   **Structure**: Direct document structure, no flattening
-   **Performance**: Lower memory usage, fewer DOM elements
-   **Complexity**: Simplified logic, no composite IDs

## Benefits

1. **Performance Improvements**

    - Reduced memory usage (no data duplication)
    - Fewer DOM elements to render
    - Simpler data flow

2. **Better User Experience**

    - Multi-item rewards display as cohesive units
    - Clear visual distinction between single and multi-item rewards
    - Proper representation of reward structure

3. **Code Maintainability**

    - Eliminates flattening complexity
    - Removes composite ID logic
    - UI matches database structure

4. **Feature Completeness**
    - Proper multi-item reward support
    - Clear editing permissions (single vs multi-item)
    - Better import/export workflow

## Migration Tasks

### Phase 1: Foundation Functions

#### Task 1.1: Create Document Helper Functions

**File**: `src/views/CrateSingleView.vue`

**Functions to Add**:

```javascript
// Value calculation for entire reward
function getRewardDocValue(rewardDoc)

// Chance calculation for reward
function getRewardDocChance(rewardDoc)

// Display image from document
function getDisplayItemImageFromDoc(rewardDoc)

// Multi-item detection
function isMultiItemReward(rewardDoc)

// Edit permission check
function canEditReward(rewardDoc)
```

**Acceptance Criteria**:

-   [ ] Functions handle both single and multi-item rewards
-   [ ] Value calculation sums all items correctly
-   [ ] Uses items' enchantments for value (not display_enchantments)
-   [ ] Proper null/undefined handling

#### Task 1.2: Create Document Update Functions

**File**: `src/views/CrateSingleView.vue`

**Functions to Add**:

```javascript
// Direct document update (no composite ID hack)
async function updateRewardDocument(rewardDoc, updates)

// Weight adjustment functions
async function increaseRewardWeight(rewardDoc)
async function decreaseRewardWeight(rewardDoc)

// Weight editing functions
function startEditWeight(rewardDoc)
async function saveWeight(rewardDoc)
function cancelEditWeight()
```

**Acceptance Criteria**:

-   [ ] Direct document updates without composite IDs
-   [ ] Proper error handling and user feedback
-   [ ] Weight validation (1-1000 range)
-   [ ] Real-time UI updates

### Phase 2: Computed Properties Migration

#### Task 2.1: Replace sortedRewardItems

**File**: `src/views/CrateSingleView.vue`

**Changes**:

-   Replace `sortedRewardItems` computed with `sortedRewardDocuments`
-   Update sorting logic to work with documents
-   Maintain all existing sort options (value, weight, chance, none)

**Acceptance Criteria**:

-   [ ] Sorting works for all document types
-   [ ] Multi-item rewards sort by total document value
-   [ ] Sort direction (asc/desc) preserved
-   [ ] Performance equivalent or better

#### Task 2.2: Update Aggregate Computed Properties

**File**: `src/views/CrateSingleView.vue`

**Changes**:

-   Update `totalWeight` to use `rewardDocuments`
-   Update `totalValue` to use `rewardDocuments`
-   Remove dependency on flattened data

**Acceptance Criteria**:

-   [ ] Total weight calculated correctly
-   [ ] Total value calculated correctly
-   [ ] Real-time updates when documents change
-   [ ] No performance regression

### Phase 3: Template Migration

#### Task 3.1: Update v-for Loop

**File**: `src/views/CrateSingleView.vue`

**Changes**:

-   Change `v-for="rewardItem in sortedRewardItems"` to `v-for="rewardDoc in sortedRewardDocuments"`
-   Update all template references from `rewardItem` to `rewardDoc`

**Acceptance Criteria**:

-   [ ] Template renders without errors
-   [ ] All data displays correctly
-   [ ] No broken references

#### Task 3.2: Update Display Logic

**File**: `src/views/CrateSingleView.vue`

**Changes**:

-   Update image display to use `getDisplayItemImageFromDoc(rewardDoc)`
-   Update name display to use `rewardDoc.display_name`
-   Update value display to use `getRewardDocValue(rewardDoc)`
-   Update chance display to use `getRewardDocChance(rewardDoc)`
-   Update enchantment tags to use `rewardDoc.display_enchantments`

**Acceptance Criteria**:

-   [ ] Single-item rewards display correctly
-   [ ] Multi-item rewards show "Contains X items" section
-   [ ] Enchantment tags display from root data
-   [ ] Commands display correctly

#### Task 3.3: Add Multi-Item UI Elements

**File**: `src/views/CrateSingleView.vue`

**Changes**:

-   Add multi-item indicator badge
-   Add items list section for multi-item rewards
-   Add conditional edit button (disabled for multi-item)
-   Update weight controls to use document functions

**Acceptance Criteria**:

-   [ ] Multi-item indicator shows for complex rewards
-   [ ] Items list shows all items in multi-item rewards
-   [ ] Edit button disabled with tooltip for multi-item
-   [ ] Weight controls work for all reward types

### Phase 4: Function Reference Updates

#### Task 4.1: Update All Function Calls

**File**: `src/views/CrateSingleView.vue`

**Changes**:

-   Replace all `getItemValue()` calls with `getRewardDocValue()`
-   Replace all `getItemChance()` calls with `getRewardDocChance()`
-   Replace all `getDisplayItemImage()` calls with `getDisplayItemImageFromDoc()`
-   Replace all weight adjustment function calls

**Acceptance Criteria**:

-   [ ] No broken function references
-   [ ] All UI interactions work correctly
-   [ ] Error handling preserved

#### Task 4.2: Update Simulation Functions

**File**: `src/views/CrateSingleView.vue`

**Changes**:

-   Update `simulateCrateOpen()` to work with documents
-   Update `simulateMultipleOpens()` to work with documents
-   Update simulation results display

**Acceptance Criteria**:

-   [ ] Simulation works with document structure
-   [ ] Results display correctly
-   [ ] Performance maintained

### Phase 5: Edit Functionality

#### Task 5.1: Create Document Edit Functions

**File**: `src/views/CrateSingleView.vue`

**Functions to Add**:

```javascript
function startEditReward(rewardDoc)
function confirmRemoveReward(rewardDoc)
```

**Acceptance Criteria**:

-   [ ] Single-item rewards fully editable
-   [ ] Multi-item rewards show appropriate restrictions
-   [ ] Form populates correctly from document data
-   [ ] Delete confirmation works for all types

#### Task 5.2: Update Save Logic

**File**: `src/views/CrateSingleView.vue`

**Changes**:

-   Update save logic to work with document structure
-   Handle both root property updates and item updates
-   Remove composite ID dependencies

**Acceptance Criteria**:

-   [ ] Single-item rewards save correctly
-   [ ] Root properties update properly
-   [ ] No composite ID hacks required
-   [ ] Error handling preserved

### Phase 6: Cleanup

#### Task 6.1: Remove Unused Functions

**File**: `src/views/CrateSingleView.vue`

**Functions to Remove**:

```javascript
// Remove these flattened-based functions:
;-getItemValue() -
	getItemChance() -
	getDisplayItemImage() -
	increaseItemWeight() -
	decreaseItemWeight() -
	startEditItem() -
	confirmRemoveItem()
```

**Acceptance Criteria**:

-   [ ] No unused function warnings
-   [ ] Code is cleaner and more maintainable
-   [ ] No dead code

#### Task 6.2: Remove Flattening Logic

**File**: `src/utils/crateRewards.js`

**Changes**:

-   Remove `flattenRewardItems()` function
-   Update `useCrateRewardItems()` to only return documents
-   Remove flattened data from return object

**Acceptance Criteria**:

-   [ ] No flattening logic remains
-   [ ] Database queries optimized
-   [ ] Memory usage reduced

## Data Structure Changes

### Before (Flattened)

```javascript
// For a reward with 2 items, creates 2 flattened entries:
;[
	{
		id: 'rewardDoc123_0', // Composite ID
		item_id: 'diamond_sword_id', // From items[0]
		quantity: 1, // From items[0]
		enchantments: ['sharp5_id'], // From items[0]
		weight: 50, // From root (duplicated)
		display_name: '<white>Starter Kit', // From root (duplicated)
		display_item: 'chest_item_id' // From root (duplicated)
		// ... all root data duplicated
	},
	{
		id: 'rewardDoc123_1', // Composite ID
		item_id: 'iron_helmet_id', // From items[1]
		quantity: 1, // From items[1]
		enchantments: [], // From items[1]
		weight: 50, // From root (SAME - duplicated)
		display_name: '<white>Starter Kit' // From root (SAME - duplicated)
		// ... all root data duplicated again
	}
]
```

### After (Document-Based)

```javascript
// Single document represents the entire reward:
{
  id: "rewardDoc123",
  display_name: "<white>Starter Kit",
  display_item: "chest_item_id",
  display_enchantments: ["looting_3_id"],
  weight: 50,
  commands: ["/give {player} diamond"],
  items: [
    {
      item_id: "diamond_sword_id",
      quantity: 1,
      enchantments: ["sharpness_5_id"]
    },
    {
      item_id: "iron_helmet_id",
      quantity: 1,
      enchantments: []
    }
  ]
}
```

## UI Display Changes

### Single-Item Reward Display

```
┌─────────────────────────────────────────────────────┐
│ [Sword Icon] 4x Diamond Sword                      │
│              [SHARPNESS V] [UNBREAKING III]         │
│                                                     │
│ Value: 145     Weight: 50 [-][50][+]    Chance: 5% │
│                                                     │
│ Commands: /give {player} diamond                    │
│                                              [Edit] [Delete] │
└─────────────────────────────────────────────────────┘
```

### Multi-Item Reward Display

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ Multi-item reward (imported from YAML, read-only) │
│ [Chest Icon] Starter Kit                            │
│                                                     │
│ Value: 145     Weight: 50 [-][50][+]    Chance: 5% │
│                                                     │
│ Contains 3 items:                                   │
│   • 4× Coal                                         │
│   • 1× Diamond Sword                                │
│   • 16× Bread                                       │
│                                                     │
│ Commands: /give {player} diamond                    │
│                                              [❌] [Delete] │
└─────────────────────────────────────────────────────┘
```

## Testing Requirements

### Functional Testing

-   [ ] Single-item rewards display correctly
-   [ ] Multi-item rewards display with items list
-   [ ] Enchantment tags show from root data
-   [ ] Value calculation accurate for all types
-   [ ] Weight editing works for all rewards
-   [ ] Edit button behavior correct
-   [ ] Delete functionality works
-   [ ] Sorting works for all criteria
-   [ ] Simulation works with documents

### Performance Testing

-   [ ] Page load time improved or maintained
-   [ ] Memory usage reduced
-   [ ] DOM rendering performance maintained
-   [ ] Database query performance maintained

### Edge Case Testing

-   [ ] Rewards with no items
-   [ ] Rewards with no display_enchantments
-   [ ] Rewards with empty commands/messages
-   [ ] Large numbers of rewards
-   [ ] Rapid weight adjustments

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback**: Revert to previous commit
2. **Partial Rollback**: Keep new functions, revert template changes
3. **Data Integrity**: Ensure no data corruption during updates
4. **User Impact**: Minimize disruption to existing workflows

## Success Criteria

### Primary Goals

-   [ ] UI displays rewards as cohesive units
-   [ ] Multi-item rewards properly represented
-   [ ] Performance improved or maintained
-   [ ] Code complexity reduced

### Secondary Goals

-   [ ] Better user experience for complex rewards
-   [ ] Cleaner codebase for future development
-   [ ] Proper separation of display vs items data
-   [ ] Foundation for future enhancements

## Timeline Estimate

-   **Phase 1**: 1 hour (Foundation functions)
-   **Phase 2**: 30 minutes (Computed properties)
-   **Phase 3**: 1.5 hours (Template migration)
-   **Phase 4**: 30 minutes (Function references)
-   **Phase 5**: 1 hour (Edit functionality)
-   **Phase 6**: 30 minutes (Cleanup)

**Total Estimated Time**: 5 hours

## Dependencies

-   Existing `rewardDocuments` data structure
-   Current `useCrateRewardItems()` function
-   Template structure in `CrateSingleView.vue`
-   Database update functions in `crateRewards.js`

## Related Files

-   `src/views/CrateSingleView.vue` - Main UI component
-   `src/utils/crateRewards.js` - Data management functions
-   `docs/crazycrates-data-transformation-specs.md` - Data structure documentation
-   `tasks/crate-reward-structure-migration-spec.md` - Database structure changes

## Notes

-   This migration maintains backward compatibility with existing data
-   No database schema changes required
-   Import/export functionality preserved
-   All existing features maintained with improved UX
