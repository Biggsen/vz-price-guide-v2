## Cypress E2E Testing with Firebase Emulators

This document describes how to run Cypress end‑to‑end tests locally and in CI without touching production data, using the Firebase Emulator Suite (Firestore + Auth).

### Scope and goals

-   Run Cypress against the app served by Vite.
-   Never hit real Firestore/Auth; use emulators or a separate test project as a fallback.
-   Deterministic test data via a seed step before tests.
-   Keep setup simple for Windows/macOS/Linux.

### Requirements

-   Node and npm per project.
-   Cypress (already installed).
-   Firebase CLI (for emulators): `firebase-tools` (installed as a dev dependency).
-   Emulator config files: `firebase.json`, `firestore.rules`, and `firestore.indexes.json` (already present).

### Environment flags

-   Use `VITE_FIREBASE_EMULATORS=1` (or `true`) when running the app/tests to toggle emulator wiring in `src/firebase.js`.
-   The e2e runner auto-sets `CYPRESS_baseUrl` to match the dev server.

### App wiring (implemented)

-   `src/firebase.js` connects to emulators when `VITE_FIREBASE_EMULATORS` is `1`/`true`:
    -   Firestore: `connectFirestoreEmulator(db, '127.0.0.1', 8080)`
    -   Auth: `connectAuthEmulator(auth, 'http://127.0.0.1:9099')`

### Emulator config (implemented)

-   `firebase.json` includes:
    -   `emulators.firestore.port: 8080`
    -   `emulators.auth.port: 9099`
    -   `emulators.ui.port: 4000` (optional UI)

### Seeding and resetting data

-   Seeding is implemented: `scripts/seed-emulator.js` writes a minimal dataset and creates emulator Auth users with fixed UIDs/claims. Profiles in Firestore exclude auth credentials.
-   Resetting is recommended (not yet implemented). Optionally add `scripts/reset-emulator.js` to wipe emulator data between runs (or use the emulator REST API `DELETE /emulator/v1/projects/<projectId>/databases/(default)/documents`).

### Cypress structure

-   Specs live in `cypress/e2e/`.
-   `cypress/support/e2e.js` is available for global handlers and custom commands (e.g., `Cypress.on('uncaught:exception', ...)`, `cy.signIn(...)`).

### NPM scripts (implemented)

-   `dev`: Start Vite.
-   `emulators`: Start Firestore/Auth emulators for project `demo-vz-price-guide`.
-   `test:e2e`: Start Vite on an available port and run Cypress against it (Windows-friendly orchestration).
-   `test:e2e:emu`: Run e2e with `VITE_FIREBASE_EMULATORS=1`.
-   `seed:emu` / `seed:emu:exec`: Seed the emulators either against a running suite or via `emulators:exec`.
-   `test:e2e:emu:exec`: Run tests inside `emulators:exec` without seeding.
-   `test:e2e:emu:seeded`: Run `emulators:exec`, seed, then run e2e.

Common flows:

-   Headless, seed, then test (recommended):
    -   `npm run test:e2e:emu:seeded`
-   Headless, no auto-seed:
    -   `npm run test:e2e:emu`
-   Interactive (start emulators separately first):
    -   `VITE_FIREBASE_EMULATORS=1 npm run cy:open`

### CI integration (example)

Use a workflow that starts emulators, seeds, starts Vite, waits for readiness, and runs Cypress. For example:

```yaml
name: e2e
on: [push, pull_request]
jobs:
    e2e:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: 20
            - run: npm ci
            - run: npx firebase emulators:exec --only firestore,auth --project demo-vz-price-guide --import=./.emulator-data "node scripts/seed-emulator.js && VITE_FIREBASE_EMULATORS=1 node scripts/run-e2e.js"
```

### Test data guidelines

-   Use stable fixtures for categories/versions consistent with app expectations.
-   Seed a minimal `items` collection subset with predictable prices per version.
-   Create at least one test user with a known email/password in the Auth emulator.

### Next steps

1. Add `scripts/reset-emulator.js` (or equivalent) to clear data between runs/specs if flakiness appears.
2. Add helpful custom commands in `cypress/support/e2e.js` (e.g., `cy.signIn`, common navigations, `Cypress.on('uncaught:exception', ...)`).
3. Expand specs beyond smoke: auth flows, CRUD for shop items, suggestions, and recipe recalculation checks.
4. Commit a CI workflow leveraging the example above.
