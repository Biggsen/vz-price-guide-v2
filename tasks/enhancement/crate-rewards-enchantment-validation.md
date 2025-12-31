# Crate Rewards Enchantment Validation

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

