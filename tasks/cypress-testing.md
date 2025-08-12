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

## Auth Testing Implementation Tasks

### 1. Cookie Banner Handling

-   [x] **Create robust cookie banner commands** in `cypress/support/e2e.js`:
    -   `cy.acceptCookies()` - handles `data-tid="banner-accept"`
    -   `cy.declineCookies()` - handles `data-tid="banner-decline"`
    -   `cy.dismissCookieBanner()` - handles any cookie banner dismissal
    -   Add retry logic and wait for banner to appear
    -   Handle cases where banner doesn't appear
    -   **Status**: ✅ Implemented with error handling and graceful fallbacks

### 2. Auth State Management

-   [x] **Implement proper auth clearing commands**:
    -   `cy.clearAuth()` - clear all auth state (localStorage, sessionStorage, cookies)
    -   `cy.signOut()` - properly sign out user from Firebase Auth
    -   `cy.ensureSignedOut()` - verify user is signed out, sign out if needed
    -   `cy.ensureSignedIn(email, password)` - verify user is signed in, sign in if needed
    -   **Status**: ✅ Implemented with comprehensive state verification

### 3. Custom Commands Setup

-   [ ] **Create comprehensive custom commands** in `cypress/support/e2e.js`:
    -   `cy.signIn(email, password)` - robust sign in with error handling
    -   `cy.signUp(email, password, confirmPassword)` - user registration
    -   `cy.requestPasswordReset(email)` - password reset flow
    -   `cy.verifyEmail()` - email verification handling
    -   `cy.waitForAuth()` - wait for auth state to stabilize

### 4. Test Data Management

-   [ ] **Improve emulator seeding**:
    -   Ensure consistent test user creation in `scripts/seed-emulator.js`
    -   Add multiple test users with different permission levels
    -   Create predictable test data for auth scenarios
    -   Add cleanup commands for between-test isolation

### 5. Auth Flow Testing Structure

-   [ ] **Organize auth tests by flow**:
    -   **Registration Flow**: signup → email verification → first login
    -   **Login Flow**: signin → redirect handling → session persistence
    -   **Password Reset Flow**: request reset → email handling → new password
    -   **Session Management**: auth state persistence, logout, redirects
    -   **Error Handling**: invalid credentials, network errors, validation

### 6. Page State Verification

-   [ ] **Add auth state verification helpers**:
    -   `cy.verifySignedIn()` - check if user is properly authenticated
    -   `cy.verifySignedOut()` - check if user is properly signed out
    -   `cy.verifyRedirectedToSignIn()` - verify redirect to signin page
    -   `cy.verifyProtectedRouteAccess()` - test access to protected routes

### 7. Error Handling & Edge Cases

-   [ ] **Handle common auth testing issues**:
    -   Network timeouts and retries
    -   Firebase emulator connection issues
    -   Cookie banner timing issues
    -   Auth state race conditions
    -   Form validation errors
    -   Email verification delays

### 8. Test Isolation & Cleanup

-   [ ] **Implement proper test isolation**:
    -   Clear auth state between tests
    -   Reset emulator data when needed
    -   Handle test user cleanup
    -   Prevent test interference

### 9. CI/CD Integration

-   [ ] **Ensure reliable CI testing**:
    -   Emulator startup reliability
    -   Test data seeding consistency
    -   Auth state management in headless mode
    -   Proper error reporting and debugging

### 10. Documentation & Maintenance

-   [ ] **Create testing documentation**:
    -   Auth testing best practices
    -   Common troubleshooting steps
    -   Test data management guide
    -   CI/CD testing workflow

## Implementation Priority

1. **Phase 1**: Cookie Banner + Auth State Management (Tasks 1-2)
2. **Phase 2**: Custom Commands + Test Data (Tasks 3-4)
3. **Phase 3**: Auth Flows + Verification (Tasks 5-6)
4. **Phase 4**: Error Handling + Isolation (Tasks 7-8)
5. **Phase 5**: CI/CD + Documentation (Tasks 9-10)

Each phase should be fully tested before moving to the next to ensure robust, reliable auth testing.
