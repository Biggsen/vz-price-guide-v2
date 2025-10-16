# Buglist & Known Issues

This document tracks bugs, regressions, and issues discovered during development and testing.

---

## Active Issues

### Crate Total Value Incorrect - Not Considering Enchantments

**Status**: 🔴 Active  
**Priority**: High  
**Type**: Bug  
**Discovered**: 2025-10-12

**Description**:
The total value calculation for crates is incorrect and appears to not be considering enchantments. This results in inaccurate pricing information for crates containing enchanted items.

**Expected Behavior**:

-   Total crate value should include the value of all items plus their enchantments
-   Enchantments should be priced separately and added to the total

**Actual Behavior**:

-   Total value calculation is missing enchantment values
-   Crate total displayed is lower than actual value

**Impact**:

-   Misleading pricing information for users
-   Inaccurate crate value assessments
-   Affects decision-making for crate management

**Files Potentially Affected**:

-   `src/utils/crateRewards.js` - Total value calculation logic
-   `src/views/CrateSingleView.vue` - Display of total value
-   Enchantment pricing utilities

**Notes**:

-   May be related to the enchanted books separation issue
-   Need to verify if enchantment prices are being fetched correctly

## Resolved Issues

### Duplicate Crate Names When Importing Same File

**Status**: ✅ Resolved  
**Priority**: Medium  
**Type**: UX Issue  
**Discovered**: 2025-01-27  
**Resolved**: 2025-01-27

**Description**:
When importing the same crate YAML file multiple times, the crates have identical names making it impossible to distinguish between them in the crate list. This creates confusion for users managing multiple versions or iterations of the same crate.

**Root Cause**:
The `createCrateReward` function had no duplicate name checking, allowing multiple crates with identical names to be created when importing the same YAML file multiple times.

**Solution Implemented**:

1. **Added duplicate checking function** (`getUniqueCrateName`) that queries existing crates and generates unique names with suffixes
2. **Added warning dialog** that appears when a duplicate name is detected, asking the user if they want to proceed with a unique name
3. **Auto-append number suffixes** (e.g., "VillageCrate (2)", "VillageCrate (3)") when user confirms the import
4. **Updated import logic** to handle duplicate detection and user confirmation flow

**Files Modified**:

-   `src/utils/crateRewards.js` - Added `getUniqueCrateName` function and updated import logic
-   `src/views/CrateRewardManagerView.vue` - Added duplicate warning dialog and confirmation flow

**User Experience**:

-   Users are warned when importing a crate with an existing name
-   They can choose to proceed with a unique name or cancel the import
-   Multiple versions of the same crate can be managed with clear naming
-   No accidental overwrites or confusion between crate versions

### Enchantment Books Not Separated When Adding Crate Items

**Status**: ✅ Resolved  
**Priority**: High  
**Type**: Regression  
**Discovered**: 2025-10-12  
**Resolved**: 2025-01-27

**Description**:
When adding items for a crate, enchanted books are not being added as separate book and enchantment entities. The system should split enchanted books into their base book item and the enchantment as separate entries, but this functionality is broken.

**Root Cause**:
The issue occurred when importing YAML files from older CrazyCrates versions that don't include the `DisplayEnchantments` field. The system was only parsing display enchantments from the `DisplayEnchantments` array, but when this field was missing, it failed to extract enchantments from the `Items` array.

**Solution Implemented**:
Added fallback logic in `importCrateRewardsFromYaml()` function to extract display enchantments from the `Items` array when `DisplayEnchantments` is missing. This ensures backward compatibility with older export formats.

**Files Modified**:

-   `src/utils/crateRewards.js` - Added fallback logic for missing DisplayEnchantments

**Notes**:

-   Fix ensures both old and new export formats work correctly
-   Maintains backward compatibility with older CrazyCrates versions
-   Enchantment book separation now works regardless of export version

---

## Investigation Needed

_Issues that need more investigation before they can be confirmed or fixed._

---

## Notes

-   Keep this list updated as bugs are discovered
-   Move issues to "Resolved" when fixed
-   Include reproduction steps when possible
-   Link to related PRs/commits when available
