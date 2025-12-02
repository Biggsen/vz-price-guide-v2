# Buglist & Known Issues

This document tracks bugs, regressions, and issues discovered during development and testing.

---

## Active Issues

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

### Admin Subnav Inconsistency Between Mobile and Desktop

**Status**: ✅ Resolved  
**Priority**: Medium  
**Type**: UX Issue  
**Discovered**: 2025-01-27  
**Resolved**: 2025-01-27

**Description**:
The admin subnav for mobile and desktop displayed different links and should be identical. The mobile and desktop admin navigation showed different sets of links, creating an inconsistent user experience.

**Root Cause**:
The `SubNav.vue` component contained dead code - a mobile collapsible layout section that was never rendered because the parent nav element had `hidden sm:block` classes, making it desktop-only. The actual mobile admin navigation is handled in `Nav.vue` (hamburger menu), which already had the correct order matching desktop.

**Solution Implemented**:
Removed all dead code from `SubNav.vue`:
- Removed unused mobile collapsible layout sections (admin and tools)
- Removed unused expansion state refs and computed properties
- Removed unused `toggleSection` function and watch handlers
- Cleaned up unused imports (`ref`, `watch`)

**Files Modified**:

-   `src/components/SubNav.vue` - Removed 256 lines of dead code, now contains only desktop navigation

**User Experience**:

-   Mobile and desktop admin navigation now consistent
-   Both show: Price Guide, Community, Design, Access (in that order)
-   Cleaner codebase with no unused mobile navigation code
-   File reduced from 364 lines to 108 lines

**Notes**:

-   The mobile admin navigation in `Nav.vue` was already correct
-   The issue was caused by dead code in `SubNav.vue` that appeared to be a mobile implementation but was never rendered
-   Navigation consistency verified across all devices

### Crate Rewards Mobile Display Issues

**Status**: ✅ Resolved  
**Priority**: High  
**Type**: UX Issue  
**Discovered**: 2025-01-27  
**Resolved**: 2025-01-27

**Description**:
Crate rewards display was broken or poorly formatted on mobile devices, creating a poor user experience when viewing crate information on smaller screens.

**Root Cause**:
The crate rewards interface lacked proper responsive design considerations for mobile devices, including:
- Icons and buttons not adapting to smaller screens
- Layout elements not stacking properly on mobile
- Text sizes too large for mobile viewports
- Padding and spacing issues causing cramped layouts
- Navigation elements not optimized for mobile interaction

**Solution Implemented**:
Comprehensive mobile responsive improvements to the crate rewards interface:

1. **Navigation Icons**: Removed icons from nav items below 900px, made admin nav icon-only
2. **Header Layout**: Removed bottom padding, moved YAML debug button to top row
3. **Reward Items List**: 
   - Moved list outside padding container for full-width on mobile
   - Added 2px white borders on mobile
   - Reduced font sizes (header and items) to match price guide homepage
   - Reduced padding and spacing on mobile
   - Reduced image sizes on mobile
4. **Sort Controls**: 
   - Reduced font sizes on mobile
   - Made buttons wrap and stack label above buttons below 450px
   - Added icon space reservation to prevent button resizing
5. **Item Rows**: 
   - Reduced padding on mobile
   - Moved weight/percentage controls below item content below 450px
   - Adjusted spacing between elements
   - Top-aligned action buttons on mobile
6. **Information Display**: 
   - Made "Rewards" and "Created" wrap to new line on mobile
   - Reduced spacing between information rows
7. **CTA Buttons**: 
   - Allowed buttons to wrap on mobile
   - Hidden "Copy List" button on mobile
   - Hidden "Show YAML Debug" button on mobile

**Files Modified**:

-   `src/components/Nav.vue` - Mobile navigation improvements
-   `src/views/CrateSingleView.vue` - Comprehensive mobile layout fixes

**User Experience**:

-   Crate rewards now display properly on mobile devices
-   Improved readability with appropriate font sizes and spacing
-   Better use of screen space on small devices
-   Consistent mobile experience matching price guide homepage patterns
-   All interactive elements accessible and properly sized for mobile

**Notes**:

-   All mobile improvements tested and verified across different screen sizes
-   Layout now responsive from 450px and below
-   Maintains full functionality while improving mobile UX

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
