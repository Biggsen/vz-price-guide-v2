# Visual Screenshots

This directory contains organized screenshots from the visual regression test suite.

## Directory Structure

- **public-pages/** - Public pages (no auth required)
- **auth-pages/** - Authentication pages
- **user-pages/** - User account pages (auth required)
- **admin-pages/** - Admin pages (admin auth required)
- **modals/** - Modal dialogs and overlays
- **responsive/** - Responsive breakpoints
- **errors/** - Error pages and states
- **misc/** - Miscellaneous screenshots

## How to Use

1. Browse the organized screenshots to review the visual design of all pages and states
2. Compare screenshots across different states (loading, success, error, empty)
3. Review responsive breakpoints to ensure consistent design across devices
4. Check modal and overlay designs for proper styling

## Generating New Screenshots

To regenerate all screenshots:

```bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, seed the database
node scripts/seed-emulator.js

# Run the visual tests
npx cypress run --spec "cypress/e2e/visual-regression.cy.js"

# Organize the screenshots
node scripts/run-visual-tests.js
```

## Notes

- Screenshots are captured at 1280x720 resolution by default
- All pages are tested in their default state unless otherwise specified
- Error states are simulated by intercepting network requests
- Loading states are simulated by adding loading indicators
- Success states are simulated by adding success messages
