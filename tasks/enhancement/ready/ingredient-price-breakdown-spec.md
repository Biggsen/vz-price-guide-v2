# Ingredient Price Breakdown Feature Specification

## 📌 Overview

This feature will display the implied per-ingredient price breakdown in the Market Overview table when an item is crafted from a single ingredient type. For example, a "Block of Gold" selling for 900 made from 9 gold ingots would display "900" with "(100 per Gold Ingot)" shown below.

**Status**: 📋 **SPECIFICATION** - Not yet implemented

---

## 1. 🎯 Goals

- Help users quickly understand the effective price per ingredient for crafted items
- Provide context for price comparison between blocks and their base ingredients
- Only show breakdown when it's meaningful (single ingredient type recipes)
- Use the shop item's actual sell listing to calculate implied per-ingredient price (not price guide prices)
- Allow users to hide/show breakdown to reduce table noise (opt-in setting)

## 2. 📋 User Stories

- As a user browsing the Market Overview, I want to see the per-ingredient price for items like emerald blocks so I can quickly compare block prices to individual ingredient prices
- As a user, I want this information to only appear when it's relevant (single ingredient recipes) so the UI doesn't get cluttered
- As a user, I want a quick way to infer ingredient value even when the ingredient is not explicitly sold in shops

## 3. 🔧 Functional Requirements

### 3.1 Display Logic

- **Trigger Condition**: Only display breakdown when:
  - User has enabled the setting (default: off)
  - Item has a recipe with exactly one ingredient type (e.g., 9 emeralds → 1 emerald block)
  - Recipe is available for the current server version (with fallback to previous versions)
  - Recipe `output_count === 1` (v1 scope)
  - Item has a valid sell price (`sell_price` is not null/undefined and > 0)
  - Sell price is currently usable (do not show when sell is struck through due to stock full or shop owner funds = 0)
  - Calculated per-ingredient price is valid (not null/undefined/zero after formatting)

- **Calculation**:
  - Sell price per ingredient = `item.sell_price / ingredient.quantity`
  - Use `formatPrice()` for display formatting (up to 2 decimals, trailing zeros removed)

- **Display Format**:
  - Main sell price displayed normally (existing behavior)
  - Breakdown shown below in smaller, gray text: `(100 per Gold Ingot)`
  - Ingredient label uses the ingredient item's display name from `availableItems`

### 3.2 Data Sources

- **Recipe Data**: From `itemData.recipes_by_version` (version-aware with fallback)
- **Item Prices**: From the shop item's `buy_price` and `sell_price` fields
- **Ingredient Label**: From the ingredient item in `availableItems` (display name)

### 3.3 Version Handling

- Use server's Minecraft version to determine which recipe version to use
- Fallback to latest available recipe version ≤ current server version
- Handle version key format conversion (dots vs underscores: "1.16" vs "1_16")

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
- **Null Prices**: Don't show breakdown if sell price is null/undefined or <= 0
- **Zero Quantity**: Don't show breakdown if ingredient quantity is 0
- **Formatted Zero**: Don't show breakdown if formatted per-ingredient price is `'0'` or `'—'` (prevents noisy “0 per …” output)
- **Version Mismatch**: Use fallback logic, don't show if no recipe found
- **Sell Not Usable**: Don't show breakdown when sell is struck through (stock full, or shop owner funds = 0 while sell price > 0)

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

#### `getSingleIngredientSellBreakdown(shopItem, itemData, availableItems, serverVersion)`
**Purpose**: Check if item has a single-ingredient recipe (output_count = 1) and calculate implied sell price per ingredient for display

**Parameters**:
- `shopItem`: Shop item object (includes `sell_price`, `stock_full`, and `shopData.owner_funds` in Market Overview context)
- `itemData`: Item object from `availableItems` (provides `recipes_by_version`)
- `availableItems`: Array of all available items (for ingredient name lookup)
- `serverVersion`: Server's Minecraft version (e.g., "1.21")

**Returns**: Object with ingredient info and prices, or null

**Logic**:
1. Get recipe using `getItemRecipe()`
2. Check if recipe has exactly one ingredient type
3. Require `recipe.output_count === 1`
4. Validate `shopItem.sell_price > 0`
5. Validate sell is usable (not stock full, not owner funds = 0 when sell_price > 0)
6. Find ingredient item in `availableItems` by `material_id` (for label)
7. Calculate implied per-ingredient sell price: `sell_price / ingredient.quantity`
8. Format using `formatPrice()` and suppress output if formatted value is `'0'` or `'—'`
9. Return structured object or null

**Return Object Structure**:
```typescript
{
  ingredient: { material_id: string, quantity: number },
  itemSellPrice: number,
  ingredientItemData: Item,
  pricePerIngredientSell: number
}
```

**Edge Cases**:
- Handle missing itemData
- Handle recipes with multiple ingredient types
- Handle missing ingredient items
- Handle missing/invalid sell price
- Handle division by zero

### 5.2 Template Updates

#### Sell Price Cell Template
- Update both category view and list view templates
- Add flex column layout
- Add conditional breakdown display (opt-in setting)
- Do not show breakdown when sell is struck through (stock full, owner funds = 0 with sell price > 0)

### 5.3 Settings (Market Overview)

- Add a settings toggle in the Market Overview Settings modal:
  - Label: "Show ingredient breakdown"
  - Default: off
- Persist in localStorage:
  - Key: `marketOverviewShowIngredientBreakdown`
  - Value: `'true' | 'false'`

### 5.3 Safety Considerations

- **Null Safety**: Use optional chaining (`?.`) for all property accesses
- **Type Checking**: Validate data types before calculations
- **Division Safety**: Check for zero quantities before division
- **Template Guards**: Use `v-if` with proper null checks
- **Error Boundaries**: Don't break existing functionality if feature fails

## 6. 📊 Performance Considerations

### 6.1 Optimization Strategies

- **Memoization**: Consider memoizing `getSingleIngredientSellBreakdown()` results per row
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

**Test `getSingleIngredientSellBreakdown()`**:
- Returns info for single-ingredient recipes with `output_count === 1`
- Returns null for multi-ingredient recipes
- Returns null when `output_count !== 1`
- Returns null when ingredient not found
- Returns null when sell price is null/undefined/<= 0
- Returns null when sell is not usable (stock full, or owner funds = 0 with sell price > 0)
- Calculates per-ingredient sell price correctly
- Suppresses output when formatted result is `'0'` or `'—'`

### 7.2 Integration Tests

- Test display in Market Overview with real shop data
- Test version fallback behavior across different server versions
- Test with items that have/don't have recipes
- Test in both category and list view modes
- Test in both comfortable and condensed layouts

### 7.3 Edge Case Tests

- Items with shop prices but no recipes
- Items with recipes but missing ingredient items
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
- Verify breakdown is hidden by default and appears when setting is enabled
- Verify breakdown does not appear when sell is struck through (stock full / owner funds = 0)

## 8. 📝 Code Locations

### 8.1 Files to Modify

- `src/views/MarketOverviewView.vue`
  - Add helper functions in script section
  - Add settings state + localStorage persistence
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
- Consider complexity vs value trade-off

### 10.2 Price Comparison

- Add optional comparison to actual ingredient shop prices (if/when desired)

### 10.3 Ingredient Price Source Indicator

- If ingredient shop price comparisons are added, optionally show which shop the ingredient price came from

### 10.4 Enhanced Formatting

- Show ingredient quantity in breakdown: "(100 per emerald × 9)"
- Show total ingredient cost: "(900 = 9 × 100 per emerald)"
- Color coding for price efficiency (green if cheaper as block, red if more expensive)
- Icons or visual indicators for price relationships

### 10.5 Performance Optimizations

- Memoize ingredient breakdown info per row
- Cache recipe lookups
- Virtual scrolling for large item lists

## 11. 📚 Related Documentation

- Recipe Feature Specification: `tasks/completed/recipes-feature-spec.md`
- Market Overview Refactoring: `tasks/refactor/market-overview-refactoring-spec.md`
- Pricing Utilities: `src/utils/pricing.js`
- Server Profile Utilities: `src/utils/serverProfile.js`

## 12. ❓ Open Questions

1. Should we expand beyond `output_count === 1` to cover recipes like sticks/slabs?
2. Should we add an optional “show in buy column too” mode?
3. Should we show breakdown in Shop Items View as well, or just Market Overview?

## 13. ✅ Acceptance Criteria

- [ ] Breakdown is hidden by default and only appears when enabled via settings
- [ ] Breakdown displays in the sell price column for single-ingredient recipes with valid sell prices
- [ ] Breakdown does not display for multi-ingredient recipes
- [ ] Breakdown does not display when `output_count !== 1`
- [ ] Breakdown does not display when recipe is missing
- [ ] Breakdown does not display when ingredient item data cannot be found for labeling
- [ ] Breakdown does not display when sell is not usable (stock full, or owner funds = 0 while sell price > 0)
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
**Estimated Effort**: 2-4 hours
**Dependencies**: Recipe feature must be implemented and populated
