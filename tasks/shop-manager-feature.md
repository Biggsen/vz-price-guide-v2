# Shop Manager Feature - VZ Price Guide

## Overview

Build a comprehensive Shop Manager feature to track multiple Minecraft server shops with buy/sell prices. This feature will enable users to manage their own shops and compare prices across different servers and competitors.

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

Shops Collection (🔄 PENDING)
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
-   Helps with shop status tracking and price comparison accuracy
-   Defaults to `false` for normal trading operations

### Key Features

#### 1. Multi-Server Support

-   Track shops across different Minecraft servers
-   Filter items by server's Minecraft version
-   Server-specific item availability

#### 2. Shop Management

-   Create and manage own shops
-   Track competitor shops
-   Categorize shops by type (buy/sell/both)

#### 3. Price Comparison

-   Compare prices across shops
-   Market analysis views
-   Price history tracking

#### 4. Version-Aware Items

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
    -   [x] Allow reading public shops for comparison
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
    -   [x] Allow reading public shop items
    -   [x] Add item validation rules

-   [x] **Task 5.3**: Create item management composables
    -   [x] `useShopItems(shopId)` - Shop's items
    -   [x] `useItemAcrossShops(itemId)` - Item across shops
    -   [x] `usePriceComparison(itemIds)` - Multi-item comparison

### Phase 6: Shop Items Management (Frontend)

-   [ ] **Task 6.1**: Create `ShopItemsView.vue`

    -   [ ] List shop's items with prices
    -   [ ] Add new items with prices
    -   [ ] Edit existing items
    -   [ ] Bulk import/export

-   [ ] **Task 6.2**: Create `ShopItemForm.vue` component

    -   [ ] Item selection (filtered by server version)
    -   [ ] Buy price input
    -   [ ] Sell price input
    -   [ ] Stock quantity input
    -   [ ] Notes textarea

-   [ ] **Task 6.3**: Create `ShopItemTable.vue` component
    -   [ ] Sortable table of items and prices
    -   [ ] Edit inline functionality
    -   [ ] Delete confirmation
    -   [ ] Bulk selection

### Phase 7: Price Comparison & Analysis

-   [ ] **Task 7.1**: Create `PriceComparisonView.vue`

    -   [ ] Compare prices across shops
    -   [ ] Filter by server
    -   [ ] Search items
    -   [ ] Export comparisons

-   [ ] **Task 7.2**: Create `MarketAnalysisView.vue`

    -   [ ] Best buy/sell prices per item
    -   [ ] Price trends over time
    -   [ ] Profit opportunity calculations
    -   [ ] Market share analysis

-   [ ] **Task 7.3**: Create comparison components
    -   [ ] `PriceComparisonTable.vue`
    -   [ ] `PriceChart.vue` (optional)
    -   [ ] `MarketSummary.vue`

### Phase 8: Integration & Polish

-   [ ] **Task 8.1**: Version-aware item filtering

    -   [ ] Filter items by server Minecraft version
    -   [ ] Use existing items collection
    -   [ ] Respect resource file data

-   [ ] **Task 8.2**: Search & filtering

    -   [ ] Search items across shops
    -   [ ] Filter by price ranges
    -   [ ] Sort by various criteria

-   [ ] **Task 8.3**: Import/Export functionality

    -   [ ] Export shop prices to CSV
    -   [ ] Import prices from CSV
    -   [ ] Bulk operations

-   [ ] **Task 8.4**: Performance optimization
    -   [ ] Pagination for large datasets
    -   [ ] Caching strategies
    -   [ ] Optimized queries

## Technical Considerations

### Database Relationships

-   Servers → Shops (one-to-many)
-   Shops → Shop_Prices (one-to-many)
-   Items → Shop_Prices (one-to-many)

### Security Rules

-   Users can only manage their own servers/shops
-   Price comparison requires read access to public shops
-   Admin users can manage all data

### UI/UX Considerations

-   Mobile-responsive design
-   Intuitive navigation between servers/shops
-   Clear visual hierarchy for price comparisons
-   Bulk operations for efficiency

## Success Metrics

-   Users can create and manage multiple servers
-   Users can track competitor shops effectively
-   Price comparison provides valuable insights
-   System handles large amounts of pricing data efficiently

## Future Enhancements

-   Real-time price updates
-   Price alerts and notifications
-   Advanced analytics and reporting
-   Integration with external market data
-   Mobile app for price checking

---

**Status**: 62.5% Complete - Phases 1, 2, 3, 4 & 5 implemented, ready for Phase 6
**Priority**: High
**Estimated Timeline**: 6-8 weeks (phased approach)
**Dependencies**: Items collection (✅ exists)

## Implementation Status Summary

### ✅ **COMPLETED** (62.5% - 5/8 phases)

-   **Phase 1**: Servers Collection (Backend) - Full `serverProfile.js` utility with CRUD operations
-   **Phase 2**: Servers Collection (Frontend) - Complete `ServersView.vue` with form handling
-   **Phase 3**: Shops Collection (Backend) - Complete `shopProfile.js` utility with CRUD operations and composables
-   **Phase 4**: Shops Collection (Frontend) - Complete `ShopsView.vue` with shop management
-   **Phase 5**: Shop Items Collection (Backend) - Complete `shopItems.js` utility with price history logic

**Additional Infrastructure Built:**

-   `ShopManagerView.vue` - Main dashboard with navigation cards for servers and shops
-   Firestore security rules for servers, shops, and shop_items collections
-   Firestore indexes for optimal server, shop, and item queries
-   Router integration and navigation structure for both servers and shops
-   Price history logic with automatic previous price tracking
-   Vue composables for reactive price data management

### 🔄 **NEXT UP** (Phase 6)

-   **Phase 6**: Shop Items Management (Frontend) - Begin `ShopItemsView.vue` and item form components

### 🔄 **PENDING** (Phases 7-8)

-   **Phase 7**: Price Comparison & Analysis
-   **Phase 8**: Integration & Polish
