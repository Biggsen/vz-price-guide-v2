# Shop Manager Enhanced Feature - VZ Price Guide

## Overview

Extends the Shop Manager MVP to support public visibility, competitive analysis, and advanced tooling for multi-shop datasets. This phase (v2) builds on the existing owner-only workflow to unlock community sharing and deeper insights.

## Scope Summary

-   Introduce public/private visibility controls for shops and items
-   Enable cross-shop price comparisons and analytics
-   Add shop type classification (buy / sell / mixed)
-   Provide advanced filtering, import/export, and reporting
-   Support bulk pricing operations across public shops

## Architecture Extensions

### Additional Fields

-   `shops.visibility` (enum: `private`, `public`) – defaults to `private`
-   `shops.shop_type` (enum: `buy`, `sell`, `mixed`) – optional
-   `shop_items.visibility_override` (optional enum) – allow item-level overrides (future)
-   `shop_items.price_history[]` (optional) – detailed history if needed beyond previous price

### Derived Collections / Indexes

-   Aggregated views for public shops per server
-   Composite indexes for `(server_id, visibility, item_id)` queries
-   Materialized summary documents for analytics dashboards (optional)

## Key Features

1. **Public Shop Sharing**

    - Visibility toggle per shop (private by default)
    - Public shops surface in shared directories and comparisons
    - Owner preview modes for verifying shared data

2. **Competitive Price Comparison**

    - `PriceComparisonView.vue` for multi-shop comparison
    - Filters by server, item category, visibility
    - Comparison table with change indicators and best price flags
    - Sorting and filtering across public inventories

3. **Market Analysis Dashboard**

    - `MarketAnalysisView.vue` with trend charts and profitability insights
    - `MarketSummary.vue` highlighting top movers and gap opportunities
    - Optional `PriceChart.vue` for historical trends

4. **Advanced Filtering & Import/Export**

    - Global search across public shops
    - Price range filtering with server context
    - CSV import/export that respects visibility rules
    - Bulk operations targeting multiple shops
    - Advanced reporting exports (e.g., profitability snapshots)

5. **Shop Classification**

    - Shop type badges (buy / sell / mixed)
    - Filtering by shop type within comparison views

## Implementation Phases

### Phase A: Visibility & Security

-   Add visibility fields and migrations
-   Update Firestore security rules for public reads
-   Ensure admin overrides respect new fields
-   Build tests for access conditions (emulator rules tests)

### Phase B: Comparison Experience

-   Implement `PriceComparisonView.vue`
-   Create `PriceComparisonTable.vue`
-   Add global search and filters
-   Build supporting composables (`usePublicShops`, `usePriceComparisonPublic`)

### Phase C: Market Analytics

-   Implement `MarketAnalysisView.vue`
-   Create `MarketSummary.vue` and optional `PriceChart.vue`
-   Add profitability calculations and indicators

### Phase D: Advanced Tooling

-   Expand import/export workflows for multi-shop datasets
-   Add bulk operations across shops (e.g., update all public buy prices)
-   Introduce pagination/caching for public collections
-   Optional: establish background jobs for summary documents

## Security & Compliance

-   Maintain owner-only write access; public visibility only affects reads
-   Validate field updates (visibility transitions, shop type values)
-   Log visibility changes for auditing
-   Ensure emulators mirror rule changes for local development

## Dependencies

-   Shop Manager MVP spec (`shop-manager-feature.md`)
-   Firebase security rule updates and emulator tests
-   Reliable item dataset with version metadata

## Success Criteria

-   Public shops discoverable and filterable by server/version
-   Comparison tools highlight actionable price differences
-   Analytics views provide trend insights without performance regressions
-   Import/export supports collaborative data workflows

## Open Questions

-   Do we need moderation or reporting for public shops?
-   Should item-level visibility overrides ship with v2 or later?
-   How do we surface admin-only diagnostics for public data integrity?
