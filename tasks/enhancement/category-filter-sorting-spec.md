# 🗂️ Category Filter Sorting Enhancement

## 📌 Overview

Players rely on category filters across the price guide to surface specific items quickly. Right now the filter options mirror the insertion order in `enabledCategories`, which makes it harder to scan—particularly on mobile. This spec captures the lightweight work needed to surface the categories alphabetically anywhere they are user-facing.

**Status**: 🔄 **ENHANCEMENT** – Behavioural polish to an existing feature

---

## 🔍 Current Behaviour

- `HomeView` renders category filter chips using `enabledCategories` in declaration order
- `ExportModal` lists the same categories in the original order for its multi-select
- Admin/Bulk tooling (`BulkUpdateItemsView`) also iterates `categories`/`enabledCategories` directly
- Firestore queries already order by `category`, but UI state derives from the unsorted constants

---

## 🎯 Goals & Requirements

1. Alphabetise category lists everywhere they are presented to the user (chips, checkboxes, dropdowns)
2. Keep Firestore query logic untouched—sorting is a UI concern only
3. Preserve disabled category handling (`disabledCategories`) and existing gating logic
4. Ensure `All categories` affordances still appear ahead of the sorted list where applicable
5. Avoid mutating the exported `enabledCategories` array in-place to prevent subtle side effects

---

## 🛠️ Implementation Outline

- Add a derived export in `src/constants.js`, e.g. `sortedEnabledCategories`, that copies + sorts `enabledCategories`
- Update relevant views/components to import and iterate over the sorted export
	- `HomeView` filter chips and computed helpers that rely on array iteration
	- `ExportModal` category checklist
	- `BulkUpdateItemsView` admin filter buttons (maintain admin-specific logic)
- Touch any other surfaces discovered during audit (e.g. reports, modals) to keep experiences consistent
- Maintain existing casing transformations (`capitalize`) and counts when swapping arrays

---

## 🧪 Testing Checklist

- Category chip order is alphabetical on desktop and mobile (`HomeView`)
- Search + filter state persists when toggling categories after the change
- Export modal checkboxes display alphabetically and selections persist
- Bulk update page renders buttons alphabetically and still honours saved state from localStorage
- Regression check: no console warnings about Vue keys or computed dependencies

---

## 📈 Success Criteria

- Qualitative: Users can scan category lists faster; QA reports improved discoverability
- Quantitative (post-release observation): Reduced filter toggle time in session replays / feedback
- No regressions in existing filter persistence or Firestore query performance

---

**Estimate**: < 1 dev day (mostly refactors, minimal new logic)  
**Risks**: Low – touches shared constants, but limited to UI iteration order only


