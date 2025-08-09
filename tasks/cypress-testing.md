## Cypress E2E Testing with Firebase Emulators

This document specifies how we will run Cypress end‑to‑end tests locally and in CI without touching production data. We will use the Firebase Emulator Suite (Firestore + Auth).

### Scope and goals

-   Run Cypress against the app served by Vite.
-   Never hit the real Firestore/Auth; use emulators or a separate test project as a fallback.
-   Deterministic test data via seed/reset hooks per spec.
-   Keep setup simple for contributors on Windows/macOS/Linux.

### Requirements

-   Node and npm per project.
-   Cypress (already installed).
-   Firebase CLI (for emulators): `npm i -D firebase-tools` or global `firebase-tools`.
-   Emulator config files: `firebase.json`, `.firebaserc`, `firestore.rules` (already present), and `firestore.indexes.json` (already present).

### Environment flags

-   Add `VITE_USE_EMULATORS=true` when running tests to toggle emulator wiring in `src/firebase.js`.
-   Optional: `VITE_EMULATOR_FIRESTORE_PORT=8080`, `VITE_EMULATOR_AUTH_PORT=9099` to override defaults.
-   Cypress will pass `CYPRESS_baseUrl` at runtime; baseUrl falls back to `http://localhost:5173`.

### App changes (edits required)

1. Update `src/firebase.js` to optionally connect to emulators when `import.meta.env.VITE_USE_EMULATORS === 'true'`.
    - Firestore: `connectFirestoreEmulator(db, '127.0.0.1', port)`.
    - Auth: `connectAuthEmulator(auth, `http://127.0.0.1:${port}`)`.
2. Ensure any network calls that hit external services are stubbed via `cy.intercept` during tests.

### Emulator config

-   Extend `firebase.json`:
    -   `emulators.firestore.port: 8080`
    -   `emulators.auth.port: 9099`
    -   `emulators.ui.port: 4000` (optional)

### Seeding and resetting data

-   Create `scripts/emulator-seed.js` that writes a minimal dataset to Firestore emulator and creates a test user in Auth emulator.
-   Create `scripts/emulator-reset.js` to wipe emulator data between runs (or use REST endpoints: `DELETE /emulator/v1/projects/<projectId>/databases/(default)/documents`).
-   Call seed/reset from Cypress `before`/`afterEach` as needed using Node tasks, or from npm scripts before running Cypress.

### Cypress structure

-   `cypress/e2e/` contains spec files.
-   `cypress/support/e2e.js` registers `Cypress.on('uncaught:exception', ...)` if needed and custom commands.
-   Add custom commands for common flows, e.g., `cy.signIn(email, password)` that hits Auth emulator REST API or uses Firebase client SDK when emulators are active.

### NPM scripts

-   `dev`: Vite dev server.
-   `emulators`: start Firebase emulators.
-   `test:e2e:emu`: start emulators + start Vite (with `VITE_USE_EMULATORS=true`) + run Cypress headless.
-   `cy:open:emu`: start emulators manually in one terminal, then run Cypress interactive with `--config baseUrl=http://localhost:5173` and `VITE_USE_EMULATORS=true`.

Example scripts (to add):

```json
{
	"scripts": {
		"emulators": "firebase emulators:start --only firestore,auth",
		"cy:open:emu": "cross-env VITE_USE_EMULATORS=true cypress open",
		"cy:run:emu": "cross-env VITE_USE_EMULATORS=true cypress run",
		"test:e2e:emu": "concurrently -k \"npm:emulators\" \"cross-env VITE_USE_EMULATORS=true vite --port 5173 --strictPort\" & wait-on http-get://localhost:5173 && npm run cy:run:emu"
	}
}
```

Notes:

-   Use `cross-env`, `concurrently`, and `wait-on` for cross‑platform orchestration.
-   On Windows, avoid `start-server-and-test` kill steps that rely on `wmic`.

### CI integration (GitHub Actions example)

-   Install Node, cache npm.
-   Install Firebase CLI.
-   Run emulators headless with `--project demo-<id>` (no real project needed).
-   Start Vite, wait on port, run Cypress.

Sketch:

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
            - run: npm run emulators &
            - run: npx wait-on tcp:8080 tcp:9099
            - run: VITE_USE_EMULATORS=true npx vite --port 5173 --strictPort &
            - run: npx wait-on http-get://localhost:5173
            - run: VITE_USE_EMULATORS=true npx cypress run
```

### Test data guidelines

-   Use stable fixtures for categories/versions consistent with app expectations.
-   Seed a minimal `items` collection subset with predictable prices per version.
-   Create at least one test user with a known email/password in the Auth emulator.

### Next steps

1. Add emulator blocks to `firebase.json` and optional `.firebaserc` project alias for local emulators.
2. Wire `src/firebase.js` to connect to emulators when `VITE_USE_EMULATORS` is true.
3. Add `scripts/emulator-seed.js` and `scripts/emulator-reset.js`.
4. Add npm scripts listed above using `concurrently`, `cross-env`, and `wait-on`.
5. Convert smoke test to run under emulators; add a basic spec that reads seeded items.
6. Add CI workflow.
