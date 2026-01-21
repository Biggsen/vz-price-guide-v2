# Crate Rewards Enchantment Selection + YAML Export (Modernized)

## Status

Completed (2026-01-21).

This spec modernizes Crate Rewards enchantment handling to match the upgraded enchantment data model and the Shop Manager UX, while keeping Crate Rewards’ CrazyCrates YAML export requirements front-and-center.

## Implementation summary

- Crate Rewards uses the Shop Manager-style enchantment UI (chips + search dropdown).
- Enchantments are stored as arrays of enchantment item document IDs and kept in sync between:
	- `items[0].enchantments`
	- `display_enchantments`
- Version-aware enchantment filtering is enforced using resource enchantment data with nearest-previous fallback.
- YAML export uses deterministic sorting and derives enchantment `name:level` from enchantment `material_id` (best-effort fallback when needed).
- Reward item images prefer the `_enchanted.webp` variant when enchantments are present (with fallback to base image).

### Primary implementation references

- `src/views/CrateSingleView.vue`
- `src/utils/crateRewards.js`
- `src/utils/enchantmentVersioning.js`
- `src/utils/image.js` (`getItemImageUrl`)
- Updates entry: `data/updates.json` (id `42`)

## Goals

- Modern enchantment picker UX in `src/views/CrateSingleView.vue` (match Shop Manager add/edit modal experience).
- Store enchantments as **arrays of enchantment item document IDs**.
- Keep the existing **base book** workflow for Crate Rewards:
	- Selecting an `enchanted_book_*` search result normalizes to base `enchanted_book` and pre-populates enchantments.
	- A base `enchanted_book` reward may contain multiple enchantments.
- Ensure YAML export produces valid output using canonical IDs (no parsing human display strings).

## Non-goals

- No conflict enforcement between enchantments (no “Sharpness vs Smite” blocking).
- No compatibility filtering between enchantments and items (e.g., “Lure only on fishing rods”).
	- Enchantments are free once an item is considered enchantable.

## Core rules

### Enchantability gate

- Only **enchantable items** can have enchantments.
- Base `enchanted_book` is **always enchantable**, regardless of `isItemEnchantable()` result.

### Enchantment picker: what’s selectable

When the selected item is enchantable (or base `enchanted_book`):

- Show enchantment options (each level is a separate option, like Shop Manager).
- The list is filtered by Minecraft version using the `resource/enchantments_X_Y.json` dataset:
	- Use the crate’s `minecraft_version` (e.g., `1.20` → `enchantments_1_20.json`).
	- If the exact file doesn’t exist, fallback to the **nearest previous** available file.
	- Enforce `maxLevel`: do not offer levels above the version’s `maxLevel` for that enchantment.

### Existing “out-of-range” enchantments remain visible

If a reward already has enchantments that don’t match the version filter (unknown enchantment for that version, or level > `maxLevel`):

- Still show them as selected chips (so they’re visible and removable).
- Do not offer them in the add list.
- YAML export still includes them (forgiving).

### Single-item consistency (manual add/edit form)

For the current manual add/edit flow (single-item rewards):

- The selected enchantment list is the source of truth.
- Persist it to both:
	- `items[0].enchantments` (what the player receives)
	- `display_enchantments` (what the GUI shows)
- These must stay in sync to avoid “looks enchanted, gives something else”.

### Item change behavior

- If the user changes the selected item, **auto-clear all enchantments**.

### Same enchantment type replacement (“last selection wins”)

- Enforce one enchantment per type (e.g., only one Sharpness).
- Selecting a new level for the same type replaces the previous selection (upgrade or downgrade).
- This behavior should be consistent in:
	- Crate Rewards
	- Shop Manager (current “only replace if higher” is considered incorrect UX and should be updated separately)

### Non-enchantable item legacy state

If an item is not enchantable but already has enchantments (legacy/bad data):

- Show the enchantment section so the enchantments are visible.
- Allow **remove-only** (do not allow adding new enchantments).
- YAML export still includes any remaining enchantments (forgiving).

## Data model

### Stored format

- Store enchantments as arrays of **enchantment item document IDs**.
- Infer enchantment type + level from the enchantment item’s `material_id` (`enchanted_book_<name>_<level>`), not from display names.

### Legacy format handling

If legacy data uses the old object-map shape for enchantments:

- Normalize to an array on load/save/export.

## UI implementation notes (`src/views/CrateSingleView.vue`)

- Replace the current simple modal `<select>` with the Shop Manager style:
	- type-to-search input
	- dropdown list
	- keyboard navigation (preferred, can reuse patterns from Shop Manager)
- Keep the existing “base book normalization” behavior:
	- selecting `enchanted_book_*` sets the selected item to base `enchanted_book`
	- pre-populate enchantments from the selected variant

## YAML export requirements (`src/utils/crateRewards.js`)

### Canonical mapping

- Convert enchantment IDs → `name:level` using the enchantment item’s `material_id`.
	- expected pattern: `enchanted_book_<name>_<level>`
- Do not derive name/level from `enchantDoc.name` (string parsing is brittle).

### Forgiving fallback (best-effort)

If an enchantment ID can’t be resolved to a proper `enchanted_book_<name>_<level>`:

- Export the best-effort representation available (do not block export).

### Deterministic sorting on export

- Sort enchantments for YAML output by:
	- enchantment name (A→Z)
	- then level (1→max)
- UI selection order doesn’t need to be modified; sorting is for export stability.

## Success criteria

- [x] Crate Rewards enchantment UI matches the Shop Manager UX.
- [x] Enchantments are stored as arrays of IDs and are exported via `material_id` mapping.
- [x] Base book normalization stays intact and supports multi-enchantment books.
- [x] Version-aware filtering works with nearest-previous fallback and maxLevel enforcement.
- [x] Export is deterministic and forgiving.
