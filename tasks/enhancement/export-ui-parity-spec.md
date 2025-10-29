# 📤 Export UI Parity Enhancement Specification

## 📌 Overview

Enhance the export functionality to achieve complete parity with the main price guide UI. Users should be able to export exactly what they see in the interface, including view modes, sorting options, and proper price formatting.

**Status**: 🔄 **ENHANCEMENT** - New features needed for UI parity

---

## 🎯 Goals & User Story

As a user of the price guide, I want the export functionality to mirror exactly what I see in the main interface, so I can export data in the same format and order as displayed, with proper price rounding and sorting options.

**Current Problem**: The export modal lacks key features available in the main UI, making it inconsistent and less useful.

---

## ✅ **Current Export Features**

### Already Implemented

-   ✅ **Authentication Gating** - Only logged-in users can export
-   ✅ **Version Selection** - Choose Minecraft version (1.16-1.21)
-   ✅ **Category Filtering** - Multi-select categories with "all" option
-   ✅ **Price Field Selection** - Choose unit_buy, unit_sell, stack_buy, stack_sell
-   ✅ **Metadata Inclusion** - Optional name, category, stack size
-   ✅ **JSON Export** - Full JSON export with proper formatting
-   ✅ **YAML Export** - Working YAML export (uses custom generation)
-   ✅ **Preview Functionality** - Shows first 3 items before export
-   ✅ **File Naming** - Proper timestamp-based naming
-   ✅ **Sorting Options** - Sort by name, buy price with ascending/descending options
-   ✅ **Round to Whole Checkbox** - Connected to economy config's `roundToWhole` setting
-   ✅ **Proper Price Rounding** - Uses `roundPriceForExport()` function with correct logic

---

## ✅ **UI Parity Achieved**

The export functionality now has complete parity with the main price guide UI:

-   ✅ **Default Order** - Preserves curated category order from main interface
-   ✅ **Name Sorting** - A-Z and Z-A options
-   ✅ **Buy Price Sorting** - Low-high and high-low options
-   ✅ **Price Rounding** - Matches main interface logic
-   ✅ **Economy Config** - Respects all settings from main interface

---

## 🎨 **UI/UX Requirements**

### Current Export Modal Layout

```
┌─────────────────────────────────────────────────────────┐
│ Export Price List                                       │
├─────────────────────────────────────────────────────────┤
│ Minecraft Version: [1.16] [1.17] [1.18] [1.19] [1.20] │
│                                                         │
│ Categories: [✓] ores [✓] food [ ] tools ...            │
│                                                         │
│ Sort Order: [Default Order ▼] [Ascending ▼]            │
│                                                         │
│ Price Fields: [✓] Unit Buy [✓] Unit Sell ...           │
│ [✓] Round to whole numbers                             │
│                                                         │
│ Advanced Options:                                       │
│ [✓] Include metadata                                    │
│                                                         │
│ Preview: (shows first 3 items)                         │
│                                                         │
│ [Cancel] [JSON] [YAML]                                 │
└─────────────────────────────────────────────────────────┘
```

### Conditional UI Elements

-   **Sorting Controls**: Always visible with Default Order, Name, and Buy Price options
-   **Round to Whole Checkbox**: Always visible in Price Fields section
-   **Preview**: Shows structure based on current selections

---

## 🔧 **Technical Implementation**

### File Changes Required

#### 1. **ExportModal.vue**

-   All functionality already implemented
-   No additional changes needed

#### 2. **Dependencies**

-   No new dependencies required
-   Use existing `customRoundPrice` function from `src/utils/pricing.js`

### Code Structure

#### State Variables (Already Implemented)

```javascript
// Sorting (already implemented)
const sortField = ref('default') // 'default', 'name', 'buy', 'sell'
const sortDirection = ref('asc') // 'asc', 'desc'

// Rounding (already implemented)
const roundToWhole = ref(false) // Connected to economy config
```

#### Export Data Generation

```javascript
// Use proper rounding function (already implemented)
import { customRoundPrice } from '../utils/pricing.js'

// Apply rounding based on setting (already implemented)
const roundedPrice = customRoundPrice(rawPrice, roundToWhole.value)
```

#### Sorting Logic (Already Implemented)

```javascript
// Default sort preserves curated order (category, subcategory, name from Firestore)
if (sortField.value === 'default') {
	return filteredItems.value
}

// Apply custom sorting (name and buy price sorting implemented)
return [...filteredItems.value].sort((a, b) => {
	// Name sorting and buy price sorting already implemented
	// Matches main interface sorting options exactly
})
```

---

## 🧪 **Testing Requirements**

### Manual Testing

-   [x] Test sorting options (name, buy) (already implemented)
-   [x] Test default order preserves curated order (already implemented)
-   [x] Test round to whole checkbox functionality (already implemented)
-   [x] Test price calculation accuracy (already implemented)
-   [x] Test with different economy config settings (already implemented)

### Test Cases

1. **Sorting**:

    - Default order (preserves curated category order) ✅
    - Name sorting (A-Z, Z-A) ✅
    - Buy price sorting (low-high, high-low) ✅

2. **Price Rounding**:

    - Round to whole: true (all prices rounded to integers) ✅
    - Round to whole: false (prices < 5 to 1 decimal, prices ≥ 5 to whole) ✅

3. **Economy Settings**:
    - Different price multipliers ✅
    - Different sell margins ✅
    - Round to whole setting ✅

---

## 📋 **Acceptance Criteria**

### Must Have

-   [x] Export modal has sorting controls (already implemented)
-   [x] Export modal has round to whole checkbox (already implemented)
-   [x] Export uses proper price rounding logic (already implemented)
-   [x] Export respects economy config settings (already implemented)
-   [x] Export preserves default curated order (already implemented)
-   [x] Export applies custom sorting when selected (already implemented)

### Should Have

-   [ ] UI controls are intuitive and match main interface
-   [ ] Preview shows correct structure based on selections
-   [x] Settings persist during export session (already implemented)
-   [x] Export performance is acceptable for large datasets (already implemented)

### Could Have

-   [ ] Export remembers last used settings
-   [ ] Export shows item count per category in categories view
-   [ ] Export includes sorting metadata in file

---

## 🚀 **Implementation Priority**

## ✅ **Implementation Complete**

The export functionality has achieved complete UI parity with the main price guide interface. All required features have been implemented and are working correctly.

---

## 📝 **Notes**

-   This enhancement maintains backward compatibility
-   No breaking changes to existing export functionality
-   Follows existing code patterns and styling
-   Uses existing utility functions where possible
-   Maintains consistency with main UI design patterns
-   All core functionality (sorting, rounding, price calculations) is implemented
-   The "Default Order" option preserves the curated category order from the main interface
-   Export modal has complete UI parity with the main price guide interface
-   No additional features are needed for UI parity
