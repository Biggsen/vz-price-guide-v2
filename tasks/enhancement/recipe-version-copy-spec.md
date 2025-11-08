# Recipe Version Copy Workflow

## Summary
- Enable editors to bootstrap a new recipe for Minecraft version `1_x+1` by copying the recipe from `1_x`.
- Maintain existing runtime fallback that uses the latest prior recipe when the current version lacks one.

## Goals
- Minimize manual data entry when introducing recipes for new versions.
- Preserve awareness of copied fields so editors can verify version-specific changes.
- Prevent inadvertent duplication of recipes or metadata drift.

## Non-Goals
- Changing how runtime fallback resolves recipes.
- Automating recipe validation beyond current requirements.

## Target Users
- Admins and content editors with permissions to manage recipes.

## User Stories
- As an editor, when I start a recipe for a newer version, I can copy the previous version so I do not start from scratch.
- As an editor, I can review which fields were copied and adjust values before saving.
- As an editor, I receive clear feedback if there is no previous recipe to copy.

## UX Requirements
- When creating a recipe for version `Vnew`, the form checks for `Vprev` and shows a primary action `Copy previous version`.
- Selecting the action clones all fields (ingredients, quantities, metadata, notes) into the draft form.
- Copied fields are visually marked until the user edits them; manual edits remove the highlight.
- If `Vprev` does not exist, the copy action is hidden or disabled with inline help text.
- Display a toast or banner summarizing the copy, prompting the user to review changes.
- Confirm overwriting if the user has an unsaved draft and re-triggers copy.

## Functional Requirements
- Copy action operates client-side: fetch the prior recipe document, remove system metadata, populate the form state.
- Do not persist automatically; user must explicitly save to create the new recipe.
- Saving a copied recipe writes a new document with fresh timestamps and author metadata.
- Persist `copied_from_version` on saved documents for audit and analytics.
- Prevent saving if the copied content is identical to the previous version (requires a change before save).
- If a recipe already exists for `Vnew`, copying replaces the form state but requires confirmation and an explicit save to overwrite the persisted record.

## Data Model
- Firestore `recipes` collection documents keyed by `item_id` and `version`.
- New field `copied_from_version` (string) set on first save; immutable afterwards.
- Ensure server rules reject updates that attempt to modify `copied_from_version` post-creation.
- Copy process must strip `created_at`, `updated_at`, `author_id`, and any system-managed fields before populating the form.

## Validation & Error Handling
- Validation mirrors existing recipe requirements (e.g., required ingredients, valid quantities).
- Surface meaningful errors when fetching the previous recipe fails (network/firestore issues).
- Block save attempts that fail validation and keep the form state intact for correction.

## Permissions & Security
- Require existing admin/editor authentication and authorization checks for the copy action.
- Enforce Firestore rules so only authorized users can create or overwrite recipes.
- Ensure runtime fallback logic remains read-only and unaffected by this change.

## Analytics & Telemetry
- Emit `recipe_copy_initiated` event with `item_id`, `from_version`, `to_version`.
- Emit `recipe_copy_save_success` and `recipe_copy_save_cancelled` events to measure adoption.
- Include `copied_from_version` in admin activity logs if available.

## Testing Strategy
- Unit tests for form state reducers or composables that handle copy logic and manual overrides.
- Integration test against Firestore emulator covering copy + save flow and metadata assertions.
- Cypress test ensuring the copy action visibility depends on the existence of `Vprev` and verifies UI highlights and toast messaging.

## Documentation & Rollout
- Update `/docs/recipes.md` with new workflow instructions and permissions.
- Add a changelog entry to `data/updates.json`.
- Communicate rollout to editors via release notes and include testing steps for QA.

