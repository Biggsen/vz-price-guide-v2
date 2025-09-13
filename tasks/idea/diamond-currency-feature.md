# 💎 Diamond Currency Feature - VZ Price Guide

## 📌 Overview

Implement a currency toggle system that allows users to switch between traditional money units and diamond-based currency. The diamond currency will use a conversion ratio to transform existing prices, making the price guide relevant for Minecraft servers that use diamond-based economies.

**Status**: ✅ **IMPLEMENTED** - Core functionality complete, but overengineered

---

## 🎯 Goals

1. **Currency Toggle**: Add a simple toggle between "Money" and "Diamond" currency modes
2. **Automatic Conversion**: Convert existing prices using a configurable ratio (32:1)
3. **Diamond Formatting**: Display prices in diamond blocks when ≥ 9 diamonds
4. **Backward Compatibility**: Maintain existing functionality for money-based servers
5. **Shop Manager Integration**: Support diamond currency in shop management features

---

## 📊 Conversion Analysis

Based on user examples, the conversion ratio is approximately **32:1**:

| Item                | Current Price | Diamond Price | Ratio  |
| ------------------- | ------------- | ------------- | ------ |
| 64 Cactus (stack)   | 64            | 2 diamonds    | 32:1   |
| Netherite Ingot     | 840           | 27 diamonds   | 31.1:1 |
| 64 Coal Ore (stack) | 640           | 18 diamonds   | 35.6:1 |

**Recommended conversion ratio**: **32:1** (current units ÷ 32 = diamonds)

---

## 📋 Current Implementation Status

### ✅ **What's Implemented**

**Core Infrastructure (COMPLETE)**

-   ✅ Currency toggle in settings (Money/Diamond)
-   ✅ Configurable conversion ratio (32:1 default)
-   ✅ localStorage persistence for currency settings
-   ✅ Clean separation between money and diamond logic

**Utility Functions (COMPLETE)**

-   ✅ `convertToDiamondPrice()` and `convertToMoneyPrice()` for conversions
-   ✅ `formatDiamondPrice()` with smart diamond block formatting (≥9 diamonds = blocks)
-   ✅ Currency-aware pricing functions (`buyUnitPriceWithCurrency`, etc.)

**UI Integration (COMPLETE)**

-   ✅ Clean toggle interface in settings modal
-   ✅ Automatic price updates when switching currencies
-   ✅ Hides diamond items when using diamond currency (smart UX)

**Price Display (COMPLETE)**

-   ✅ `ItemTable.vue` updated to handle diamond formatting
-   ✅ All price columns show correct currency
-   ✅ Sorting works with diamond prices

### ⚠️ **Overengineered Components**

**Diamond Recipe System (OVERENGINEERED)**

-   ❌ **Problem**: Created a separate pricing system for items with diamond in their recipes
-   ❌ **Issue**: Two competing pricing systems (conversion vs recipe-based)
-   ❌ **Complexity**: `findDiamondRecipeItems()` function with 140+ lines of complex logic
-   ❌ **Inconsistency**: Same item gets different prices depending on which system is used

**Redundant Functions (OVERENGINEERED)**

-   ❌ **Problem**: Multiple similar formatting functions:
    -   `formatDiamondRecipePrice()`
    -   `formatDiamondRecipeStackPrice()`
    -   `formatDiamondRecipeSellPrice()`
    -   `formatDiamondRecipeSellStackPrice()`
-   ❌ **Issue**: Could be consolidated into a single parameterized function

**Complex Price Logic (OVERENGINEERED)**

-   ❌ **Problem**: `getDisplayPrice()` function chooses between two pricing systems
-   ❌ **Issue**: Creates confusion about which system is used for which items
-   ❌ **Maintenance**: Two systems to maintain and debug

### 🚫 **Missing Implementation (From Original Spec)**

**Shop Management (NOT IMPLEMENTED)**

-   ❌ `ShopItemTable.vue` has no diamond currency support
-   ❌ `ShopItemForm.vue` has no diamond currency support
-   ❌ No server/shop-level currency configuration

**Data Model Extensions (NOT IMPLEMENTED)**

-   ❌ No `currency_type` field in servers/shops collections
-   ❌ No database-level currency support

**Admin Tools (NOT IMPLEMENTED)**

-   ❌ No diamond currency in `AddItemView.vue` or `EditItemView.vue`
-   ❌ No migration tools

---

## 🔧 **Recommendations for Simplification**

### **Remove Diamond Recipe System**

The recipe-based pricing adds unnecessary complexity without clear user value. The simple 32:1 conversion ratio is:

-   ✅ Easier to understand
-   ✅ More predictable
-   ✅ Easier to maintain
-   ✅ Matches the original spec

### **Consolidate Functions**

Replace multiple `formatDiamondRecipe*` functions with a single parameterized function.

### **Simplify Price Logic**

Use one consistent pricing system (conversion-based) instead of two competing systems.

### **Focus on Core Value**

The basic currency toggle with conversion is the main value. The complex recipe system can be removed.

---

## 📊 **Implementation Comparison**

### **Current Overengineered Approach**

```javascript
// Two competing pricing systems
function getDisplayPrice(item) {
	if (
		currencyType.value === 'diamond' &&
		diamondRecipePriceMap.value[item.material_id] !== undefined
	) {
		// Use recipe-based pricing (inconsistent)
		return diamondRecipePriceMap.value[item.material_id]
	}
	// Use conversion-based pricing
	return getItemEffectivePrice(item)
}

// Complex recipe calculation (140+ lines)
function findDiamondRecipeItems(allItems, version) {
	// ... complex logic to calculate recipe-based prices
	// Diamond = 1, other ingredients converted to diamond equivalent
}

// Multiple redundant functions
formatDiamondRecipePrice()
formatDiamondRecipeStackPrice()
formatDiamondRecipeSellPrice()
formatDiamondRecipeSellStackPrice()
```

### **Recommended Simplified Approach**

```javascript
// Single consistent pricing system
function getDisplayPrice(item) {
	const moneyPrice = getEffectivePrice(item, version)
	if (currencyType === 'diamond') {
		return convertToDiamondPrice(moneyPrice, 32)
	}
	return moneyPrice
}

// Single parameterized function
function formatPriceWithCurrency(price, currencyType, priceMultiplier, sellMargin, stack) {
	const calculatedPrice = price * priceMultiplier * (sellMargin || 1) * (stack || 1)
	if (currencyType === 'diamond') {
		return formatDiamondPrice(calculatedPrice)
	}
	return formatCurrency(calculatedPrice)
}
```

### **Benefits of Simplification**

-   ✅ **Consistency**: All items use the same pricing logic
-   ✅ **Predictability**: Users know exactly how prices are calculated
-   ✅ **Maintainability**: One system to debug and maintain
-   ✅ **Performance**: No complex recipe calculations
-   ✅ **User Experience**: Simpler, more intuitive behavior

---

## 🏗️ Technical Architecture

### 1. Data Model Extensions

#### Economy Configuration

```ts
EconomyConfig {
  priceMultiplier: number;
  sellMargin: number;
  roundToWhole: boolean;
  version: string;
  currencyType: 'money' | 'diamond';  // NEW
  diamondConversionRatio: number;     // NEW (default: 32)
}
```

#### Shop/Server Currency Support

```ts
Server {
  // ... existing fields
  currency_type: 'money' | 'diamond';  // NEW (default: 'money')
  diamond_conversion_ratio: number;    // NEW (default: 32)
}

Shop {
  // ... existing fields
  currency_type: 'money' | 'diamond';  // NEW (inherits from server)
}
```

### 2. Core Utility Functions

#### New Functions in `src/utils/pricing.js`

```ts
// Convert money price to diamond price
function convertToDiamondPrice(moneyPrice: number, ratio: number = 32): number

// Convert diamond price to money price
function convertToMoneyPrice(diamondPrice: number, ratio: number = 32): number

// Format diamond price as either diamonds or diamond blocks (e.g., "5 diamonds" or "3 diamond blocks")
function formatDiamondPrice(diamondPrice: number): string

// Get effective price in current currency
function getEffectivePriceInCurrency(
	item: Item,
	version: string,
	currencyType: string,
	config: EconomyConfig
): number
```

### 3. UI Components

#### Currency Toggle Component

-   Simple toggle switch in economy settings
-   Visual indicator showing current currency mode
-   Automatic price updates when toggled

#### Price Display Updates

-   Update `ItemTable.vue` to handle diamond formatting
-   Update `ShopItemTable.vue` for shop management
-   Update all price input forms to support diamond entry

---

## 📋 Implementation Tasks

### Phase 1: Core Infrastructure

#### Task 1.1: Extend Economy Configuration

-   [x] **Update `src/views/HomeView.vue`**
    -   [x] Add `currencyType` ref (default: 'money')
    -   [x] Add `diamondConversionRatio` ref (default: 32)
    -   [x] Update `economyConfig` computed property
    -   [x] Add localStorage persistence for new fields
    -   [x] Update `resetEconomyConfig()` function

#### Task 1.2: Create Diamond Currency Utilities

-   [x] **Extend `src/utils/pricing.js`**
    -   [x] Add `convertToDiamondPrice()` function (money → diamonds)
    -   [x] Add `convertToMoneyPrice()` function (diamonds → money)
    -   [x] Add `formatDiamondPrice()` function (diamonds → diamonds or diamond blocks based on amount)
    -   [x] Add `getEffectivePriceInCurrency()` function
    -   [x] Update existing price functions to handle currency type
    -   [x] **OVERENGINEERED**: Added `findDiamondRecipeItems()` function (should be removed)

#### Task 1.3: Add Currency Toggle UI

-   [x] **Update economy settings in `src/views/HomeView.vue`**
    -   [x] Add currency type toggle (Money/Diamond)
    -   [x] Add diamond conversion ratio input (when in diamond mode)
    -   [x] Update styling to accommodate new controls
    -   [x] Add visual indicators for current currency mode

### Phase 2: Price Display Updates

#### Task 2.1: Update Item Table Display

-   [x] **Update `src/components/ItemTable.vue`**
    -   [x] Modify price display logic to use `getEffectivePriceInCurrency()`
    -   [x] Add diamond formatting for diamond currency mode (diamonds or diamond blocks)
    -   [x] Update sorting logic to handle diamond prices
    -   [x] Ensure all price columns show correct currency
    -   [x] **OVERENGINEERED**: Added complex `diamondRecipePriceMap` logic (should be simplified)

#### Task 2.2: Update Shop Management

-   [ ] **Update `src/components/ShopItemTable.vue`**
    -   Add currency type detection from shop/server
    -   Update price display and formatting (diamonds or diamond blocks)
-   Modify price input handling for diamond entry
    -   Update price history display

#### Task 2.3: Update Price Input Forms

-   [ ] **Update `src/components/ShopItemForm.vue`**
    -   Add currency type detection
    -   Update price input validation for diamonds
-   Add diamond formatting in price previews (diamonds or diamond blocks)
    -   Handle currency conversion in form submission

### Phase 3: Shop Manager Integration

#### Task 3.1: Add Currency Support to Data Models

-   [ ] **Update server data structure**

    -   Add `currency_type` field to servers collection (default: 'money')
    -   Add `diamond_conversion_ratio` field to servers collection (default: 32)
    -   Update Firestore rules to allow currency type fields
    -   Update `src/utils/serverProfile.js` to handle new fields

-   [ ] **Update shop data structure**
    -   Add `currency_type` field to shops collection (inherits from server)
    -   Update Firestore rules to allow currency type
    -   Create migration script for existing servers and shops

#### Task 3.2: Update Shop Management Views

-   [ ] **Update `src/views/ShopsView.vue`**

    -   Add currency type selection in shop creation/editing
    -   Display currency type in shop list
    -   Add currency type filtering

-   [ ] **Update `src/views/ServersView.vue`**
    -   Add currency type selection in server creation/editing form
    -   Add diamond conversion ratio input (when currency type is 'diamond')
    -   Display currency type in server list table
    -   Update form validation to handle new fields
    -   Update `serverForm` data structure to include currency fields

#### Task 3.3: Update Market Overview

-   [ ] **Update `src/views/MarketOverviewView.vue`**
    -   Handle currency type detection from shops/servers
    -   Display currency type indicators
    -   Update trading opportunity calculations for diamond currency

### Phase 4: Admin and Management Tools

#### Task 4.1: Add Currency Management to Admin

-   [ ] **Update `src/views/AddItemView.vue`**

    -   Add currency type selection
    -   Update price input handling
    -   Add diamond price preview (diamonds or diamond blocks)

-   [ ] **Update `src/views/EditItemView.vue`**
    -   Add currency type selection
    -   Update price input handling
    -   Add diamond price preview (diamonds or diamond blocks)

#### Task 4.2: Create Currency Migration Tools

-   [ ] **Create `scripts/migrateToDiamondCurrency.js`**

    -   Bulk convert existing prices to diamond format
    -   Update server currency types and conversion ratios
    -   Update shop currency types (inherit from servers)
    -   Provide rollback functionality

-   [ ] **Create `scripts/auditCurrencyTypes.js`**
    -   Audit current currency usage across servers and shops
    -   Identify currency type consistency issues
    -   Generate migration recommendations
    -   Validate server-shop currency relationships

### Phase 5: Testing and Polish

#### Task 5.1: Comprehensive Testing

-   [ ] **Test currency conversion accuracy**

    -   Verify 32:1 ratio works correctly
    -   Test edge cases (zero prices, very large prices)
    -   Test diamond formatting and unit selection

-   [ ] **Test UI interactions**

    -   Currency toggle functionality
    -   Price input validation
    -   Sorting and filtering with different currencies

-   [ ] **Test data persistence**
    -   localStorage configuration persistence
    -   Firestore currency type storage
    -   Migration script accuracy

#### Task 5.2: Documentation and Help

-   [ ] **Update user documentation**

    -   Add diamond currency explanation
    -   Document conversion ratio concept
    -   Provide usage examples

-   [ ] **Add in-app help**
    -   Tooltips for currency controls
    -   Help text for diamond formatting
    -   Currency type indicators

---

## 🎨 UI/UX Considerations

### Currency Toggle Design

-   **Simple toggle switch**: Money ↔ Diamond
-   **Visual indicators**: Currency icons (💰/💎)
-   **Contextual labels**: "Money Mode" / "Diamond Mode"

### Diamond Price Formatting

-   **Single unit display**: Display as either diamonds OR diamond blocks, not mixed
-   **Diamond blocks**: For larger amounts (e.g., "3 diamond blocks" for 27+ diamonds)
-   **Individual diamonds**: For smaller amounts (e.g., "5 diamonds" for < 9 diamonds)
-   **Threshold-based**: Choose display unit based on price size (e.g., ≥ 9 diamonds = blocks, < 9 = diamonds)
-   **Consistent format**: "3 diamond blocks" or "5 diamonds" (never mixed)

### Price Input Handling

-   **Diamond input**: Allow whole numbers only (1, 2, 3 diamonds or diamond blocks)
-   **Unit selection**: Choose input unit (diamonds or diamond blocks)
-   **Conversion preview**: Show both currencies when switching
-   **Validation**: Prevent negative or decimal diamond prices
-   **Auto-formatting**: Display in appropriate unit based on amount

---

## 🔧 Technical Considerations

### Performance

-   **Lazy conversion**: Convert prices on-demand, not pre-calculate
-   **Caching**: Cache converted prices during session
-   **Efficient formatting**: Optimize diamond block calculation

### Data Integrity

-   **Backup strategy**: Create backups before currency migrations
-   **Rollback plan**: Ability to revert currency changes
-   **Validation**: Ensure conversion ratio is positive and reasonable

### Compatibility

-   **Backward compatibility**: Existing money-based servers and shops continue working
-   **Server-level currency**: All shops on a server inherit the server's currency type
-   **Currency consistency**: Shops automatically use their server's currency settings
-   **Migration path**: Clear upgrade path for existing users

---

## 📈 Success Metrics

1. **User Adoption**: Percentage of shops using diamond currency
2. **Conversion Accuracy**: User feedback on price conversion accuracy
3. **Feature Usage**: Currency toggle usage statistics
4. **Error Reduction**: Fewer price-related support requests

---

## 🚀 Future Enhancements

### Advanced Currency Features

-   **Custom conversion ratios**: Per-server or per-shop ratios
-   **Multiple diamond types**: Different diamond variants
-   **Currency exchange rates**: Real-time conversion between currencies

### Enhanced Formatting

-   **Compact diamond display**: "3d" or "3db" shorthand
-   **Price ranges**: Show min/max diamond prices
-   **Trend indicators**: Diamond price change arrows

### Integration Features

-   **Plugin integration**: Connect to Minecraft economy plugins
-   **API endpoints**: Currency conversion APIs
-   **Bulk operations**: Mass currency conversion tools
