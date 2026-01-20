# Recipe Version Copy Workflow (Implementation-Ready)

## Summary
- Add a **client-side “Copy previous version”** action in the recipe editor so admins can bootstrap a version-specific recipe without re-entering data.
- Keep the existing **runtime version inheritance** (fallback to nearest earlier recipe) unchanged.

## Background / Current State
- Recipes are stored on the Firestore `items` documents under `recipes_by_version`.
- The recipe editor lives at `src/views/EditRecipeView.vue` and currently:
	- loads `recipes_by_version[versionKey]` for the selected version, or starts empty
	- saves by writing `items.recipes_by_version.${versionKey} = { ingredients, output_count }`
- Version keys in Firestore use underscores (e.g. `1_21`), while the UI uses dot versions (e.g. `1.21`).

## Goals
- Minimize manual entry when creating a recipe for a newer version.
- Reduce accidental “redundant overrides” (creating a new version recipe that is identical to the inherited one).
- Provide a lightweight audit signal for “this recipe was created by copying”.

## Non-Goals
- Changing how runtime fallback resolves recipes.
- Introducing a separate Firestore `recipes` collection (this feature must work with the existing `items.recipes_by_version` model).
- Building a full diff/highlight system for copied fields (optional follow-up).

## Target Users
- Admins/content editors who can manage recipes (`useAdmin().canBulkUpdate`).

## User Stories
- As an editor, when I’m editing a recipe for version `Vnew` and no recipe exists yet, I can copy the nearest previous recipe so I don’t start from scratch.
- As an editor, I can replace my current draft with the previous recipe, with a confirmation prompt.
- As an editor, if there is no previous recipe, the UI makes it obvious (no mysterious “copy nothing” button).

## Definitions
- **Dot version**: UI version string like `1.21` (from `src/constants.js` `versions` array).
- **Version key**: Firestore key like `1_21` (dot version with `.` replaced by `_`).
- **Previous recipe version** (`Vprev`): the **nearest earlier** dot version (based on `versions` ordering) that has an entry in `item.recipes_by_version`.
	- Example: if `Vnew = 1.21` and the item has recipes in `1_19` and `1_16`, then `Vprev = 1.19`.

## UX Requirements (MVP)
### Action visibility
- In `EditRecipeView.vue`, for the selected version `Vnew`:
	- If `Vprev` exists, show a primary button: **“Copy previous version (Vprev)”**
	- If `Vprev` does not exist, hide the button and show a small inline hint like: “No previous recipe exists to copy.”

### Copy behavior
- Clicking “Copy previous version” replaces the **draft form state** with the previous recipe’s data:
	- `ingredients`
	- `output_count`
- Show a banner/toast after copying:
	- “Copied recipe from `Vprev`. Review and save to create an override for `Vnew`.”

### Confirmation (overwrite protection)
- If the current form is “dirty” (user has edits since load/copy), re-copying must require confirmation.
- If a recipe already exists for `Vnew` (explicit recipe), copying must require confirmation because it will overwrite the existing form state (and a subsequent save will overwrite the stored recipe).

### Save guardrail (prevent redundant overrides)
- If the user copied from `Vprev` and did not make any changes, block saving with a clear message:
	- “No changes detected. This version already inherits the recipe from `Vprev`—make a change before saving.”

## Data Model
### Stored shape (existing + small extension)
Recipes remain embedded on `items`:

```js
items/{itemId} {
  recipes_by_version: {
    "1_21": {
      ingredients: [{ material_id: "iron_ingot", quantity: 3 }],
      output_count: 1,
      copied_from_version: "1.20" // optional
    }
  }
}
```

### Rules for `copied_from_version`
- Optional string (dot version, e.g. `1.20`)
- Set **only when saving** a recipe that was created via “Copy previous version”
- Treated as **immutable** once set:
	- the UI must never allow editing it
	- saves must preserve an existing value rather than deleting/overwriting it

## Functional Requirements
### Previous-version resolution
- Derive `Vprev` using the existing `versions` array ordering from `src/constants.js` and the presence of `item.recipes_by_version[versionKey]`.
- When copying, support both stored recipe formats:
	- **Legacy**: array of ingredients → interpret as `{ ingredients: array, output_count: 1 }`
	- **Current**: object with `ingredients`/`output_count` (ignore extra keys)

### Copy is client-side and non-persistent
- Copy must not write to Firestore until the user clicks “Save”.

### Saving
- When saving for version `Vnew`, write `items.recipes_by_version[VnewKey]` as an object:
	- `ingredients`, `output_count`
	- `copied_from_version`:
		- set if this recipe originated from copy and the field was not previously set
		- preserved if it already exists on the stored recipe

## Permissions & Security
- The copy UI must be gated behind existing recipe-edit permissions (`canBulkUpdate`), same as save/delete.
- Firestore security rules (outside this repo) must ensure:
	- only authorized users can write `items.recipes_by_version.*`
	- attempts to change an existing `copied_from_version` are rejected

## Analytics & Telemetry
Use the existing GA helper in `src/utils/analytics.js` (`trackEvent`) with a single rich event:

- Event name: `recipe_version_copy`
- Parameters:
	- `action`: `initiated` | `cancelled` | `saved`
	- `item_id`
	- `from_version` (dot, e.g. `1.20`)
	- `to_version` (dot, e.g. `1.21`)
	- `location`: `edit_recipe`

## Testing Strategy
- **Unit**: helper for resolving `Vprev` given `versions` + `recipes_by_version` keys; normalization of legacy array vs object.
- **Cypress**:
	- button visibility (shown only when `Vprev` exists)
	- copy populates form fields correctly
	- save is blocked when unchanged after copy
	- overwrite confirmation appears when form is dirty

## Acceptance Criteria
- Editors can copy the nearest previous recipe into the current version’s draft in `EditRecipeView`.
- Copy never auto-saves; save is explicit.
- Saving an unchanged copy is blocked (because inheritance already covers it).
- `copied_from_version` is written for copied recipes and cannot be modified by later edits.

## Follow-Ups (Optional)
- Highlight copied fields until edited (nice-to-have).
- Surface `copied_from_version` in recipe management tables for audit visibility.

