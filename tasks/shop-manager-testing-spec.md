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

### 1. Access Control & Authentication Tests (`shop-manager-access.cy.js`)

**Purpose**: Verify that access control works correctly for authenticated, unauthenticated, and unverified users.

**Test Cases**:
- [ ] Unauthenticated users see CTA/modal prompting sign up when accessing `/shop-manager`
- [ ] Unauthenticated users are redirected when accessing protected shop manager routes
- [ ] Unverified users see email verification prompt modal
- [ ] Verified users can access shop manager dashboard
- [ ] Navigation links in header/nav work correctly based on auth state
- [ ] Shop manager modal shows correct content for different auth states
- [ ] Modal navigation (sign up, sign in, verify email) works correctly

**Test Data Requirements**:
- Unauthenticated user state
- Authenticated but unverified user
- Verified user with shop manager access

**Selectors Needed**:
- `data-cy` attributes for shop manager CTA buttons
- `data-cy` attributes for modal elements
- `data-cy` attributes for navigation links

### 2. Shop Manager Dashboard Tests (`shop-manager-dashboard.cy.js`)

**Purpose**: Verify the main dashboard displays correctly and navigation works.

**Test Cases**:
- [ ] Dashboard loads with correct title and structure
- [ ] Shows empty state when no servers exist
- [ ] Shows empty state when no shops exist
- [ ] Displays existing servers in table/cards
- [ ] Displays existing shops grouped by server
- [ ] Navigation cards work (Servers, Shops, Market Overview)
- [ ] Server count displays correctly
- [ ] Shop count displays correctly
- [ ] LocalStorage preferences persist (hidden shops, table sorting)
- [ ] Server form modal opens and closes correctly
- [ ] Shop form modal opens and closes correctly
- [ ] Delete confirmation modals work correctly

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

### 3. Server Management Tests (`shop-manager-servers.cy.js`)

**Purpose**: Verify CRUD operations for servers work correctly.

**Test Cases**:
- [ ] Create server with valid data (name, version, description)
- [ ] Form validation for required fields (name)
- [ ] Form validation for Minecraft version selection
- [ ] Server name uniqueness validation (if implemented)
- [ ] Edit existing server
- [ ] Delete server with confirmation
- [ ] Cancel delete operation
- [ ] Server list displays all user's servers
- [ ] Server displays with correct Minecraft version
- [ ] Server description displays correctly
- [ ] Error handling for failed create operation
- [ ] Error handling for failed update operation
- [ ] Error handling for failed delete operation
- [ ] Version dropdown shows all supported versions (1.16-1.21)
- [ ] Default version selection works correctly

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

### 4. Shop Management Tests (`shop-manager-shops.cy.js`)

**Purpose**: Verify CRUD operations for shops work correctly.

**Test Cases**:
- [ ] Create shop with valid data (name, server, location, description, is_own_shop)
- [ ] Form validation for required fields (name, server)
- [ ] Server selection dropdown works correctly
- [ ] Location field is optional
- [ ] Description field works correctly
- [ ] "Is own shop" checkbox works correctly
- [ ] Edit existing shop
- [ ] Delete shop with confirmation
- [ ] Cancel delete operation
- [ ] Shop list displays by server grouping
- [ ] Shop visibility toggle (hide/show) works
- [ ] Navigation to shop items view works
- [ ] Error handling for failed operations
- [ ] Empty state when no shops exist
- [ ] Shop count updates after create/delete

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

### 5. Shop Items Management Tests (`shop-manager-items.cy.js`)

**Purpose**: Verify shop items CRUD, price tracking, and stock management work correctly.

**Test Cases**:
- [ ] Add single item to shop
- [ ] Add multiple items to shop (bulk selection)
- [ ] Item search and selection works correctly
- [ ] Version filtering (only shows items for server's Minecraft version)
- [ ] Edit item buy price with inline editing
- [ ] Edit item sell price with inline editing
- [ ] Price history tracking (previous prices display correctly)
- [ ] Price change indicators (↑ ↓) display correctly
- [ ] Stock quantity field works correctly
- [ ] Stock full checkbox works correctly
- [ ] Notes field works correctly
- [ ] Delete item with confirmation
- [ ] Bulk operations (if implemented)
- [ ] Mark items as checked (last_updated tracking)
- [ ] Table sorting works correctly
- [ ] Table filtering works correctly
- [ ] Empty state when no items in shop
- [ ] Item count displays correctly
- [ ] View mode toggle (categories/list) works
- [ ] Layout toggle (comfortable/compact) works
- [ ] Error handling for failed operations

**Test Data Requirements**:
- Shop with no items (empty state)
- Shop with multiple items
- Items with various price states
- Items with stock status
- Items with notes
- Items with price history
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

### 6. Market Overview Tests (`shop-manager-market-overview.cy.js`)

**Purpose**: Verify market overview displays and compares prices correctly.

**Test Cases**:
- [ ] Market overview loads for selected server
- [ ] Displays all shops on server
- [ ] Price comparison table works correctly
- [ ] Item search and filtering works
- [ ] Version filtering works correctly
- [ ] Price sorting works correctly
- [ ] Best price indicators display correctly
- [ ] Navigation back to shop manager works
- [ ] Empty state when no shops on server
- [ ] Empty state when no items in shops
- [ ] Error handling for invalid server selection
- [ ] Redirect when server doesn't exist
- [ ] Redirect when user has no shops on server

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

**Test Cases**:
- [ ] Complete workflow: Create server → Create shop → Add items → View market
- [ ] Navigation from dashboard to servers view
- [ ] Navigation from dashboard to shops view
- [ ] Navigation from dashboard to market overview
- [ ] Navigation from shop list to shop items view
- [ ] Navigation from shop items back to shop manager
- [ ] Navigation from market overview back to shop manager
- [ ] URL routing works correctly
- [ ] Deep linking to specific shop works
- [ ] Deep linking to specific server market works
- [ ] Data persistence across navigation
- [ ] Back button functionality works
- [ ] Browser back/forward navigation works
- [ ] Page refresh maintains state where applicable

**Test Data Requirements**:
- Complete test scenario with server, shop, and items
- Various navigation paths

**Selectors Needed**:
- `data-cy` attributes for all navigation links/buttons
- URL verification in tests

### 8. Edge Cases & Error Handling (`shop-manager-edge-cases.cy.js`)

**Purpose**: Verify edge cases and error scenarios are handled gracefully.

**Test Cases**:
- [ ] Handling deleted servers (shops should handle gracefully)
- [ ] Handling deleted shops (items should handle gracefully)
- [ ] Concurrent edits (if applicable)
- [ ] Network errors during operations
- [ ] Invalid data submission
- [ ] Maximum length validation for text fields
- [ ] Special characters in names/descriptions
- [ ] Very long descriptions
- [ ] Empty strings where not allowed
- [ ] Negative prices (if not allowed)
- [ ] Zero prices
- [ ] Very large price values
- [ ] Invalid Minecraft version selection
- [ ] Missing required fields
- [ ] Form submission with validation errors
- [ ] Modal close during form editing
- [ ] Page refresh during form editing

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
  - Items with price history
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

### Phase 2: Core Test Files

- [ ] **Task 2.1**: Create `shop-manager-access.cy.js`
  - Access control tests
  - Authentication state tests
  - Modal interaction tests

- [ ] **Task 2.2**: Create `shop-manager-dashboard.cy.js`
  - Dashboard display tests
  - Navigation tests
  - Empty state tests
  - LocalStorage persistence tests

- [ ] **Task 2.3**: Create `shop-manager-servers.cy.js`
  - Server CRUD tests
  - Form validation tests
  - Error handling tests

- [ ] **Task 2.4**: Create `shop-manager-shops.cy.js`
  - Shop CRUD tests
  - Form validation tests
  - Visibility toggle tests

- [ ] **Task 2.5**: Create `shop-manager-items.cy.js`
  - Item CRUD tests
  - Price tracking tests
  - Stock management tests
  - Bulk operations tests

- [ ] **Task 2.6**: Create `shop-manager-market-overview.cy.js`
  - Market overview display tests
  - Price comparison tests
  - Filtering tests

### Phase 3: Integration & Edge Cases

- [ ] **Task 3.1**: Create `shop-manager-integration.cy.js`
  - Complete workflow tests
  - Navigation tests
  - URL routing tests

- [ ] **Task 3.2**: Create `shop-manager-edge-cases.cy.js`
  - Error handling tests
  - Edge case scenarios
  - Validation edge cases

### Phase 4: Test Utilities & Helpers

- [ ] **Task 4.1**: Create custom Cypress commands for shop manager
  - `cy.createTestServer(serverData)` - Create test server
  - `cy.createTestShop(shopData)` - Create test shop
  - `cy.createTestShopItem(itemData)` - Create test shop item
  - `cy.navigateToShopManager()` - Navigate to shop manager
  - `cy.navigateToShopItems(shopId)` - Navigate to shop items
  - `cy.navigateToMarketOverview(serverId)` - Navigate to market overview

- [ ] **Task 4.2**: Create test data fixtures
  - Server fixtures
  - Shop fixtures
  - Shop item fixtures

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

- [ ] All test files created and passing
- [ ] Coverage for all major user flows
- [ ] Access control properly tested
- [ ] CRUD operations tested for all entities
- [ ] Error handling tested
- [ ] Edge cases covered
- [ ] Tests run reliably in CI/CD
- [ ] Documentation complete

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




