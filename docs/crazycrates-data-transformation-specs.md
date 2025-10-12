# Crazy Crates Data Transformation Specifications

## Overview

This document defines the data transformation pipelines for the Crazy Crates system, documenting how different input sources are converted into the unified database structure. Understanding these transformations is crucial for maintaining data consistency and preventing bugs like the enchantment storage issue.

## Database Schema (Target Structure)

All transformation pipelines must produce documents that conform to this unified structure:

```javascript
// Collection: 'crate_reward_items'
{
  id: "documentId",
  crate_reward_id: "crateId",

  // Display properties (for crate GUI)
  display_name: "<white>Enchanted Book", // Capitalized, no quantity prefix for quantity 1
  display_item: "xsdQqpscAytYFvladiMw", // Item document ID or material_id
  display_amount: 1,
  display_enchantments: ["KyymuTiPLtULAXZegX1H", "ZAwrXdLMCfTSzhzYErxG"], // Array of enchantment document IDs

  // Prize properties
  weight: 50,
  custom_model_data: -1,
  firework: false,
  commands: [],
  messages: [],
  display_lore: [],

  // Items array (embedded items)
  items: [
    {
      item_id: "xsdQqpscAytYFvladiMw",
      quantity: 1,
      enchantments: ["KyymuTiPLtULAXZegX1H"], // Array of enchantment document IDs
      catalog_item: true,
      matched: true,
      name: "", // Only populated for imported items with special names
      materialId: "enchanted_book",
      custom_properties: {}
    }
  ],

  // Metadata
  import_source: "manual" | "yaml_import",
  import_timestamp: "2025-01-12T10:30:00.000Z",
  original_yaml_key: "2", // Only for YAML imports
  created_at: "2025-01-12T10:30:00.000Z",
  updated_at: "2025-01-12T10:30:00.000Z"
}
```

## Transformation Pipeline 1: YAML Import

### Input Format

```yaml
Crate:
    CrateName: 'Village Crate'
    Prizes:
        '1':
            DisplayName: '<white>1x enchanted book'
            DisplayItem: 'enchanted_book'
            DisplayAmount: 1
            DisplayEnchantments: ['sharpness:5', 'unbreaking:3']
            Weight: 50
            Items:
                - 'item:enchanted_book, amount:1, sharpness:5, unbreaking:3'
```

### Transformation Process

#### Step 1: YAML Parsing

-   **Function**: `parseCrateRewardsYaml()`
-   **Library**: `js-yaml`
-   **Output**: JavaScript object with prizes array

#### Step 2: Prize Extraction

-   **Function**: `extractPrizesFromYaml()`
-   **Process**:
    -   Extract `DisplayName`, `DisplayItem`, `Weight`, etc.
    -   Parse `Items` array containing item strings
    -   Handle `DisplayEnchantments` array if present

#### Step 3: Item String Parsing

-   **Function**: `parseItemString()`
-   **Input**: `"item:enchanted_book, amount:1, sharpness:5, unbreaking:3"`
-   **Process**:
    -   Extract material ID: `"enchanted_book"`
    -   Extract quantity: `1`
    -   Extract enchantments: `{ "sharpness": 5, "unbreaking": 3 }`
    -   Convert enchantments to array format

#### Step 4: Enchantment Conversion

-   **Process**: Convert enchantment names to document IDs
    -   `"sharpness:5"` → find `enchanted_book_sharpness_5` → get document ID
    -   Store as array: `["KyymuTiPLtULAXZegX1H"]`

#### Step 5: Catalog Matching

-   **Function**: `findMatchingItem()`
-   **Process**: Match parsed item to catalog item by `material_id`

#### Step 6: Document Creation

-   **Function**: `addCrateRewardItem()` (import path)
-   **Process**: Create document with new structure

### Key Characteristics

✅ **Enchantments as Arrays**: Always stored as arrays of document IDs
✅ **Validation**: Enchantment names validated against whitelist
✅ **Error Handling**: Detailed error messages for parsing failures
✅ **Metadata**: Includes `import_source: "yaml_import"` and `original_yaml_key`

### Code Location

-   **Main Functions**: `src/utils/crateRewards.js` (lines 703-883)
-   **UI Component**: `src/views/CrateSingleView.vue` (import modal)

---

## Transformation Pipeline 2: Manual Item Creation

### Input Format

```javascript
// Form data from UI
{
  item_id: "xsdQqpscAytYFvladiMw", // Selected from catalog
  quantity: 1,
  weight: 50,
  enchantments: {
    "KyymuTiPLtULAXZegX1H": 5,  // enchantment document ID → level
    "ZAwrXdLMCfTSzhzYErxG": 3   // enchantment document ID → level
  }
}
```

### Transformation Process

#### Step 1: Form Data Collection

-   **UI**: `CrateSingleView.vue` item form
-   **Process**: User selects item from catalog, adds enchantments
-   **Enchantments**: Stored as object with document IDs as keys

#### Step 2: Display Name Generation

-   **Function**: `generateDisplayName()`
-   **Process**: Create display name from item and enchantments

#### Step 3: Document Creation

-   **Function**: `addCrateRewardItem()` (manual path)
-   **Process**: Create document with new structure

### Key Characteristics

✅ **Enchantments as Arrays**: Converted from object to array format during creation
✅ **Display Enchantments**: Created at document level from enchantments object
✅ **Consistent Structure**: Matches YAML import structure
✅ **Capitalized Names**: Item names are capitalized in display_name
✅ **Conditional Quantity**: Only shows quantity prefix when quantity > 1

### Code Location

-   **Main Function**: `src/utils/crateRewards.js` (lines 127-171)
-   **UI Component**: `src/views/CrateSingleView.vue` (add item form)

---

## ✅ RESOLVED: Structural Inconsistency

### Previous Issue (Fixed)

The manual creation pipeline previously produced this inconsistent structure:

```javascript
{
	items: [
		{
			enchantments: {
				KyymuTiPLtULAXZegX1H: 5, // Object format - WAS WRONG
				ZAwrXdLMCfTSzhzYErxG: 3
			},
			name: '<white>1x enchanted book' // WAS POPULATED FOR MANUAL ITEMS
		}
	]
	// Missing display_enchantments field
}
```

### Current Solution (Implemented)

Both YAML import and manual creation now produce this consistent structure:

```javascript
{
  display_name: "<white>Enchanted Book", // Capitalized, no quantity prefix for qty 1
  display_enchantments: ["KyymuTiPLtULAXZegX1H", "ZAwrXdLMCfTSzhzYErxG"], // Array format - CORRECT
  items: [{
    enchantments: ["KyymuTiPLtULAXZegX1H", "ZAwrXdLMCfTSzhzYErxG"], // Array format - CORRECT
    name: "" // Only populated for imported items with special names
  }]
}
```

### Root Cause (Resolved)

The manual creation process now includes the enchantment transformation step that converts the form's object format to the database's array format.

---

## ✅ IMPLEMENTED: Manual Creation Pipeline Fixes

### Changes Made

#### 1. ✅ Updated `addCrateRewardItem()` Function

```javascript
// In src/utils/crateRewards.js, lines 155-167
const rewardDocument = {
	crate_reward_id: crateId,
	weight: itemData.weight || 50,
	display_name: itemData.display_name || '',
	display_item: itemData.display_item || materialId,
	display_amount: itemData.display_amount || itemData.quantity || 1,

	// ✅ IMPLEMENTED: Convert enchantments object to array
	display_enchantments: enchantmentsArray,

	custom_model_data: itemData.custom_model_data || -1,
	import_source: 'manual',
	items: [
		{
			item_id: itemData.item_id,
			quantity: itemData.quantity || 1,

			// ✅ IMPLEMENTED: Convert enchantments object to array
			enchantments: enchantmentsArray,

			catalog_item: true,
			matched: true,
			name: '' // ✅ IMPLEMENTED: Only populated for imported items with special names
		}
	],
	created_at: now,
	updated_at: now
}
```

#### 2. ✅ Updated `generateDisplayName()` Function

```javascript
// In src/views/CrateSingleView.vue, lines 435-449
function generateDisplayName(itemForm) {
	const item = getItemById(itemForm.item_id)
	if (!item) return ''

	const quantity = itemForm.quantity || 1
	const itemName = stripColorCodes(item.name)

	// ✅ IMPLEMENTED: Capitalize the item name (convert to title case)
	const capitalizedItemName = itemName.replace(/\b\w/g, (l) => l.toUpperCase())

	// ✅ IMPLEMENTED: Only show quantity prefix if quantity is more than 1
	const quantityPrefix = quantity > 1 ? `${quantity}x ` : ''

	return `<white>${quantityPrefix}${capitalizedItemName}`
}
```

### ✅ Implementation Completed

1. **✅ Identified the Issue**: Confirmed enchantments were stored as objects instead of arrays
2. **✅ Fixed the Transformation**: Added object-to-array conversion in `addCrateRewardItem()`
3. **✅ Added display_enchantments**: Created the missing field at document level
4. **✅ Fixed name field**: Only populated for imported items with special names
5. **✅ Updated display_name generation**: Capitalized names and conditional quantity prefix
6. **✅ Updated Documentation**: Reflected the corrected transformation

---

## Data Flow Diagrams

### YAML Import Flow

```
YAML File → js-yaml → Prize Objects → Item String Parser → Enchantment Conversion → Catalog Matching → Database Document
```

### Manual Creation Flow (Previous - Broken)

```
UI Form → Form Data Object → Database Document (with object enchantments)
```

### Manual Creation Flow (Current - Fixed)

```
UI Form → Form Data Object → Enchantment Conversion → Display Name Generation → Database Document (with array enchantments)
```

---

## Validation Rules

### Enchantment Format Validation

-   **Database**: Must be array of document IDs
-   **UI Form**: Can be object with document IDs as keys
-   **Conversion**: Object keys → Array elements

### Required Fields

-   **All Documents**: `crate_reward_id`, `weight`, `items[]`
-   **Display Fields**: `display_name` (capitalized, conditional quantity), `display_item`, `display_amount`
-   **Enchantments**: `display_enchantments[]`, `items[].enchantments[]` (both as arrays)
-   **Item Names**: `items[].name` (empty for manual items, populated for imported items with special names)

### Data Types

-   **Enchantments**: Always arrays of strings (document IDs)
-   **Quantities**: Always numbers
-   **Weights**: Always positive numbers
-   **Timestamps**: Always ISO strings

---

## Testing Strategy

### Unit Tests

-   Test enchantment object-to-array conversion
-   Test display_enchantments field creation
-   Test form data validation

### Integration Tests

-   Test manual item creation matches YAML import structure
-   Test edit/update operations preserve array format
-   Test UI displays enchantments correctly

### Manual Testing

-   Create item manually, verify database structure
-   Edit existing item, verify enchantments preserved
-   Compare manual vs YAML import structures

---

## Migration Notes

### Existing Data

-   **YAML Imports**: Already correct (array format)
-   **Manual Items**: ✅ Fixed - now use array format
-   **Mixed Documents**: May exist during transition period

### Backward Compatibility

-   **Reading**: Handle both object and array formats for legacy data
-   **Writing**: Always use array format for new data
-   **UI**: Convert between formats as needed for display
-   **Migration**: Existing manual items with object format will need conversion

---

## Related Files

### Core Implementation

-   `src/utils/crateRewards.js` - Main transformation functions
-   `src/views/CrateSingleView.vue` - Manual creation UI

### Documentation

-   `tasks/crate-reward-structure-migration-spec.md` - Database structure changes
-   `tasks/yaml-import-refactor-spec.md` - YAML parsing implementation

### Test Files

-   `cypress/e2e/` - End-to-end tests for item creation
-   `tests/fixtures/` - Test data for validation

---

## Future Considerations

### Potential Enhancements

1. **Enchantment Levels**: Store level information in enchantment documents
2. **Custom Properties**: Support for item-specific custom data
3. **Validation**: Real-time validation of enchantment combinations
4. **Bulk Operations**: Support for batch enchantment updates

### Performance Optimizations

1. **Caching**: Cache enchantment document lookups
2. **Validation**: Pre-validate enchantment IDs before save
3. **Indexing**: Optimize Firestore queries for enchantment searches

---

## Conclusion

The enchantment storage issue has been resolved through consistent transformation pipelines between YAML import and manual creation. The implemented fixes ensure both paths produce identical database structures with:

-   ✅ Array format for enchantments in both `display_enchantments` and `items[].enchantments`
-   ✅ Capitalized item names in `display_name` with conditional quantity prefix
-   ✅ Empty `name` field for manual items (only populated for imported items with special names)
-   ✅ Consistent data validation and transformation steps

This specification serves as a reference for maintaining data consistency and preventing similar issues in the future.
