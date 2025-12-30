# Ingredient Price Breakdown Feature Specification

## 📌 Overview

This feature will display the per-ingredient price breakdown for items in the Market Overview table when an item is crafted from a single ingredient type. For example, a "Block of Emerald" costing 900 made from 9 emeralds would display "900" with "(100 per emerald)" shown below.

**Status**: 📋 **SPECIFICATION** - Not yet implemented

---

## 1. 🎯 Goals

- Help users quickly understand the effective price per ingredient for crafted items
- Provide context for price comparison between blocks and their base ingredients
- Only show breakdown when it's meaningful (single ingredient type recipes)
- Use actual shop prices, not price guide prices

## 2. 📋 User Stories

- As a user browsing the Market Overview, I want to see the per-ingredient price for items like emerald blocks so I can quickly compare block prices to individual ingredient prices
- As a user, I want this information to only appear when it's relevant (single ingredient recipes) so the UI doesn't get cluttered
- As a user, I want to see shop prices for ingredients, not theoretical price guide prices

## 3. 🔧 Functional Requirements

### 3.1 Display Logic

- **Trigger Condition**: Only display breakdown when:
  - Item has a recipe with exactly one ingredient type (e.g., 9 emeralds → 1 emerald block)
  - Recipe is available for the current server version (with fallback to previous versions)
  - Item has valid buy/sell prices
  - Calculated per-ingredient price is valid (not null/undefined/zero)

- **Calculation**:
  - Buy price per ingredient = `item.buy_price / ingredient.quantity`
  - Sell price per ingredient = `item.sell_price / ingredient.quantity`
  - Round to 2 decimal places for display

- **Display Format**:
  - Main price displayed normally (e.g., "900")
  - Breakdown shown below in smaller, gray text: `(100 per emerald)`
  - Only show when calculated price is valid

### 3.2 Data Sources

- **Recipe Data**: From `itemData.recipes_by_version` (version-aware with fallback)
- **Ingredient Prices**: From shop items in the same shop (preferred) or any shop on the server
- **Item Prices**: From the shop item's `buy_price` and `sell_price` fields

### 3.3 Version Handling

- Use server's Minecraft version to determine which recipe version to use
- Fallback to latest available recipe version ≤ current server version
- Handle version key format conversion (dots vs underscores: "1.16" vs "1_16")

### 3.4 Ingredient Price Resolution

- **Priority Order**:
  1. Same shop as the item (most relevant)
  2. Any shop on the same server
  3. If no shop price found, don't show breakdown

- **Validation**:
  - Ingredient must exist in availableItems
  - Ingredient shop item must have valid buy/sell prices
  - Skip if ingredient price is null, undefined, or zero

## 4. 🎨 UI/UX Requirements

### 4.1 Visual Design

- **Main Price**: Displayed normally in the price cell (existing behavior)
- **Breakdown Text**:
  - Smaller font size (`text-xs`)
  - Gray color (`text-gray-500`)
  - Right-aligned to match price alignment
  - Format: `(X per ingredient_name)`
  - Use `formatPrice()` utility for consistent number formatting

### 4.2 Layout

- Price cells should use flex column layout to stack main price and breakdown
- Breakdown appears below main price with small gap (`gap-1`)
- Must work in both "comfortable" and "condensed" layout modes
- Must work in both "categories" and "list" view modes
- Should not break existing price cell layout or alignment

### 4.3 Edge Cases & Error Handling

- **No Recipe**: Don't show breakdown (silent, no error)
- **Multiple Ingredients**: Don't show breakdown (only single ingredient recipes)
- **Missing Ingredient Data**: Don't show breakdown if ingredient item not found
- **Null Prices**: Don't show breakdown if item price is null/undefined
- **Zero Quantity**: Don't show breakdown if ingredient quantity is 0
- **Missing Shop Prices**: Don't show breakdown if ingredient has no shop price
- **Version Mismatch**: Use fallback logic, don't show if no recipe found

## 5. 🏗️ Implementation Plan

### 5.1 Helper Functions to Create

#### `getItemRecipe(itemData, serverVersion)`
**Purpose**: Get recipe for an item based on server version with fallback logic

**Parameters**:
- `itemData`: Item object from availableItems
- `serverVersion`: Server's Minecraft version (e.g., "1.21")

**Returns**: Recipe object or null

**Logic**:
1. Extract major.minor version from serverVersion
2. Convert to version key format (replace dots with underscores)
3. Check if recipe exists for exact version
4. If not, find latest available version ≤ server version
5. Return recipe or null

**Edge Cases**:
- Handle missing `recipes_by_version` field
- Handle version format mismatches
- Handle empty recipe objects

#### `getSingleIngredientPriceInfo(shopItem, availableItems, shopItems)`
**Purpose**: Check if item has single-ingredient recipe and calculate per-ingredient prices

**Parameters**:
- `shopItem`: Shop item object with itemData
- `availableItems`: Array of all available items
- `shopItems`: Array of all shop items on server

**Returns**: Object with ingredient info and prices, or null

**Logic**:
1. Get recipe using `getItemRecipe()`
2. Check if recipe has exactly one ingredient type
3. Find ingredient item in availableItems by material_id
4. Find ingredient shop prices (prefer same shop, then any shop)
5. Calculate per-ingredient prices
6. Return structured object or null

**Return Object Structure**:
```typescript
{
  ingredient: { material_id: string, quantity: number },
  ingredientItemData: Item,
  ingredientBuyPrice: number | null,
  ingredientSellPrice: number | null,
  itemBuyPrice: number,
  itemSellPrice: number,
  quantity: number,
  pricePerIngredientBuy: number | null,
  pricePerIngredientSell: number | null
}
```

**Edge Cases**:
- Handle missing itemData
- Handle recipes with multiple ingredient types
- Handle missing ingredient items
- Handle missing ingredient shop prices
- Handle zero or null prices
- Handle division by zero

### 5.2 Template Updates

#### Buy Price Cell Template
- Update both category view and list view templates
- Add flex column layout
- Add conditional breakdown display
- Use optional chaining for safety

#### Sell Price Cell Template
- Same updates as buy price cell
- Separate logic for sell price breakdown

### 5.3 Safety Considerations

- **Null Safety**: Use optional chaining (`?.`) for all property accesses
- **Type Checking**: Validate data types before calculations
- **Division Safety**: Check for zero quantities before division
- **Template Guards**: Use `v-if` with proper null checks
- **Error Boundaries**: Don't break existing functionality if feature fails

## 6. 📊 Performance Considerations

### 6.1 Optimization Strategies

- **Memoization**: Consider memoizing `getSingleIngredientPriceInfo()` results per row
- **Computed Properties**: Could compute ingredient info once per row instead of calling function multiple times
- **Caching**: Cache recipe lookups per item/version combination
- **Lazy Evaluation**: Only calculate when breakdown will actually be displayed

### 6.2 Performance Targets

- Function calls should complete in < 10ms per row
- No noticeable impact on table rendering time
- Should handle 100+ items without lag

## 7. 🧪 Testing Requirements

### 7.1 Unit Tests

**Test `getItemRecipe()`**:
- Returns recipe for exact version match
- Returns recipe for fallback version
- Returns null when no recipe exists
- Handles version format conversions
- Handles missing recipes_by_version field

**Test `getSingleIngredientPriceInfo()`**:
- Returns info for single-ingredient recipes
- Returns null for multi-ingredient recipes
- Returns null when ingredient not found
- Returns null when no shop prices available
- Calculates prices correctly
- Handles zero/null prices gracefully
- Prefers same-shop ingredient prices

### 7.2 Integration Tests

- Test display in Market Overview with real shop data
- Test version fallback behavior across different server versions
- Test with items that have/don't have recipes
- Test with items that have/don't have ingredient shop prices
- Test in both category and list view modes
- Test in both comfortable and condensed layouts

### 7.3 Edge Case Tests

- Items with recipes but no shop prices
- Items with shop prices but no recipes
- Items with recipes but missing ingredient items
- Items with recipes but ingredient has no shop price
- Version mismatches and fallbacks
- Zero quantities
- Null/undefined prices
- Empty recipe arrays

### 7.4 Cypress Tests

- Verify breakdown appears for emerald block with valid recipe
- Verify breakdown doesn't appear for items without recipes
- Verify breakdown doesn't appear for multi-ingredient recipes
- Verify breakdown formatting is correct
- Verify breakdown works in both view modes

## 8. 📝 Code Locations

### 8.1 Files to Modify

- `src/views/MarketOverviewView.vue`
  - Add helper functions in script section
  - Update buyPrice cell templates (category and list views)
  - Update sellPrice cell templates (category and list views)
  - Import `formatPrice` from `src/utils/pricing.js`

### 8.2 Dependencies

- `formatPrice()` from `src/utils/pricing.js` (already exists)
- `getMajorMinorVersion()` from `src/utils/serverProfile.js` (already exists)
- Recipe data structure from items collection
- Shop items data structure

## 9. 🚀 Deployment Plan

### 9.1 Prerequisites

- Items must have `recipes_by_version` data populated
- Shop items must have valid `buy_price` and `sell_price` values
- Server must have valid Minecraft version set

### 9.2 Rollout Strategy

- Feature is opt-in by design (only shows when conditions are met)
- No breaking changes to existing functionality
- Can be deployed without migration
- No database changes required

### 9.3 Monitoring

- Monitor for errors related to null property access
- Track how often breakdown is displayed vs not displayed
- Monitor performance impact of function calls
- Collect user feedback on usefulness

### 9.4 Rollback Plan

- Feature can be disabled by removing template updates
- No data changes required for rollback
- Helper functions can remain (unused) or be removed

## 10. 🔮 Future Enhancements

### 10.1 Multi-Ingredient Support

- Show breakdown for recipes with multiple ingredients
- Display as: "(100 per emerald, 50 per gold ingot)"
- Only when all ingredients have valid shop prices
- Consider complexity vs value trade-off

### 10.2 Price Comparison

- Show actual ingredient shop price alongside calculated price
- Highlight when calculated price differs significantly from actual ingredient price
- Example: "900 (100 per emerald, actual: 120)"
- Could indicate arbitrage opportunities

### 10.3 Ingredient Price Source Indicator

- Show which shop the ingredient price comes from
- Tooltip or small indicator showing source shop name
- Different styling if from different shop
- Could help users find best deals

### 10.4 Enhanced Formatting

- Show ingredient quantity in breakdown: "(100 per emerald × 9)"
- Show total ingredient cost: "(900 = 9 × 100 per emerald)"
- Color coding for price efficiency (green if cheaper as block, red if more expensive)
- Icons or visual indicators for price relationships

### 10.5 Performance Optimizations

- Memoize ingredient price info per row
- Cache recipe lookups
- Batch ingredient price lookups
- Virtual scrolling for large item lists

## 11. 📚 Related Documentation

- Recipe Feature Specification: `tasks/completed/recipes-feature-spec.md`
- Market Overview Refactoring: `tasks/refactor/market-overview-refactoring-spec.md`
- Pricing Utilities: `src/utils/pricing.js`
- Server Profile Utilities: `src/utils/serverProfile.js`

## 12. ❓ Open Questions

1. Should we show breakdown even if ingredient price is from a different shop?
2. Should we show breakdown if ingredient has no shop price (use price guide as fallback)?
3. Should we show breakdown for items with 2-3 ingredients (not just single)?
4. Should we add a setting to enable/disable this feature?
5. Should we show breakdown in Shop Items View as well, or just Market Overview?

## 13. ✅ Acceptance Criteria

- [ ] Breakdown displays for single-ingredient recipes with valid prices
- [ ] Breakdown does not display for multi-ingredient recipes
- [ ] Breakdown does not display when recipe is missing
- [ ] Breakdown does not display when ingredient price is missing
- [ ] Breakdown works in both category and list view modes
- [ ] Breakdown works in both comfortable and condensed layouts
- [ ] Breakdown uses correct price formatting
- [ ] Breakdown handles all edge cases gracefully
- [ ] No performance degradation
- [ ] All tests pass
- [ ] Code follows project style guidelines

---

**Status**: 📋 Specification - Ready for implementation
**Priority**: Medium
**Estimated Effort**: 4-6 hours
**Dependencies**: Recipe feature must be implemented and populated
