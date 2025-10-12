# Buglist & Known Issues

This document tracks bugs, regressions, and issues discovered during development and testing.

---

## Active Issues

### Enchantment Books Not Separated When Adding Crate Items

**Status**: 🔴 Active  
**Priority**: High  
**Type**: Regression  
**Discovered**: 2025-10-12

**Description**:
When adding items for a crate, enchanted books are not being added as separate book and enchantment entities. The system should split enchanted books into their base book item and the enchantment as separate entries, but this functionality is broken.

**Expected Behavior**:

-   Enchanted book should be split into:
    1. Book item entry
    2. Enchantment entry with appropriate level

**Actual Behavior**:

-   Enchanted books are being added as a single item without separation

**Impact**:

-   Affects crate reward pricing accuracy
-   Breaks enchantment book pricing workflow
-   Users cannot properly value enchanted books in crates

**Files Potentially Affected**:

-   `src/utils/crateRewards.js`
-   `src/views/CrateSingleView.vue`
-   Related item/enchantment handling utilities

**Notes**:

-   This was working previously, indicating a regression
-   May be related to recent changes in crate management workflow

### Duplicate Crate Names When Importing Same File

**Status**: 🔴 Active  
**Priority**: Medium  
**Type**: UX Issue  
**Discovered**: 2025-01-27

**Description**:
When importing the same crate YAML file multiple times, the crates have identical names making it impossible to distinguish between them in the crate list. This creates confusion for users managing multiple versions or iterations of the same crate.

**Expected Behavior**:

-   System should either automatically rename duplicate crates (e.g., "VillageCrate (2)", "VillageCrate (3)")
-   Or warn the user that a crate with this name already exists before importing

**Actual Behavior**:

-   Multiple crates with identical names are created without any differentiation
-   Users cannot distinguish between different versions of the same crate

**Impact**:

-   Poor user experience when managing multiple versions of crates
-   Risk of accidentally managing the wrong crate
-   Confusion in the crate management interface

**Potential Solutions**:

-   Auto-append a number suffix to duplicate crate names
-   Show a confirmation dialog warning about existing crate names
-   Allow users to specify a custom name during import

**Files Potentially Affected**:

-   Import functionality in crate management
-   YAML import handlers
-   Crate naming/validation logic

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

_No resolved issues yet._

---

## Investigation Needed

_Issues that need more investigation before they can be confirmed or fixed._

---

## Notes

-   Keep this list updated as bugs are discovered
-   Move issues to "Resolved" when fixed
-   Include reproduction steps when possible
-   Link to related PRs/commits when available
