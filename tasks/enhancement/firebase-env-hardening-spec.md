# Firebase Dev/Prod Environment Hardening Specification

## 📌 Overview

This enhancement tightens the existing Firebase dev/prod environment setup so that misconfiguration fails fast at build time and optional safety guardrails are documented. The current setup (Option A: same env var names, Vite mode selects `.env.development` vs `.env.production`) remains unchanged; we add validation and small fixes to close identified gaps.

**Status**: 📋 **SPECIFICATION** – Not yet implemented

---

## 1. 🎯 Goals

-   **Fail fast in production builds**: Ensure `vite build` (production mode) never succeeds when Firebase config is missing or still points at the dev project.
-   **Document CI contract**: Make it explicit what environment variables CI must set for production builds.
-   **Optional hardening**: Document or implement optional guardrails (e.g. build-time checks, measurementId) without changing default local workflows.
-   **Keep current behavior**: No change to how `npm run dev` / `npm run dev:prod` work; only add validation and small, non-breaking fixes.

## 2. 📋 Current Behavior (Summary)

-   **Development**: `npm run dev` → Vite mode `development` → loads `.env.development` → dev project (`demo-vz-price-guide`) and emulators when `VITE_FIREBASE_EMULATORS=1`.
-   **Local prod**: `npm run dev:prod` → `vite --mode production` → loads `.env.production` → prod project (`vz-price-guide`), emulators off, console warning when connected to prod DB.
-   **Production build**: `npm run build` → Vite mode `production` → loads `.env.production` (or CI-injected vars). There is **no check** that the resulting config is actually the prod project or that required vars are set.

## 3. 🔴 Gaps Addressed

| Gap                                      | Risk                                                                                                           | This spec                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Production build without prod config** | CI/build can succeed with missing or dev Firebase config; wrong app could be deployed.                         | Add build-time validation that fails the build when in production mode and config is invalid. |
| **No build-time guardrails**             | No automated check that `VITE_FIREBASE_PROJECT_ID` is set and equals the real prod project in production mode. | Implement a pre-build or Vite plugin check.                                                   |
| **Prod warning is advisory only**        | Default `dev:prod` only warns in console; no block.                                                            | Leave as-is; document as intentional. Optionally mention `dev:prod:confirm` in CI/docs.       |
| **measurementId unused**                 | `.env.development` has `VITE_FIREBASE_MEASUREMENT_ID` but `firebase.js` does not use it.                       | Add `measurementId` to Firebase config when present (optional for Analytics).                 |

## 4. 🔧 Functional Requirements

### 4.1 Build-time validation (production mode only)

-   When Vite runs in **production** mode (e.g. `vite build` or `vite --mode production`), before the build completes:
    -   **Required**: `VITE_FIREBASE_PROJECT_ID` must be set and non-empty.
    -   **Required**: `VITE_FIREBASE_PROJECT_ID` must equal the **production** project id (e.g. `vz-price-guide`). If it equals the **dev** project id (e.g. `demo-vz-price-guide`), the build must **fail** with a clear error.
    -   **Recommended**: Other required Firebase client vars (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_APP_ID`, etc.) should be checked for non-empty; if any are missing, fail the build with a message listing what is missing.
-   When Vite runs in **development** mode, no validation is required (current behavior unchanged).
-   Validation must run in the same environment as the build (Node/Vite), using `import.meta.env` or the same env loading that Vite uses so the check sees the same values as the built app.

### 4.2 Implementation options for build-time validation

-   **Option A – Vite plugin**: A small custom plugin that runs in `configResolved` or `buildStart` and reads `mode` and env; if `mode === 'production'`, run the checks and call `throw new Error(...)` or use Vite’s `config.logger.error` + exit.
-   **Option B – Pre-build script**: An npm script (e.g. `node scripts/validate-firebase-env.js`) that checks `process.env` (with explicit loading of `.env.production` via `dotenv` or similar) and exits with code 1 on failure; `build` script becomes `npm run validate:firebase:prod && vite build`.
-   **Option C – Inline in vite.config.js**: In `vite.config.js`, read `process.env.NODE_ENV` / Vite’s mode and, when building for production, read env and throw if invalid (note: Vite’s env may not be fully loaded in config phase; may need to load `.env.production` manually in config).

Recommendation: **Option A (Vite plugin)** or **Option B (pre-build script)** so validation runs with the same env as the build and keeps `vite.config.js` clean.

### 4.3 Constants

-   **Production project id**: Single source of truth (e.g. `vz-price-guide`). Define in one place (e.g. `scripts/validate-firebase-env.js` or a shared `src/constants/firebase.js`) so the build check and any runtime warning stay in sync.
-   **Dev project id**: (e.g. `demo-vz-price-guide`) used only to reject production builds that accidentally use dev config.

### 4.4 measurementId (optional)

-   If `VITE_FIREBASE_MEASUREMENT_ID` is set in the loaded env, add `measurementId` to the Firebase `firebaseConfig` object in `src/firebase.js` so Analytics can use it when enabled. If unset, leave unchanged (no key or undefined).

### 4.5 Documentation and CI

-   **CI**: Document in `docs/production-development.md` (or a short CI/deploy doc) that production builds **must** have:
    -   All `VITE_FIREBASE_*` vars set to production values, **or**
    -   A `.env.production` (or equivalent) with production values present in the build environment.
-   **env.production.example**: Add a one-line note that this file (or the same vars set in CI) is **required** for production builds and that the build will fail if production mode is used with dev or missing config.

## 5. 🏗️ Implementation Plan

### 5.1 Add build-time validation

1. Choose implementation (Vite plugin vs pre-build script).
2. Define constants: production project id, dev project id, list of required `VITE_FIREBASE_*` vars.
3. In production mode only:
    - Ensure `VITE_FIREBASE_PROJECT_ID === '<production-project-id>'`.
    - If `VITE_FIREBASE_PROJECT_ID === '<dev-project-id>'`, fail with: e.g. "Production build cannot use dev Firebase project. Set production env or use .env.production."
    - Optionally: for each required var, ensure non-empty; fail with a list of missing vars.
4. Integrate: either register the plugin in `vite.config.js` or add `validate:firebase:prod` and wire `build` to run it first.

### 5.2 Optional: measurementId in firebase.js

-   In `src/firebase.js`, add `measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined` (or omit key when undefined) to `firebaseConfig`.

### 5.3 Documentation updates

-   **docs/production-development.md**: Add a "Production builds and CI" subsection stating that production builds require prod Firebase env and will fail if dev project or missing vars are detected; reference `env.production.example` and CI env vars.
-   **env.production.example**: Add a short comment at top that this file (or equivalent CI env) is required for production builds and that the build fails in production mode without valid prod config.

### 5.4 No changes to

-   `npm run dev` or `npm run dev:prod` / `dev:prod:confirm`.
-   Runtime behavior of `firebase.js` (except optional measurementId).
-   `.env.development` or local developer workflow.

## 6. 🧪 Testing Requirements

-   **Manual**: Run `vite build` with no `.env.production` and no production env vars → build should fail with clear message.
-   **Manual**: Run `vite build` with `VITE_FIREBASE_PROJECT_ID=demo-vz-price-guide` (and other vars set) → build should fail.
-   **Manual**: Run `vite build` with correct production vars (or `.env.production` present) → build should succeed.
-   **Manual**: Run `npm run dev` and `npm run dev:prod` → unchanged behavior.
-   **Optional**: Add a small Node script or CI step that runs the same validation so CI can run it explicitly if desired.

## 7. 📝 Code / Config Locations

-   **New**: `scripts/validate-firebase-env.js` (if using pre-build script) or a small plugin in e.g. `vite-plugin-validate-firebase-env.js` (or inline in repo).
-   **Modify**: `vite.config.js` (if using plugin or loading env in config).
-   **Modify**: `package.json` – `build` script if pre-build validation is used.
-   **Modify**: `src/firebase.js` – add `measurementId` when present.
-   **Modify**: `docs/production-development.md`, `env.production.example`.

## 8. ✅ Acceptance Criteria

-   [ ] In production mode, build fails when `VITE_FIREBASE_PROJECT_ID` is missing or equals the dev project id, with a clear error message.
-   [ ] In production mode, build succeeds only when `VITE_FIREBASE_PROJECT_ID` equals the production project id and (if implemented) required Firebase vars are set.
-   [ ] Development mode and `npm run dev` / `npm run dev:prod` behavior are unchanged.
-   [ ] Documentation states that production builds require prod Firebase config and that validation will fail otherwise.
-   [ ] Optional: `measurementId` is included in Firebase config when `VITE_FIREBASE_MEASUREMENT_ID` is set.
-   [ ] Optional: `env.production.example` includes a note about production build requirement and validation.

---

**Status**: 📋 Specification – Ready for implementation  
**Priority**: Medium (hardening; reduces deploy risk)  
**Estimated Effort**: 1–2 hours  
**Dependencies**: None; builds on existing Firebase env setup.
