# Price Field Migration Tasks

## Overview

Migrate from the legacy `price` field to the unified `prices_by_version` structure with static and dynamic pricing. This migration will consolidate pricing logic and eliminate the dual-field approach currently used as a fallback mechanism.

## Background

Currently, the system uses a hybrid approach:

-   **Legacy `price` field**: Used as fallback and for simple operations
-   **`prices_by_version` structure**: Used for version-aware pricing with static/dynamic types
-   **`getEffectivePrice()` function**: Handles fallback logic from `prices_by_version` to `price`

## Migration Strategy

### Phase 1: Preparation & Data Audit ⏳

#### Task 1.1: Comprehensive Data Audit

-   [ ] **Create audit script** to analyze current pricing data
    -   [ ] Count items with only `price` field
    -   [ ] Count items with only `prices_by_version` field
    -   [ ] Count items with both fields
    -   [ ] Identify pricing inconsistencies between fields
    -   [ ] Generate audit report with statistics

#### Task 1.2: Version Data Validation

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

### Phase 2: Backend Updates 🔄

#### Task 2.1: Update Utility Functions

-   [ ] **Enhance `pricing.js` utilities**
    -   [ ] Remove `item.price || 0` fallback from `getEffectivePrice()`
    -   [ ] Add validation for `prices_by_version` completeness
    -   [ ] Create `ensurePricesByVersion()` helper function
    -   [ ] Add migration helpers for backward compatibility

#### Task 2.2: Database Query Updates

-   [ ] **Update Firestore queries**
    -   [ ] Replace direct `price` field queries with `getEffectivePrice()` calls
    -   [ ] Update filtering logic in `HomeView.vue`
    -   [ ] Update sorting logic where applicable
    -   [ ] Test query performance impact

#### Task 2.3: Admin Script Updates

-   [ ] **Update existing admin scripts**
    -   [ ] `updateEnchantedBookPrices.js` → update `prices_by_version`
    -   [ ] `addEnchantedBooks.js` → use version-aware pricing
    -   [ ] `auditVersionKeys.js` → expand to validate pricing completeness
    -   [ ] Add migration status tracking

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

### Phase 5: Migration Execution 🚀

#### Task 5.1: Staging Migration

-   [ ] **Deploy to staging environment**
    -   [ ] Run migration script on staging data
    -   [ ] Validate all functionality works
    -   [ ] Test rollback procedures
    -   [ ] Performance validation

#### Task 5.2: Production Migration

-   [ ] **Execute production migration**
    -   [ ] Create database backup
    -   [ ] Run migration script with monitoring
    -   [ ] Validate data integrity
    -   [ ] Monitor application performance

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
