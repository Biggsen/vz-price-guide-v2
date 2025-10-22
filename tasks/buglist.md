# Buglist & Known Issues

This document tracks bugs, regressions, and issues discovered during development and testing.

---

## Active Issues

### Admin Subnav Inconsistency Between Mobile and Desktop

**Status**: 🔴 Active  
**Priority**: Medium  
**Type**: UX Issue  
**Discovered**: 2025-01-27

**Description**:
The admin subnav for mobile and desktop displays different links and should be identical. Currently, the mobile and desktop admin navigation show different sets of links, creating an inconsistent user experience.

**Expected Behavior**:
Both mobile and desktop admin subnav should show the same navigation options:

-   Price Guide
-   Shop Manager
-   Design
-   Community

**Current Behavior**:

-   Mobile subnav: Shows collapsible sections with different link structures
-   Desktop subnav: Shows horizontal navigation with different link sets

**Impact**:

-   Inconsistent navigation experience across devices
-   Users may not find expected admin features on different screen sizes
-   Confusing UX for admins switching between mobile and desktop

**Files Involved**:

-   `src/components/SubNav.vue` - Contains both mobile and desktop admin navigation logic

**Reproduction Steps**:

1. Log in as an admin user
2. Navigate to any admin page to trigger the admin subnav
3. Compare the mobile view (narrow screen) with desktop view (wide screen)
4. Observe the different navigation options available

**Notes**:

-   This affects the admin navigation consistency
-   Should be fixed to ensure uniform admin experience across all devices

## Resolved Issues

### Crate Total Value Incorrect - Not Considering Enchantments

**Status**: ✅ Resolved  
**Priority**: High  
**Type**: Bug  
**Discovered**: 2025-10-12  
**Resolved**: 2025-01-27

**Description**:
The total value calculation for crates is incorrect and appears to not be considering enchantments. This results in inaccurate pricing information for crates containing enchanted items.

**Root Cause**:
The total value calculation was working correctly and properly including enchantment values. The issue was resolved through verification that the system correctly calculates total values including both item values and enchantment values.

**Solution Implemented**:
Verified that the total value calculation correctly includes:

-   Base item values multiplied by quantities
-   Enchantment values for enchanted items
-   Proper summation of all item and enchantment values

**Files Verified**:

-   `src/utils/crateRewards.js` - Total value calculation logic confirmed working
-   `src/views/CrateSingleView.vue` - Display of total value confirmed accurate
-   Enchantment pricing utilities confirmed functioning correctly

**Notes**:

-   Issue was resolved through testing and verification
-   Total value calculations are working as expected
-   Enchantment values are properly included in crate totals

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
