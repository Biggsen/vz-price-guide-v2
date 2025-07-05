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
├── shop_type (e.g., "buy", "sell", "both")
├── location (optional)
├── description
├── created_at
└── updated_at

Shop_Prices Collection (🔄 PENDING)
├── shop_id (shop reference)
├── item_id (reference to items collection)
├── buy_price (nullable)
├── sell_price (nullable)
├── stock_quantity (optional)
├── last_updated
└── notes
```

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

### Phase 3: Shops Collection (Backend)

-   [ ] **Task 3.1**: Create `shopProfile.js` utility

    -   [ ] `createShop(userId, shopData)`
    -   [ ] `updateShop(shopId, updates)`
    -   [ ] `deleteShop(shopId)`
    -   [ ] `getUserShops(userId)`
    -   [ ] `getServerShops(serverId)`
    -   [ ] `shopExists(shopId)`

-   [ ] **Task 3.2**: Update Firestore security rules

    -   [ ] Allow users to read/write own shops
    -   [ ] Allow reading public shops for comparison
    -   [ ] Add shop validation rules

-   [ ] **Task 3.3**: Create shop management composables
    -   [ ] `useShops(userId)` - User's shops
    -   [ ] `useServerShops(serverId)` - Server's shops
    -   [ ] `useShop(shopId)` - Single shop

### Phase 4: Shops Collection (Frontend)

-   [ ] **Task 4.1**: Create `ShopsView.vue`

    -   [ ] List user's shops by server
    -   [ ] Create new shop form
    -   [ ] Edit existing shops
    -   [ ] Delete shops

-   [ ] **Task 4.2**: Create `ShopForm.vue` component

    -   [ ] Shop name input
    -   [ ] Server selection dropdown
    -   [ ] Shop type selection (buy/sell/both)
    -   [ ] Location input (optional)
    -   [ ] Description textarea
    -   [ ] "Is own shop" checkbox

-   [ ] **Task 4.3**: Add navigation
    -   [ ] Add "Shops" link to main nav
    -   [ ] Update router with shops routes

### Phase 5: Shop Prices Collection (Backend)

-   [ ] **Task 5.1**: Create `shopPrices.js` utility

    -   [ ] `addShopPrice(shopId, itemId, priceData)`
    -   [ ] `updateShopPrice(priceId, updates)`
    -   [ ] `deleteShopPrice(priceId)`
    -   [ ] `getShopPrices(shopId)`
    -   [ ] `getItemPrices(itemId)` - across shops
    -   [ ] `bulkUpdatePrices(shopId, pricesArray)`

-   [ ] **Task 5.2**: Update Firestore security rules

    -   [ ] Allow users to read/write prices for own shops
    -   [ ] Allow reading public shop prices
    -   [ ] Add price validation rules

-   [ ] **Task 5.3**: Create price management composables
    -   [ ] `useShopPrices(shopId)` - Shop's prices
    -   [ ] `useItemPrices(itemId)` - Item across shops
    -   [ ] `usePriceComparison(itemIds)` - Multi-item comparison

### Phase 6: Price Management (Frontend)

-   [ ] **Task 6.1**: Create `ShopPricesView.vue`

    -   [ ] List shop's item prices
    -   [ ] Add new item prices
    -   [ ] Edit existing prices
    -   [ ] Bulk import/export

-   [ ] **Task 6.2**: Create `PriceForm.vue` component

    -   [ ] Item selection (filtered by server version)
    -   [ ] Buy price input
    -   [ ] Sell price input
    -   [ ] Stock quantity input
    -   [ ] Notes textarea

-   [ ] **Task 6.3**: Create `ItemPriceTable.vue` component
    -   [ ] Sortable table of items and prices
    -   [ ] Edit inline functionality
    -   [ ] Delete confirmation
    -   [ ] Bulk selection

### Phase 7: Price Comparison & Analysis

-   [ ] **Task 7.1**: Create `PriceComparisonView.vue`

    -   [ ] Compare prices across shops
    -   [ ] Filter by server/shop type
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

**Status**: 25% Complete - Phases 1 & 2 implemented, ready for Phase 3
**Priority**: High
**Estimated Timeline**: 6-8 weeks (phased approach)
**Dependencies**: Items collection (✅ exists)

## Implementation Status Summary

### ✅ **COMPLETED** (25% - 2/8 phases)

-   **Phase 1**: Servers Collection (Backend) - Full `serverProfile.js` utility with CRUD operations
-   **Phase 2**: Servers Collection (Frontend) - Complete `ServersView.vue` with form handling

**Additional Infrastructure Built:**

-   `ShopManagerView.vue` - Main dashboard with navigation cards
-   Firestore security rules for servers collection
-   Firestore indexes for optimal server queries
-   Router integration and navigation structure

### 🔄 **NEXT UP** (Phase 3)

-   **Phase 3**: Shops Collection (Backend) - Begin `shopProfile.js` utility implementation

### 🔄 **PENDING** (Phases 4-8)

-   **Phase 4**: Shops Collection (Frontend)
-   **Phase 5**: Shop Prices Collection (Backend)
-   **Phase 6**: Price Management (Frontend)
-   **Phase 7**: Price Comparison & Analysis
-   **Phase 8**: Integration & Polish
