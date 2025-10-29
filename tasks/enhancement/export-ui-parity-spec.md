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

---

## 🔄 **Missing Features for UI Parity**

### 1. **View Mode Support**

**Current State**: Export always uses flat list structure
**Missing**: Toggle between categories view and list view

**Implementation Tasks**:

-   [ ] Add view mode toggle (Categories/List) to export modal UI
-   [ ] Implement categories view export structure (grouped by category)
-   [ ] Implement list view export structure (flat list)
-   [ ] Update export data generation to respect view mode selection

### 2. **Sorting Options**

**Current State**: No sorting controls in export modal
**Missing**: Sort by name, buy price, sell price with ascending/descending options

**Implementation Tasks**:

-   [ ] Add sorting controls to export modal UI
-   [ ] Implement sorting logic for list view exports
-   [ ] Add sort field selection (name, buy, sell)
-   [ ] Add sort direction selection (ascending, descending)
-   [ ] Update export data generation to apply sorting

### 3. **Round to Whole Checkbox**

**Current State**: Always rounds to whole numbers with `Math.round()`
**Missing**: Checkbox to control rounding behavior

**Implementation Tasks**:

-   [ ] Add "Round to whole numbers" checkbox to export modal UI
-   [ ] Connect checkbox to economy config's `roundToWhole` setting
-   [ ] Update price calculation logic to respect rounding preference
-   [ ] Ensure checkbox state persists during export session

### 4. **Proper Price Modifiers**

**Current State**: Uses hardcoded `Math.round()` for all prices
**Missing**: Use `customRoundPrice()` function with proper rounding logic

**Implementation Tasks**:

-   [ ] Replace `Math.round()` calls with `customRoundPrice()` function
-   [ ] Import `customRoundPrice` from pricing utilities
-   [ ] Apply proper rounding logic: prices < 5 round to 1 decimal, prices ≥ 5 round to whole numbers
-   [ ] Respect `roundToWhole` setting from economy config
-   [ ] Update all price field calculations (unit_buy, unit_sell, stack_buy, stack_sell)

---

## 🎨 **UI/UX Requirements**

### Export Modal Layout

```
┌─────────────────────────────────────────────────────────┐
│ Export Price List                                       │
├─────────────────────────────────────────────────────────┤
│ Minecraft Version: [1.16] [1.17] [1.18] [1.19] [1.20] │
│                                                         │
│ Categories: [✓] ores [✓] food [ ] tools ...            │
│                                                         │
│ View Mode: [Categories] [List]                          │
│                                                         │
│ Sort Order: [Name ▼] [Ascending ▼] (only in List view) │
│                                                         │
│ Price Fields: [✓] Unit Buy [✓] Unit Sell ...           │
│                                                         │
│ Advanced Options:                                       │
│ [✓] Include metadata                                    │
│ [✓] Round to whole numbers                             │
│                                                         │
│ Preview: (shows first 3 items)                         │
│                                                         │
│ [Cancel] [JSON] [YAML]                                 │
└─────────────────────────────────────────────────────────┘
```

### Conditional UI Elements

-   **View Mode Toggle**: Always visible
-   **Sorting Controls**: Only visible when "List" view mode is selected
-   **Round to Whole Checkbox**: Always visible in Advanced Options
-   **Preview**: Shows structure based on selected view mode

---

## 🔧 **Technical Implementation**

### File Changes Required

#### 1. **ExportModal.vue**

-   Add view mode state and UI controls
-   Add sorting state and UI controls
-   Add round to whole checkbox
-   Update export data generation logic
-   Import `customRoundPrice` from pricing utilities

#### 2. **Dependencies**

-   No new dependencies required
-   Use existing `customRoundPrice` function from `src/utils/pricing.js`

### Code Structure

#### New State Variables

```javascript
// View mode
const exportViewMode = ref('list') // 'categories' or 'list'

// Sorting (only for list view)
const sortField = ref('name') // 'name', 'buy', 'sell'
const sortDirection = ref('asc') // 'asc', 'desc'

// Rounding
const roundToWhole = computed(() => props.economyConfig.roundToWhole || false)
```

#### Export Data Generation

```javascript
// Use proper rounding function
import { customRoundPrice } from '../utils/pricing.js'

// Apply rounding based on setting
const roundedPrice = customRoundPrice(rawPrice, roundToWhole.value)
```

#### View Mode Logic

```javascript
// Categories view: Group by category
if (exportViewMode.value === 'categories') {
	// Group items by category in export structure
}

// List view: Flat list with sorting
if (exportViewMode.value === 'list') {
	// Apply sorting and export as flat list
}
```

---

## 🧪 **Testing Requirements**

### Manual Testing

-   [ ] Test view mode toggle (categories vs list)
-   [ ] Test sorting options in list view
-   [ ] Test round to whole checkbox functionality
-   [ ] Test price calculation accuracy
-   [ ] Test export file generation for both view modes
-   [ ] Test with different economy config settings

### Test Cases

1. **View Mode Export**:

    - Categories view exports grouped data
    - List view exports flat sorted data

2. **Sorting**:

    - Name sorting (A-Z, Z-A)
    - Buy price sorting (low-high, high-low)
    - Sell price sorting (low-high, high-low)

3. **Price Rounding**:

    - Round to whole: true (all prices rounded to integers)
    - Round to whole: false (prices < 5 to 1 decimal, prices ≥ 5 to whole)

4. **Economy Settings**:
    - Different price multipliers
    - Different sell margins
    - Round to whole setting

---

## 📋 **Acceptance Criteria**

### Must Have

-   [ ] Export modal has view mode toggle (Categories/List)
-   [ ] Export modal has sorting controls for list view
-   [ ] Export modal has round to whole checkbox
-   [ ] Export uses proper price rounding logic
-   [ ] Export respects economy config settings
-   [ ] Export generates correct file structure based on view mode
-   [ ] Export applies sorting when list view is selected

### Should Have

-   [ ] UI controls are intuitive and match main interface
-   [ ] Preview shows correct structure based on selections
-   [ ] Settings persist during export session
-   [ ] Export performance is acceptable for large datasets

### Could Have

-   [ ] Export remembers last used settings
-   [ ] Export shows item count per category in categories view
-   [ ] Export includes sorting metadata in file

---

## 🚀 **Implementation Priority**

### Phase 1: Core Functionality

1. Add proper price rounding logic
2. Add round to whole checkbox
3. Add view mode toggle

### Phase 2: Sorting & Polish

1. Add sorting controls for list view
2. Implement sorting logic
3. Update UI layout and styling

### Phase 3: Testing & Refinement

1. Comprehensive testing
2. Performance optimization
3. UI/UX improvements

---

## 📝 **Notes**

-   This enhancement maintains backward compatibility
-   No breaking changes to existing export functionality
-   Follows existing code patterns and styling
-   Uses existing utility functions where possible
-   Maintains consistency with main UI design patterns
