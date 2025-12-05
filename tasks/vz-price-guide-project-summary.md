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
	"lastUpdated": "2025-12-05",
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

---

## Features (In Progress)

<!--
  WORK ITEM TYPE: Features

  List features currently being developed.
  Include estimated completion or progress indicators if helpful.
  Items in this section will be tagged as "Features" by the parser.
-->

-   [ ] Homepage Refactoring - Breaking down 928-line component into manageable pieces (30-42 hours estimated)
-   [ ] Shop Manager Phase 7 - Price comparison and market analysis features

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

-   [ ] Price Export Enhancements - CSV/XLSX support, proper YAML library, dedicated route
-   [ ] Suggestions Enhancements - Comments/threads, detail views, advanced filtering
-   [ ] User Accounts Enhancements - Account settings, data export, account deletion
-   [ ] Category Filter Sorting - Improve category ordering in filters
-   [ ] Base Input Component Refactor - Standardize input components
-   [ ] Email Notifications - Notification system for suggestions and updates
-   [ ] Hard 404 Spec - Implement proper 404 handling
-   [ ] Netlify Blobs Media Spec - Media storage improvements
-   [ ] Recipe Version Copy Spec - Recipe versioning improvements
-   [ ] Shop Manager Enhanced - Additional shop manager improvements

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

-   [ ] Inline Notes Editing Bug - Notes don't save consistently, shows long dash instead (Shop Manager)
-   [ ] Item Search Keyboard Navigation - When using keyboard in item search results, doesn't scroll with up/down keys (Shop Manager)
-   [ ] Item Search Category Ordering - Categories in item search results should match main price guide order (Shop Manager)

### Bug Details

#### Inline Notes Editing Bug

-   **Description**: Notes don't save consistently, shows long dash instead
-   **Severity**: Medium
-   **Affected Areas**: Shop page inline editing functionality
-   **Steps to Reproduce**: Edit notes inline on shop page, save, observe inconsistent behavior
-   **Workaround**: None

#### Item Search Keyboard Navigation

-   **Description**: When using keyboard in item search results, doesn't scroll with up/down keys
-   **Severity**: Medium
-   **Affected Areas**: Item search in Shop Manager
-   **Steps to Reproduce**: Use keyboard navigation in item search, selected item goes below viewport
-   **Workaround**: Use mouse to scroll

#### Item Search Category Ordering

-   **Description**: Categories in item search results should match main price guide order
-   **Severity**: Low
-   **Affected Areas**: Item search in Shop Manager
-   **Steps to Reproduce**: Open item search, observe category ordering
-   **Workaround**: None

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

-   [ ] Fix Shop Manager Bugs - Inline notes editing, keyboard navigation scrolling, category ordering
-   [ ] Complete Homepage Refactoring - Extract composables, create utilities, reduce component size
-   [ ] Finish Shop Manager Phase 7 - Search & filtering improvements, price comparison features

### Medium Priority

-   [ ] Price Export Enhancements - CSV/XLSX support, improved YAML implementation, dedicated route
-   [ ] User Accounts Enhancements - Account settings page, data export, account deletion
-   [ ] Suggestions Enhancements - Comments/threads, detail views, advanced filtering

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
-   **Open Issues**: 3 active bugs
-   **Active Features**: 2 (Homepage Refactoring, Shop Manager Phase 7)
-   **Completed Features**: 13
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

-   **Large Components**: 1 major refactoring needed (HomeView - 928 lines)
-   **Code Duplication**: Minimal, well-organized
-   **Performance**: Good, room for optimization
-   **Maintainability**: High, following Vue 3 best practices

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

1. Fix Shop Manager Bugs

    - Fix inline notes editing (save functionality)
    - Implement keyboard navigation scrolling in item search
    - Align category ordering in item search with main price guide

2. Complete Homepage Refactoring
    - Extract constants and utilities
    - Create composables (useEconomyConfig, useFilters, useItems)
    - Refactor main component to <400 lines
    - Add unit tests

### Short-term (Next 1-3 months)

1. Finish Shop Manager Phase 7

    - Complete search & filtering improvements
    - Add price comparison features
    - Performance optimizations

2. Price Export Enhancements

    - Add CSV/XLSX support
    - Improve YAML implementation
    - Create dedicated export route

3. User Accounts Enhancements
    - Account settings page
    - Data export functionality
    - Account deletion

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

-   **2025-12-05**: Implemented multiple item selection feature in Shop Manager. Added "Enable multiple selection" checkbox that allows users to select multiple items at once when adding to shops. Selected items share the same buy price, sell price, and notes. Removed all console.log debug statements from shop manager components (ShopItemsView, ShopItemForm, ShopItemTable) and useShopItems utility for cleaner production code.
-   **2025-12-04**: Simplified shop `fully_cataloged` field from complex map structure (with `at`, `by`, `by_label`, `notes`) to a simple boolean. Updated Firestore rules to validate boolean type, removed catalog metadata helpers from codebase, and simplified UI to show catalog status as a checkbox.

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

1. **Technical Debt Reduction** - Homepage Refactoring, code organization, performance optimization
2. **User Experience Enhancement** - Price Export improvements, Shop Manager completion, enhanced suggestions
3. **Platform Evolution** - Community features, advanced collaboration, market intelligence
4. **Innovation & Growth** - Diamond currency, linked shops, expert network

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
