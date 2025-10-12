# Crate Reward Structure Migration Specification

## Overview

Migrate the crate reward items from the previous single-item-per-document structure to a new unified structure that supports both single and multiple items per reward. This enables better compatibility with Crazy Crates YAML imports while maintaining a simple editing experience for single items.

**Status**: ✅ **MIGRATION COMPLETE** - All functionality implemented and working in production.

## Problem Statement

### Previous Structure (Legacy)

```javascript
// Collection: 'crate_reward_items'
// Each document represented a single item
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

### Current Structure (New)

```javascript
// Collection: 'crate_reward_items'
// Each document represents one reward prize and can contain multiple items
{
  id: "eFDvjv0RfFfEUkbI9RAb",
  crate_reward_id: "test-crate-1",
  weight: 15,
  display_name: "<red>Diamond Sword",
  display_item: "RGhRyLF0itVnvfTEzMXx",
  display_amount: 1,
  display_enchantments: ["FAolooXwUfooppFZFmCO","Loot3XwUfooppFZFmCO"], // Array of enchantment IDs
  custom_model_data: -1,
  import_source: "manual", // "manual" or "yaml_import"
  import_timestamp: "2025-10-09T13:01:03.393Z", // Optional
  original_yaml_key: "2", // Optional: original prize ID from YAML
  items: [
    {
      item_id: "RGhRyLF0itVnvfTEzMXx",
      quantity: 1,
      enchantments: ["FAolooXwUfooppFZFmCO","Loot3XwUfooppFZFmCO"], // Array format
      catalog_item: true,
      matched: true,
      name: "<red>Diamond Sword"
    }
  ],
  // Additional optional fields for YAML imports
  display_lore: [],
  firework: false,
  commands: [],
  messages: [],
  display_patterns: [],
  blacklisted_permissions: [],
  created_at: "2025-10-09T13:01:03.393Z",
  updated_at: "2025-10-09T13:01:03.393Z"
}
```

## Goals

1. ✅ **Unified Data Structure**: All crate rewards use the same `items: []` structure
2. ✅ **Backward Compatibility**: Existing single-item rewards continue to work
3. ✅ **Import Flexibility**: Support complex YAML imports with multiple items per reward
4. ✅ **Simple Editing**: Manual item addition remains simple (single item per reward)
5. ✅ **Future-Proof**: Easy to extend to allow multiple items per reward later

**All goals achieved successfully.**

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

#### Implemented Functions:

-   ✅ `addCrateRewardItem()` - Creates new structure with single item in `items[]` array, sets `import_source: 'manual'`
-   ✅ `deleteCrateRewardItem()` - Deletes entire reward document by ID
-   ✅ `useCrateRewardItems()` - Returns raw document-based structure (documents with embedded items arrays)
-   ✅ `calculateRewardItemValue()` - Calculates value for individual items within rewards
-   ✅ `calculateCrateRewardTotalValue()` - Handles both document-based and legacy flattened structures
-   ✅ `formatRewardItemForYaml()` - Formats reward documents for YAML export
-   ✅ `generateCrazyCratesYaml()` - Generates complete Crazy Crates YAML from reward documents
-   ✅ `importCrateRewardsFromYaml()` - Imports YAML into new structure with embedded items arrays

#### Helper Functions:

-   ✅ `isMultiItemReward()` - Detects if reward contains multiple items (checks `items.length > 1`)
-   ✅ `parseItemString()` - Parses Crazy Crates item strings into structured data
-   ✅ `findMatchingItem()` - Matches parsed items to database items by material_id
-   ✅ `itemObjectToItemString()` - Converts item objects back to Crazy Crates format

**Note**: The flattening approach was not needed - the UI works directly with document-based structure.

### 2. UI Components

#### ✅ View Separation Completed:

The monolithic `CrateRewardManagerView.vue` was split into two focused components:

-   ✅ `CrateRewardManagerView.vue` - List/dashboard view for managing multiple crate rewards
-   ✅ `CrateSingleView.vue` - Detail view for managing a single crate reward's items

#### ✅ `CrateSingleView.vue` Implementation:

-   Works directly with document-based structure from `useCrateRewardItems()`
-   Handles reward documents with embedded `items[]` arrays
-   Supports adding/editing/deleting items within rewards
-   Displays item information from embedded items array
-   Supports inline weight editing
-   Proper validation and 404 handling for invalid crate IDs

#### ✅ `CrateRewardManagerView.vue` Implementation:

-   Updated item counting logic to work with new structure
-   Calculates total weight from reward documents
-   Import functionality creates new structure

### 3. Import/Export System

#### ✅ Import Implementation:

-   `importCrateRewardsFromYaml()` - Creates documents with new structure
-   Handles single-item prizes (creates with one item in `items[]`)
-   Handles multi-item prizes (creates with multiple items in `items[]`)
-   Parses display enchantments and stores as ID arrays
-   Preserves all YAML metadata (commands, messages, lore, etc.)
-   Sets `import_source: 'yaml_import'` for tracking

#### ✅ Export Implementation:

-   `generateCrazyCratesYaml()` - Works with reward documents
-   `formatRewardItemForYaml()` - Converts document structure to YAML format
-   `itemObjectToItemString()` - Converts embedded items to Crazy Crates item strings
-   Properly formats enchantments back to YAML syntax
-   Preserves display item, enchantments, and custom model data

### 4. Data Migration

#### ✅ Migration Status:

-   **No migration script needed** - New structure was introduced before significant production data existed
-   All new rewards use the new structure automatically
-   `addCrateRewardItem()` creates new structure by default
-   Backward compatibility maintained for any legacy data through `calculateCrateRewardTotalValue()`

## Technical Considerations

### Document-Based Approach (Implemented)

The UI works directly with reward documents, eliminating the need for flattening:

```javascript
// useCrateRewardItems() returns documents directly
{
	rewardDocuments, // Array of reward documents with embedded items
		pending,
		error
}

// UI iterates over rewardDocuments
rewardDocuments.forEach((rewardDoc) => {
	// Access document-level fields
	const weight = rewardDoc.weight
	const displayName = rewardDoc.display_name

	// Access embedded items
	rewardDoc.items.forEach((item) => {
		const itemId = item.item_id
		const quantity = item.quantity
	})
})
```

### Document ID Strategy

-   Each reward document has a unique Firestore ID
-   Delete operations use the document ID directly
-   No composite IDs needed - operations target entire reward documents
-   Maintains clean separation between prizes

### Import Source Tracking

-   ✅ `import_source` field distinguishes imported vs manual items
-   `"yaml_import"` for YAML imports
-   `"manual"` for manually added items
-   `import_timestamp` and `original_yaml_key` preserved for imported items

### Enchantment Handling

-   Enchantments stored as arrays of item IDs (not objects)
-   `display_enchantments` at document level for display item enchantments
-   `enchantments` within items array for actual item enchantments
-   Conversion logic handles both array and legacy object formats

## Testing Strategy

### ✅ Manual Testing Completed

-   ✅ Single-item rewards work correctly
-   ✅ Multi-item rewards from YAML imports function properly
-   ✅ Add/edit/delete workflows validated
-   ✅ YAML import with single items tested
-   ✅ YAML import with multiple items tested
-   ✅ YAML export generates valid files
-   ✅ Weight editing and calculations verified
-   ✅ Enchantment handling tested (display and item enchantments)

### Testing Notes

-   No automated tests implemented yet (future enhancement opportunity)
-   Manual testing covered all critical user workflows
-   Import/export functionality validated with real Crazy Crates YAML files
-   Edge cases tested: empty items arrays, command-only rewards, enchanted items

## Risk Assessment (Post-Implementation)

### ✅ Mitigated Risks

-   ✅ **Data Access Layer**: Successfully updated, no issues
-   ✅ **UI Updates**: Document-based approach simplified implementation
-   ✅ **Import/Export**: Working correctly with real YAML files
-   ✅ **Data Migration**: Avoided by introducing structure before significant production use

### Remaining Considerations

-   Export functionality works but should be validated regularly with new Crazy Crates versions
-   Enchantment parsing relies on naming conventions (may need updates for future Minecraft versions)

## Success Criteria

1. ✅ All existing single-item rewards continue to work
2. ✅ New multi-item rewards can be imported from YAML
3. ✅ Manual item addition remains simple and familiar
4. ✅ Export produces valid Crazy Crates YAML
5. ✅ No data loss during migration (no migration needed)
6. ✅ Performance remains acceptable
7. ✅ Import source tracking implemented for debugging and maintenance

**All success criteria met successfully.**

## Timeline

-   **Phase 1**: Data Access Layer (2-3 days) ✅ **COMPLETED**
-   **Phase 2**: UI Updates (2-3 days) ✅ **COMPLETED** (includes view separation)
-   **Phase 3**: Import/Export (1-2 days) ✅ **COMPLETED**
-   **Phase 4**: Data Migration (1 day) ✅ **COMPLETED** (not needed)
-   **Testing & Validation**: (2-3 days) ✅ **COMPLETED**

**Total Estimated Time**: 8-12 days  
**Actual Time**: ~10 days (including view separation work)  
**Status**: ✅ **MIGRATION COMPLETE**

## Dependencies

-   ✅ No external dependencies
-   ✅ Coordination between data layer and UI completed successfully
-   ✅ View separation completed (see `crate-rewards-view-separation-spec.md`)

## Rollback Plan

-   ✅ Backward compatibility maintained in `calculateCrateRewardTotalValue()`
-   ✅ Legacy structure detection and handling preserved
-   ✅ No migration needed - new structure introduced cleanly
-   ✅ Can support both structures if needed

## Final Status

**✅ MIGRATION COMPLETE** - The crate reward structure migration has been successfully completed. The new unified structure is fully implemented and working in production.

### What Was Accomplished

1. **New Document Structure**: Reward documents with embedded `items[]` arrays
2. **Full Import/Export**: YAML import and export working with Crazy Crates format
3. **View Separation**: Split monolithic component into focused views
4. **Enchantment Support**: Array-based enchantment handling for both display and items
5. **Import Tracking**: Source tracking for imported vs manual rewards
6. **Backward Compatibility**: Legacy structure support maintained

### Production Status

-   ✅ All features working in production
-   ✅ Users can create single-item rewards manually
-   ✅ Users can import multi-item rewards from YAML
-   ✅ Users can export crates to valid YAML files
-   ✅ All CRUD operations functional
-   ✅ No data migration needed

### Future Enhancements

-   Add automated tests for import/export functionality
-   Add UI for editing multi-item rewards (currently view-only for imported multi-item rewards)
-   Add validation for Crazy Crates YAML compatibility across versions
-   Add batch operations for managing multiple rewards
