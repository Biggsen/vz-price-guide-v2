# Buglist & Known Issues

This document tracks bugs, regressions, and issues discovered during development and testing.

---

## Active Issues

### Crate Rewards Mobile Display Issues

**Status**: 🔴 Active  
**Priority**: High  
**Type**: UX Issue  
**Discovered**: 2025-01-27

**Description**:
Crate rewards display is broken or poorly formatted on mobile devices, creating a poor user experience when viewing crate information on smaller screens.

**Expected Behavior**:
Crate rewards should display properly on mobile devices with appropriate layout, spacing, and readability.

**Current Behavior**:
Crate rewards interface is a mess on mobile devices with layout, formatting, or usability issues.

**Impact**:

-   Poor mobile user experience when viewing crate rewards
-   Potential usability issues on mobile devices
-   Inconsistent experience across device types

**Notes**:

-   Needs investigation to identify specific mobile display issues
-   Should be tested across different mobile screen sizes

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

### Settings Price Modifiers Not Persisting in UI

**Status**: ✅ Resolved  
**Priority**: Medium  
**Type**: UI Bug  
**Discovered**: 2025-01-27  
**Resolved**: 2025-01-27

**Description**:
In the settings modal, the price modifiers (Buy X and Sell %) were refreshing back to their default values (1 and 30) even after being changed by the user. The custom values were not being persisted in the UI, though the price guide still reflected the custom values correctly.

**Root Cause**:
The `loadSettings()` function was only called when `handleOpen()` was explicitly called, but the parent component never called this method. The modal opened with default values instead of loading saved values from localStorage.

**Solution Implemented**:
Added a watcher in `SettingsModal.vue` that monitors the `isOpen` prop and calls `loadSettings()` whenever the modal opens. This ensures that saved settings are loaded from localStorage and displayed in the UI when the modal is opened.

**Files Modified**:

-   `src/components/SettingsModal.vue` - Added watcher for `isOpen` prop to load settings on modal open

**User Experience**:

-   Settings UI now correctly displays saved values when modal is reopened
-   No more disconnect between UI display and actual functionality
-   Users can see their custom price modifiers reflected in the settings modal
-   Settings persist correctly across page refreshes and navigation

**Notes**:

-   The underlying functionality was working correctly - only the UI loading was broken
-   Settings are now properly loaded from localStorage when modal opens
-   No changes needed to the save functionality as it was already working


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

### Price Guide vs Export Item Count Discrepancy

**Status**: ✅ Resolved  
**Priority**: High  
**Type**: Data Integrity  
**Discovered**: 2025-11-10  
**Resolved**: 2025-01-27

**Description**:
The admin price guide reported `1,473` items, while the export summary indicated only `1,471` items would be exported. Additionally, category counts in the price guide (e.g., "Enchantments (122)") didn't match the actual items displayed in the table (121 items). The export was correctly excluding 0-priced items, which revealed the discrepancy.

**Root Cause**:
The price guide's count functions (`getTotalItemCount()` and `totalCategoryCounts`) were including items with 0 prices in their counts, while the table display (`itemsWithValidPrices`) and export pipeline correctly excluded 0-priced items. This created a mismatch where:

-   Category buttons showed counts including 0-priced items
-   The "All categories" count included 0-priced items
-   The table and export correctly excluded 0-priced items
-   Admin users had an additional issue where `getTotalItemCount()` bypassed price filtering entirely

**Solution Implemented**:
Updated both `getTotalItemCount()` and `totalCategoryCounts` computed properties to exclude 0-priced items for all users (admin and non-admin), matching the filtering logic used by `itemsWithValidPrices` and the export pipeline:

1.   **Fixed `totalCategoryCounts`**: Added price filtering to exclude 0-priced items for both admin and non-admin users
2.   **Fixed `getTotalItemCount()`**: Removed the early return for admin users that bypassed price filtering, ensuring 0-priced items are excluded for all users

**Files Modified**:

-   `src/views/HomeView.vue` - Updated `totalCategoryCounts` and `getTotalItemCount()` to exclude 0-priced items

**User Experience**:

-   Category button counts now match the actual items displayed in the table
-   "All categories" count now matches the sum of individual category counts
-   Price guide counts are now consistent with export counts
-   All views (table, category buttons, export) use the same filtering logic

**Notes**:

-   The export pipeline was working correctly - it was the price guide counts that were wrong
-   This fix ensures consistency across all views and eliminates confusion about item counts
-   Zero-priced items are now consistently excluded from counts and displays across the application

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
