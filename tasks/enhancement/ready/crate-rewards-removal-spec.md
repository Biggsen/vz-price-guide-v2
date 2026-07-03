# Crate Rewards Feature Removal Specification

## Overview

Remove the **Crate Rewards** feature from the application in its entirety. This includes all user-facing UI, supporting utilities, Firestore security rules and indexes, tests, seed data, dev tooling, and documentation tied to CrazyCrates YAML import/export and crate prize management.

The feature was introduced as the first entry on the Tools page — a workflow for building, importing, simulating, and exporting CrazyCrates prize configurations. It is self-contained: no other live product surface (price guide, shop manager, recipes, exports) depends on it.

**Status**: 📋 **SPECIFICATION** – Not yet implemented

---

## Goals

1. Delete all crate-rewards application code with no remaining imports or dead routes.
2. Remove Firestore rules and indexes for `crate_rewards` and `crate_reward_items`.
3. Update navigation, routing, and the Tools page so the product has no broken links or empty shells.
4. Remove or update all automated tests that cover crate functionality.
5. Document the Firestore data disposition decision (retain vs delete production data).
6. Cancel or archive related idea/backlog specs so they are not picked up later.

## Non-Goals

- Removing `js-yaml` from `package.json` — still required by shop import/export (`ShopItemsView`, `economyShopGuiImport`, `vzPriceGuideImport`, etc.).
- Changing price guide, shop manager, or recipe functionality.
- Implementing a replacement tool on the Tools page (out of scope unless explicitly added later).
- Automatically deleting production Firestore documents (requires a separate scripted migration with explicit approval).

---

## Rationale

- Reduces maintenance surface during Minecraft version transition (26.x) — crate code contains its own version-aware enchantment mapping unrelated to the price guide.
- Removes ~5,000+ lines across views, utils, and components that are not core to the price guide mission.
- Eliminates a parallel Firestore data model (`crate_rewards`, `crate_reward_items`) and associated security rules.
- Simplifies Cypress and visual regression suites.

---

## Scope Inventory

### Files to delete

| Path | Approx. size | Role |
|------|-------------|------|
| `src/utils/crateRewards.js` | ~1,500 lines | Firestore CRUD, YAML parse/generate, CrazyCrates logic, VueFire composables |
| `src/views/CrateRewardManagerView.vue` | ~1,000 lines | Crate list/dashboard |
| `src/views/CrateSingleView.vue` | ~1,900 lines | Single-crate detail/editor |
| `src/components/CrateEditModal.vue` | — | Edit crate metadata modal |
| `src/components/CrateRewardItemRow.vue` | — | Prize row in detail view |
| `src/components/CrateRewardItemFormModal.vue` | — | Add/edit prize modal |
| `src/components/CrateImportModal.vue` | — | YAML import modal |
| `src/components/CrateClearAllModal.vue` | — | Clear-all confirmation |
| `src/components/CrateTestRewardsModal.vue` | — | Reward simulation modal |
| `src/views/YamlImportDevView.vue` | ~1,000 lines | Admin dev tool writing to `crate_reward_items` |
| `cypress/e2e/crate-rewards.cy.js` | — | Dedicated E2E suite |
| `scripts/reports/crateRewardReport.js` | — | Admin report script |
| `docs/crazycrates-data-transformation-specs.md` | — | CrazyCrates transformation reference |
| `public/images/tools/crate-rewards.png` | — | Tools page card image (if present) |

### Files to modify

| Path | Changes |
|------|---------|
| `src/router/index.js` | Remove `/crate-rewards` and `/crate-rewards/:id` routes; remove `/dev/yaml-import` route |
| `src/App.vue` | Remove `/crate-rewards` from `toolsRoutes` and `startsWith('/crate-rewards/')` nav logic |
| `src/components/Nav.vue` | Remove crate-rewards active-state checks from Tools nav highlight |
| `src/components/SubNav.vue` | Remove "Crate Rewards" subnav link and related `isToolsActive` path checks |
| `src/views/ToolsView.vue` | Remove crate rewards card, auth modal, handlers, and `showCrateRewardsModal` state |
| `firestore.rules` | Remove `match /crate_rewards/{crateId}` and `match /crate_reward_items/{itemId}` blocks |
| `firestore.indexes.json` | Remove both `crate_rewards` and `crate_reward_items` composite indexes |
| `scripts/seed-emulator.js` | Remove `crate_rewards` and `crate_reward_items` from `TEST_DATA` and seed loop |
| `cypress/e2e/visual-screenshots.cy.js` | Remove crate-rewards and crate-rewards-detail screenshot tests |
| `scripts/run-visual-tests.js` | Remove `crate-rewards` from screenshot filter list |
| `data/updates.json` | Add changelog entry announcing feature removal (at implementation time) |
| `tasks/vz-price-guide-project-summary.md` | Remove crate rewards from feature list and history |
| `tasks/view-file-sizes.md` | Remove CrateSingleView / CrateRewardManagerView rows |
| `tasks/buglist.md` | Archive or annotate resolved crate-specific bugs as obsolete |
| `tasks/enhancement/not-ready/hard-404-spec.md` | Remove `/crate-rewards/*` from known-route examples |

### Idea/backlog specs to archive or delete

Move to `tasks/completed/` with a one-line "cancelled — feature removed" header, or delete outright:

- `tasks/idea/multi-user-crate-management-feature.md`
- `tasks/idea/single-prize-import-feature.md`

Completed crate specs in `tasks/completed/` may remain as historical record; no action required unless consolidating docs.

---

## Firestore Data Disposition

Two collections are affected:

| Collection | Documents | Typical fields |
|------------|-----------|----------------|
| `crate_rewards` | Per-user crate metadata | `user_id`, `name`, `description`, `minecraft_version`, timestamps |
| `crate_reward_items` | Prize documents per crate | `crate_reward_id`, `weight`, `items[]`, display/enchantment fields |

### Recommended approach

**Phase A (with code removal):** Remove security rules so the collections are no longer accessible from the client. Documents remain in Firestore as orphaned data.

**Phase B (optional, separate approval):** Run a one-off admin script to export then delete all documents in both collections. Only proceed after confirming no users need recovery.

### Pre-removal checklist

- [ ] Run `node scripts/reports/crateRewardReport.js` (or equivalent query) to capture user/crate counts.
- [ ] Decide whether to notify affected users (if any non-owner accounts exist).
- [ ] Export sample data if needed for personal offline reference.

---

## Implementation Plan

### Phase 1 — Delete feature code

1. Delete all files listed in **Files to delete**.
2. Remove routes from `src/router/index.js`:
   - `crate-rewards` (manager)
   - `crate-reward-detail` (single view)
   - `yaml-import-dev` (dev tool)
3. Fix any broken imports surfaced by `npm run build`.

### Phase 2 — Navigation and Tools page

1. **`App.vue`**: `toolsRoutes` becomes `['/tools']` only.
2. **`Nav.vue`**: Tools tab active state checks only `route.path === '/tools'`.
3. **`SubNav.vue`**: Remove the Crate Rewards `RouterLink`; Tools subnav may show only "Tools" or be removed entirely if it becomes redundant with a single child route.
4. **`ToolsView.vue`**:
   - Remove the Crate Rewards card and image.
   - Remove `showCrateRewardsModal`, `handleCrateRewardsClick`, and related modal markup.
   - Revisit page layout — if no tools remain, consider a placeholder or future-tools message (product decision).

### Phase 3 — Firebase configuration

1. Delete crate `match` blocks from `firestore.rules`.
2. Remove crate index entries from `firestore.indexes.json`.
3. Deploy rules and indexes: `firebase deploy --only firestore:rules,firestore:indexes`.

### Phase 4 — Tests and scripts

1. Delete `cypress/e2e/crate-rewards.cy.js`.
2. Remove crate screenshot tests from `visual-screenshots.cy.js`.
3. Update `scripts/run-visual-tests.js` filter.
4. Remove crate seed data from `scripts/seed-emulator.js`.
5. Delete `scripts/reports/crateRewardReport.js`.

### Phase 5 — Documentation and backlog

1. Delete `docs/crazycrates-data-transformation-specs.md`.
2. Update `tasks/vz-price-guide-project-summary.md`, `tasks/view-file-sizes.md`, `tasks/buglist.md`.
3. Archive/cancel idea specs listed above.
4. Add removal note to `data/updates.json`.

### Phase 6 — Verification

Run full quality gate:

```bash
npm run lint
npm run build
# Cypress (minus deleted spec)
npx cypress run --spec "cypress/e2e/**/*.cy.js"
```

Manual checks:

- [ ] `/crate-rewards` and `/crate-rewards/any-id` return app 404 (or hosting fallback), not a blank/error page.
- [ ] `/dev/yaml-import` unreachable.
- [ ] Tools nav and subnav render without crate links.
- [ ] Tools page loads without console errors.
- [ ] Price guide, shop manager, exports, recipes unaffected.
- [ ] Emulator seed runs without crate collections.
- [ ] No remaining `crate` references in `src/` (grep verification).

---

## Redirect Strategy (optional)

If bookmarked URLs are a concern, add a client-side redirect in the router:

```js
{ path: '/crate-rewards/:pathMatch(.*)*', redirect: '/tools' }
```

Or a Firebase Hosting rewrite to `/tools`. Not required for a hard removal but improves UX for existing links.

---

## Dependency Analysis

### Inbound (nothing else imports crate code)

Confirmed: only crate views and `YamlImportDevView` import `crateRewards.js`. Safe to delete without cascading refactors elsewhere.

### Outbound (crate code imports from shared modules)

| Import | Action |
|--------|--------|
| `getEffectivePrice` from `pricing.js` | Removed with crate code; no change to `pricing.js` |
| `versions` / `baseEnabledVersions` from `constants.js` | Removed with crate views; no change to `constants.js` |
| `js-yaml` | Keep dependency — used by shop tooling |

---

## Post-Removal Product State

| Area | After removal |
|------|---------------|
| Tools page | Empty or placeholder unless another tool is added |
| Tools subnav | Likely redundant — consider removing subnav when only `/tools` remains |
| Auth-gated tools | Crate was the primary authenticated tool; verify Tools page still makes sense for unauthenticated vs authenticated users |
| Firestore | Orphaned `crate_rewards` / `crate_reward_items` data until Phase B cleanup |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Users lose saved crates | Run report pre-removal; optional export script; changelog announcement |
| Broken bookmarks | Optional redirect to `/tools` |
| Emulator tests fail | Remove crate seed data and visual tests in same PR |
| Firestore index deploy errors | Remove unused indexes before deploy; verify no queries remain |
| Missed reference in grep | Phase 6 verification grep: `crate`, `CrateReward`, `crate_reward` across repo |

---

## Effort Estimate

| Phase | Estimate |
|-------|----------|
| Phases 1–2 (code + nav) | 2–3 hours |
| Phase 3 (Firebase) | 30 minutes |
| Phase 4 (tests/scripts) | 1 hour |
| Phase 5 (docs) | 30 minutes |
| Phase 6 (verification) | 1 hour |
| **Total** | **~half day** |

Optional Firestore data export/delete script: +1–2 hours.

---

## Acceptance Criteria

- [ ] Zero files matching `*Crate*` or `crateRewards*` under `src/`.
- [ ] No routes containing `crate-rewards` or `yaml-import` in `src/router/index.js`.
- [ ] `rg -i "crate" src/` returns no matches (or only unrelated false positives — verify manually).
- [ ] `npm run lint` and `npm run build` pass.
- [ ] Cypress suite passes with `crate-rewards.cy.js` removed.
- [ ] Firestore rules deployed without crate collections.
- [ ] `data/updates.json` documents the removal.
- [ ] Product owner sign-off on Firestore data disposition (retain vs delete).

---

## Suggested Commit Structure

Single PR is acceptable given the feature is fully coupled. If splitting for review:

1. **PR 1**: Delete feature code, routes, nav, tests, seed data.
2. **PR 2**: Firebase rules/indexes deploy + docs/updates.

---

## Related Historical Specs (no action required)

These document past crate work and can remain in `tasks/completed/` as archive:

- `tasks/completed/crate-rewards-view-separation-spec.md`
- `tasks/completed/crate-rewards-ui-migration-spec.md`
- `tasks/completed/crate-reward-structure-migration-spec.md`
- `tasks/completed/crate-rewards-custom-pricing-feature.md`
- `tasks/completed/crate-rewards-enchantment-validation.md`
- `tasks/completed/refactor/crate-single-view-refactoring-spec.md`
- `tasks/completed/refactor/yaml-import-refactor-spec.md` (partially crate-related)
