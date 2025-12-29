# 💎 Diamond Currency Feature - VZ Price Guide

## 📌 Overview

Implement a currency toggle system that allows users to switch between traditional money units and diamond-based currency. The diamond currency uses ratio-based pricing (e.g., "1 diamond per 32 items") calculated from existing price data, then rounded to common Minecraft quantities. This approach recreates the natural diamond economy format used by servers like TogetherCraft.

**Status**: ✅ **COMPLETED** - December 29, 2025

---

## 🎯 Goals

1. **Currency Toggle**: Add a simple toggle between "Money" and "Diamond" currency modes
2. **Ratio-Based Conversion**: Convert existing prices to diamond ratios using price relationships
3. **Quantity Rounding**: Round ratios to common Minecraft quantities (4, 8, 16, 32, 64, 128, 256)
4. **Hybrid Display**: Show compact ratio format in table cells with full context in tooltips
5. **Backward Compatibility**: Maintain existing functionality for money-based servers
6. **Shop Manager Integration**: Support diamond currency in shop management features

---

## 📊 Conversion Strategy

### Price-to-Ratio Conversion

Convert existing money prices to diamond ratios using relative pricing:

**Example:**
- Diamond price: 280
- Amethyst Shard price: 10
- Raw ratio: 280 ÷ 10 = 28 shards per diamond
- Rounded to common quantity: 28 → **32** (nearest standard grouping)
- Display format: **"1 diamond per 32 amethyst shards"**

### Rounding Targets

Round calculated ratios to nearest standard Minecraft quantities:
- **Common quantities**: 1, 2, 4, 8, 16, 32, 64, 128, 256
- **Shulker-aware**: Consider 1728 (shulker size) as a target for bulk pricing
- **Direction**: Round to nearest (most accurate), with option for round-up (buyer-friendly) or round-down (seller-friendly)

### Ratio Display Logic

- **When ratio < 1**: "1 diamond per X items" (common items)
- **When ratio ≥ 1**: "X diamonds per 1 item" (rare/expensive items)
- Always use whole numbers for diamonds

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
  diamondItemId?: string;              // NEW (reference to diamond item for ratio calculation)
  diamondRoundingDirection?: 'nearest' | 'up' | 'down';  // NEW (default: 'nearest')
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
// Calculate diamond ratio from item prices
function calculateDiamondRatio(
	itemPrice: number,
	diamondPrice: number
): { diamonds: number, quantity: number }

// Round ratio to nearest common quantity
function roundToCommonQuantity(ratio: number): number

// Format diamond ratio for display (compact format)
function formatDiamondRatio(diamonds: number, quantity: number): string
// Returns: "1 per 32" or "7 per 1" or "12 per shulker"

// Format diamond ratio for tooltip (full format)
function formatDiamondRatioFull(diamonds: number, quantity: number, itemName: string): string
// Returns: "1 diamond per 32 amethyst shards" or "7 diamonds per 1 ancient debris"

// Get diamond pricing for item (buy and sell)
function getDiamondPricing(
	item: Item,
	diamondItem: Item,
	version: string,
	sellMargin: number
): {
	buy: { diamonds: number, quantity: number },
	sell: { diamonds: number, quantity: number },
	shulkerBuy?: { diamonds: number, quantity: number },
	shulkerSell?: { diamonds: number, quantity: number }
}
```

### 3. UI Components

#### Currency Toggle Component

-   Simple toggle switch in economy settings
-   Visual indicator showing current currency mode (💰/💎)
-   Automatic price updates when toggled
-   Column headers change: "Stack" → "Shulker" in diamond mode

#### Price Display Updates - Hybrid Format

**Table Column Structure:**

**Money Mode:**
- Unit Price Buy | Unit Price Sell
- Stack Price Buy | Stack Price Sell
- Stack (optional quantity column)

**Diamond Mode:**
- Unit Price Buy | Unit Price Sell
  - Display: "1 per 32" (compact ratio)
  - Tooltip: "1 diamond per 32 amethyst shards" (full context)
- Shulker Price Buy | Shulker Price Sell
  - Display: "12 per shulker" (compact ratio)
  - Tooltip: "12 diamonds per shulker (1728 items)" (full context)
- Shulker (optional quantity column)

**Display Examples:**
- Common items: "1 per 32", "1 per 64", "1 per 128"
- Rare items: "7 per 1", "30 per 1"
- Shulker pricing: "12 per shulker", "24 per shulker"

**Components to Update:**
- `ItemTable.vue`: Hybrid ratio display with tooltips
- `ShopItemTable.vue`: Diamond currency detection and formatting
- All price input forms: Support ratio-based entry

---

## 📋 Implementation Tasks

### Phase 1: Core Infrastructure

#### Task 1.1: Extend Economy Configuration

-   [ ] **Update `src/views/HomeView.vue`**
    -   Add `currencyType` ref (default: 'money')
    -   Add `diamondItemId` ref (reference to diamond item for ratio calculation)
    -   Add `diamondRoundingDirection` ref (default: 'nearest')
    -   Update `economyConfig` computed property
    -   Add localStorage persistence for new fields
    -   Update `resetEconomyConfig()` function

#### Task 1.2: Create Diamond Currency Utilities

-   [ ] **Extend `src/utils/pricing.js`**
    -   Add `calculateDiamondRatio()` function (item price → diamond ratio)
    -   Add `roundToCommonQuantity()` function (round to 4, 8, 16, 32, 64, 128, 256)
    -   Add `formatDiamondRatio()` function (compact: "1 per 32")
    -   Add `formatDiamondRatioFull()` function (full: "1 diamond per 32 items")
    -   Add `getDiamondPricing()` function (calculate buy/sell/shulker ratios)
    -   Update existing price functions to detect currency type and format accordingly

#### Task 1.3: Add Currency Toggle UI

-   [ ] **Update economy settings in `src/views/HomeView.vue`**
    -   Add currency type toggle (Money/Diamond)
    -   Add rounding direction option (nearest/up/down) for diamond mode
    -   Update styling to accommodate new controls
    -   Add visual indicators for current currency mode (💰/💎)
    -   Add help text explaining ratio-based pricing

### Phase 2: Price Display Updates

#### Task 2.1: Update Item Table Display

-   [ ] **Update `src/components/ItemTable.vue`**
    -   Detect currency type from economy config
    -   When in diamond mode:
        - Calculate diamond ratios for each item (using diamond item price as reference)
        - Display compact ratio format: "1 per 32" in table cells
        - Add tooltips with full format: "1 diamond per 32 amethyst shards"
        - Change "Stack" column header to "Shulker"
        - Calculate shulker pricing (may differ from unit × stack size)
    -   Update sorting logic to use per-item equivalent for comparison
    -   Ensure Buy/Sell columns show correct ratios

#### Task 2.2: Update Shop Management

-   [ ] **Update `src/components/ShopItemTable.vue`**
    -   Add currency type detection from shop/server
    -   When in diamond mode:
        - Display ratios in compact format: "1 per 32"
        - Show full ratio in tooltips
        - Update column headers: "Stack" → "Shulker"
    -   Modify price input handling for diamond entry (ratio format)
    -   Update price history display to show ratio changes

#### Task 2.3: Update Price Input Forms

-   [ ] **Update `src/components/ShopItemForm.vue`**
    -   Add currency type detection
    -   When in diamond mode:
        - Input format: "1 per 32" or "7 per 1" (ratio entry)
        - Validate ratio format and quantities
        - Show preview of calculated per-item equivalent
    -   Add diamond ratio formatting in price previews
    -   Handle ratio conversion in form submission (store as ratio structure)

### Phase 3: Shop Manager Integration

#### Task 3.1: Add Currency Support to Data Models

-   [ ] **Update server data structure**

    -   Add `currency_type` field to servers collection (default: 'money')
    -   Add `diamond_item_id` field to servers collection (reference to diamond item for ratio calculation)
    -   Add `diamond_rounding_direction` field (default: 'nearest', options: 'nearest'|'up'|'down')
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
    -   When currency type is 'diamond':
        - Add diamond item selector (which item represents 1 diamond)
        - Add rounding direction selector (nearest/up/down)
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

    -   Detect currency type from server/economy config
    -   When in diamond mode:
        - Show ratio input format: "1 per 32" or "7 per 1"
        - Calculate and display per-item equivalent preview
    -   Update price input handling for ratio format
    -   Add diamond ratio preview with tooltip

-   [ ] **Update `src/views/EditItemView.vue`**
    -   Detect currency type from server/economy config
    -   When in diamond mode:
        - Show ratio input format: "1 per 32" or "7 per 1"
        - Calculate and display per-item equivalent preview
    -   Update price input handling for ratio format
    -   Add diamond ratio preview with tooltip

#### Task 4.2: Create Currency Migration Tools

-   [ ] **Create `scripts/migrateToDiamondCurrency.js`**

    -   Bulk convert existing prices to diamond ratios:
        - Calculate ratio: diamond_price / item_price
        - Round to common quantities (4, 8, 16, 32, 64, 128, 256)
        - Store ratio structure: { diamonds: X, quantity: Y }
    -   Update server currency types and diamond item references
    -   Update shop currency types (inherit from servers)
    -   Provide rollback functionality (restore original prices)

-   [ ] **Create `scripts/auditCurrencyTypes.js`**
    -   Audit current currency usage across servers and shops
    -   Identify currency type consistency issues
    -   Generate migration recommendations
    -   Validate server-shop currency relationships

### Phase 5: Testing and Polish

#### Task 5.1: Comprehensive Testing

-   [ ] **Test currency conversion accuracy**

    -   Verify ratio calculation from existing prices
    -   Test rounding to common quantities (4, 8, 16, 32, 64, 128, 256)
    -   Test edge cases:
        - Zero prices
        - Very large prices (ratio ≥ 1: "X per 1")
        - Very small prices (ratio < 1: "1 per X")
        - Items more expensive than diamond
    -   Test ratio formatting (compact vs full format)
    -   Test shulker pricing calculations

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

### Diamond Price Formatting - Hybrid Display

-   **Compact format in cells**: "1 per 32", "7 per 1", "12 per shulker"
-   **Full format in tooltips**: "1 diamond per 32 amethyst shards", "7 diamonds per 1 ancient debris"
-   **Ratio direction**:
    - When ratio < 1: "1 per X items" (common items)
    - When ratio ≥ 1: "X per 1 item" (rare/expensive items)
-   **Always whole numbers**: Diamonds are discrete units, no decimals
-   **Shulker pricing**: Independent from unit pricing, may not be simple multiple

### Price Input Handling

-   **Ratio input format**: "1 per 32" or "7 per 1" (diamonds per quantity)
-   **Quantity validation**: Must be common Minecraft quantities (4, 8, 16, 32, 64, 128, 256, 1728)
-   **Diamond validation**: Whole numbers only, no decimals
-   **Conversion preview**: Show per-item equivalent when entering ratios
-   **Auto-rounding**: Suggest nearest common quantity when entering custom ratios

---

## 🔧 Technical Considerations

### Performance

-   **Lazy conversion**: Calculate ratios on-demand from existing prices
-   **Caching**: Cache calculated ratios during session
-   **Efficient rounding**: Optimize common quantity rounding algorithm
-   **Diamond item lookup**: Cache diamond item reference to avoid repeated lookups

### Data Integrity

-   **Backup strategy**: Create backups before currency migrations
-   **Rollback plan**: Ability to revert currency changes (original prices preserved)
-   **Validation**: 
    - Ensure diamond item reference is valid
    - Validate ratio calculations (no division by zero)
    - Ensure rounded quantities are valid Minecraft stack sizes

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

-   **Alternative ratio formats**: "1:32" or "1/32" shorthand options
-   **Price ranges**: Show min/max diamond ratios
-   **Trend indicators**: Ratio change arrows (↑ ↓)
-   **Bulk quantity presets**: Quick buttons for common quantities (64, 128, shulker)

### Integration Features

-   **Plugin integration**: Connect to Minecraft economy plugins
-   **API endpoints**: Currency conversion APIs
-   **Bulk operations**: Mass currency conversion tools

