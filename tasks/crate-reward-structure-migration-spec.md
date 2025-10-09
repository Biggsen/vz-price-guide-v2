# Crate Reward Structure Migration Specification

## Overview

Migrate the crate reward items from the current single-item-per-document structure to a new unified structure that supports both single and multiple items per reward. This enables better compatibility with Crazy Crates YAML imports while maintaining a simple editing experience for single items.

## Problem Statement

### Current Structure (Old)

```javascript
// Collection: 'crate_reward_items'
// Each document represents a single item
{
  id: "test-crate-item-1",
  crate_reward_id: "test-crate-1",
  item_id: "XVCyPYaBBsdifkVvJjJe",
  quantity: 1,
  weight: 25,
  display_name: "",
  display_item: "diamond",
  display_amount: 1,
  custom_model_data: -1,
  enchantments: {},
  created_at: "2025-09-19T10:30:00...",
  updated_at: "2025-09-19T10:30:00..."
}
```

### Target Structure (New)

```javascript
// Collection: 'crate_reward_items'
// Each document can contain multiple items
{
  id: "eFDvjv0RfFfEUkbI9RAb",
  crate_reward_id: "test-crate-1",
  weight: 15,
  display_name: "<red>Diamond Sword",
  display_item: "RGhRyLF0itVnvfTEzMXx",
  display_amount: 1,
  display_enchantments: {FAolooXwUfooppFZFmCO: 5},
  custom_model_data: -1,
  import_source: "yaml_parser", // Optional: indicates imported item
  import_timestamp: "2025-10-09T13:01:03.393Z", // Optional
  original_yaml_key: "2", // Optional: original prize ID from YAML
  items: [
    {
      item_id: "RGhRyLF0itVnvfTEzMXx",
      quantity: 1,
      enchantments: {looting: 3, sharpness: 5},
      catalog_item: true,
      matched: true,
      name: "<red>Diamond Sword"
    }
  ],
  created_at: "2025-10-09T13:01:03.393Z",
  updated_at: "2025-10-09T13:01:03.393Z"
}
```

## Goals

1. **Unified Data Structure**: All crate rewards use the same `items: []` structure
2. **Backward Compatibility**: Existing single-item rewards continue to work
3. **Import Flexibility**: Support complex YAML imports with multiple items per reward
4. **Simple Editing**: Manual item addition remains simple (single item per reward)
5. **Future-Proof**: Easy to extend to allow multiple items per reward later

## Migration Strategy

### Phase 1: Data Access Layer Updates

-   Update `crateRewards.js` utility functions to handle new structure
-   Implement data flattening for UI compatibility
-   Maintain existing API contracts where possible

### Phase 2: UI Layer Updates

-   Update `CrateSingleView.vue` to handle flattened data
-   Add visual indicators for imported vs manual items
-   Update item counting and weight calculations

### Phase 3: Import/Export Updates

-   Update import logic to use new structure
-   Ensure export maintains compatibility
-   Test with complex YAML files

### Phase 4: Data Migration

-   Create migration script for existing single-item rewards
-   Update Firestore rules if needed
-   Validate all functionality

## Detailed Implementation Plan

### 1. Data Access Layer (`src/utils/crateRewards.js`)

#### Functions to Update:

-   `addCrateRewardItem()` - Create new structure with single item in `items[]`
-   `updateCrateRewardItem()` - Handle updates to items within the array
-   `deleteCrateRewardItem()` - Remove items from the array or delete document
-   `useCrateRewardItems()` - Flatten `items[]` arrays for UI display
-   `calculateRewardItemValue()` - Handle flattened data structure
-   `calculateCrateRewardTotalValue()` - Handle flattened data structure

#### New Helper Functions:

-   `flattenRewardItems()` - Convert new structure to old structure for UI
-   `isMultiItemReward()` - Detect if reward contains multiple items
-   `getRewardItemById()` - Find specific item within a reward document

### 2. UI Components

#### `CrateSingleView.vue` Updates:

-   Handle flattened data from `useCrateRewardItems()`
-   Update item IDs for edit/delete operations (use composite IDs)
-   Add visual indicators for imported items
-   Update sorting and filtering logic

#### `CrateRewardManagerView.vue` Updates:

-   Update item counting logic for new structure
-   Update weight calculation logic

### 3. Import/Export System

#### Import Updates:

-   `importCrateRewardsFromYaml()` - Create new structure for all imports
-   Handle single-item prizes (create with one item in `items[]`)
-   Handle multi-item prizes (create with multiple items in `items[]`)

#### Export Updates:

-   `generateCrazyCratesYaml()` - Work with flattened data
-   `formatRewardItemForYaml()` - Handle flattened item structure

### 4. Data Migration

#### Migration Script Requirements:

-   Identify all existing single-item rewards
-   Convert to new structure with single item in `items[]`
-   Preserve all existing data
-   Add migration metadata

## Technical Considerations

### Data Flattening Strategy

```javascript
// Convert new structure to old structure for UI compatibility
function flattenRewardItems(rewardItems) {
	return rewardItems.flatMap((reward) =>
		reward.items.map((item, index) => ({
			...item,
			id: `${reward.id}_${index}`, // Composite ID for UI operations
			weight: reward.weight,
			display_name: reward.display_name,
			display_item: reward.display_item,
			display_amount: reward.display_amount,
			custom_model_data: reward.custom_model_data,
			import_source: reward.import_source,
			created_at: reward.created_at,
			updated_at: reward.updated_at
		}))
	)
}
```

### Composite ID Strategy

-   Use `${rewardDocumentId}_${itemIndex}` for flattened items
-   Parse composite IDs in edit/delete operations
-   Maintain referential integrity

### Import Source Tracking

-   Add `import_source` field to distinguish imported vs manual items
-   Use `"yaml_parser"` for YAML imports
-   Use `"manual"` or omit for manually added items
-   Enable different UI treatment for imported items

## Testing Strategy

### Unit Tests

-   Test data flattening functions
-   Test composite ID generation/parsing
-   Test import/export with new structure

### Integration Tests

-   Test full add/edit/delete workflow
-   Test YAML import with single and multiple items
-   Test YAML export with new structure

### Manual Testing

-   Test existing single-item rewards still work
-   Test new multi-item rewards from imports
-   Test UI indicators for imported items
-   Test weight editing and calculations

## Risk Assessment

### Low Risk

-   Data access layer updates (well-contained)
-   UI updates (mostly presentation changes)

### Medium Risk

-   Composite ID handling (could break edit/delete)
-   Data migration (could lose data if not careful)

### High Risk

-   Import/export compatibility (could break existing workflows)
-   Firestore rules updates (could break permissions)

## Success Criteria

1. ✅ All existing single-item rewards continue to work
2. ✅ New multi-item rewards can be imported from YAML
3. ✅ Manual item addition remains simple and familiar
4. ✅ Export produces valid Crazy Crates YAML
5. ✅ No data loss during migration
6. ✅ Performance remains acceptable
7. ✅ UI clearly indicates imported vs manual items

## Timeline

-   **Phase 1**: Data Access Layer (2-3 days)
-   **Phase 2**: UI Updates (2-3 days)
-   **Phase 3**: Import/Export (1-2 days)
-   **Phase 4**: Data Migration (1 day)
-   **Testing & Validation**: (2-3 days)

**Total Estimated Time**: 8-12 days

## Dependencies

-   No external dependencies
-   Requires careful coordination between data layer and UI
-   Migration script needs to be run in production environment

## Rollback Plan

-   Keep old data structure intact during migration
-   Implement feature flags to switch between old/new structure
-   Maintain backup of original data
-   Can revert to old structure if issues arise
