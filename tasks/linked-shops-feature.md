# Linked Shops Feature - Collaborative Market Intelligence

## Overview

Transform the Shop Manager from a personal tool into a collaborative market intelligence platform by allowing users to link and share real shop data with each other. This feature enables more accurate competitive analysis and reduces manual data entry for tracking competitor shops.

## The Problem

When tracking competitor shops, users must manually estimate prices and constantly update them. This leads to:

-   Inaccurate market intelligence
-   Time-consuming manual updates
-   Duplicate effort across users
-   Guesswork instead of real data

## The Solution

Allow shop owners to **opt-in** to sharing their real shop data with other users who are tracking them as competitors, creating live-linked shops with real-time accurate pricing.

## Core Scenario

### Example Flow:

1. **Verzion** creates his own shop on "Rails" server ✅
2. **Verzion** creates "adamantine competitor shop" (proxy shop with estimated prices)
3. **Adamantine** joins the platform and creates his real shop
4. **System detects** potential match (same minecraft username on same server)
5. **Adamantine** gets notification: _"verzion is tracking a shop for you - share real data?"_
6. **If accepted**: Verzion's proxy shop becomes a **live view** of adamantine's real shop
7. **If declined**: Both shops remain separate

## Architecture

### Data Structure Extensions

```
Shop_Links Collection (NEW)
├── proxy_shop_id (reference to tracking shop)
├── real_shop_id (reference to actual shop)
├── requester_id (user who requested link)
├── owner_id (user who owns real shop)
├── sharing_permissions (object)
├── status ("pending", "active", "revoked")
├── created_at
├── approved_at
├── revoked_at
└── notes

Sharing_Permissions Object
├── view_prices (boolean)
├── view_stock (boolean)
├── view_notes (boolean)
├── view_location (boolean)
├── real_time_updates (boolean)
└── historical_data_access (boolean)

Shop Model Updates
├── is_proxy_shop (boolean)
├── linked_to_shop_id (nullable)
├── proxy_for_username (minecraft username being tracked)
├── link_requests_count
└── sharing_status ("none", "requesting", "sharing", "receiving")
```

### Key Features

#### 1. Smart Shop Detection

-   Detect potential matches when new users create shops
-   Match by minecraft username + server
-   Suggest linking opportunities
-   Handle multiple shops per user

#### 2. Granular Sharing Permissions

-   **View Prices**: See buy/sell prices
-   **View Stock**: See inventory quantities
-   **View Notes**: See internal shop notes
-   **View Location**: See shop coordinates/location
-   **Real-time Updates**: Live data vs snapshot
-   **Historical Data**: Access to price history

#### 3. Collaborative Workflows

-   **Sharing Requests**: Formal request/approval process
-   **Permission Management**: Fine-grained control
-   **Revocation**: Stop sharing anytime
-   **Multiple Links**: One shop can be shared with multiple users

#### 4. Data Ownership & Control

-   Clear ownership indicators
-   Permission revocation
-   Data export before unlinking
-   Historical proxy data preservation

## Implementation Phases

### Phase 1: Core Linking Infrastructure

-   [ ] **Task 1.1**: Extend Shop model with linking fields
-   [ ] **Task 1.2**: Create Shop_Links collection
-   [ ] **Task 1.3**: Create sharing permissions system
-   [ ] **Task 1.4**: Update Firestore security rules for sharing

### Phase 2: Shop Detection & Matching

-   [ ] **Task 2.1**: Create shop matching algorithm
    -   [ ] Match by minecraft username + server
    -   [ ] Handle name variations and similarities
    -   [ ] Detect potential duplicates
-   [ ] **Task 2.2**: Build matching suggestions UI
-   [ ] **Task 2.3**: Create link request workflow

### Phase 3: Sharing Request System

-   [ ] **Task 3.1**: Create `linkRequests.js` utility
    -   [ ] `sendLinkRequest(proxyShopId, realShopId, permissions)`
    -   [ ] `approveLinkRequest(requestId, permissions)`
    -   [ ] `denyLinkRequest(requestId, reason)`
    -   [ ] `revokeLinkAccess(linkId)`
-   [ ] **Task 3.2**: Build notification system for requests
-   [ ] **Task 3.3**: Create request management UI

### Phase 4: Live Data Sharing

-   [ ] **Task 4.1**: Create `linkedShopData.js` utility
    -   [ ] `getLinkedShopData(shopId, permissions)`
    -   [ ] `syncLinkedPrices(realShopId, proxyShopId)`
    -   [ ] `applyPermissionFilter(data, permissions)`
-   [ ] **Task 4.2**: Build real-time sync mechanism
-   [ ] **Task 4.3**: Handle permission-based data filtering

### Phase 5: Permission Management UI

-   [ ] **Task 5.1**: Create `LinkManagementView.vue`
    -   [ ] List incoming link requests
    -   [ ] List outgoing link requests
    -   [ ] Manage active links
    -   [ ] Revoke access controls
-   [ ] **Task 5.2**: Create `SharingPermissionsForm.vue`
    -   [ ] Granular permission toggles
    -   [ ] Permission explanations
    -   [ ] Preview shared data
-   [ ] **Task 5.3**: Add sharing indicators to shop views

### Phase 6: Advanced Features

-   [ ] **Task 6.1**: Historical data preservation
    -   [ ] Keep proxy shop estimates as historical reference
    -   [ ] Show data source timeline
    -   [ ] Export historical vs live data
-   [ ] **Task 6.2**: Multi-user sharing groups
    -   [ ] Share with multiple competitors
    -   [ ] Group permission management
    -   [ ] Sharing circles/networks
-   [ ] **Task 6.3**: Analytics & insights
    -   [ ] Accuracy improvements from linking
    -   [ ] Market intelligence dashboard
    -   [ ] Collaborative analysis tools

### Phase 7: Privacy & Security

-   [ ] **Task 7.1**: Privacy controls
    -   [ ] Public/private shop settings
    -   [ ] Selective sharing options
    -   [ ] Anonymous tracking mode
-   [ ] **Task 7.2**: Data protection
    -   [ ] Secure data transmission
    -   [ ] Audit trails for access
    -   [ ] GDPR compliance features
-   [ ] **Task 7.3**: Anti-abuse measures
    -   [ ] Rate limiting for requests
    -   [ ] Spam prevention
    -   [ ] Malicious user detection

## User Experience Flows

### For Proxy Shop Creator (Verzion):

1. Creates competitor shop with estimated prices
2. Gets notification when real shop owner joins
3. Sends linking request with desired permissions
4. Views live data when approved
5. Sees clear indicators of data source
6. Can export historical estimates before linking

### For Real Shop Owner (Adamantine):

1. Creates shop and sees linking suggestions
2. Reviews incoming link requests
3. Sets granular sharing permissions
4. Monitors who has access to what data
5. Can revoke access anytime
6. Gets insights into market perception

### For Market Intelligence:

1. More accurate competitive analysis
2. Real-time price monitoring
3. Collaborative market insights
4. Reduced manual data entry
5. Better strategic decisions

## Technical Considerations

### Performance

-   Efficient real-time sync mechanisms
-   Cached permission checks
-   Optimized queries for linked data
-   Pagination for large sharing networks

### Security

-   Encrypted data transmission
-   Audit logs for all access
-   Permission validation on every request
-   Secure revocation mechanisms

### Scalability

-   Handle thousands of linked shops
-   Efficient permission inheritance
-   Bulk operations for sharing groups
-   Optimized notification systems

## Success Metrics

-   **Adoption Rate**: % of users who create proxy shops
-   **Linking Rate**: % of proxy shops that get linked to real shops
-   **Data Accuracy**: Improvement in price accuracy after linking
-   **User Engagement**: Increase in platform usage
-   **Collaboration**: Number of active sharing relationships

## Future Enhancements

-   **AI-Powered Matching**: Smart shop detection using ML
-   **Market Predictions**: Price forecasting based on linked data
-   **Integration APIs**: Connect with external trading platforms
-   **Mobile Notifications**: Real-time alerts for price changes
-   **Blockchain Integration**: Immutable price history records

## Risk Mitigation

-   **Privacy First**: All sharing is opt-in with granular controls
-   **Data Ownership**: Clear ownership and control mechanisms
-   **Easy Exit**: Simple revocation and data export
-   **Transparency**: Always show data sources and permissions

---

**Status**: Future Enhancement (depends on core Shop Manager)
**Priority**: Medium-High (significant value add)
**Estimated Timeline**: 4-6 weeks (after core Shop Manager complete)
**Dependencies**: Shop Manager Phase 1-6 complete

**Value Proposition**: Transforms personal tool into collaborative platform, creating network effects and significantly higher user engagement.
