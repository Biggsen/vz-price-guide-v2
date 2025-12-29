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

Migration will be handled through admin UI views rather than scripts, following the patterns established in `MissingItemsView.vue` and `RecipeImportView.vue`.

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

Create utility functions in `src/utils/enchantments.js`:

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

### Current State

Enchantment selection in `CrateSingleView.vue` currently shows all enchantments and allows any selection.

### Changes Required

1. **Filter Enchantment List**
   - Update `enchantmentItems` computed property to filter based on selected item
   - Use `getCompatibleEnchantments()` utility
   - Only show compatible enchantments in the modal dropdown

2. **Hide Enchantment Section for Non-Enchantable Items**
   - Hide "Enchantments" section when selected item is not enchantable
   - Hide "Enchantments" section when selected item is an enchanted book itself (category === 'enchantments')
   - Use `isItemEnchantable()` utility and check item category

3. **Validation on Add**
   - When adding enchantment, check for conflicts with existing enchantments
   - Show error message if conflict detected
   - Use `hasEnchantmentConflict()` and `getEnchantmentConflictReason()` utilities

4. **Visual Feedback**
   - Show warning/error indicators for incompatible selections
   - Disable incompatible options (though they should already be filtered out)

### Code Changes

In `CrateSingleView.vue`:

```javascript
// Update enchantmentItems computed to filter by selected item
const enchantmentItems = computed(() => {
  if (!allItems.value) return []
  const allEnchItems = allItems.value.filter((item) => item.category === 'enchantments')
  
  // If no item selected, return empty (shouldn't show enchantments)
  if (!itemForm.value.item_id) return []
  
  const selectedItem = getItemById(itemForm.value.item_id)
  if (!selectedItem) return []
  
  // Hide enchantments for enchanted books themselves
  if (selectedItem.category === 'enchantments') return []
  
  // Filter to only compatible enchantments
  return getCompatibleEnchantments(selectedItem, allEnchItems)
})

// Add validation before saving enchantment
function saveEnchantment() {
  if (!enchantmentForm.value.enchantment) return
  
  const newEnchId = enchantmentForm.value.enchantment
  const existingEnchIds = Object.keys(itemForm.value.enchantments || {})
  const allEnchItems = allItems.value.filter(item => item.category === 'enchantments')
  
  // Check for conflicts
  if (hasEnchantmentConflict(newEnchId, existingEnchIds, allEnchItems)) {
    const reason = getEnchantmentConflictReason(newEnchId, existingEnchIds, allEnchItems)
    addItemFormError.value = reason
    return
  }
  
  itemForm.value.enchantments[newEnchId] = 1
  showEnchantmentModal.value = false
}
```

## UI Updates - Shop Items

### Current State

`ShopItemForm.vue` does not currently support enchantments.

### Changes Required

1. **Add Enchantment Section**
   - Similar UI to crate rewards enchantment section
   - Show/hide based on selected item's enchantability (hide for non-enchantable items and enchanted books)
   - Add/remove enchantments functionality

2. **Reuse Validation Logic**
   - Import and use same validation utilities
   - Filter enchantment list based on selected item
   - Check for conflicts before saving

3. **Store Enchantments**
   - Add `enchantments` field to shop item document
   - Array of enchanted book item document IDs
   - Display enchantments in shop item list/detail views

### Code Structure

Similar implementation to crate rewards:
- Enchantment selection modal
- Filtered enchantment list
- Validation on add
- Display existing enchantments with remove functionality

## Example Workflow: Iron Sword

1. User selects "iron_sword" item
   - Item has `enchantCategories: ["weapon", "fire_aspect", "melee_weapon", "durability", "sharp_weapon", "sweeping", "vanishing"]`
   - System recognizes item is enchantable

2. User clicks "Add Enchantment"
   - Modal opens with filtered list
   - Shows: Sharpness, Smite, Bane of Arthropods, Fire Aspect, Sweeping Edge, Knockback, Looting, Unbreaking, Mending, etc.
   - Hides: Lure, Power, Protection, Respiration, Depth Strider, etc.

3. User selects "Sharpness V"
   - System validates: compatible (category "sharp_weapon" is in sword's categories)
   - No existing enchantments, so no conflicts
   - Enchantment added successfully

4. User tries to add "Smite V"
   - System validates: compatible category
   - But checks conflicts: Sharpness excludes ["smite", ...]
   - Shows error: "Cannot combine Sharpness with Smite"
   - Enchantment not added

5. User tries to add "Lure"
   - Already filtered out of list (not shown)
   - If somehow selected, validation fails: "Lure can only be applied to fishing rods"

6. User selects an enchanted book as the item
   - Enchantment section is hidden (enchanted books cannot be enchanted)

## Dependencies

- **Recipe Import UI Improvements** (`tasks/enhancement/recipe-import-ui-improvements.md`): The list view patterns and bulk import functionality from this enhancement will be used as reference/pattern for the enchanted book metadata migration view. This ensures consistency in admin UI patterns and leverages any improvements made to the recipe import workflow.

## Implementation Phases

### Phase 1: Data Migration (Admin UI)
- Create admin views for migrating `enchantCategories` and enchantment metadata
- Implement comparison logic and update functionality
- Add routes and admin dashboard integration
- Test migration workflows
- Populate Firestore with compatibility data via admin UI
- Verify data integrity

### Phase 2: Validation Utilities
- Create `src/utils/enchantments.js` with all utility functions
- Add unit tests for validation logic

### Phase 3: Crate Rewards UI
- Update `CrateSingleView.vue` with filtering and validation
- Test with various items and enchantment combinations

### Phase 4: Shop Items UI
- Add enchantment support to `ShopItemForm.vue`
- Update shop item display components to show enchantments
- Test end-to-end workflow

## Testing Considerations

- Test with items that cannot be enchanted (should hide section)
- Test with items that can be enchanted but have no compatible enchantments (edge case)
- Test all mutual exclusion rules (Sharpness/Smite, Protection types, Silk Touch/Fortune, etc.)
- Test with enchanted books themselves (should hide enchantment section - enchanted books cannot be enchanted)
- Test version-specific edge cases if any

## Success Criteria

- Users can only see and select compatible enchantments for selected items
- Conflicting enchantments are prevented with clear error messages
- Non-enchantable items don't show enchantment options
- All compatibility rules from PrismarineJS data are properly enforced
- Shop items can store and display enchantments
- Admin UI migration views successfully populate all required data
- Migration process is user-friendly and allows selective updates

## Open Questions

- Should we validate enchantment levels (e.g., prevent Protection VI if max is IV)?
- How do we handle version-specific enchantment compatibility changes?
- Should we cache enchantment compatibility lookups for performance?

