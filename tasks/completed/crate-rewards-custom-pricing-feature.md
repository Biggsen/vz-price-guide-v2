# Crate Rewards Custom Pricing Feature

## Overview

Allow users to assign custom prices to items that show "Unknown" values in crate rewards, providing flexibility for items not in the catalog or with missing pricing data.

## Problem Statement

Currently, items without pricing data in the catalog show "Unknown" values in crate reward displays, which limits the usefulness of value calculations for crate rewards. Users should be able to assign their own prices to these items to get accurate total values.

## Proposed Solution

### Database Schema Changes

Add fields to the items collection to track custom pricing:

```javascript
{
  // ... existing fields ...
  custom_price: number | null,           // User-assigned price
  price_source: 'catalog' | 'custom',    // How the price was determined
  custom_price_updated_at: timestamp,    // When custom price was set
  custom_price_updated_by: string        // User ID who set the price
}
```

### UI Implementation

1. **Inline Editing**: Make "Unknown" values clickable/editable in crate reward item rows
2. **Visual Indicators**: Show different styling for custom vs catalog prices
3. **Price Source Tooltips**: Display who set custom prices and when
4. **Reset Option**: Allow reverting custom prices back to catalog pricing

### Value Calculation Logic

Update `getItemValue` function in CrateSingleView to prioritize custom prices:

```javascript
function getItemValue(rewardItem) {
	const item = getItemById(rewardItem.item_id)
	if (!item) return 'Unknown'

	// Check for custom price first
	if (item.price_source === 'custom' && item.custom_price) {
		const baseValue = item.custom_price * (rewardItem.quantity || 1)
		// Still add enchantment values
		let enchantmentValue = 0
		// ... enchantment calculation logic ...
		return baseValue + enchantmentValue
	}

	// Fallback to catalog pricing
	const unitPrice = getEffectivePrice(item, currentVersion.value)
	if (unitPrice === 0) return 'Unknown'

	// ... rest of existing logic
}
```

### Database Functions

```javascript
async function updateItemCustomPrice(itemId, customPrice, userId) {
	const itemRef = doc(db, 'items', itemId)
	await updateDoc(itemRef, {
		custom_price: customPrice,
		price_source: 'custom',
		custom_price_updated_at: new Date().toISOString(),
		custom_price_updated_by: userId
	})
}

async function resetToCatalogPricing(itemId, userId) {
	const itemRef = doc(db, 'items', itemId)
	await updateDoc(itemRef, {
		custom_price: null,
		price_source: 'catalog',
		custom_price_updated_at: new Date().toISOString(),
		custom_price_updated_by: userId
	})
}
```

## Benefits

-   **Flexibility**: Users can override any item's pricing in crate rewards
-   **Transparency**: Clear indication of price source (catalog vs custom)
-   **Audit Trail**: Track who set custom prices and when
-   **Fallback**: Can revert to catalog pricing if needed
-   **Accurate Totals**: Better value calculations for crate reward totals

## UI Components Needed

1. **EditableValue component** - handles inline editing in crate reward rows
2. **PriceSourceIndicator** - shows custom/catalog status
3. **CustomPriceModal** - for detailed price assignment
4. **PriceHistory** - optional, to track price changes

## Implementation Priority

**Medium** - Useful feature that enhances crate reward value accuracy but not critical for core functionality.

## Related Features

-   Crate reward value calculations
-   Crate reward item display
-   Item catalog management
-   User permissions and admin controls
