# Shop Manager Feature - VZ Price Guide

## Overview

Build a comprehensive Shop Manager feature to track multiple Minecraft server shops with buy/sell prices. This MVP enables users to manage their own shops across servers with streamlined inventory and price tracking.

## Inspiration

Based on Excel spreadsheet showing shops like "verzion", "adamantine", "PizzaKing446", etc. with item pricing comparisons.

## Architecture

### Data Structure Hierarchy

```
Servers Collection (✅ IMPLEMENTED)
├── name (e.g., "Hypixel Skyblock")
├── minecraft_version (e.g., "1.20")
├── owner_id (user reference)
├── description
├── created_at
└── updated_at

Shops Collection (✅ IMPLEMENTED)
├── name (e.g., "verzion's shop")
├── server_id (server reference)
├── owner_id (user reference)
├── is_own_shop (boolean)
├── location (optional)
├── description
├── created_at
└── updated_at

Shop_Items Collection (✅ IMPLEMENTED)
├── shop_id (shop reference)
├── item_id (reference to items collection)
├── buy_price (nullable)
├── sell_price (nullable)
├── previous_buy_price (nullable)
├── previous_sell_price (nullable)
├── previous_price_date (nullable)
├── stock_quantity (optional)
├── stock_full (boolean, default: false)
├── last_updated
└── notes
```

### Simple Price History Logic

When updating prices in the `shopItems.js` utility:

1. **Before updating**: Save current `buy_price` → `previous_buy_price`, `sell_price` → `previous_sell_price`
2. **Store timing**: Save current `last_updated` → `previous_price_date`
3. **Update current**: Set new prices and `last_updated`

This approach provides:

-   **Current prices** for active trading
-   **Previous prices** to show price trends (↑ ↓)
-   **Change timing** to track when prices last changed
-   **Simple implementation** without complex price history tables

### Stock Management

The `stock_full` boolean field handles a common Minecraft shop scenario:

-   When set to `true`, indicates the shop's chest is full and cannot accept more items
-   Useful for buy prices - shop owner can't purchase more items until chest is emptied
-   Helps with shop status tracking and pricing accuracy for owners
-   Defaults to `false` for normal trading operations

### Key Features

#### 1. Multi-Server Support

-   Track personal shops across different Minecraft servers
-   Filter available items by the selected server's Minecraft version
-   Maintain server-specific item availability for owner workflows

#### 2. Shop Management

-   Create and manage own shops
-   Manage shop metadata (name, description, optional location)
-   Control shop inventory with price history context

#### 3. Version-Aware Items

-   Filter items based on server Minecraft version
-   Use existing items collection with version field
-   Respect resource files for version-specific items

## Implementation Tasks

### Phase 1: Servers Collection (Backend) ✅ COMPLETED

-   [x] **Task 1.1**: Create `serverProfile.js` utility

    -   [x] `createServer(userId, serverData)`
    -   [x] `updateServer(serverId, updates)`
    -   [x] `deleteServer(serverId)`
    -   [x] `getUserServers(userId)`
    -   [x] `serverExists(serverId)`

-   [x] **Task 1.2**: Update Firestore security rules

    -   [x] Allow users to read/write own servers
    -   [x] Add server validation rules

-   [x] **Task 1.3**: Create server management composables
    -   [x] `useServers(userId)` - Vue composable
    -   [x] `useServer(serverId)` - Single server

### Phase 2: Servers Collection (Frontend) ✅ COMPLETED

-   [x] **Task 2.1**: Create `ServersView.vue`

    -   [x] List user's servers
    -   [x] Create new server form
    -   [x] Edit existing servers
    -   [x] Delete servers

-   [x] **Task 2.2**: Create `ServerForm.vue` component

    -   [x] Server name input
    -   [x] Minecraft version dropdown (1.16-1.21)
    -   [x] Description textarea
    -   [x] Form validation

-   [x] **Task 2.3**: Add navigation
    -   [x] Add "Servers" link to main nav
    -   [x] Update router with servers routes

### Phase 3: Shops Collection (Backend) ✅ COMPLETED

-   [x] **Task 3.1**: Create `shopProfile.js` utility

    -   [x] `createShop(userId, shopData)`
    -   [x] `updateShop(shopId, updates)`
    -   [x] `deleteShop(shopId)`
    -   [x] `getUserShops(userId)`
    -   [x] `getServerShops(serverId)`
    -   [x] `shopExists(shopId)`

-   [x] **Task 3.2**: Update Firestore security rules

    -   [x] Allow users to read/write own shops
    -   [x] Prevent other users from accessing private shops
    -   [x] Add shop validation rules

-   [x] **Task 3.3**: Create shop management composables
    -   [x] `useShops(userId)` - User's shops
    -   [x] `useServerShops(serverId)` - Server's shops
    -   [x] `useShop(shopId)` - Single shop

### Phase 4: Shops Collection (Frontend) ✅ COMPLETED

-   [x] **Task 4.1**: Create `ShopsView.vue`

    -   [x] List user's shops by server
    -   [x] Create new shop form
    -   [x] Edit existing shops
    -   [x] Delete shops

-   [x] **Task 4.2**: Integrate shop form within `ShopsView.vue`

    -   [x] Shop name input
    -   [x] Server selection dropdown
    -   [x] Location input (optional)
    -   [x] Description textarea
    -   [x] "Is own shop" checkbox

-   [x] **Task 4.3**: Add navigation
    -   [x] Add "Shops" link to shop manager dashboard
    -   [x] Update router with shops routes

### Phase 5: Shop Items Collection (Backend) ✅ COMPLETED

-   [x] **Task 5.1**: Create `shopItems.js` utility

    -   [x] `addShopItem(shopId, itemId, itemData)`
    -   [x] `updateShopItem(itemId, updates)`
    -   [x] `deleteShopItem(itemId)`
    -   [x] `getShopItems(shopId)`
    -   [x] `getItemAcrossShops(itemId)` - across shops
    -   [x] `bulkUpdateShopItems(shopId, itemsArray)`

-   [x] **Task 5.2**: Update Firestore security rules

    -   [x] Allow users to read/write items for own shops
    -   [x] Prevent access to other users' shop items
    -   [x] Add item validation rules

-   [x] **Task 5.3**: Create item management composables
    -   [x] `useShopItems(shopId)` - Shop's items
-   [x] `useItemAcrossShops(itemId)` - Item across user's shops
-   [x] `usePriceComparison(itemIds)` - Multi-shop comparison (scope to owner data)

### Phase 6: Shop Items Management (Frontend) ✅ COMPLETED

-   [x] **Task 6.1**: Create `ShopItemsView.vue`

    -   [x] List shop's items with prices
    -   [x] Add new items with prices
    -   [x] Edit existing items
    -   [x] Shop selector with server context
    -   [x] Category-based organization
    -   [x] Real-time integration with shop items backend

-   [x] **Task 6.2**: Create `ShopItemForm.vue` component

    -   [x] Item selection (filtered by server version)
    -   [x] Buy price input
    -   [x] Sell price input
    -   [x] Stock quantity input with "stock full" checkbox
    -   [x] Notes textarea
    -   [x] Smart item search and category-based dropdown
    -   [x] Form validation

-   [x] **Task 6.3**: Create `ShopItemTable.vue` component

    -   [x] Sortable table of items and prices
    -   [x] Inline editing functionality
    -   [x] Delete confirmation
    -   [x] Bulk selection and operations
    -   [x] Price history display with change indicators
    -   [x] Stock management with visual indicators

-   [x] **Task 6.4**: Add navigation and routing
    -   [x] Added `/shop-items` route to router
    -   [x] Updated ShopManagerView with shop items link
    -   [x] Integrated with existing authentication flow

### Phase 7: MVP Polish

-   [x] **Task 7.1**: Version-aware item filtering (owner scope)

    -   [x] Filter item picker options by server Minecraft version
    -   [x] Use existing items collection
    -   [x] Respect resource file data

-   [ ] **Task 7.2**: Search & filtering (owner scope)

    -   [ ] Search items within user's shops
    -   [ ] Filter by price ranges
    -   [x] Sort by price, last updated, and stock status

-   [ ] **Task 7.4**: Performance and UX
    -   [ ] Pagination or virtual scrolling for large personal inventories
    -   [ ] Cache recent queries per user session
    -   [ ] Optimize Firestore queries for owner workflows

### Deferred Scope (`shop-manager-enhanced` spec)

-   Public shop visibility and competitor tracking
-   Price comparison dashboards and analytics
-   Advanced search, filtering, and import/export across shops
-   Bulk pricing operations and CSV workflows
-   Market share and profitability analysis
-   Performance and caching improvements for multi-shop views

## Technical Considerations

### Database Relationships

-   Servers → Shops (one-to-many)
-   Shops → Shop_Items (one-to-many)
-   Items → Shop_Items (one-to-many)

### Security Rules

-   Users can only manage their own servers/shops
-   Admin users can manage all data
-   Service accounts must respect owner scoping

### UI/UX Considerations

-   Mobile-responsive design
-   Intuitive navigation between servers/shops
-   Clear visual hierarchy for price management workflows
-   Bulk operations for efficiency

## Success Metrics

-   Users can create and manage multiple servers
-   Users can update shop inventories quickly
-   Price history provides clear before/after values
-   UI remains responsive for single-owner datasets

## Future Enhancements

-   Public shop sharing and comparison views
-   Shop type classification and segmentation
-   Market analytics and reporting
-   Price alerts and notifications
-   Integration with external market data
-   Mobile app for price checking

---

**Status**: 75% Complete - Phases 1-6 implemented, Phase 7 MVP polish in progress planning
**Priority**: High
**Estimated Timeline**: 6-8 weeks (phased approach)
**Dependencies**: Items collection (✅ exists)

## Implementation Status Summary

### ✅ **COMPLETED** (75% - 6/8 phases)

-   **Phase 1**: Servers Collection (Backend) - Full `serverProfile.js` utility with CRUD operations
-   **Phase 2**: Servers Collection (Frontend) - Complete `ServersView.vue` with form handling
-   **Phase 3**: Shops Collection (Backend) - Complete `shopProfile.js` utility with CRUD operations and composables
-   **Phase 4**: Shops Collection (Frontend) - Complete `ShopsView.vue` with shop management
-   **Phase 5**: Shop Items Collection (Backend) - Complete `shopItems.js` utility with price history logic
-   **Phase 6**: Shop Items Management (Frontend) - Complete `ShopItemsView.vue`, `ShopItemForm.vue`, and `ShopItemTable.vue` with full CRUD operations

**Additional Infrastructure Built:**

-   `ShopManagerView.vue` - Main dashboard with navigation cards for servers, shops, and shop items
-   Firestore security rules for servers, shops, and shop_items collections
-   Firestore indexes for optimal server, shop, and item queries
-   Router integration and navigation structure for servers, shops, and shop items
-   Price history logic with automatic previous price tracking
-   Vue composables for reactive price data management
-   Comprehensive shop items UI with inline editing, bulk operations, and price history display

### 🔄 **NEXT UP**

-   **Phase 7**: MVP Polish tasks (search, filtering, import/export)
-   Align implementation with owner-only scope checklist

### 🔁 **DEFERRED**

-   Public visibility, comparisons, and analytics (see `shop-manager-enhanced` spec)
