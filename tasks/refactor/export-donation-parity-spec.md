# Export Donation Parity Fix

## Overview

The donation export flow produces different output than direct export due to duplicated logic with hardcoded defaults. This spec addresses the parity issue by extracting shared export generation logic.

**Status**: 🟡 Ready for implementation  
**Branch**: `feature/export-donations` (on top of existing work)  
**Priority**: High (blocks donation feature release)

---

## Problem Statement

### Current State

Two separate export code paths exist:

| Path            | Location                                         | Used When                         |
| --------------- | ------------------------------------------------ | --------------------------------- |
| Direct Export   | `ExportModal.vue` (computed `exportData`)        | User exports with $0 donation     |
| Donation Export | `ExportSuccessView.vue` (`generateExportData()`) | User exports after Stripe payment |

### The Bug

`ExportSuccessView` uses hardcoded defaults instead of user's economy settings:

```javascript
// ExportSuccessView.vue - WRONG
const priceMultiplier = 1 // Should use user's setting
const sellMargin = 0.3 // Should use user's setting
// No diamond currency support at all
```

### Impact

Users who donate AND have customized settings get:

-   Wrong prices (different multiplier/margin)
-   Wrong currency format (money instead of diamonds)
-   Different metadata

This is a trust issue - they paid for an export that doesn't match what they previewed.

---

## Solution

Extract shared export generation logic to a utility function used by both components.

### New File: `src/utils/exportData.js`

```javascript
/**
 * Generates export data from items and config.
 * Single source of truth for both direct and donation exports.
 */
export function generateExportData(items, config) {
	// Transform items with pricing calculations
	// Handle both money and diamond currency modes
	// Apply sorting, filtering
	// Generate metadata
	// Return data object ready for serialization
}

/**
 * Serializes export data to JSON string.
 */
export function serializeJSON(data, includeMetadata = true) {
	// ...
}

/**
 * Serializes export data to YAML string.
 */
export function serializeYAML(data, includeMetadata = true) {
	// ...
}
```

### Config Schema

The export config passed to `generateExportData` must include ALL settings that affect output:

```javascript
{
  // Already saved by buildExportConfig:
  format: 'json' | 'yaml',
  version: '1.21',
  categories: ['blocks', 'tools'] | null,  // null = all
  priceFields: ['unit_buy', 'unit_sell', 'stack_buy', 'stack_sell'],
  sortField: 'default' | 'name' | 'buy',
  sortDirection: 'asc' | 'desc',
  roundToWhole: boolean,
  includeMetadata: boolean,

  // NEW - must be added to buildExportConfig:
  priceMultiplier: number,        // e.g., 1.5
  sellMargin: number,             // e.g., 0.3
  currencyType: 'money' | 'diamond',
  diamondItemId: string | null,   // Item ID for diamond ratio calc
  diamondRoundingDirection: 'nearest' | 'up' | 'down'
}
```

---

## Implementation Tasks

### Phase 1: Extract Shared Utility

-   [ ] Create `src/utils/exportData.js`
-   [ ] Move pricing/transform logic from `ExportModal.vue` computed to utility
-   [ ] Move `generateYAML()` logic to utility
-   [ ] Export: `generateExportData()`, `serializeJSON()`, `serializeYAML()`

### Phase 2: Update ExportModal

-   [ ] Import shared utility
-   [ ] Replace `exportData` computed with call to `generateExportData()`
-   [ ] Update `buildExportConfig()` to include economy settings:
    -   `priceMultiplier`
    -   `sellMargin`
    -   `currencyType`
    -   `diamondItemId`
    -   `diamondRoundingDirection`
-   [ ] Verify direct export still works identically

### Phase 3: Update ExportSuccessView

-   [ ] Import shared utility
-   [ ] Replace local `generateExportData()` with shared version
-   [ ] Replace local `generateYAML()` with shared version
-   [ ] Use full config from sessionStorage (no hardcoded defaults)
-   [ ] Diamond currency: diamond item lookup already available via `allItems`

### Phase 4: Verification

-   [ ] Test direct export (money mode) - should be identical
-   [ ] Test direct export (diamond mode) - should be identical
-   [ ] Test donation export (money mode) - should now match direct
-   [ ] Test donation export (diamond mode) - should now match direct
-   [ ] Verify metadata includes correct settings in both paths

---

## Files Changed

| File                              | Change                                           |
| --------------------------------- | ------------------------------------------------ |
| `src/utils/exportData.js`         | **NEW** - Shared export generation               |
| `src/components/ExportModal.vue`  | Use shared utility, expand `buildExportConfig()` |
| `src/views/ExportSuccessView.vue` | Use shared utility, remove local implementations |

---

## Testing Checklist

### Direct Export (ExportModal)

-   [ ] Money mode with default settings
-   [ ] Money mode with custom multiplier (e.g., 1.5x)
-   [ ] Money mode with custom margin (e.g., 0.4)
-   [ ] Money mode with round-to-whole enabled
-   [ ] Diamond mode with default rounding
-   [ ] Diamond mode with custom rounding direction
-   [ ] JSON format output correct
-   [ ] YAML format output correct

### Donation Export (ExportSuccessView)

-   [ ] Money mode with default settings → matches direct export
-   [ ] Money mode with custom multiplier → matches direct export
-   [ ] Money mode with custom margin → matches direct export
-   [ ] Diamond mode → matches direct export
-   [ ] Metadata includes correct settings

---

## Future Considerations

This refactor creates the foundation for the enhancements outlined in `tasks/enhancement/not-ready/price-export-enhancements.md`:

-   **CSV/XLSX formats**: Add `serializeCSV()`, `serializeXLSX()` to utility
-   **Plugin formats**: Add plugin-specific serializers
-   **Additional transforms**: Extend `generateExportData()` config

The modular structure supports these without duplicating logic across components.

---

## Estimated Effort

-   **New utility file**: ~100-120 lines
-   **ExportModal changes**: ~30 lines (mostly deletions)
-   **ExportSuccessView changes**: ~40 lines (mostly deletions)
-   **Total time**: 2-3 hours implementation + testing
