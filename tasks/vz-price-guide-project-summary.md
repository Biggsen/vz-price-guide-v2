<!-- PROJECT-MANIFEST:START -->

```json
{
	"schemaVersion": 1,
	"projectId": "vz-price-guide-v2",
	"name": "verzion's economy price guide",
	"repo": "Biggsen/vz-price-guide-v2",
	"visibility": "public",
	"status": "active",
	"domain": "minecraft",
	"type": "webapp",
	"lastUpdated": "2025-12-16",
	"links": {
		"prod": "https://minecraft-economy-price-guide.net/",
		"staging": null
	},
	"tags": ["webapp", "vue", "firebase", "minecraft", "tailwind"]
}
```

<!-- PROJECT-MANIFEST:END -->

# verzion's economy price guide - Project Summary

<!--
  The manifest block above contains machine-readable metadata about the project.
  This block MUST be present at the top of the file and MUST be valid JSON.
  The parser extracts this block to populate the Project Atlas dashboard.

  Required fields:
  - schemaVersion: Always 1 for v1
  - projectId: Unique identifier (lowercase, hyphens)
  - name: Display name
  - repo: GitHub owner/repo-name
  - visibility: "public" | "staging" | "private"
  - status: "active" | "mvp" | "paused" | "archived"
  - domain: "music" | "minecraft" | "management" | "other" (field/area categorization)
  - type: "webapp" | "microservice" | "tool" | "cli" | "library" | "other" (technical architecture)
  - lastUpdated: ISO date string (YYYY-MM-DD)
  - links: Object with "prod" and "staging" (strings or null)
  - tags: Array of strings
-->

## Project Overview

<!--
  This section provides a high-level description of the project.
  Include: purpose, main goals, target audience, key value proposition.
-->

**verzion's economy price guide** is a Vue 3 + Firebase application for Minecraft economy price tracking and management. The project has evolved from a simple price guide into a comprehensive platform with user accounts, shop management, crate rewards, and dynamic pricing systems.

### Key Features

-   **User Accounts System** - Registration, authentication, email verification, password reset
-   **Recipes & Dynamic Pricing** - 2,000+ recipes with automatic price calculations
-   **Shop Manager** - Multi-server shop tracking
-   **Crate Rewards Management** - YAML import, custom pricing, value calculations
-   **Suggestions System** - User feedback and feature requests with admin management
-   **Price Export** - JSON/YAML export with filtering and version selection
-   **Item Catalog** - 1,400+ items across 6 Minecraft versions (1.16-1.21)

---

## Tech Stack

<!--
  Document the technologies, frameworks, and tools used in the project.
  This helps with understanding dependencies and technical context.
-->

-   **Frontend**: Vue 3 (Composition API), Vite, Tailwind CSS, Heroicons
-   **Backend**: Firebase Firestore, Firebase Auth, Firebase Emulators
-   **Development**: ESLint + Prettier, Cypress (E2E testing), Node.js scripts
-   **Deployment**: Netlify

---

## Current Focus

<!--
  Describe what you're actively working on right now.
  This helps track immediate priorities and current development state.
-->

Currently focused on **Homepage Refactoring** - breaking down the 928-line HomeView.vue component into manageable pieces. This involves extracting composables (useEconomyConfig, useFilters, useItems), creating utility functions and constants, and improving testability and maintainability. Estimated effort: 30-42 hours.

Also working on **Shop Manager Phase 7** - price comparison and market analysis features.

---

## Features (Done)

<!--
  WORK ITEM TYPE: Features

  List completed features and major accomplishments.
  Use checkboxes to mark completed items if desired.
  Items in this section will be tagged as "Features" by the parser.
  The parser will identify TODO items (- [ ] and - [x]) throughout the document.
-->

-   [x] User Accounts System - Registration, authentication, email verification, password reset
-   [x] Recipes & Dynamic Pricing - 2,000+ recipes with automatic price calculations
-   [x] Suggestions System - User feedback and feature requests with admin management
-   [x] Crate Rewards Management - YAML import, custom pricing, value calculations
-   [x] Shop Manager - Multi-server shop tracking (80% complete)
-   [x] Price Export - JSON/YAML export with filtering and version selection
-   [x] Bulk Item Management - Admin tools for managing the item catalog
-   [x] Visual Testing - Comprehensive screenshot-based testing system
-   [x] Item Catalog - 1,400+ items across 6 Minecraft versions (1.16-1.21)
-   [x] Price Field Migration - Version-aware pricing with inheritance and fallback logic
-   [x] Homepage Cleanup - Initial improvements and organization
-   [x] Custom Pricing for Crates - Enhanced crate pricing capabilities
-   [x] Brewing Category - Complete potion catalog with brewing recipes
-   [x] Market Overview Refactoring - Shared utility functions extracted (date, pricing, tableTransform)
-   [x] Shop Manager Refactoring - ShopFormModal component extracted, ~423 lines of code eliminated
-   [x] Crate Rewards Mobile Display - Comprehensive mobile responsive improvements
-   [x] Duplicate Crate Name Detection - Auto-append number suffixes when importing duplicate crates
-   [x] Comment to SuggestionMessages Refactor - Refactored comment system to use suggestionMessages terminology, renamed all files and components, updated Firestore collection path

### Detailed Completed Features

#### User Accounts System

-   Registration, authentication, email verification, password reset
-   Status: Production ready

#### Recipes & Dynamic Pricing

-   2,000+ recipes with automatic price calculations
-   Version-aware pricing with inheritance and fallback logic
-   Dynamic pricing system with circular dependency detection
-   Status: Production ready

#### Item Catalog

-   1,400+ items across 6 Minecraft versions (1.16-1.21)
-   Comprehensive item data with images and metadata
-   Status: Production ready

#### Shop Manager

-   Multi-server shop tracking with price history
-   Catalog status tracking (fully_cataloged boolean field)
-   Multiple item selection - users can select multiple items at once when adding to shops
-   Selected items share the same buy price, sell price, and notes
-   Status: 80% complete (Phase 7 in progress)

#### Comment to SuggestionMessages Refactor

-   Refactored comment system to use suggestionMessages terminology for better semantic accuracy
-   Renamed utility file: `comments.js` → `suggestionMessages.js`
-   Renamed components: `CommentForm` → `SuggestionMessageForm`, `AdminCommentForm` → `AdminSuggestionMessageForm`, `CommentList` → `SuggestionMessageList`
-   Updated Firestore collection path: `comments` → `suggestionMessages`
-   Updated all function names, variable names, and UI terminology
-   Status: Production ready

---

## Features (In Progress)

<!--
  WORK ITEM TYPE: Features

  List features currently being developed.
  Include estimated completion or progress indicators if helpful.
  Items in this section will be tagged as "Features" by the parser.
-->

-   [ ] Homepage Refactoring - Breaking down 928-line component into manageable pieces (30-42 hours estimated)
-   [ ] Shop Manager Phase 7 - Price comparison and market analysis features (75% complete)

### Detailed In-Progress Features

#### Homepage Refactoring

-   Current status: Breaking down 928-line HomeView.vue component
-   Remaining work: Extract composables (useEconomyConfig, useFilters, useItems), create utility functions and constants, refactor main component to <400 lines, add unit tests
-   Estimated completion: 30-42 hours

#### Shop Manager Phase 7

-   Current status: Price comparison and market analysis features
-   Remaining work: Search & filtering improvements (owner scope), performance optimizations (pagination/virtual scrolling), price comparison features, market analysis tools

---

## Enhancements

<!--
  WORK ITEM TYPE: Enhancements

  List improvements and enhancements to existing features.
  These are not new features, but improvements to what already exists.
  Items in this section will be tagged as "Enhancements" by the parser.
-->

-   [ ] Price Export Enhancements - CSV/XLSX support, proper YAML library (js-yaml), dedicated route, stack size override, currency format toggle
-   [ ] Suggestions Enhancements - Detail views, advanced filtering/search, status badges, improved admin workflows (note: messaging already implemented via suggestionMessages)
-   [ ] User Accounts Enhancements - Account settings page, data export, account deletion (GDPR-style cleanup), email preferences, security settings
-   [ ] Category Filter Sorting - Improve category ordering in filters
-   [ ] Base Input Component Refactor - Standardize input components
-   [ ] Email Notifications - Notification system for suggestions and updates, welcome emails, deliverability monitoring
-   [ ] Hard 404 Spec - Implement proper 404 handling
-   [ ] Netlify Blobs Media Spec - Media storage improvements
-   [ ] Recipe Version Copy Spec - Recipe versioning improvements
-   [ ] Shop Manager Enhanced - Public visibility, competitive price comparison, market analysis dashboard, advanced filtering/import/export
-   [ ] Market Overview Refactoring - ViewModeLayoutToggle component, MarketItemsTable component, useViewSettings composable enhancement, useItemGrouping composable
-   [ ] Shop Refactoring - useShopForm composable, ShopItemsTable component, useInlineEditing composable, component breakdown

### High Priority Enhancements

#### Price Export Enhancements

-   CSV/XLSX format support
-   Better YAML library implementation
-   Dedicated export route/page
-   Enhanced filtering options

#### Shop Manager Phase 7 Completion

-   Search & filtering improvements (owner scope)
-   Performance optimizations (pagination/virtual scrolling)
-   Price comparison features
-   Market analysis tools

#### Homepage Refactoring

-   Reduce HomeView.vue from 928 lines to <400 lines
-   Extract composables (useEconomyConfig, useFilters, useItems)
-   Create utility functions and constants
-   Improve testability and maintainability
-   **Estimated Effort**: 30-42 hours

### Medium Priority Enhancements

#### Suggestions Enhancements

-   Comments/threads system
-   Detail views for suggestions
-   Advanced filtering and search
-   Status workflow improvements

#### User Accounts Enhancements

-   Account settings page
-   Data export functionality
-   Account deletion with data cleanup
-   Profile customization options

#### Other Enhancements

-   Category filter sorting improvements
-   Base input component refactor
-   Email notifications spec
-   Hard 404 spec implementation
-   Netlify Blobs media spec

---

## Known Issues

<!--
  WORK ITEM TYPE: Bugs

  Document bugs, problems, or issues that need to be addressed.
  Include severity, affected areas, and workarounds if available.
  Items in this section will be tagged as "Bugs" by the parser.

  Alternative section headings: "Active Bugs", "Outstanding Issues", "Bugs"
-->

### Active Bugs

_No active bugs currently - all recent issues have been resolved._

### Recently Resolved Bugs

#### Settings Price Modifiers Not Persisting in UI

-   **Status**: ✅ Resolved (2025-01-27)
-   **Description**: Price modifiers (Buy X and Sell %) were refreshing back to default values in settings modal
-   **Solution**: Added watcher in SettingsModal.vue to load settings when modal opens

#### Admin Subnav Inconsistency Between Mobile and Desktop

-   **Status**: ✅ Resolved (2025-01-27)
-   **Description**: Mobile and desktop admin navigation showed different links
-   **Solution**: Removed dead code from SubNav.vue (256 lines), now consistent across devices

#### Crate Rewards Mobile Display Issues

-   **Status**: ✅ Resolved (2025-01-27)
-   **Description**: Crate rewards display was broken or poorly formatted on mobile devices
-   **Solution**: Comprehensive mobile responsive improvements to CrateSingleView.vue

#### Price Guide vs Export Item Count Discrepancy

-   **Status**: ✅ Resolved (2025-01-27)
-   **Description**: Price guide count included 0-priced items while export correctly excluded them
-   **Solution**: Updated count functions to exclude 0-priced items for consistency

#### Duplicate Crate Names When Importing Same File

-   **Status**: ✅ Resolved (2025-01-27)
-   **Description**: Multiple imports of same crate YAML created identical names
-   **Solution**: Added duplicate checking with auto-append number suffixes and warning dialog

#### Enchantment Books Not Separated When Adding Crate Items

-   **Status**: ✅ Resolved (2025-01-27)
-   **Description**: Enchanted books not being added as separate book and enchantment entities
-   **Solution**: Added fallback logic to extract display enchantments from Items array when DisplayEnchantments is missing

---

## Outstanding Tasks

<!--
  WORK ITEM TYPE: Tasks

  Inbox for uncategorized work items that may later become features or enhancements.
  Can be organized by priority, category, or timeline.
  Items in this section will be tagged as "Tasks" by the parser.

  Alternative section headings: "Tasks", "Outstanding Tasks", "Todo"
-->

### High Priority

-   [ ] Complete Homepage Refactoring - Extract composables (useEconomyConfig, useFilters, useItems), create utilities, reduce component size to <400 lines
-   [ ] Finish Shop Manager Phase 7 - Search & filtering improvements (owner scope), price comparison features, performance optimizations

### Medium Priority

-   [ ] Price Export Enhancements - CSV/XLSX support (SheetJS), proper YAML library (js-yaml), dedicated route, stack size override, currency format toggle
-   [ ] User Accounts Enhancements - Account settings page, data export, account deletion (GDPR-style cleanup), email preferences, security settings
-   [ ] Suggestions Enhancements - Detail views, advanced filtering/search, status badges (note: messaging already implemented)
-   [ ] Market Overview Refactoring - ViewModeLayoutToggle component, MarketItemsTable component, composables (useViewSettings, useItemGrouping)
-   [ ] Shop Refactoring - useShopForm composable, ShopItemsTable component, useInlineEditing composable, component breakdown
-   [ ] Unit Testing Implementation - Vitest setup, utility function tests, component tests, coverage reporting

### Low Priority / Future

-   [ ] Community Features - Platform transformation to community-driven marketplace
-   [ ] Diamond Currency - Currency toggle with 32:1 conversion ratio
-   [ ] Linked Shops - Collaborative market intelligence
-   [ ] Multi-User Crate Management - Role-based collaboration
-   [ ] Single Prize Import - Granular crate prize import
-   [ ] User Price Guide - Custom price guides with dynamic pricing
-   [ ] Membership/Sponsorship - Premium features and monetization

---

## Project Status

<!--
  Optional section for project health indicators.
  Can include metrics, completion percentages, or status summaries.
-->

**Overall Status**: Active Development  
**Completion**: ~85%  
**Last Major Update**: December 2025

### Metrics

-   **Code Coverage**: 80% (Cypress E2E testing)
-   **Open Issues**: 0 active bugs (6 recently resolved)
-   **Active Features**: 2 (Homepage Refactoring, Shop Manager Phase 7)
-   **Completed Features**: 17
-   **Frontend Components**: 38 Vue components and views
-   **Backend Utilities**: 12 utility modules
-   **Testing Suites**: 7 Cypress test suites
-   **Node Scripts**: 15 Node.js utilities

### Feature Completeness

-   **Core Features**: 85% complete
-   **User Management**: 90% complete
-   **Data Management**: 95% complete
-   **Shop Manager**: 80% complete
-   **Testing Coverage**: 80% complete

### Technical Debt

-   **Large Components**: 1 major refactoring needed (HomeView - 928 lines, target <400 lines)
-   **Code Duplication**: Reduced significantly through recent refactoring (Market Overview, Shop Manager)
-   **Performance**: Good, room for optimization (pagination/virtual scrolling for large datasets)
-   **Maintainability**: High, following Vue 3 best practices, composables pattern established
-   **Testing**: E2E coverage good, unit testing infrastructure needed (Vitest)

### Data Management

-   **2,000+ recipes** with automatic price calculations
-   **Version-aware pricing** with inheritance and fallback logic
-   **Dynamic pricing system** with circular dependency detection
-   **Comprehensive item catalog** with 1,400+ items across 6 Minecraft versions

---

## Next Steps

<!--
  Outline immediate next actions and priorities.
  Helps track what should be worked on next.
-->

### Immediate (Next 1-2 weeks)

1. Complete Homepage Refactoring
    - Extract constants and utilities (homepage.js, constants)
    - Create composables (useEconomyConfig, useFilters, useItems)
    - Refactor main component to <400 lines
    - Add unit tests

2. Finish Shop Manager Phase 7
    - Complete search & filtering improvements (owner scope)
    - Add price comparison features
    - Performance optimizations (pagination/virtual scrolling)

### Short-term (Next 1-3 months)

1. Price Export Enhancements
    - Add CSV/XLSX support (SheetJS library)
    - Improve YAML implementation (js-yaml library)
    - Create dedicated export route
    - Add stack size override and currency format toggle

2. User Accounts Enhancements
    - Account settings page (email preferences, security settings)
    - Data export functionality (JSON download)
    - Account deletion with GDPR-style cleanup

3. Market Overview & Shop Refactoring
    - Extract ViewModeLayoutToggle and MarketItemsTable components
    - Create useViewSettings and useItemGrouping composables
    - Complete shop refactoring (useShopForm, ShopItemsTable, useInlineEditing)

4. Unit Testing Implementation
    - Set up Vitest testing framework
    - Test utility functions (pricing, image, admin)
    - Test components (ExportModal, ItemTable, base components)
    - Add coverage reporting

### Long-term (3+ months)

1. Community Features - Begin platform transformation
2. Diamond Currency - Alternative economy support
3. Linked Shops - Collaborative market intelligence
4. Advanced Analytics - Market trends and predictions

---

## Notes

<!--
  Additional notes, decisions, or context that doesn't fit elsewhere.
  Can include architecture decisions, lessons learned, or future considerations.
-->

### Recent Changes

-   **2025-12-16**: Updated project summary with comprehensive review of all tasks and current project status. Moved Comment to SuggestionMessages Refactor from in-progress to completed (refactor already implemented).
-   **2025-01-27**: Resolved multiple bugs including settings price modifiers persistence, admin subnav consistency, crate rewards mobile display, price guide count discrepancies, duplicate crate names, and enchantment book separation. All issues fixed and tested.
-   **2025-01-27**: Completed Market Overview refactoring - extracted shared utility functions (date.js, pricing.js, tableTransform.js), eliminated ~100 lines of duplicated code from MarketOverviewView and ShopItemsView.
-   **2025-01-27**: Completed Shop Manager refactoring - extracted ShopFormModal component, eliminated ~423 lines of duplicated code from ShopItemsView and ShopManagerView.
-   **2025-12-05**: Implemented multiple item selection feature in Shop Manager. Added "Enable multiple selection" checkbox that allows users to select multiple items at once when adding to shops. Selected items share the same buy price, sell price, and notes. Removed all console.log debug statements from shop manager components for cleaner production code.
-   **2025-12-04**: Simplified shop `fully_cataloged` field from complex map structure to a simple boolean. Updated Firestore rules and simplified UI.

### Development Workflow

-   Uses Firebase emulators by default for local development
-   Seed emulator database: `npm run seed:emu`
-   Cypress testing with emulator support
-   Manual emulator startup preferred

### Code Style

-   **Indentation**: Tabs (tab width 4)
-   **Semicolons**: None
-   **Quotes**: Single quotes
-   **Print Width**: 100 characters
-   **Trailing Commas**: None
-   **Components**: PascalCase, `<script setup>` syntax

### Testing

-   Cypress E2E tests with Firebase emulators
-   Visual regression testing with screenshots
-   Manual testing workflow preferred

### Architecture Decisions

-   Resource files in `/resource/` are static reference data only, not the application's live data source
-   Live data (items, prices) must come from Firestore collections, not resource files
-   When a Minecraft version doesn't have a recipe, the system falls back to using the previous version's recipe instead of duplicating recipes
-   Use underscores (e.g., `1_16`) for version keys and filenames, not dots (e.g., `1.16`)
-   Shop `fully_cataloged` field is a simple boolean (simplified from complex map structure in 2025-12-04)

### Strategic Focus Areas

1. **Technical Debt Reduction** - Homepage Refactoring (30-42 hours), code organization, performance optimization, unit testing infrastructure
2. **User Experience Enhancement** - Price Export improvements (CSV/XLSX), Shop Manager completion, enhanced suggestions, user account settings
3. **Code Quality & Maintainability** - Component extraction, composable patterns, shared utilities, testing coverage
4. **Platform Evolution** - Community features, advanced collaboration, market intelligence, Shop Manager Enhanced features
5. **Innovation & Growth** - Diamond currency, linked shops, expert network, multi-user crate management

---

<!--
  END OF TEMPLATE

  This template demonstrates the structure expected by Project Atlas.

  Key points:
  1. Manifest block MUST be at the top with valid JSON
  2. Four work item types are defined: Features, Enhancements, Bugs, Tasks
  3. Items are tagged by the section they appear in (no inference needed)
  4. TODO items use - [ ] (incomplete) and - [x] (completed) format
  5. Follow this structure when creating or regenerating project files

  Work Item Types:
  - Features: New functionality (sections like "Features (Done)", "Features (In Progress)")
  - Enhancements: Improvements to existing features (section: "Enhancements")
  - Bugs: Problems to fix (sections like "Known Issues", "Active Bugs")
  - Tasks: Inbox for uncategorized work (section: "Outstanding Tasks")

  The parser will:
  - Extract the manifest block and validate it
  - Parse markdown sections and extract work items
  - Tag items with their type based on section headings
  - Identify TODO items (- [ ] and - [x]) across all sections
  - Preserve markdown structure (lists, paragraphs, etc.)
-->
