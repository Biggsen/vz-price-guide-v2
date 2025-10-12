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

---

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
