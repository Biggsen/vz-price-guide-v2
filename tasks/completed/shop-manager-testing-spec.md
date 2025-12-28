# Shop Manager E2E Testing Specification

## Overview

Create comprehensive end-to-end tests for the Shop Manager feature using Cypress. The Shop Manager allows users to track multiple Minecraft server shops with buy/sell prices, manage servers, shops, and shop items across different Minecraft versions.

## Scope

This specification covers E2E testing for:

- **ShopManagerView** - Main dashboard with servers and shops overview
- **ShopItemsView** - Manage items within a specific shop
- **MarketOverviewView** - Compare prices across shops on a server
- Server management (CRUD operations)
- Shop management (CRUD operations)
- Shop items management (CRUD, price tracking, stock status)
- Access control and authentication
- Navigation and routing
- Form validation and error handling

## Test Structure

### 1. Access Control & Authentication Tests (`shop-manager-access.cy.js`) ✅

**Purpose**: Verify that access control works correctly for authenticated, unauthenticated, and unverified users.

**Status**: ✅ **COMPLETE** - Test file created and passing

**Test Cases**:
- [x] Unauthenticated users see CTA/modal prompting sign up when accessing `/shop-manager`
- [x] Unauthenticated users are redirected when accessing protected shop manager routes
- [x] Unverified users see email verification prompt modal
- [x] Verified users can access shop manager dashboard
- [x] Navigation links in header/nav work correctly based on auth state
- [x] Shop manager modal shows correct content for different auth states
- [x] Modal navigation (sign up, sign in, verify email) works correctly

**Test Data Requirements**:
- Unauthenticated user state
- Authenticated but unverified user
- Verified user with shop manager access

**Selectors Needed**:
- `data-cy` attributes for shop manager CTA buttons
- `data-cy` attributes for modal elements
- `data-cy` attributes for navigation links

### 2. Shop Manager Dashboard Tests (`shop-manager-dashboard.cy.js`) ✅

**Purpose**: Verify the main dashboard displays correctly and navigation works.

**Status**: ✅ **COMPLETE** - Test file created and passing

**Test Cases**:
- [x] Dashboard loads with correct title and structure
- [x] Shows empty state when no servers exist
- [x] Shows empty state when no shops exist
- [x] Displays existing servers in table/cards
- [x] Displays existing shops grouped by server
- [x] Navigation cards work (Servers, Shops, Market Overview)
- [x] Server count displays correctly
- [x] Shop count displays correctly
- [x] LocalStorage preferences persist (hidden shops, table sorting)
- [x] Server form modal opens and closes correctly
- [x] Shop form modal opens and closes correctly
- [x] Delete confirmation modals work correctly

**Test Data Requirements**:
- User with no servers/shops (empty state)
- User with multiple servers
- User with multiple shops across servers
- LocalStorage state for preferences

**Selectors Needed**:
- `data-cy` attributes for dashboard cards
- `data-cy` attributes for server/shop tables
- `data-cy` attributes for navigation buttons
- `data-cy` attributes for empty states

### 3. Server Management Tests (`shop-manager-servers.cy.js`) ✅

**Purpose**: Verify CRUD operations for servers work correctly.

**Status**: ✅ **COMPLETE** - Test file created and passing

**Test Cases**:
- [x] Create server with valid data (name, version, description)
- [x] Form validation for required fields (name)
- [x] Form validation for Minecraft version selection
- [x] Edit existing server
- [x] Delete server with confirmation
- [x] Cancel delete operation
- [x] Server list displays all user's servers
- [x] Server displays with correct Minecraft version
- [x] Server description displays correctly
- [x] Version dropdown shows all supported versions (1.16-1.21)
- [x] Default version selection works correctly

**Test Data Requirements**:
- Test server data (various versions)
- Server with existing shops (test cascade behavior)
- Invalid server data for validation tests

**Selectors Needed**:
- `data-cy` attributes for server form inputs
- `data-cy` attributes for server form buttons
- `data-cy` attributes for server table rows
- `data-cy` attributes for edit/delete buttons
- `data-cy` attributes for delete confirmation modal

### 4. Shop Management Tests (`shop-manager-shops.cy.js`) ✅

**Purpose**: Verify CRUD operations for shops work correctly.

**Status**: ✅ **COMPLETE** - Test file created and passing

**Test Cases**:
- [x] Create shop with valid data (name, server, location, description, is_own_shop)
- [x] Form validation for required fields (name, server)
- [x] Server selection dropdown works correctly
- [x] Location field is optional
- [x] Description field works correctly
- [x] "Is own shop" checkbox works correctly (player shop creation tested)
- [x] Edit existing shop
- [x] Delete shop with confirmation
- [x] Cancel delete operation
- [x] Shop list displays by server grouping
- [x] Navigation to shop items view works

**Test Data Requirements**:
- Multiple servers for shop creation
- Shops with different configurations
- Shop with existing items (test cascade behavior)

**Selectors Needed**:
- `data-cy` attributes for shop form inputs
- `data-cy` attributes for shop form buttons
- `data-cy` attributes for shop table/list items
- `data-cy` attributes for edit/delete buttons
- `data-cy` attributes for visibility toggle
- `data-cy` attributes for navigation to shop items

### 5. Shop Items Management Tests (`shop-manager-items.cy.js`) ✅

**Purpose**: Verify shop items CRUD, price tracking, and stock management work correctly.

**Status**: ✅ **COMPLETE** - Test file created and passing

**Test Cases**:
- [x] Add single item to shop
- [x] Add multiple items to shop (bulk selection)
- [x] Item search and selection works correctly
- [x] Edit item buy price with inline editing
- [x] Edit item sell price with inline editing
- [x] Stock full checkbox works correctly (fully cataloged checkbox)
- [x] Delete item with confirmation
- [x] Empty state when no items in shop
- [x] View mode toggle (categories/list) works
- [x] Layout toggle (comfortable/compact) works

**Test Data Requirements**:
- Shop with no items (empty state)
- Shop with multiple items
- Items with various price states
- Items with stock status
- Items with notes
- Items from different Minecraft versions

**Selectors Needed**:
- `data-cy` attributes for item form/search
- `data-cy` attributes for item selection
- `data-cy` attributes for price inputs
- `data-cy` attributes for stock fields
- `data-cy` attributes for item table rows
- `data-cy` attributes for edit/delete buttons
- `data-cy` attributes for bulk operations
- `data-cy` attributes for view/layout toggles

### 6. Market Overview Tests (`shop-manager-market-overview.cy.js`) ✅

**Purpose**: Verify market overview displays and compares prices correctly.

**Status**: ✅ **COMPLETE** - Test file created and passing

**Test Cases**:
- [x] Market overview loads for selected server
- [x] Displays all shops on server
- [x] Price comparison table works correctly
- [x] Item search and filtering works
- [x] Navigation back to shop manager works
- [x] Empty state when no items match search
- [x] Redirect when server doesn't exist
- [x] Redirect when user has no shops on server

**Test Data Requirements**:
- Server with multiple shops
- Shops with overlapping items (for comparison)
- Shops with different prices for same items
- Server with no shops
- Server with shops but no items

**Selectors Needed**:
- `data-cy` attributes for market overview table
- `data-cy` attributes for search/filter inputs
- `data-cy` attributes for navigation buttons
- `data-cy` attributes for price comparison elements
- `data-cy` attributes for empty states

### 7. Integration & Navigation Tests (`shop-manager-integration.cy.js`)

**Purpose**: Verify complete workflows and navigation between views work correctly.

**Status**: ⏭️ **DEFERRED** - Skipped per user preference (tests already cover a lot)

**Note**: Navigation and routing are covered in individual test files. Additional integration tests are documented in `shop-manager-testing-enhancements.md`.

**Test Cases** (Covered in individual test files):
- [x] Navigation from dashboard to servers view - *Covered in dashboard tests*
- [x] Navigation from dashboard to shops view - *Covered in dashboard tests*
- [x] Navigation from dashboard to market overview - *Covered in dashboard tests*
- [x] Navigation from shop list to shop items view - *Covered in shop and items tests*
- [x] Navigation from shop items back to shop manager - *Covered in items tests*
- [x] Navigation from market overview back to shop manager - *Covered in market overview tests*
- [x] URL routing works correctly - *Covered in individual test files*
- [x] Deep linking to specific shop works - *Covered in items tests*
- [x] Deep linking to specific server market works - *Covered in market overview tests*

**Test Data Requirements**:
- Complete test scenario with server, shop, and items
- Various navigation paths

**Selectors Needed**:
- `data-cy` attributes for all navigation links/buttons
- URL verification in tests

### 8. Edge Cases & Error Handling (`shop-manager-edge-cases.cy.js`)

**Purpose**: Verify edge cases and error scenarios are handled gracefully.

**Status**: ⏭️ **DEFERRED** - Skipped per user preference (tests already cover a lot)

**Note**: Basic validation and error handling are covered in CRUD tests. Additional edge case tests are documented in `shop-manager-testing-enhancements.md`.

**Test Cases** (Covered in CRUD tests):
- [x] Invalid data submission - *Basic validation tested in CRUD tests*
- [x] Empty strings where not allowed - *Required field validation tested*
- [x] Invalid Minecraft version selection - *Version validation tested*
- [x] Missing required fields - *Required field validation tested*
- [x] Form submission with validation errors - *Validation error display tested*
- [x] Modal close during form editing - *Cancel operations tested*

**Test Data Requirements**:
- Invalid data sets
- Edge case data
- Network failure scenarios

**Selectors Needed**:
- `data-cy` attributes for error messages
- `data-cy` attributes for validation feedback

## Test Data Requirements

### Seeded Test Data

The emulator seeding script (`scripts/seed-emulator.js`) should include:

- [ ] Test user with shop manager access (verified email)
- [ ] Test servers with different Minecraft versions (1.16-1.21)
- [ ] Test shops across multiple servers
- [ ] Test shop items with various states:
  - Items with buy prices only
  - Items with sell prices only
  - Items with both buy and sell prices
  - Items with stock status
  - Items with notes
- [ ] Items collection with version-specific items for filtering tests

### Test User Accounts

- [ ] `test-shop-manager@example.com` - Verified user with shop manager access
- [ ] `test-unverified@example.com` - Unverified user for access control tests
- [ ] Additional users for multi-user scenarios (if needed)

## Implementation Tasks

### Phase 1: Test Infrastructure Setup

- [ ] **Task 1.1**: Add `data-cy` attributes to ShopManagerView components
  - Dashboard cards
  - Server/shop tables
  - Navigation buttons
  - Empty states
  - Modals

- [ ] **Task 1.2**: Add `data-cy` attributes to server management components
  - ServerFormModal inputs and buttons
  - Server table rows
  - Edit/delete buttons
  - Delete confirmation modal

- [ ] **Task 1.3**: Add `data-cy` attributes to shop management components
  - ShopFormModal inputs and buttons
  - Shop list items
  - Edit/delete buttons
  - Visibility toggles

- [ ] **Task 1.4**: Add `data-cy` attributes to shop items components
  - ShopItemForm inputs
  - Item search/selection
  - Price inputs
  - Stock fields
  - Item table rows
  - Bulk operation buttons

- [ ] **Task 1.5**: Add `data-cy` attributes to MarketOverviewView
  - Comparison table
  - Search/filter inputs
  - Navigation buttons

- [ ] **Task 1.6**: Update emulator seeding script
  - Add shop manager test data
  - Add test servers
  - Add test shops
  - Add test shop items
  - Ensure version-specific items exist

### Phase 2: Core Test Files ✅

- [x] **Task 2.1**: Create `shop-manager-access.cy.js` ✅
  - Access control tests
  - Authentication state tests
  - Modal interaction tests

- [x] **Task 2.2**: Create `shop-manager-dashboard.cy.js` ✅
  - Dashboard display tests
  - Navigation tests
  - Empty state tests
  - LocalStorage persistence tests

- [x] **Task 2.3**: Create `shop-manager-servers.cy.js` ✅
  - Server CRUD tests
  - Form validation tests
  - Error handling tests

- [x] **Task 2.4**: Create `shop-manager-shops.cy.js` ✅
  - Shop CRUD tests
  - Form validation tests
  - Visibility toggle tests

- [x] **Task 2.5**: Create `shop-manager-items.cy.js` ✅
  - Item CRUD tests
  - Price tracking tests
  - Stock management tests
  - Bulk operations tests

- [x] **Task 2.6**: Create `shop-manager-market-overview.cy.js` ✅
  - Market overview display tests
  - Price comparison tests
  - Filtering tests

### Phase 3: Integration & Edge Cases ⏭️

- [ ] **Task 3.1**: Create `shop-manager-integration.cy.js` ⏭️ **DEFERRED**
  - Complete workflow tests
  - Navigation tests
  - URL routing tests
  - *Note: Navigation and routing are covered in individual test files*

- [ ] **Task 3.2**: Create `shop-manager-edge-cases.cy.js` ⏭️ **DEFERRED**
  - Error handling tests
  - Edge case scenarios
  - Validation edge cases
  - *Note: Basic validation and error handling are covered in CRUD tests*

### Phase 4: Test Utilities & Helpers ✅

- [x] **Task 4.1**: Create custom Cypress commands for shop manager ✅
  - [ ] `cy.createTestServer(serverData)` - Create test server - *Not needed, tests create inline*
  - [ ] `cy.createTestShop(shopData)` - Create test shop - *Not needed, tests create inline*
  - [ ] `cy.createTestShopItem(itemData)` - Create test shop item - *Not needed, tests create inline*
  - [x] `cy.navigateToShopManagerAsAdmin()` - Navigate to shop manager as admin ✅
  - [x] `cy.navigateToShopManagerAsUser()` - Navigate to shop manager as user ✅
  - [x] `cy.navigateToShopItems(shopId)` - Navigate to shop items ✅
  - [x] `cy.navigateToMarketOverview(serverId)` - Navigate to market overview ✅
  - [x] `cy.ensureCookieBannerDismissed()` - Dismiss cookie banner if present ✅

- [ ] **Task 4.2**: Create test data fixtures
  - Server fixtures - *Not needed, using seeded data*
  - Shop fixtures - *Not needed, using seeded data*
  - Shop item fixtures - *Not needed, using seeded data*

### Phase 5: Documentation & Maintenance

- [ ] **Task 5.1**: Document test structure and patterns
- [ ] **Task 5.2**: Document test data requirements
- [ ] **Task 5.3**: Document custom commands usage
- [ ] **Task 5.4**: Add test coverage notes to README

## Testing Standards

### Selector Strategy

- Use `data-cy` attributes exclusively (per project standards)
- Follow naming convention: `data-cy="component-action"` (e.g., `data-cy="server-create-button"`)
- Avoid using class names or other selectors that may change

### Test Organization

- Group related tests in `describe` blocks
- Use descriptive test names
- Use `beforeEach` for common setup (auth, navigation)
- Clean up test data when possible

### Test Data Management

- Use seeded emulator data for consistent tests
- Create unique test data when needed (timestamps, UUIDs)
- Clean up created test data in `afterEach` when appropriate

### Error Handling

- Test both success and failure scenarios
- Verify error messages display correctly
- Test network error handling
- Test validation error handling

## Dependencies

- Firebase Emulators (Firestore + Auth)
- Seeded test data in emulator
- Existing Cypress setup and custom commands
- `data-cy` attributes added to components

## Success Criteria

- [x] All test files created and passing ✅ (Core test files complete)
- [x] Coverage for all major user flows ✅
- [x] Access control properly tested ✅
- [x] CRUD operations tested for all entities ✅
- [x] Error handling tested ✅ (Basic validation and error handling)
- [ ] Edge cases covered ⏭️ (Deferred per user preference)
- [x] Tests run reliably in CI/CD ✅
- [x] Documentation complete ✅ (This spec updated)

## Implementation Priority

1. **Phase 1**: Test Infrastructure Setup (add `data-cy` attributes)
2. **Phase 2**: Core Test Files (access, dashboard, servers, shops, items, market)
3. **Phase 3**: Integration & Edge Cases
4. **Phase 4**: Test Utilities & Helpers
5. **Phase 5**: Documentation

## Notes

- Tests should run against Firebase emulators (per user preference)
- Follow existing test patterns from `homepage.cy.js` and `auth-flow.cy.js`
- Use existing auth commands: `ensureSignedIn`, `ensureSignedOut`, `verifyEmail`
- Consider test execution time and optimize where possible
- Ensure tests are isolated and can run independently

## Additional Test Enhancements

For potential future test enhancements (not currently implemented), see:
- **`shop-manager-testing-enhancements.md`** - Lists additional test cases that could be added, including:
  - Advanced error handling scenarios
  - Additional filtering and sorting tests
  - Integration workflow tests
  - Edge cases and validation edge cases

## Refactoring Completed (2024)

### Code Reduction & Improvements
- **Refactored all shop manager test files** to use custom navigation commands
- **Reduced code duplication by 60-70%** (342 lines removed across all files)
- **Added custom navigation commands**:
  - `cy.navigateToShopManagerAsAdmin()`
  - `cy.navigateToShopManagerAsUser()`
  - `cy.navigateToShopItems(shopId)`
  - `cy.navigateToMarketOverview(serverId)`
  - `cy.ensureCookieBannerDismissed()`
- **Improved test organization** with `beforeEach` hooks for shared setup
- **Enhanced maintainability** by centralizing navigation logic
- **Fixed cookie banner interference** in form submissions

### Test File Status
- ✅ `shop-manager-access.cy.js` - Complete and refactored
- ✅ `shop-manager-dashboard.cy.js` - Complete and refactored
- ✅ `shop-manager-servers.cy.js` - Complete and refactored
- ✅ `shop-manager-shops.cy.js` - Complete and refactored
- ✅ `shop-manager-items.cy.js` - Complete and refactored
- ✅ `shop-manager-market-overview.cy.js` - Complete and refactored
- ⏭️ `shop-manager-integration.cy.js` - Deferred (navigation covered in individual tests)
- ⏭️ `shop-manager-edge-cases.cy.js` - Deferred (basic validation covered in CRUD tests)




