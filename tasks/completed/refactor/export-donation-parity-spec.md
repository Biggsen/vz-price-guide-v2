# Export Donation Parity Fix

## Overview

The donation export flow produces different output than direct export due to duplicated logic with hardcoded defaults. This spec addresses the parity issue by extracting shared export generation logic.

**Status**: ✅ Complete  
**Branch**: `feature/export-donations`  
**Completed**: 2026-01-31

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

-   [x] Create `src/utils/exportData.js`
-   [x] Move pricing/transform logic from `ExportModal.vue` computed to utility
-   [x] Move `generateYAML()` logic to utility
-   [x] Export: `generateExportData()`, `serializeJSON()`, `serializeYAML()`

### Phase 2: Update ExportModal

-   [x] Import shared utility
-   [x] Replace `exportData` computed with call to `generateExportData()`
-   [x] Update `buildExportConfig()` to include economy settings:
    -   `priceMultiplier`
    -   `sellMargin`
    -   `currencyType`
    -   `diamondItemId`
    -   `diamondRoundingDirection`
-   [x] Verify direct export still works identically

### Phase 3: Update ExportSuccessView

-   [x] Import shared utility
-   [x] Replace local `generateExportData()` with shared version
-   [x] Replace local `generateYAML()` with shared version
-   [x] Use full config from sessionStorage (no hardcoded defaults)
-   [x] Diamond currency: diamond item lookup already available via `allItems`

### Phase 4: Verification

-   [x] Test direct export (money mode) - should be identical
-   [x] Test direct export (diamond mode) - should be identical
-   [x] Test donation export (money mode) - should now match direct
-   [x] Test donation export (diamond mode) - should now match direct
-   [x] Verify metadata includes correct settings in both paths

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

-   [x] Money mode with default settings
-   [x] Money mode with custom multiplier (e.g., 1.5x)
-   [x] Money mode with custom margin (e.g., 0.4)
-   [x] Money mode with round-to-whole enabled
-   [x] Diamond mode with default rounding
-   [x] Diamond mode with custom rounding direction
-   [x] JSON format output correct
-   [x] YAML format output correct

### Donation Export (ExportSuccessView)

-   [x] Money mode with default settings → matches direct export
-   [x] Money mode with custom multiplier → matches direct export
-   [x] Money mode with custom margin → matches direct export
-   [x] Diamond mode → matches direct export
-   [x] Metadata includes correct settings

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
