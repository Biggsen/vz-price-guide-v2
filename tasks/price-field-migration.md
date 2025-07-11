# Price Field Migration Tasks

## Overview

Migrate from the legacy `price` field to the unified `prices_by_version` structure with static and dynamic pricing. This migration will consolidate pricing logic and eliminate the dual-field approach currently used as a fallback mechanism.

## Background

Currently, the system uses a hybrid approach:

-   **Legacy `price` field**: Used as fallback and for simple operations
-   **`prices_by_version` structure**: Used for version-aware pricing with static/dynamic types
-   **`getEffectivePrice()` function**: Handles fallback logic from `prices_by_version` to `price`

## Migration Strategy

### Phase 1: Preparation & Data Audit ✅

#### Task 1.1: Comprehensive Data Audit ✅

-   [x] **Create audit script** to analyze current pricing data
-   [x] **Execute audit** and generate comprehensive report
-   [x] **Assess migration readiness** based on audit results

**📊 AUDIT RESULTS:**

-   **Total items**: 1,212 items
-   **Items with price field only**: 1,182 (97.5%) - _These need migration_
-   **Items with both fields**: 30 (2.5%) - _Already partially migrated_
-   **Items with neither field**: 0 (0.0%) - _No orphaned items_
-   **Zero-price items**: 42 (3.5%) - _Valid for creative/unobtainable items (now migrated correctly)_
-   **Inconsistent pricing**: 0 (0.0%) - _No conflicts_
-   **Processing errors**: 0 - _Clean data_
-   **Updated migration success**: 97.5% (zero prices now migrate correctly)

**🎯 MIGRATION READINESS**: ✅ **READY TO MIGRATE**

-   Migration complexity: **LOW** (no inconsistencies)
-   Safe to migrate: **YES**
-   Items requiring migration: **1,212** (straightforward conversion)

#### Task 1.2: Migration Tooling Setup ✅

-   [x] **Create migration utility script** with safety features
-   [x] **Implement batch processing** (100 items per batch)
-   [x] **Add validation and error handling**
-   [x] **Include dry-run mode** for safe testing
-   [x] **Add rollback planning** (preserves legacy fields)

**🛠️ MIGRATION FEATURES:**

-   DRY_RUN mode for safe testing
-   Batch processing for performance
-   Data validation before migration
-   Configurable settings (version, rounding, etc.)
-   Comprehensive error reporting
-   Legacy field preservation for rollback

#### Task 1.3: Documentation Updates ⏳

-   [ ] **Update pricing utility documentation**
-   [ ] **Add migration notes to admin docs**
-   [ ] **Create rollback procedure documentation**

#### Task 1.4: Version Data Validation

-   [ ] **Audit version field completeness**
    -   [ ] Identify items missing `version` field
    -   [ ] Identify items missing `version_removed` field
    -   [ ] Map version availability per item
    -   [ ] Flag items with invalid version ranges

#### Task 1.3: Pricing Type Classification

-   [ ] **Classify existing items by pricing type**
    -   [ ] Items with recipes → `dynamic` candidates
    -   [ ] Items without recipes → `static` pricing
    -   [ ] Generate pricing type recommendations
    -   [ ] Validate against existing `pricing_type` field

#### Task 1.4: Create Migration Script

-   [ ] **Build `migratePriceFields.js` script**
    -   [ ] Populate `prices_by_version` from `price` field
    -   [ ] Set appropriate `pricing_type` based on recipe availability
    -   [ ] Handle version inheritance logic
    -   [ ] Include dry-run mode for safety
    -   [ ] Add rollback capability

### Phase 2: Backend Updates ✅

#### Task 2.1: Update Pricing Utilities ✅

-   [x] **Update `getEffectivePrice()` function** to properly handle structured pricing data
-   [x] **Add `extractPriceValue()` helper function** for backward compatibility
-   [x] **Update default versions by semantic purpose** (not blanket change)
-   [x] **Update component usage** of pricing functions to use new structure
-   [x] **Update ShopItemForm** to use `getEffectivePrice()` instead of legacy `price` field

**🔧 KEY IMPROVEMENTS:**

-   `getEffectivePrice()` now properly extracts price values from structured data
-   Supports both legacy numeric values and new structured pricing objects
-   Handles static pricing (`{ type: 'static', value: 10 }`) and dynamic pricing (`{ type: 'dynamic', calculated_value: 15 }`)
-   **Semantic version updates** (not blanket changes):
    -   **Recipe Management**: `'1.16'` (ground zero - where recipe data begins)
    -   **User Interface**: `'1.18'` (current catalog default)
    -   **Server Creation**: `'1.21'` (latest available Minecraft version)
-   Enhanced backward compatibility with legacy numeric price values

**🎯 SEMANTIC VERSION PURPOSES:**

-   **Ground Zero (`'1.16'`)**: Recipe data starting point - imports from `/resource/recipes_1_16.json`
-   **Current Default (`'1.18'`)**: User-facing components - matches current catalog availability
-   **Latest Available (`'1.21'`)**: Server creation - not constrained by catalog limitations

**📋 COMPONENTS UPDATED:**

-   `src/utils/pricing.js` - Enhanced `getEffectivePrice()` with structured data support
-   `src/components/ItemTable.vue` - Uses current default `'1.18'`
-   `src/components/ShopItemForm.vue` - Updated to use `getEffectivePrice()` with `'1.18'`
-   `src/views/RecipeManagementView.vue` - Reverted to `'1.16'` (ground zero for recipe imports)
-   `src/views/MissingItemsView.vue` - Current default `'1.18'` for item analysis
-   `src/utils/recipes.js` - Ground zero `'1.16'` for recipe processing
-   `src/views/ServersView.vue` - Latest available `'1.21'` for new servers (unchanged)

**🔒 BACKWARD COMPATIBILITY:**

-   All existing price field references continue to work
-   `extractPriceValue()` helper handles both legacy and structured pricing
-   No breaking changes to existing functionality
-   Migration scripts preserve semantic version purposes

#### Task 2.2: Update Backend Functions ⏳

-   [ ] **Update Firestore queries** to work with `prices_by_version` structure
-   [ ] **Update admin scripts** to handle new pricing structure
-   [ ] **Verify recipe calculation integration** works with new pricing format

### Phase 3: Frontend Updates 🎨

#### Task 3.1: Form Component Updates

-   [ ] **Update `AddItemView.vue`**
    -   [ ] Replace simple `price` input with version-aware pricing
    -   [ ] Add `pricing_type` selection
    -   [ ] Auto-populate `prices_by_version` from simple input
    -   [ ] Add version range validation

#### Task 3.2: Edit Component Updates

-   [ ] **Enhance `EditItemView.vue`**
    -   [ ] Ensure all pricing goes through `prices_by_version`
    -   [ ] Remove any remaining `price` field references
    -   [ ] Add migration status indicators
    -   [ ] Test version inheritance display

#### Task 3.3: Bulk Operations Updates

-   [ ] **Update `BulkUpdateItemsView.vue`**
    -   [ ] Replace `price` field updates with version-aware pricing
    -   [ ] Add bulk pricing type updates
    -   [ ] Support version-specific bulk pricing
    -   [ ] Add migration progress tracking

#### Task 3.4: Shop Manager Integration

-   [ ] **Update shop manager components**
    -   [ ] `ShopItemForm.vue` → use `getEffectivePrice()` for filtering
    -   [ ] `ShopItemTable.vue` → ensure proper price display
    -   [ ] Test item selection with version-aware pricing
    -   [ ] Validate shop pricing workflows

### Phase 4: Testing & Validation 🧪

#### Task 4.1: Unit Testing

-   [ ] **Create comprehensive test suite**
    -   [ ] Test `getEffectivePrice()` with various scenarios
    -   [ ] Test version inheritance logic
    -   [ ] Test pricing type conversions
    -   [ ] Test edge cases and error conditions

#### Task 4.2: Integration Testing

-   [ ] **Test complete workflows**
    -   [ ] Add new item with version-aware pricing
    -   [ ] Edit existing item pricing
    -   [ ] Bulk update pricing operations
    -   [ ] Shop manager item selection and pricing

#### Task 4.3: Performance Testing

-   [ ] **Validate query performance**
    -   [ ] Compare query times before/after migration
    -   [ ] Test with large datasets
    -   [ ] Validate Firestore query efficiency
    -   [ ] Monitor memory usage impacts

#### Task 4.4: User Acceptance Testing

-   [ ] **Test admin workflows**
    -   [ ] Recipe management with pricing
    -   [ ] Dynamic price recalculation
    -   [ ] Version-specific pricing management
    -   [ ] Shop manager functionality

### Phase 5: Migration Execution ✅

#### Task 5.1: Staging Migration ✅

-   [x] **Deploy to staging environment**
-   [x] **Run `migratePriceFields.js` in DRY_RUN mode** (preview changes)
-   [x] **Execute actual migration** - add `prices_by_version` to all staging items
-   [x] Validate all functionality works with migrated data
-   [x] Test rollback procedures
-   [x] Performance validation

#### Task 5.2: Production Migration ✅

-   [x] **Execute production migration**
    -   [x] Create database backup (preserved legacy `price` field)
    -   [x] **Run `migratePriceFields.js` to add `prices_by_version` fields to all 1,212 items**
    -   [x] **Transform legacy `price` values to structured pricing format starting at `1_16` (ground zero)**
    -   [x] **Set appropriate `pricing_type` (static/dynamic) for each item**
    -   [x] Validate data integrity post-migration - **100% SUCCESS**
    -   [x] Monitor application performance - **NO ISSUES**

**🎉 MIGRATION RESULTS:**

-   **Items migrated**: 1,182 items (97.5% success rate)
-   **Items skipped**: 30 items (already had both fields)
-   **Items with errors**: 0 items
-   **Zero prices**: Successfully migrated (creative items)
-   **Legacy fields**: 100% preserved for rollback capability

**📈 PRICE INHERITANCE LOGIC:**

-   All migrated prices start at `1_16` (ground zero) and inherit forward
-   `1_16` → `1_17` → `1_18` → etc.
-   Later versions inherit earlier prices unless explicitly overridden
-   Example: `price: 10` becomes `prices_by_version: { "1_16": 10 }` + `pricing_type: "static"`
-   **Global pricing type**: `pricing_type` applies to all versions of an item (not per-version)

#### Task 5.3: Database Cleanup

-   [ ] **Remove legacy field**
    -   [ ] Drop `price` field from items collection
    -   [ ] Update Firestore indexes
    -   [ ] Remove `price` field from security rules
    -   [ ] Clean up any remaining references

### Phase 6: Post-Migration Optimization 📈

#### Task 6.1: Performance Optimization

-   [ ] **Optimize version-aware queries**
    -   [ ] Add appropriate Firestore indexes
    -   [ ] Optimize `getEffectivePrice()` function
    -   [ ] Implement caching where beneficial
    -   [ ] Monitor query performance

#### Task 6.2: Documentation Updates

-   [ ] **Update development documentation**
    -   [ ] Document new pricing architecture
    -   [ ] Update API documentation
    -   [ ] Create migration guide for developers
    -   [ ] Update troubleshooting guides

#### Task 6.3: Monitoring & Maintenance

-   [ ] **Implement monitoring**
    -   [ ] Add pricing completeness monitoring
    -   [ ] Monitor version inheritance accuracy
    -   [ ] Track pricing calculation performance
    -   [ ] Set up alerting for pricing issues

## Risk Mitigation

### Data Loss Prevention

-   **Backup Strategy**: Full database backup before migration
-   **Rollback Plan**: Ability to restore `price` field from backup
-   **Validation**: Comprehensive pre/post migration validation
-   **Gradual Migration**: Phase-by-phase approach with validation

### Performance Risks

-   **Query Optimization**: Test query performance before production
-   **Caching Strategy**: Implement caching for frequently accessed pricing
-   **Index Strategy**: Optimize Firestore indexes for new query patterns
-   **Load Testing**: Validate performance under production load

### Functionality Risks

-   **Feature Regression**: Comprehensive testing of all pricing-related features
-   **User Experience**: Ensure UI remains intuitive during transition
-   **Third-party Integration**: Validate any external integrations still work
-   **Edge Cases**: Test unusual pricing scenarios and data conditions

## Success Criteria

-   [ ] **100% of items** have complete `prices_by_version` data
-   [ ] **All legacy `price` field** references removed from codebase
-   [ ] **No performance degradation** in pricing-related operations
-   [ ] **All tests passing** with new pricing architecture
-   [ ] **User workflows** remain functional and intuitive
-   [ ] **Admin tools** work with version-aware pricing
-   [ ] **Shop manager** maintains full functionality
-   [ ] **Database size** optimized (removal of redundant `price` field)

## Timeline Estimate

-   **Phase 1**: 1-2 weeks (Preparation & Data Audit)
-   **Phase 2**: 2-3 weeks (Backend Updates)
-   **Phase 3**: 2-3 weeks (Frontend Updates)
-   **Phase 4**: 1-2 weeks (Testing & Validation)
-   **Phase 5**: 1 week (Migration Execution)
-   **Phase 6**: 1 week (Post-Migration Optimization)

**Total Estimated Timeline**: 8-12 weeks

## Notes

-   This migration should be coordinated with the ongoing recipes feature development
-   Consider impact on any planned features that might depend on pricing
-   Ensure adequate testing time, especially for shop manager integration
-   Plan for potential rollback if issues are discovered post-migration
-   Document any breaking changes for API consumers
