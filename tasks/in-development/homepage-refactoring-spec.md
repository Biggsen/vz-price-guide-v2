# HomeView Refactoring Specification

## Overview

The HomeView.vue component has grown to 928 lines and contains complex, overlapping logic that makes it difficult to maintain and test. This specification outlines a systematic refactoring approach to improve code organization, reduce complexity, and enhance maintainability.

## Current Issues

-   **File Size**: 928 lines in a single component
-   **Complex Logic**: Multiple overlapping computed properties with duplicate filtering logic
-   **Magic Numbers**: Scattered hardcoded values throughout the code
-   **Duplicate Code**: Same filtering logic repeated in multiple places
-   **Poor Separation of Concerns**: Data fetching, filtering, UI state, and business logic all mixed together
-   **Difficult Testing**: Complex interdependencies make unit testing challenging

## Refactoring Goals

1. **Reduce Component Size**: Target <400 lines for the main component
2. **Improve Maintainability**: Clear separation of concerns
3. **Enhance Testability**: Isolated, focused functions and composables
4. **Reduce Duplication**: Eliminate repeated filtering and processing logic
5. **Better Performance**: More efficient computed properties and data flow

## Phase 1: Extract Constants and Utilities

### Task 1.1: Create Constants File

**File**: `src/constants/homepage.js`
**Effort**: Low
**Dependencies**: None

```javascript
// Magic numbers and configuration values
export const MAX_CATEGORIES_FOR_DB = 10
export const LOADING_DELAY_FAST = 300
export const LOADING_DELAY_SLOW = 100
export const LOADING_THRESHOLD = 100

// Fallback values
export const FALLBACK_VERSIONS = ['1.16', '1.17', '1.18', '1.19', '1.20', '1.21']

// LocalStorage keys
export const STORAGE_KEYS = {
	PRICE_MULTIPLIER: 'priceMultiplier',
	SELL_MARGIN: 'sellMargin',
	ROUND_TO_WHOLE: 'roundToWhole',
	VIEW_MODE: 'viewMode',
	LAYOUT: 'layout',
	SELECTED_VERSION: 'selectedVersion',
	SHOW_STACK_SIZE: 'showStackSize',
	ALERT_DISMISSED: 'crateRewardsToolAlertDismissed'
}
```

### Task 1.2: Create Utility Functions

**File**: `src/utils/homepage.js`
**Effort**: Low
**Dependencies**: Task 1.1

```javascript
// Version comparison utility
export function isVersionLessOrEqual(itemVersion, targetVersion) {
	// Extract existing logic
}

// Search term processing
export function processSearchTerms(query) {
	// Extract existing logic
}

// Item filtering utilities
export function filterItemsBySearch(items, searchTerms) {
	// Extract existing logic
}

export function filterItemsByVersion(items, selectedVersion) {
	// Extract version_removed filtering logic
}

export function filterItemsByPriceAndImage(items, user, selectedVersion) {
	// Extract price/image validation logic
}
```

## Phase 2: Create Composables

### Task 2.1: Create useEconomyConfig Composable

**File**: `src/composables/useEconomyConfig.js`
**Effort**: Medium
**Dependencies**: Task 1.1

**Responsibilities**:

-   Manage economy configuration state (priceMultiplier, sellMargin, etc.)
-   Handle localStorage persistence
-   Provide save/load functionality
-   Watch for changes and auto-save

**Interface**:

```javascript
export function useEconomyConfig() {
	return {
		// State
		priceMultiplier,
		sellMargin,
		roundToWhole,
		showStackSize,
		viewMode,
		layout,

		// Computed
		economyConfig,

		// Methods
		loadConfig,
		saveConfig,
		resetToDefaults
	}
}
```

### Task 2.2: Create useFilters Composable

**File**: `src/composables/useFilters.js`
**Effort**: Medium
**Dependencies**: Task 1.2

**Responsibilities**:

-   Manage search query state
-   Handle category filtering (visibleCategories)
-   Manage version selection
-   Provide filtered data based on current filters

**Interface**:

```javascript
export function useFilters(items, enabledCategories, enabledVersions) {
	return {
		// State
		searchQuery,
		visibleCategories,
		selectedVersion,

		// Computed
		filteredItems,
		categoryCounts,
		totalItemCount,

		// Methods
		toggleCategory,
		clearAllCategories,
		resetFilters,
		updateSearchQuery
	}
}
```

### Task 2.3: Create useItems Composable

**File**: `src/composables/useItems.js`
**Effort**: High
**Dependencies**: Task 1.2, Task 2.2

**Responsibilities**:

-   Manage Firestore queries and data fetching
-   Handle loading states
-   Process and filter items based on version, category, and search
-   Provide grouped and flat item collections

**Interface**:

```javascript
export function useItems(selectedVersion, visibleCategories, searchQuery) {
	return {
		// State
		isLoading,
		hasInitiallyLoaded,

		// Data
		allItems,
		groupedItems,
		allVisibleItems,
		categoryCounts,

		// Methods
		refreshItems,
		getCacheStats
	}
}
```

## Phase 3: Refactor Main Component

### Task 3.1: Simplify HomeView Template

**Effort**: Medium
**Dependencies**: All Phase 2 tasks

**Changes**:

-   Remove complex inline logic from template
-   Move conditional class bindings to computed properties
-   Simplify event handlers
-   Extract complex template sections into smaller components if needed

### Task 3.2: Update HomeView Script

**Effort**: Medium
**Dependencies**: All Phase 2 tasks

**Changes**:

-   Replace complex logic with composable calls
-   Remove duplicate computed properties
-   Simplify watchers and lifecycle hooks
-   Clean up imports and dependencies

### Task 3.3: Create Sub-Components (Optional)

**Effort**: Medium
**Dependencies**: Task 3.1

**Potential Components**:

-   `CategoryFilters.vue` - Category filter buttons
-   `ViewControls.vue` - View mode and layout toggles
-   `SearchBar.vue` - Search input and reset button
-   `LoadingState.vue` - Loading and empty state displays

## Phase 4: Testing and Optimization

### Task 4.1: Add Unit Tests

**Effort**: Medium
**Dependencies**: All previous tasks

**Test Files**:

-   `src/composables/__tests__/useEconomyConfig.test.js`
-   `src/composables/__tests__/useFilters.test.js`
-   `src/composables/__tests__/useItems.test.js`
-   `src/utils/__tests__/homepage.test.js`

### Task 4.2: Performance Optimization

**Effort**: Low
**Dependencies**: All previous tasks

**Optimizations**:

-   Review computed property dependencies
-   Optimize Firestore queries
-   Add memoization where appropriate
-   Profile and optimize rendering performance

### Task 4.3: Documentation Updates

**Effort**: Low
**Dependencies**: All previous tasks

**Updates**:

-   Update component documentation
-   Add JSDoc comments to composables
-   Update development guidelines
-   Create migration guide for future changes

## Implementation Strategy

### Recommended Order

1. **Phase 1** (Constants & Utilities) - Foundation work, low risk
2. **Phase 2** (Composables) - Core refactoring, medium risk
3. **Phase 3** (Component Updates) - Integration, medium risk
4. **Phase 4** (Testing & Optimization) - Polish, low risk

### Risk Mitigation

-   **Incremental Changes**: Each phase can be implemented and tested independently
-   **Backward Compatibility**: Maintain existing functionality throughout refactoring
-   **Feature Flags**: Use feature flags to toggle between old and new implementations during development
-   **Comprehensive Testing**: Add tests before refactoring to ensure behavior preservation

### Success Metrics

-   **File Size**: HomeView.vue < 400 lines
-   **Complexity**: Reduce cyclomatic complexity by 50%
-   **Test Coverage**: Achieve 80%+ test coverage for new composables
-   **Performance**: Maintain or improve current loading times
-   **Maintainability**: Reduce time to implement new features by 30%

## Estimated Effort

-   **Phase 1**: 4-6 hours
-   **Phase 2**: 12-16 hours
-   **Phase 3**: 8-12 hours
-   **Phase 4**: 6-8 hours
-   **Total**: 30-42 hours

## Dependencies

-   Vue 3 Composition API
-   VueFire
-   Existing utility functions (pricing.js, admin.js)
-   Current component structure and styling

## Acceptance Criteria

-   [ ] HomeView.vue is under 400 lines
-   [ ] All existing functionality is preserved
-   [ ] No performance regression
-   [ ] All new composables have unit tests
-   [ ] Code follows established patterns and conventions
-   [ ] Documentation is updated
-   [ ] No breaking changes to public API

## Future Considerations

-   Consider extracting similar patterns to other large components
-   Evaluate if composables can be reused across components
-   Plan for potential state management migration if complexity grows
-   Consider implementing virtual scrolling for large item lists
