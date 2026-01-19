# 🗂️ Category Order Preference (Curated vs Alphabetical)

## Status
- **Not ready to implement**

## Blockers / Open Questions
- **Where the setting lives**: homepage settings modal vs account settings vs both.
- **Exact scope**: do Shop Manager / Market Overview / Crate Rewards respect the preference, or are they explicitly “fixed curated order”?
- **Persistence detail**: localStorage key name, default value, and how anonymous vs signed-in users should behave (and whether/when this should later sync to a user profile).

## 📌 Overview

Category order is currently **curated** via `enabledCategories` (which intentionally groups related categories like tools/weapons/armor). A previous idea was to force **alphabetical** ordering everywhere, but that risks reducing usability for players who browse by “type of gameplay” rather than category name.

This enhancement introduces an **optional** user preference for **Category order**:

- **Curated (default)**: preserves the current grouped ordering
- **Alphabetical (optional)**: sorts category labels A→Z for users who prefer scanning that way

---

## ✅ Value Check (Gate)

Do **not** implement this just because it’s tidy.

Proceed only if at least one is true:

- We’re already touching homepage filters/settings UX (low incremental cost)
- Multiple users explicitly ask for alphabetised categories (support/feedback)
- We observe meaningful “scan friction” (e.g., session replay notes, repeated mis-clicks, user feedback)

If none of the above: leave curated ordering as-is and revisit later.

---

## 🔍 Current Behaviour

- Category lists appear in **curated order** because many views iterate `enabledCategories` directly.
- Some views intentionally rebuild category ordering to “match price guide order” using `enabledCategories`.
- Firestore queries often order by `category`, but UI ordering is primarily driven by constants and client-side grouping/iteration order.

---

## 🎯 Goals

1. Provide a **user-selectable** category ordering mode (Curated vs Alphabetical)
2. Keep **Curated** as the default to preserve existing mental models and grouping
3. Keep Firestore query/filter logic untouched (ordering is a presentation concern)
4. Ensure “All categories” affordances remain first where applicable
5. Avoid in-place mutation of exported arrays to prevent subtle side effects

---

## 🚫 Non-Goals

- Re-categorising items or changing category names
- Changing Firestore ordering/indexes
- Forcing one ordering for all users
- Creating a complex drag-and-drop category ordering UI (out of scope)

---

## 🧭 Scope (Where the preference applies)

Because categories are surfaced in many places (homepage, export, shop manager, crate rewards, admin tools), apply the preference intentionally.

Recommended defaults:

- **Public browsing surfaces (respect preference)**:
	- Homepage category chips and category sections
	- Export modal category checklist
- **Admin/data-entry surfaces (optional / can remain curated)**:
	- Bulk update category filter buttons
	- Add/edit item category dropdowns

Note: If the preference is introduced, either:

- apply it consistently across all category lists, **or**
- explicitly document which surfaces are “fixed curated order” to avoid surprise.

---

## 🛠️ Implementation Outline (Low-cascade)

- Introduce a single source of truth for display order, e.g.:
	- A small “category order” utility/composable that returns `displayCategories` based on a stored preference
	- Modes:
		- `curated`: return a copy of `enabledCategories` as-is
		- `alphabetical`: return a copy of `enabledCategories` sorted (case-insensitive, stable)
- Store the preference:
	- **MVP**: localStorage (per-device)
	- **Optional later**: persist to user profile for cross-device consistency
- Update UI components to iterate `displayCategories` instead of raw `enabledCategories` where in scope
- Keep logic that depends on “enabled categories” (validation/gating) using `enabledCategories` unchanged

---

## 🧪 Testing Checklist

- **Default behavior unchanged**: Curated order remains the default for existing users
- **Preference toggle works**: Switching to Alphabetical changes category order where in scope
- **State persistence**: Preference persists across refresh (localStorage MVP)
- **Filters still behave**: Selected categories, URL params, and counts continue working
- **No regressions**: No console warnings about Vue keys or computed dependencies

---

## 📈 Success Criteria

- Qualitative: Users who prefer alphabetical can find categories faster without harming everyone else
- No regressions in filter persistence or query performance
- Minimal maintenance burden (order logic is centralized, not copy-pasted)

---

**Estimate**: 0.5–1 dev day (mostly plumbing + refactors)  
**Risks**: Medium (cascade potential) unless the ordering logic is centralized and scope is explicit
