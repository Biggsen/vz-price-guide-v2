# VZ Price Guide v2 - Project Summary

**Last Updated**: January 2025  
**Project Status**: Active Development  
**Overall Completion**: ~85%

---

## Project Overview

**VZ Price Guide v2** is a Vue 3 + Firebase application for Minecraft economy price tracking and management. The project has evolved from a simple price guide into a comprehensive platform with user accounts, shop management, crate rewards, and dynamic pricing systems.

### Technical Stack

- **Frontend**: Vue 3 (Composition API), Vite, Tailwind CSS, Heroicons
- **Backend**: Firebase Firestore, Firebase Auth, Firebase Emulators
- **Development**: ESLint + Prettier, Cypress (E2E testing), Node.js scripts
- **Deployment**: Netlify

---

## Core Features Status

### ✅ Completed & Production Ready

- **User Accounts System** - Registration, authentication, email verification, password reset
- **Recipes & Dynamic Pricing** - 2,000+ recipes with automatic price calculations
- **Suggestions System** - User feedback and feature requests with admin management
- **Crate Rewards Management** - YAML import, custom pricing, value calculations
- **Shop Manager** - Multi-server shop tracking with price history (75% complete)
- **Price Export** - JSON/YAML export with filtering and version selection
- **Bulk Item Management** - Admin tools for managing the item catalog
- **Visual Testing** - Comprehensive screenshot-based testing system
- **Item Catalog** - 1,400+ items across 6 Minecraft versions (1.16-1.21)

### 🔄 In Development

- **Homepage Refactoring** - Breaking down 928-line component into manageable pieces (30-42 hours estimated)
- **Shop Manager Phase 7** - Price comparison and market analysis features

### 🔄 Enhancements Needed

- **Price Export** - CSV/XLSX support, proper YAML library, dedicated route
- **Suggestions** - Comments/threads, detail views, advanced filtering
- **User Accounts** - Account settings, data export, account deletion

---

## Outstanding Issues

### Active Bugs (3)

#### 1. Crate Rewards Mobile Display Issues
- **Status**: 🔴 Active
- **Priority**: High
- **Description**: Crate rewards display is broken or poorly formatted on mobile devices
- **Impact**: Poor mobile user experience when viewing crate information

#### 2. Admin Subnav Inconsistency Between Mobile and Desktop
- **Status**: 🔴 Active
- **Priority**: Medium
- **Description**: Mobile and desktop admin navigation show different sets of links
- **Expected**: Both should show: Price Guide, Shop Manager, Design, Community
- **Files**: `src/components/SubNav.vue`

#### 3. Price Guide vs Export Item Count Discrepancy
- **Status**: 🔴 Active
- **Priority**: High
- **Description**: Price guide reports 1,473 items, but export only includes 1,471 items
- **Impact**: Incomplete export files, possible loss of pricing data

### Shop Manager Bugs (from shop-manager-notes.md)

1. **Inline Notes Editing Bug**
   - Notes don't save consistently, shows long dash instead
   - Affects shop page inline editing functionality

2. **Item Search Keyboard Navigation**
   - When using keyboard in item search results, doesn't scroll with up/down keys
   - Selected item goes below viewport and can't be seen

3. **Item Search Category Ordering**
   - Categories in item search results should match main price guide order
   - Currently inconsistent ordering

---

## Outstanding Enhancements

### High Priority

#### Price Export Enhancements
- CSV/XLSX format support
- Better YAML library implementation
- Dedicated export route/page
- Enhanced filtering options

#### Shop Manager Phase 7 Completion
- Search & filtering improvements (owner scope)
- Performance optimizations (pagination/virtual scrolling)
- Price comparison features
- Market analysis tools

#### Homepage Refactoring
- Reduce HomeView.vue from 928 lines to <400 lines
- Extract composables (useEconomyConfig, useFilters, useItems)
- Create utility functions and constants
- Improve testability and maintainability
- **Estimated Effort**: 30-42 hours

### Medium Priority

#### Suggestions Enhancements
- Comments/threads system
- Detail views for suggestions
- Advanced filtering and search
- Status workflow improvements

#### User Accounts Enhancements
- Account settings page
- Data export functionality
- Account deletion with data cleanup
- Profile customization options

#### Other Enhancements
- Category filter sorting improvements
- Base input component refactor
- Email notifications spec
- Hard 404 spec implementation
- Netlify Blobs media spec

### Future Ideas (7 tasks)

1. **Community Features** - Platform transformation to community-driven marketplace
2. **Diamond Currency** - Currency toggle with 32:1 conversion ratio
3. **Linked Shops** - Collaborative market intelligence
4. **Multi-User Crate Management** - Role-based collaboration
5. **Single Prize Import** - Granular crate prize import
6. **User Price Guide** - Custom price guides with dynamic pricing
7. **Membership/Sponsorship** - Premium features and monetization

---

## Task Organization

### `/completed` (14 tasks)
Major features that have been fully implemented and are production-ready:
- User accounts fundamentals
- Recipes and dynamic pricing system
- Suggestions MVP
- Crate rewards management
- Price field migration
- Homepage cleanup
- Custom pricing for crates
- All Minecraft version items (1.16-1.21)
- Brewing category with complete potion catalog

### `/in-development` (3 tasks)
Currently active development work:
- **Homepage Refactoring** - Technical debt reduction (30-42 hours estimated)
- **Shop Manager Phase 7** - Price comparison features
- **Comment to Suggestion Messages Refactor** - Messaging system improvements

### `/enhancement` (10 tasks)
Improvements to existing features:
- Price Export Enhancements
- Suggestions Enhancements
- User Accounts Enhancements
- Category Filter Sorting
- Base Input Component Refactor
- Email Notifications
- Hard 404 Spec
- Netlify Blobs Media Spec
- Recipe Version Copy Spec
- Shop Manager Enhanced

### `/idea` (7 tasks)
Future features and concepts:
- Community Features
- Diamond Currency
- Linked Shops
- Multi-User Crate Management
- Single Prize Import
- User Price Guide
- Membership/Sponsorship

### `/testing` (1 task)
Testing infrastructure:
- Cypress Testing - Comprehensive auth testing with Firebase emulators

### Root Level
- **Buglist** - 3 active issues, 3 resolved bugs documented
- **Shop Manager Notes** - Scratchpad for observations and bugs

---

## Key Metrics

### Codebase Size
- **Frontend**: 38 Vue components and views
- **Backend**: 12 utility modules
- **Testing**: 7 Cypress test suites
- **Scripts**: 15 Node.js utilities

### Feature Completeness
- **Core Features**: 85% complete
- **User Management**: 90% complete
- **Data Management**: 95% complete
- **Testing Coverage**: 80% complete

### Technical Debt
- **Large Components**: 1 major refactoring needed (HomeView - 928 lines)
- **Code Duplication**: Minimal, well-organized
- **Performance**: Good, room for optimization
- **Maintainability**: High, following Vue 3 best practices

### Data Management
- **2,000+ recipes** with automatic price calculations
- **Version-aware pricing** with inheritance and fallback logic
- **Dynamic pricing system** with circular dependency detection
- **Comprehensive item catalog** with 1,400+ items across 6 Minecraft versions

---

## Next Steps

### Immediate (Next 2-4 weeks)

1. **Fix Shop Manager Bugs**
   - Fix inline notes editing (save functionality)
   - Implement keyboard navigation scrolling in item search
   - Align category ordering in item search with main price guide

2. **Complete Homepage Refactoring**
   - Extract constants and utilities
   - Create composables (useEconomyConfig, useFilters, useItems)
   - Refactor main component to <400 lines
   - Add unit tests

3. **Fix Active Bugs**
   - Resolve crate rewards mobile display issues
   - Fix admin subnav consistency between mobile/desktop
   - Investigate and fix export item count discrepancy

### Short-term (Next 1-3 months)

1. **Finish Shop Manager Phase 7**
   - Complete search & filtering improvements
   - Add price comparison features
   - Performance optimizations

2. **Price Export Enhancements**
   - Add CSV/XLSX support
   - Improve YAML implementation
   - Create dedicated export route

3. **User Accounts Enhancements**
   - Account settings page
   - Data export functionality
   - Account deletion

### Long-term (Next 3-12 months)

1. **Community Features** - Begin platform transformation
2. **Diamond Currency** - Alternative economy support
3. **Linked Shops** - Collaborative market intelligence
4. **Advanced Analytics** - Market trends and predictions

---

## Strategic Focus Areas

### 1. Technical Debt Reduction
- Homepage Refactoring - Break down 928-line component
- Code Organization - Extract composables and utilities
- Performance Optimization - Improve loading and rendering

### 2. User Experience Enhancement
- Price Export Improvements - CSV/XLSX support
- Shop Manager Completion - Price comparison features
- Enhanced Suggestions - Better feedback workflows

### 3. Platform Evolution
- Community Features - Transform to community-driven platform
- Advanced Collaboration - Multi-user features and sharing
- Market Intelligence - Trend analysis and predictions

### 4. Innovation & Growth
- Diamond Currency - Alternative economy support
- Linked Shops - Collaborative market intelligence
- Expert Network - Premium features and monetization

---

## Project Highlights

- ✅ **Production Ready**: Core features are stable and user-tested
- ✅ **Scalable Architecture**: Built for growth with Firebase backend
- ✅ **Comprehensive Testing**: Visual and functional testing coverage
- ✅ **User-Centric Design**: Focus on real user needs and workflows
- ✅ **Active Development**: Regular updates and feature additions
- ✅ **Community Driven**: User feedback shapes development priorities

---

## Development Workflow

### Local Development
- Uses Firebase emulators by default
- Seed emulator database: `npm run seed:emu`
- Cypress testing with emulator support
- Manual emulator startup preferred

### Code Style
- **Indentation**: Tabs (tab width 4)
- **Semicolons**: None
- **Quotes**: Single quotes
- **Print Width**: 100 characters
- **Trailing Commas**: None
- **Components**: PascalCase, `<script setup>` syntax

### Testing
- Cypress E2E tests with Firebase emulators
- Visual regression testing with screenshots
- Manual testing workflow preferred

---

**Note**: This document should be updated regularly as project status changes. Refer to individual task files in `/tasks` for detailed specifications and implementation plans.


