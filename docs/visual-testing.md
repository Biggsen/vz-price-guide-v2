# Visual Testing System

This document describes the visual testing system for capturing screenshots of all pages and their various states in the application.

## Overview

The visual testing system allows you to capture screenshots of every page in the application without manually navigating to each one. This is useful for:

-   Reviewing the visual design of the entire application
-   Documenting all page states (loading, success, error, empty)
-   Comparing designs across different breakpoints
-   Creating a visual reference for stakeholders

## Components

### 1. Visual Screenshot Test (`cypress/e2e/visual-screenshots.cy.js`)

The main test file that captures screenshots of all pages and states. It includes:

-   **Public Pages**: Home, signin, signup, reset password, updates, policies, 404
-   **Authentication Flow**: Verify email, reset password confirm, success pages
-   **User Pages**: Account, change password, suggestions (authenticated users)
-   **Admin Pages**: Dashboard, shop manager, item management, recipes, styleguide
-   **Access Control**: Restricted access pages
-   **Home Page Variations**: Different view modes, layouts, alert states
-   **Responsive Breakpoints**: Mobile, tablet, desktop, large desktop
-   **Modal States**: Settings and export modals

### 2. Test Data Seeding (`scripts/seed-emulator.js`)

Enhanced seeding script that provides comprehensive test data for all scenarios:

-   **Users**: Regular users, admin users, unverified users
-   **Items**: Various Minecraft items with different pricing types
-   **Shops & Shop Items**: Test shops with pricing data
-   **Servers**: Test server configurations
-   **Suggestions**: Various suggestion states
-   **Recipes**: Recipe data for testing recipe management

### 3. Visual Test Runner (`scripts/run-visual-tests.js`)

Automated script that:

-   Runs the visual screenshot tests
-   Organizes screenshots into categorized directories
-   Creates a README with organization information
-   Handles error reporting and cleanup

### 4. Organized Output (`visual-screenshots/`)

The output directory is organized into categories:

```
visual-screenshots/
├── public-pages/          # Pages accessible without authentication
├── auth-pages/            # Authentication flow pages
├── user-pages/            # Pages requiring user authentication
├── admin-pages/           # Pages requiring admin authentication
├── modals/                # Modal dialogs and overlays
├── responsive/            # Different screen sizes
├── errors/                # Error pages and states
└── README.md              # Organization information
```

## Usage

### Prerequisites

1. Firebase emulators must be running
2. Test data must be seeded
3. Development server should be running

### Running Visual Tests

#### Option 1: Using npm script (Recommended)

```bash
# Start Firebase emulators (in one terminal)
npm run emulators

# In another terminal, seed the database
npm run seed:emu

# Run the visual tests
npm run visual:tests
```

#### Option 2: Manual execution

```bash
# Start Firebase emulators
firebase emulators:start --only firestore,auth --project demo-vz-price-guide

# In another terminal, seed the database
node scripts/seed-emulator.js

# Run the visual tests
node scripts/run-visual-tests.js
```

### Viewing Results

After running the tests, screenshots will be organized in the `visual-screenshots/` directory. Browse through the categorized folders to review:

-   All page designs and layouts
-   Different states (loading, success, error, empty)
-   Responsive behavior across breakpoints
-   Modal and overlay designs

## Test Coverage

### Page States Captured

Each page captures these key states:

1. **Default State**: Normal page load with standard content
2. **Loading State**: When data is being fetched
3. **Error State**: When errors occur (network issues, validation errors)
4. **Success State**: When operations complete successfully
5. **Empty State**: When no data is available
6. **Authentication States**: Logged in vs logged out views

### Responsive Breakpoints

-   **Mobile**: 375x667 (iPhone SE)
-   **Tablet**: 768x1024 (iPad)
-   **Desktop**: 1280x720 (Standard desktop)
-   **Large Desktop**: 1440x900 (Large screens)

### Special Variations

-   **Home Page**: With/without alerts, different view modes, layouts
-   **Authentication**: Different user types (regular, admin, unverified)
-   **Modals**: Settings and export modal states

## Customization

### Adding New Pages

To add a new page to the visual tests:

1. Add the page route to the appropriate test describe block in `visual-screenshots.cy.js`
2. Ensure the page has proper loading states and error handling
3. Add test data to `seed-emulator.js` if needed
4. Update the categorization in `run-visual-tests.js`

### Adding New States

To capture additional states for existing pages:

1. Add new test cases in `visual-screenshots.cy.js`
2. Use Cypress intercepts to simulate different scenarios
3. Update the screenshot naming convention

### Modifying Organization

To change how screenshots are organized:

1. Update the `categories` object in `run-visual-tests.js`
2. Modify the categorization logic in the `organizeScreenshots()` function
3. Update the README template

## Troubleshooting

### Common Issues

1. **Tests fail with authentication errors**

    - Ensure Firebase emulators are running
    - Verify test data is properly seeded
    - Check that user accounts exist with correct permissions

2. **Screenshots are blank or incomplete**

    - Increase wait times in `waitForPageReady()`
    - Check that pages are fully loaded before taking screenshots
    - Verify that CSS and assets are loading properly

3. **Tests timeout**
    - Increase Cypress timeouts in `cypress.config.js`
    - Check that emulators are responding quickly
    - Ensure development server is running

### Debug Mode

To run tests in debug mode:

```bash
# Run with Cypress GUI
npx cypress open

# Select the visual-screenshots.cy.js test
# Run individual tests to debug issues
```

## Best Practices

1. **Consistent Naming**: Use consistent naming for screenshots (page-state format)
2. **Wait for Stability**: Always wait for pages to fully load before capturing
3. **Handle Dynamic Content**: Account for loading states and dynamic content
4. **Regular Updates**: Run visual tests after major UI changes
5. **Version Control**: Consider adding screenshots to version control for design tracking

## Integration with CI/CD

The visual testing system can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Visual Tests
  run: |
      npm run emulators &
      sleep 10
      npm run seed:emu
      npm run visual:tests
```

This ensures that visual regressions are caught early in the development process.
