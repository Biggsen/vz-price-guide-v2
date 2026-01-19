# Crate Rewards Enchantment Validation

## Status: Needs revision

This spec is directionally correct, but it conflicts with current `CrateSingleView.vue` behavior in a few important places (especially around enchanted books), and it omits several UI/validation details that are required for a smooth implementation.

## Revision notes (what must be clarified/updated)

- **Enchanted book behavior is currently contradictory**
	- The spec says to return `[]` / hide enchantments if the selected item’s `category === 'enchantments'`.
	- In `CrateSingleView.vue`, selecting an `enchanted_book_*` item currently normalizes to the base `enchanted_book` and pre-populates enchantments (this is an existing workflow).
	- Revision needed: explicitly define the supported crate-reward use cases:
		- **Allow** “enchanted book reward with enchantments” (current behavior), or
		- **Disallow** enchanting books entirely (and remove/replace the normalization behavior), or
		- Treat “enchantment items” (category `enchantments`) differently from base `enchanted_book` inventory items.

- **Validation path is incomplete (two add flows)**
	- The modal adds enchantments via both `saveEnchantment()` and `onEnchantmentSelected()`.
	- This spec only describes adding conflict validation in `saveEnchantment()`, which would leave the other path unvalidated unless the implementation is consolidated.
	- Revision needed: specify a single source of truth for adding enchantments so compatibility/conflict checks always run.

- **Conflict error messaging has no defined UI target**
	- The spec proposes setting `addItemFormError` to the conflict reason string.
	- In `CrateSingleView.vue`, `addItemFormError` is currently rendered only for specific field errors and won’t reliably display arbitrary conflict messages.
	- Revision needed: define a dedicated error state (e.g., `enchantmentError`) and where it displays (near the enchantment controls/modal), or explicitly expand the modal’s error rendering rules.

- **No policy for “item changed after adding enchantments”**
	- If the user changes the selected item, existing enchantments may become invalid.
	- Revision needed: decide and document one behavior:
		- auto-clear enchantments on item change, or
		- auto-prune only incompatible enchantments, or
		- keep but show warnings and block save until fixed.

- **No rules for duplicates / level replacement**
	- The crate form stores enchantments as an object keyed by enchantment item id (often with value `1`), and users can add multiple “same type different level” books.
	- `ShopItemForm.vue` already implements sensible behavior (replace lower level with higher level of the same enchantment type, ignore lower/equal).
	- Revision needed: specify whether crate rewards should match that behavior, allow duplicates, or enforce one-per-type.

- **Edge case: compatibility filtering when the user already has incompatible enchantments**
	- Filtering the dropdown prevents new invalid picks, but it doesn’t address already-selected invalid states (e.g., imported YAML or prior saves).
	- Revision needed: specify defensive validation on save (and/or display) to detect and surface incompatible existing enchantments.

## Overview

Integrate enchantment compatibility validation into the crate rewards UI (`CrateSingleView.vue`), ensuring users can only select compatible enchantments for items and preventing conflicting enchantment combinations.

## Prerequisites

This enhancement depends on:
- **Enchantment Compatibility Feature** (`tasks/enchantment-compatibility-feature.md`): Phases 1 and 2 must be complete
  - Data migration views must have populated `enchantCategories` and `enchantment_category` fields
  - Validation utilities in `src/utils/enchantments.js` must be implemented

## Current State

Enchantment selection in `CrateSingleView.vue` currently shows all enchantments and allows any selection, regardless of item compatibility or enchantment conflicts.

## Changes Required

### 1. Filter Enchantment List

Update `enchantmentItems` computed property to filter based on selected item:
- Use `getCompatibleEnchantments()` utility from `src/utils/enchantments.js`
- Only show compatible enchantments in the modal dropdown
- Return empty array if no item is selected
- Return empty array if selected item is an enchanted book itself (category === 'enchantments')

### 2. Hide Enchantment Section for Non-Enchantable Items

- Hide "Enchantments" section when selected item is not enchantable
- Hide "Enchantments" section when selected item is an enchanted book itself (category === 'enchantments')
- Use `isItemEnchantable()` utility to determine visibility

### 3. Validation on Add

- When adding enchantment, check for conflicts with existing enchantments
- Show error message if conflict detected
- Use `hasEnchantmentConflict()` and `getEnchantmentConflictReason()` utilities
- Prevent adding conflicting enchantments

### 4. Visual Feedback

- Show warning/error indicators for incompatible selections (defensive check)
- Display clear error messages when conflicts are detected
- Disable incompatible options (though they should already be filtered out)

## Implementation Details

### Code Changes in `CrateSingleView.vue`

#### Import Validation Utilities

```javascript
import {
	isItemEnchantable,
	getCompatibleEnchantments,
	hasEnchantmentConflict,
	getEnchantmentConflictReason
} from '../utils/enchantments.js'
```

#### Update `enchantmentItems` Computed Property

Replace the current implementation (around line 314) with:

```javascript
// Enchantment items for selection - filtered by compatibility
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
```

#### Update Enchantment Section Visibility

Add computed property to determine if enchantment section should be shown:

```javascript
const showEnchantmentSection = computed(() => {
	if (!itemForm.value.item_id) return false
	const selectedItem = getItemById(itemForm.value.item_id)
	if (!selectedItem) return false
	
	// Hide for enchanted books
	if (selectedItem.category === 'enchantments') return false
	
	// Hide for non-enchantable items
	return isItemEnchantable(selectedItem)
})
```

Then conditionally render the enchantment section in the template using `v-if="showEnchantmentSection"`.

#### Add Validation to `saveEnchantment()` Function

Update the function (around line 1158) to include conflict checking:

```javascript
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
	
	// No conflict, add the enchantment
	itemForm.value.enchantments[newEnchId] = 1
	showEnchantmentModal.value = false
	enchantmentForm.value = { enchantment: '' }
}
```

## Example Workflow: Iron Sword

1. User selects "iron_sword" item
   - Item has `enchantCategories: ["weapon", "fire_aspect", "melee_weapon", "durability", "sharp_weapon", "sweeping", "vanishing"]`
   - System recognizes item is enchantable
   - Enchantment section is visible

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

## Testing Considerations

- Test with items that cannot be enchanted (should hide section)
- Test with items that can be enchanted but have no compatible enchantments (edge case - should show empty list)
- Test all mutual exclusion rules (Sharpness/Smite, Protection types, Silk Touch/Fortune, etc.)
- Test with enchanted books themselves (should hide enchantment section)
- Test error message display when conflicts are detected
- Test that filtered list updates correctly when item selection changes

## Success Criteria

- Users can only see and select compatible enchantments for selected items
- Conflicting enchantments are prevented with clear error messages
- Non-enchantable items don't show enchantment options
- Enchanted books themselves don't show enchantment section
- All compatibility rules from PrismarineJS data are properly enforced
- Error messages are user-friendly and actionable

