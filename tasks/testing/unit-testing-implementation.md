# Unit Testing Implementation Task Specification

## Overview

Implement a comprehensive unit testing framework for the Vue.js price guide application, focusing on testing utility functions, components, and business logic.

## Goals

-   Establish unit testing infrastructure using Vitest
-   Create comprehensive test coverage for pricing utility functions
-   Set up testing patterns for Vue components
-   Ensure code quality and prevent regressions
-   Provide fast feedback during development

## Scope

### Phase 1: Testing Infrastructure Setup

-   [ ] Install and configure Vitest testing framework
-   [ ] Set up test configuration and scripts
-   [ ] Create testing utilities and helpers
-   [ ] Establish testing conventions and patterns

### Phase 2: Utility Functions Testing

-   [ ] Test pricing utility functions (`src/utils/pricing.js`)
-   [ ] Test image utility functions (`src/utils/image.js`)
-   [ ] Test admin utility functions (`src/utils/admin.js`)
-   [ ] Test any other utility modules

### Phase 3: Component Testing

-   [ ] Test base components (`src/components/Base*.vue`)
-   [ ] Test complex components (`ExportModal.vue`, `ItemTable.vue`)
-   [ ] Test view components (`src/views/*.vue`)
-   [ ] Test form validation and user interactions

### Phase 4: Integration and Coverage

-   [ ] Set up test coverage reporting
-   [ ] Add CI/CD integration for testing
-   [ ] Create testing documentation
-   [ ] Establish testing best practices

## Technical Requirements

### Testing Framework: Vitest

**Rationale**: Vitest is the recommended choice because:

-   Built by Vite team, perfect integration with existing Vite setup
-   Fast execution and hot reload
-   Jest-compatible API for easy migration
-   Excellent Vue 3 support
-   Zero configuration required

### Dependencies to Install

```bash
npm install --save-dev vitest @vitest/ui @vue/test-utils jsdom
```

### Configuration Files

#### `vite.config.js` (add test configuration)

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
	plugins: [vue()],
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.js']
	}
})
```

#### `src/test/setup.js` (test setup file)

```javascript
import { vi } from 'vitest'

// Mock Firebase
vi.mock('firebase/app', () => ({
	initializeApp: vi.fn()
}))

vi.mock('firebase/firestore', () => ({
	getFirestore: vi.fn(),
	collection: vi.fn(),
	doc: vi.fn(),
	getDocs: vi.fn(),
	getDoc: vi.fn()
}))

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}))
```

### Package.json Scripts

```json
{
	"scripts": {
		"test": "vitest",
		"test:ui": "vitest --ui",
		"test:run": "vitest run",
		"test:coverage": "vitest run --coverage",
		"test:watch": "vitest --watch"
	}
}
```

## Test Structure

### Directory Structure

```
src/
├── test/
│   ├── setup.js
│   ├── utils/
│   │   └── test-helpers.js
│   └── __mocks__/
├── utils/
│   └── __tests__/
│       ├── pricing.test.js
│       ├── image.test.js
│       └── admin.test.js
└── components/
    └── __tests__/
        ├── ExportModal.test.js
        ├── ItemTable.test.js
        └── BaseButton.test.js
```

## Priority Test Cases

### 1. Pricing Functions (`src/utils/pricing.js`)

#### `roundPriceForExport` Logic

-   [ ] Small prices (< 1): Always preserve decimals
-   [ ] Medium prices (1-999): Respect `roundToWhole` setting
-   [ ] Large prices (>= 1000): Always round
-   [ ] Edge cases: 0, negative numbers, NaN, Infinity

#### Raw Pricing Functions

-   [ ] `buyUnitPriceRaw`: Basic calculation and rounding
-   [ ] `sellUnitPriceRaw`: Margin calculation and rounding
-   [ ] `buyStackPriceRaw`: Stack size calculation
-   [ ] `sellStackPriceRaw`: Stack size with margin

#### Existing Functions

-   [ ] `formatCurrency`: String formatting logic
-   [ ] `customRoundPrice`: Ceiling rounding rules
-   [ ] `getEffectivePrice`: Version inheritance logic

### 2. Export Modal Component (`src/components/ExportModal.vue`)

#### Props and State

-   [ ] Initial state values
-   [ ] Prop validation and defaults
-   [ ] Reactive state updates

#### Computed Properties

-   [ ] `filteredItems`: Version and category filtering
-   [ ] `sortedFilteredItems`: Sorting logic
-   [ ] `exportData`: Data generation for export

#### User Interactions

-   [ ] Category selection
-   [ ] Price field toggles
-   [ ] Sort order changes
-   [ ] Round to whole numbers toggle

#### Export Functions

-   [ ] JSON export generation
-   [ ] YAML export generation
-   [ ] File download functionality

### 3. Item Table Component (`src/components/ItemTable.vue`)

#### Props and Rendering

-   [ ] Item display logic
-   [ ] Price formatting
-   [ ] Category grouping
-   [ ] Sorting functionality

#### User Interactions

-   [ ] Sort column clicks
-   [ ] View mode changes
-   [ ] Layout adjustments

## Test Implementation Examples

### Pricing Function Test Example

```javascript
import { describe, it, expect } from 'vitest'
import { buyUnitPriceRaw, sellUnitPriceRaw } from '../pricing.js'

describe('Raw Pricing Functions', () => {
	describe('roundPriceForExport logic', () => {
		it('should preserve decimals for small prices even when roundToWhole is true', () => {
			expect(buyUnitPriceRaw(0.3, 1, true)).toBe(0.3)
			expect(sellUnitPriceRaw(0.3, 1, 1, true)).toBe(0.3)
		})

		it('should preserve decimals for medium prices when roundToWhole is false', () => {
			expect(buyUnitPriceRaw(9, 1.2, false)).toBe(10.8)
			expect(sellUnitPriceRaw(9, 1.2, 0.3, false)).toBe(3.24)
		})

		it('should round medium prices when roundToWhole is true', () => {
			expect(buyUnitPriceRaw(9, 1.2, true)).toBe(11)
			expect(sellUnitPriceRaw(9, 1.2, 0.3, true)).toBe(3)
		})

		it('should always round large prices', () => {
			expect(buyUnitPriceRaw(1000, 1, false)).toBe(1000)
			expect(buyUnitPriceRaw(1000, 1.5, false)).toBe(1500)
		})
	})
})
```

### Component Test Example

```javascript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ExportModal from '../ExportModal.vue'

describe('ExportModal', () => {
	const defaultProps = {
		items: [],
		selectedVersion: '1.20',
		economyConfig: {
			priceMultiplier: 1,
			sellMargin: 0.3,
			roundToWhole: false
		}
	}

	it('should render with default props', () => {
		const wrapper = mount(ExportModal, { props: defaultProps })
		expect(wrapper.find('[data-testid="export-modal"]').exists()).toBe(true)
	})

	it('should filter items by selected categories', async () => {
		const items = [
			{ material_id: '1', category: 'blocks', name: 'Stone' },
			{ material_id: '2', category: 'tools', name: 'Pickaxe' }
		]
		const wrapper = mount(ExportModal, {
			props: { ...defaultProps, items }
		})

		await wrapper.setData({ selectedCategories: ['blocks'] })
		expect(wrapper.vm.filteredItems).toHaveLength(1)
	})
})
```

## Success Criteria

### Coverage Targets

-   **Utility Functions**: 100% line coverage
-   **Components**: 80% line coverage
-   **Critical Business Logic**: 100% coverage

### Quality Metrics

-   All tests pass consistently
-   Tests run in under 30 seconds
-   Clear, readable test descriptions
-   Proper mocking of external dependencies
-   No flaky tests

### Documentation

-   README section on running tests
-   Testing conventions guide
-   Component testing patterns
-   Mock setup documentation

## Implementation Timeline

### Week 1: Infrastructure Setup

-   Install and configure Vitest
-   Set up test configuration
-   Create basic test utilities
-   Write first pricing function tests

### Week 2: Core Function Testing

-   Complete pricing utility tests
-   Add image and admin utility tests
-   Set up component testing patterns

### Week 3: Component Testing

-   Test ExportModal component
-   Test ItemTable component
-   Test base components

### Week 4: Integration and Polish

-   Add coverage reporting
-   CI/CD integration
-   Documentation and cleanup

## Risk Mitigation

### Potential Issues

-   **Firebase mocking complexity**: Use comprehensive mocks
-   **Vue component testing**: Leverage Vue Test Utils
-   **Test performance**: Use Vitest's speed optimizations
-   **CI/CD integration**: Start with simple test runs

### Solutions

-   Create reusable mock utilities
-   Follow Vue testing best practices
-   Use test.only() for debugging
-   Implement gradual CI integration

## Acceptance Criteria

-   [ ] All pricing functions have comprehensive test coverage
-   [ ] Export modal functionality is fully tested
-   [ ] Tests run reliably in CI/CD pipeline
-   [ ] Coverage reports are generated and accessible
-   [ ] Testing documentation is complete
-   [ ] No regressions in existing functionality
-   [ ] Tests provide fast feedback during development

## Future Enhancements

### Phase 2 Considerations

-   Visual regression testing
-   Performance testing
-   E2E test integration
-   Test data management
-   Advanced mocking strategies

### Maintenance

-   Regular test review and updates
-   Performance monitoring
-   Coverage trend analysis
-   Test quality metrics

---

**Priority**: High
**Estimated Effort**: 2-3 weeks
**Dependencies**: None
**Blockers**: None
