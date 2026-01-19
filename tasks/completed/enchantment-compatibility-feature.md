# Enchantment Compatibility Feature

## Overview

Implement enchantment compatibility validation for items in crate rewards and shop items, ensuring that only valid enchantments can be applied to items based on Minecraft's enchantment rules. This includes filtering available enchantments by item type and preventing conflicting enchantment combinations.

## Problem Statement

Currently, the crate rewards system allows adding any enchantment to any item, even though Minecraft has strict rules about which enchantments can be applied to which items. For example:

- Lure can only be applied to fishing rods
- Sharpness, Smite, and Bane of Arthropods are mutually exclusive
- Protection-type enchantments cannot be combined
- Many items (like stone blocks, food items) cannot be enchanted at all

This leads to invalid crate configurations that won't work in-game.

## Proposed Solution

### Data Sources

1. **Resource Files** (`resource/items_*.json`): Contains `enchantCategories` arrays for enchantable items
2. **PrismarineJS Data** (`resource/enchantments_*.json`): Contains enchantment metadata including:
   - `category`: Which item category the enchantment applies to (e.g., `"fishing_rod"`, `"foot_armor"`, `"bow"`)
   - `exclude`: Array of enchantment names that cannot be combined with this one
   - `maxLevel`: Maximum enchantment level

### Database Schema Changes

#### Regular Items Collection

Add `enchantCategories` and `enchantable` fields to items:

```javascript
{
  // ... existing fields ...
  enchantCategories: string[] | null  // e.g., ["weapon", "fire_aspect", "melee_weapon", "durability"]
  enchantable: boolean | null  // Explicit flag to mark items as enchantable or not (defaults to true during migration)
}
```

**Enchantability Logic:**
- Item is enchantable if: `enchantCategories` exists AND has length > 0 AND `enchantable !== false`
- During migration, items with `enchantCategories` are automatically set with `enchantable: true`
- The `enchantable` flag allows manual curation to mark false positives (items with categories that aren't actually enchantable in-game, like `brush`)
- If `enchantable` field is missing or `null`, it defaults to `true` for items with `enchantCategories`

#### Enchanted Book Items Collection

Add enchantment metadata to enchanted book items:

```javascript
{
  // ... existing fields ...
  enchantment_category: string | null,        // e.g., "foot_armor", "fishing_rod", "bow"
  enchantment_exclude: string[] | null,       // e.g., ["depth_strider"] for frost_walker
  enchantment_max_level: number | null        // e.g., 4 for Protection
}
```

- Populated from PrismarineJS enchantment data
- Extracted from `material_id` pattern: `enchanted_book_{enchantment_name}_{level}`

#### Shop Items Collection

Add `enchantments` field to store enchantments on shop items:

```javascript
{
  // ... existing fields ...
  enchantments: string[]  // Array of enchanted book item document IDs
}
```

## Data Migration via Admin UI

✅ **Status: IMPLEMENTED** - Migration handled through admin UI views rather than scripts, following the patterns established in `MissingItemsView.vue` and `RecipeImportView.vue`.

### View 1: Migrate enchantCategories (Regular Items)

**Route**: `/admin/enchantments/migrate-items`

**Pattern**: Similar to `MissingItemsView.vue`

**Features**:
- Version selector for versioned resource files
- Load `resource/items_*.json` files and compare with Firestore items
- Table view showing:
  - Item name/material_id
  - Current `enchantCategories` in DB (if any)
  - Proposed `enchantCategories` from resource file
  - Status indicator (needs update / up to date / missing in resource)
- Selection capabilities:
  - Individual item checkboxes
  - "Select All" checkbox
  - Bulk update button for selected items
  - Individual "Update" button per item
- Filtering:
  - Show only items needing updates
  - Search by material_id or name
- Progress tracking:
  - "Updated X items, Skipped Y items" summary
  - Visual feedback during updates

**Process**:
1. Load resource file for selected version
2. Load all items from Firestore
3. Compare `enchantCategories` from resource vs Firestore
4. Display items needing updates
5. Admin reviews and selects items to update
6. Update Firestore documents with `enchantCategories` array
7. Refresh and show progress

### View 2: Migrate Enchantment Metadata (Enchanted Books)

**Route**: `/admin/enchantments/migrate-books`

**Pattern**: Similar to `RecipeImportView.vue` with list view (see dependencies)

**Features**:
- Load PrismarineJS `enchantments_*.json` data from local resource files
- Query all enchanted book items from Firestore (`category === 'enchantments'`)
- List view showing:
  - Enchanted book name/material_id
  - Current metadata (if any)
  - Proposed metadata from PrismarineJS (category, exclude, maxLevel)
  - Match status (found / not found in PrismarineJS data)
- Individual review or bulk operations:
  - Individual Import/Skip buttons
  - Bulk selection checkboxes
  - Bulk import button
- Filtering and search:
  - Filter by enchantment name
  - Filter by status (needs update / up to date / not found)
  - Search by material_id
- Progress tracking:
  - "Imported X, Skipped Y, Failed Z" summary
  - Visual progress indicators

**Process**:
1. Load PrismarineJS `enchantments_*.json` file for selected version
2. Query all enchanted book items from Firestore
3. For each enchanted book:
   - Extract enchantment name from `material_id` (pattern: `enchanted_book_{name}_{level}`)
   - Match to PrismarineJS data by `name` field
   - Show comparison (current vs proposed)
4. Admin reviews and selects items to update
5. Update Firestore documents with:
   - `enchantment_category`: from PrismarineJS `category`
   - `enchantment_exclude`: from PrismarineJS `exclude`
   - `enchantment_max_level`: from PrismarineJS `maxLevel`
6. Refresh and show progress

### View 3: Manage Enchantable Items

**Route**: `/admin/enchantments/manage`

**Purpose**: Review and manually curate the `enchantable` flag for items with `enchantCategories`. This addresses false positives where items have enchantment categories in the resource files but aren't actually enchantable in-game (e.g., `brush`).

**Features**:
1. List all items with `enchantCategories` from Firestore
2. Show current `enchantable` status (defaults to `true`)
3. Display enchantment categories for context
4. Filter by status: All / Enchantable / Not Enchantable
5. Search by name or material_id
6. Toggle `enchantable` flag for individual items
7. Bulk update selected items to set `enchantable` to `true` or `false`
8. Statistics display: Total items, Enchantable count, Not Enchantable count

**Workflow**:
1. After migration, review items with `enchantCategories` that shouldn't be enchantable
2. Search/filter to find items like `brush` that have categories but aren't enchantable
3. Mark them as `enchantable: false`
4. The validation utilities will respect this flag

### Admin Dashboard Integration

Add to `AdminView.vue`:
- New section "Enchantment Compatibility" with links to:
  - Migrate Item Categories (View 1)
  - Migrate Book Metadata (View 2)
  - Manage Enchantable Items (View 3)
- Access controlled via `canBulkUpdate` permission (same as recipe import)

### Key Advantages of UI-Based Migration

- **Interactive review**: Admins can review changes before applying
- **Visual comparison**: See current vs proposed data side-by-side
- **Selective updates**: Update only selected items, not all-or-nothing
- **Progress feedback**: Real-time feedback during migration
- **Error handling**: User-friendly error messages with retry options
- **Consistent UX**: Follows established admin UI patterns

## Validation Utilities

✅ **Status: IMPLEMENTED** - Utility functions created in `src/utils/enchantments.js` with comprehensive unit tests.

The following utility functions are available:

### `isItemEnchantable(item)`

Check if an item can accept enchantments.

```javascript
function isItemEnchantable(item) {
  // Must have enchantCategories
  if (!item.enchantCategories || !Array.isArray(item.enchantCategories) || item.enchantCategories.length === 0) {
    return false
  }
  // Check explicit enchantable flag (defaults to true if not set)
  return item.enchantable !== false
}
```

### `getCompatibleEnchantments(item, allEnchantmentItems)`

Filter enchantment list to only show compatible enchantments for an item.

```javascript
function getCompatibleEnchantments(item, allEnchantmentItems) {
  if (!isItemEnchantable(item)) return []
  
  const itemCategories = item.enchantCategories || []
  return allEnchantmentItems.filter(enchItem => {
    const enchCategory = enchItem.enchantment_category
    return enchCategory && itemCategories.includes(enchCategory)
  })
}
```

### `isEnchantmentCompatibleWithItem(enchantmentItem, targetItem)`

Check if a specific enchantment can be applied to an item.

```javascript
function isEnchantmentCompatibleWithItem(enchantmentItem, targetItem) {
  if (!isItemEnchantable(targetItem)) return false
  if (!enchantmentItem.enchantment_category) return false
  
  return targetItem.enchantCategories.includes(enchantmentItem.enchantment_category)
}
```

### `hasEnchantmentConflict(newEnchantment, existingEnchantments, allEnchantmentItems)`

Check if adding an enchantment would conflict with existing enchantments.

```javascript
function hasEnchantmentConflict(newEnchantment, existingEnchantments, allEnchantmentItems) {
  // Get exclude list for new enchantment
  const newEnchItem = allEnchantmentItems.find(e => e.id === newEnchantment)
  if (!newEnchItem || !newEnchItem.enchantment_exclude) return false
  
  // Extract enchantment names from existing enchantment IDs
  const existingEnchNames = existingEnchantments.map(enchId => {
    const enchItem = allEnchantmentItems.find(e => e.id === enchId)
    return enchItem ? extractEnchantmentName(enchItem.material_id) : null
  }).filter(Boolean)
  
  // Check if any existing enchantment name is in the exclude list
  const conflicts = newEnchItem.enchantment_exclude.filter(excludedName => 
    existingEnchNames.some(name => name === excludedName)
  )
  
  if (conflicts.length > 0) return true
  
  // Also check reverse: if any existing enchantment excludes the new one
  const newEnchName = extractEnchantmentName(newEnchItem.material_id)
  for (const existingId of existingEnchantments) {
    const existingEnchItem = allEnchantmentItems.find(e => e.id === existingId)
    if (existingEnchItem?.enchantment_exclude?.includes(newEnchName)) {
      return true
    }
  }
  
  return false
}

function extractEnchantmentName(materialId) {
  // Extract from "enchanted_book_frost_walker_2" -> "frost_walker"
  const match = materialId.match(/^enchanted_book_(.+)_\d+$/)
  return match ? match[1] : null
}
```

### `getEnchantmentConflictReason(newEnchantment, existingEnchantments, allEnchantmentItems)`

Get user-friendly message explaining why an enchantment conflicts.

```javascript
function getEnchantmentConflictReason(newEnchantment, existingEnchantments, allEnchantmentItems) {
  // Similar logic to hasEnchantmentConflict but returns descriptive message
  // e.g., "Cannot combine Sharpness with Smite"
}
```

## UI Updates - Crate Rewards

**See separate spec**: `tasks/enhancement/not-ready/crate-rewards-enchantment-validation.md`

Phase 3 (Crate Rewards UI integration) has been extracted to a separate specification document for future implementation.

## UI Updates - Shop Items

### ✅ Implementation Status: COMPLETE

`ShopItemForm.vue` fully supports enchantments with all required features:

1. **Enchantment Section**
   - ✅ Enchantment section shown/hidden based on selected item's enchantability
   - ✅ Hidden for non-enchantable items and enchanted books themselves
   - ✅ Add/remove enchantments functionality with search interface

2. **Validation Logic**
   - ✅ Uses `isItemEnchantable()`, `getCompatibleEnchantments()`, `hasEnchantmentConflict()`, and `getEnchantmentConflictReason()` utilities
   - ✅ Filters enchantment list to show only compatible enchantments for selected item
   - ✅ Validates conflicts before adding enchantments
   - ✅ Shows user-friendly error messages for conflicts

3. **Data Storage**
   - ✅ `enchantments` field stored in shop item documents as array of enchanted book item document IDs
   - ✅ Enchantments displayed in shop item forms and views
   - ✅ Supports editing existing shop items with enchantments

### Implementation Details

- Enchantment search with keyboard navigation
- Real-time filtering of compatible enchantments
- Conflict detection and prevention
- Level replacement (higher level replaces lower level of same enchantment type)
- Visual display of selected enchantments with remove buttons

## Example Workflow

See `tasks/enhancement/crate-rewards-enchantment-validation.md` for detailed workflow examples.

See `tasks/enhancement/not-ready/crate-rewards-enchantment-validation.md` for the current (not-ready) spec.

## Dependencies

- **Recipe Import UI Improvements** (`tasks/enhancement/recipe-import-ui-improvements.md`): The list view patterns and bulk import functionality from this enhancement will be used as reference/pattern for the enchanted book metadata migration view. This ensures consistency in admin UI patterns and leverages any improvements made to the recipe import workflow.

## Implementation Phases

### ✅ Phase 1: Data Migration (Admin UI) - COMPLETE
- ✅ Created admin views for migrating `enchantCategories` and enchantment metadata
- ✅ Implemented comparison logic and update functionality
- ✅ Added routes and admin dashboard integration
- ✅ Tested migration workflows
- ✅ Populated Firestore with compatibility data via admin UI
- ✅ Verified data integrity

**Implementation**: All three admin views (`MigrateItemsView.vue`, `MigrateBooksView.vue`, `ManageEnchantableItemsView.vue`) are implemented and accessible via `/admin/enchantments/*` routes.

### ✅ Phase 2: Validation Utilities - COMPLETE
- ✅ Created `src/utils/enchantments.js` with all utility functions
- ✅ Added comprehensive unit tests for validation logic

**Implementation**: All utility functions (`isItemEnchantable`, `getCompatibleEnchantments`, `isEnchantmentCompatibleWithItem`, `hasEnchantmentConflict`, `getEnchantmentConflictReason`) are implemented and tested.

### ⏳ Phase 3: Crate Rewards UI - PENDING
- **See separate spec**: `tasks/enhancement/not-ready/crate-rewards-enchantment-validation.md`
- Update `CrateSingleView.vue` with filtering and validation
- Test with various items and enchantment combinations

**Status**: Extracted to separate specification document. Not yet implemented.

### ✅ Phase 4: Shop Items UI - COMPLETE
- ✅ Added enchantment support to `ShopItemForm.vue`
- ✅ Updated shop item display components to show enchantments
- ✅ Tested end-to-end workflow

**Implementation**: `ShopItemForm.vue` fully implements enchantment support with filtering, validation, conflict detection, and proper data storage.

## Testing Considerations

- Test with items that cannot be enchanted (should hide section)
- Test with items that can be enchanted but have no compatible enchantments (edge case)
- Test all mutual exclusion rules (Sharpness/Smite, Protection types, Silk Touch/Fortune, etc.)
- Test with enchanted books themselves (should hide enchantment section - enchanted books cannot be enchanted)
- Test version-specific edge cases if any

## Success Criteria

### ✅ Completed
- ✅ Admin UI migration views successfully populate all required data
- ✅ Migration process is user-friendly and allows selective updates
- ✅ Validation utilities are implemented and tested
- ✅ Shop items can store and display enchantments
- ✅ Shop item forms filter enchantments by compatibility
- ✅ Shop item forms prevent conflicting enchantment combinations
- ✅ Enchantment section hidden for non-enchantable items

### ⏳ Pending
- ⏳ Crate rewards UI validation (see Phase 3 spec for detailed criteria)

## Open Questions

- Should we validate enchantment levels (e.g., prevent Protection VI if max is IV)?
- How do we handle version-specific enchantment compatibility changes?
- Should we cache enchantment compatibility lookups for performance?

