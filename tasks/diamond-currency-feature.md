# 💎 Diamond Currency Feature - VZ Price Guide

## 📌 Overview

Implement a currency toggle system that allows users to switch between traditional money units and diamond-based currency. The diamond currency will use a conversion ratio to transform existing prices, making the price guide relevant for Minecraft servers that use diamond-based economies.

**Status**: 🚧 **PLANNING** - Ready for implementation

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
Shop {
  // ... existing fields
  currency_type: 'money' | 'diamond';  // NEW
}

Server {
  // ... existing fields
  currency_type: 'money' | 'diamond';  // NEW
}
```

### 2. Core Utility Functions

#### New Functions in `src/utils/pricing.js`

```ts
// Convert money price to diamond price
function convertToDiamondPrice(moneyPrice: number, ratio: number = 32): number

// Convert diamond price to money price
function convertToMoneyPrice(diamondPrice: number, ratio: number = 32): number

// Format diamond price (e.g., "3 diamond blocks + 2 diamonds")
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

-   [ ] **Update `src/views/HomeView.vue`**
    -   Add `currencyType` ref (default: 'money')
    -   Add `diamondConversionRatio` ref (default: 32)
    -   Update `economyConfig` computed property
    -   Add localStorage persistence for new fields
    -   Update `resetEconomyConfig()` function

#### Task 1.2: Create Diamond Currency Utilities

-   [ ] **Extend `src/utils/pricing.js`**
    -   Add `convertToDiamondPrice()` function
    -   Add `convertToMoneyPrice()` function
    -   Add `formatDiamondPrice()` function
    -   Add `getEffectivePriceInCurrency()` function
    -   Update existing price functions to handle currency type

#### Task 1.3: Add Currency Toggle UI

-   [ ] **Update economy settings in `src/views/HomeView.vue`**
    -   Add currency type toggle (Money/Diamond)
    -   Add diamond conversion ratio input (when in diamond mode)
    -   Update styling to accommodate new controls
    -   Add visual indicators for current currency mode

### Phase 2: Price Display Updates

#### Task 2.1: Update Item Table Display

-   [ ] **Update `src/components/ItemTable.vue`**
    -   Modify price display logic to use `getEffectivePriceInCurrency()`
    -   Add diamond formatting for diamond currency mode
    -   Update sorting logic to handle diamond prices
    -   Ensure all price columns show correct currency

#### Task 2.2: Update Shop Management

-   [ ] **Update `src/components/ShopItemTable.vue`**
    -   Add currency type detection from shop/server
    -   Update price display and formatting
    -   Modify price input handling for diamond entry
    -   Update price history display

#### Task 2.3: Update Price Input Forms

-   [ ] **Update `src/components/ShopItemForm.vue`**
    -   Add currency type detection
    -   Update price input validation for diamonds
    -   Add diamond formatting in price previews
    -   Handle currency conversion in form submission

### Phase 3: Shop Manager Integration

#### Task 3.1: Add Currency Support to Data Models

-   [ ] **Update shop and server data structures**
    -   Add `currency_type` field to shops collection
    -   Add `currency_type` field to servers collection
    -   Update Firestore rules to allow currency type
    -   Create migration script for existing shops

#### Task 3.2: Update Shop Management Views

-   [ ] **Update `src/views/ShopsView.vue`**

    -   Add currency type selection in shop creation/editing
    -   Display currency type in shop list
    -   Add currency type filtering

-   [ ] **Update `src/views/ServersView.vue`**
    -   Add currency type selection in server creation/editing
    -   Display currency type in server list

#### Task 3.3: Update Market Overview

-   [ ] **Update `src/views/MarketOverviewView.vue`**
    -   Handle mixed currency types across shops
    -   Display currency type indicators
    -   Update trading opportunity calculations for diamond currency

### Phase 4: Admin and Management Tools

#### Task 4.1: Add Currency Management to Admin

-   [ ] **Update `src/views/AddItemView.vue`**

    -   Add currency type selection
    -   Update price input handling
    -   Add diamond price preview

-   [ ] **Update `src/views/EditItemView.vue`**
    -   Add currency type selection
    -   Update price input handling
    -   Add diamond price preview

#### Task 4.2: Create Currency Migration Tools

-   [ ] **Create `scripts/migrateToDiamondCurrency.js`**

    -   Bulk convert existing prices to diamond format
    -   Update shop/server currency types
    -   Provide rollback functionality

-   [ ] **Create `scripts/auditCurrencyTypes.js`**
    -   Audit current currency usage across shops
    -   Identify mixed currency scenarios
    -   Generate migration recommendations

### Phase 5: Testing and Polish

#### Task 5.1: Comprehensive Testing

-   [ ] **Test currency conversion accuracy**

    -   Verify 32:1 ratio works correctly
    -   Test edge cases (zero prices, very large prices)
    -   Test diamond block formatting

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

-   **Diamond blocks**: Show as "3 diamond blocks" (≥ 9 diamonds)
-   **Mixed format**: "1 diamond block + 2 diamonds" (11 diamonds)
-   **Small amounts**: "5 diamonds" (< 9 diamonds)

### Price Input Handling

-   **Diamond input**: Allow whole numbers only
-   **Conversion preview**: Show both currencies when switching
-   **Validation**: Prevent negative or decimal diamond prices

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

-   **Backward compatibility**: Existing money-based shops continue working
-   **Mixed currency**: Handle shops with different currency types
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

-   **Compact diamond display**: "3db + 2d" shorthand
-   **Price ranges**: Show min/max diamond prices
-   **Trend indicators**: Diamond price change arrows

### Integration Features

-   **Plugin integration**: Connect to Minecraft economy plugins
-   **API endpoints**: Currency conversion APIs
-   **Bulk operations**: Mass currency conversion tools
