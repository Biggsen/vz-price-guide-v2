# Shop Manager E2E Testing - Enhancement Opportunities

## Overview

This document outlines potential test enhancements for the Shop Manager feature. These tests are not currently implemented but could be added to improve test coverage. Some items may require UI features to be implemented first.

## Enhancement Categories

### 1. Additional Validation & Error Handling Tests

#### Server Management
- [ ] **Server name uniqueness validation** - Test that duplicate server names are rejected (if feature is implemented in UI)
- [ ] **Error handling for failed create operation** - Test network errors, Firestore errors during server creation
- [ ] **Error handling for failed update operation** - Test network errors, Firestore errors during server update
- [ ] **Error handling for failed delete operation** - Test network errors, Firestore errors during server deletion

#### Shop Management
- [ ] **Error handling for failed operations** - Test network errors, Firestore errors during shop CRUD operations
- [ ] **Shop visibility toggle (hide/show)** - Test shop visibility toggle functionality (if feature is implemented)
- [ ] **Shop count updates after create/delete** - Explicitly test that shop count updates dynamically after operations
- [ ] **Empty state when no shops exist** - Dedicated test for shop-specific empty state (currently covered in dashboard tests)

#### Shop Items Management
- [ ] **Error handling for failed operations** - Test network errors, Firestore errors during item CRUD operations
- [ ] **Item count displays correctly** - Explicitly test that item count updates dynamically after operations
- [ ] **Notes field works correctly** - Test adding, editing, and displaying notes on shop items

### 2. Advanced Filtering & Sorting Tests

#### Shop Items Management
- [ ] **Version filtering** - Explicitly test that only items matching the server's Minecraft version are shown
- [ ] **Table sorting works correctly** - Test sorting by name, buy price, sell price, etc.
- [ ] **Table filtering works correctly** - Test filtering by category, price range, stock status, etc.

#### Market Overview
- [ ] **Version filtering works correctly** - Test version-specific filtering in market overview
- [ ] **Price sorting works correctly** - Test sorting by buy price, sell price, best deal, etc.
- [ ] **Best price indicators display correctly** - Test highlighting of best buy/sell prices across shops

### 3. Advanced Features & Workflows

#### Shop Items Management
- [ ] **Bulk operations** - Test bulk edit, bulk delete, bulk price updates (if implemented)
- [ ] **Mark items as checked (last_updated tracking)** - Test item checking/unchecking and last_updated timestamp updates

#### Market Overview
- [ ] **Empty state when no shops on server** - Dedicated test for server with no shops (currently covered via redirect)
- [ ] **Error handling for invalid server selection** - Explicit test for invalid server ID handling

### 4. Integration & Workflow Tests

These tests verify complete end-to-end workflows and cross-feature interactions:

- [ ] **Complete workflow: Create server → Create shop → Add items → View market** - Test full user journey in single test
- [ ] **Data persistence across navigation** - Test that data persists when navigating between views
- [ ] **Back button functionality works** - Test browser back button maintains correct state
- [ ] **Browser back/forward navigation works** - Test browser history navigation
- [ ] **Page refresh maintains state where applicable** - Test that appropriate state persists on refresh

### 5. Edge Cases & Advanced Error Scenarios

These tests verify edge cases and error scenarios that may not be common but should be handled gracefully:

#### Data Validation Edge Cases
- [ ] **Maximum length validation for text fields** - Test server names, shop names, descriptions at max length
- [ ] **Special characters in names/descriptions** - Test handling of special characters, emojis, unicode
- [ ] **Very long descriptions** - Test extremely long description fields
- [ ] **Negative prices (if not allowed)** - Test validation for negative price values
- [ ] **Zero prices** - Test handling of zero price values
- [ ] **Very large price values** - Test handling of extremely large numbers

#### Error Scenarios
- [ ] **Handling deleted servers** - Test that shops handle gracefully when their parent server is deleted
- [ ] **Handling deleted shops** - Test that items handle gracefully when their parent shop is deleted
- [ ] **Concurrent edits** - Test behavior when multiple users edit the same entity simultaneously
- [ ] **Network errors during operations** - Test handling of network failures during CRUD operations
- [ ] **Page refresh during form editing** - Test behavior when page is refreshed mid-form-edit

## Implementation Notes

### Priority Levels

**High Priority** (Core functionality that should be tested):
- Error handling for failed operations (all entities)
- Table sorting and filtering (if UI supports it)
- Notes field functionality (if implemented)
- Shop visibility toggle (if implemented)

**Medium Priority** (Nice to have, improves coverage):
- Version filtering explicit tests
- Item count updates
- Best price indicators
- Bulk operations (if implemented)

**Low Priority** (Edge cases, may not be critical):
- Maximum length validation
- Special characters handling
- Very large values
- Concurrent edits
- Page refresh scenarios

### Dependencies

Some tests require UI features to be implemented first:
- Shop visibility toggle - Requires UI feature
- Bulk operations - Requires UI feature
- Table sorting/filtering - Requires UI feature
- Best price indicators - Requires UI feature

### Test Organization

If implementing these enhancements:
- Consider adding to existing test files where appropriate
- Create new test files for integration/workflow tests
- Group edge cases in a dedicated test file if many are implemented
- Use the same custom navigation commands and patterns established in core tests

## Related Documentation

- See `shop-manager-testing-spec.md` for the main testing specification
- Core test files are complete and passing
- Custom navigation commands are available in `cypress/support/e2e.js`

