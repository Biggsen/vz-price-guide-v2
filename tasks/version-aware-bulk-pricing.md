# Version-Aware Bulk Pricing Update

## Overview

A dedicated bulk update interface for managing version-specific pricing data (`prices_by_version`) and recipe assignments. This interface will handle complex version-aware operations that affect pricing calculations and inheritance.

## Purpose

Separate version-aware pricing operations from simple item detail updates to:

-   Reduce complexity in the main bulk update interface
-   Provide specialized tools for pricing management
-   Handle version inheritance and recipe integration
-   Support advanced pricing workflows

## Target Users

-   **Advanced Admins**: Users with recipe management permissions
-   **Pricing Managers**: Users responsible for version-specific pricing
-   **Data Migration Teams**: Users handling bulk pricing updates

## Core Features

### 1. Version Selection & Management

#### Version Selector

-   **Dropdown**: Select target version (1_16, 1_17, 1_18, 1_19, 1_20, 1_21)
-   **Default**: Current default version (1_18)
-   **Multi-select**: Update multiple versions simultaneously
-   **Inheritance indicators**: Show which versions inherit from others

#### Version Status Display

-   **Current pricing**: Show existing prices for each version
-   **Inheritance status**: Indicate if price is inherited or explicit
-   **Recipe status**: Show if item has recipes for each version
-   **Pricing type**: Display static vs dynamic for each version

### 2. Bulk Price Updates

#### Single Version Updates

```javascript
// Update specific version
await updateDoc(doc(db, 'items', id), {
	prices_by_version: {
		[selectedVersion]: newPrice
	}
})
```

#### Multi-Version Updates

-   **Copy to versions**: Apply price to multiple versions
-   **Inheritance preservation**: Maintain inheritance chain
-   **Batch validation**: Ensure no circular dependencies

#### Price Type Management

-   **Static pricing**: Manual price assignment
-   **Dynamic pricing**: Recipe-based calculation
-   **Auto-detection**: Suggest pricing type based on recipe availability
-   **Bulk conversion**: Convert items between static/dynamic

### 3. Recipe Integration

#### Recipe Assignment

-   **Bulk recipe assignment**: Assign recipes to multiple items
-   **Version-specific recipes**: Manage recipes per version
-   **Recipe validation**: Check for missing ingredients
-   **Circular dependency detection**: Prevent infinite loops

#### Dynamic Price Calculation

-   **Bulk recalculation**: Recalculate all dynamic items for a version
-   **Dependency tracking**: Show which items affect others
-   **Calculation preview**: Show price changes before applying
-   **Error reporting**: Detailed error messages for failed calculations

### 4. Advanced Operations

#### Version Inheritance Management

-   **Inheritance override**: Force explicit pricing for inherited versions
-   **Inheritance restoration**: Revert to inherited pricing
-   **Inheritance chain visualization**: Show full inheritance path

#### Bulk Operations

-   **Copy pricing**: Copy prices between versions
-   **Price scaling**: Apply percentage changes across versions
-   **Price rounding**: Apply consistent rounding rules
-   **Price validation**: Check for reasonable price ranges

## User Interface Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Version-Aware Bulk Pricing Update                          │
├─────────────────────────────────────────────────────────────┤
│ Version Selection: [1_18 ▼] [Multi-select] [Inheritance]   │
├─────────────────────────────────────────────────────────────┤
│ Bulk Operations Panel                                      │
│ ├─ Price Updates                                           │
│ ├─ Pricing Type Management                                 │
│ ├─ Recipe Operations                                       │
│ └─ Advanced Operations                                     │
├─────────────────────────────────────────────────────────────┤
│ Item Selection & Filtering                                 │
│ ├─ Search/Filter                                           │
│ ├─ Category/Subcategory filters                            │
│ ├─ Pricing type filters                                    │
│ └─ Recipe status filters                                   │
├─────────────────────────────────────────────────────────────┤
│ Data Table (Version-aware columns)                         │
│ ├─ Item details                                            │
│ ├─ Version pricing columns                                 │
│ ├─ Inheritance indicators                                  │
│ └─ Recipe status                                           │
└─────────────────────────────────────────────────────────────┘
```

### Key UI Components

#### Version Selector Panel

-   **Primary version dropdown**: Main target version
-   **Multi-version checkboxes**: Select additional versions
-   **Inheritance toggle**: Show/hide inheritance information
-   **Version status summary**: Quick overview of all versions

#### Bulk Operations Panel

-   **Price update section**: Set prices for selected versions
-   **Pricing type section**: Convert between static/dynamic
-   **Recipe section**: Assign/remove recipes
-   **Advanced section**: Inheritance and scaling operations

#### Enhanced Data Table

-   **Version columns**: One column per version showing price
-   **Inheritance indicators**: Visual cues for inherited prices
-   **Recipe status**: Icons showing recipe availability
-   **Pricing type**: Static/dynamic indicators
-   **Validation status**: Error/warning indicators

## Technical Implementation

### Data Structure

```javascript
// Item structure for version-aware operations
{
  material_id: string,
  name: string,
  prices_by_version: {
    "1_16": number,
    "1_17": number,
    "1_18": number,
    // ... other versions
  },
  pricing_type: 'static' | 'dynamic',
  recipes_by_version: {
    "1_16": Recipe,
    "1_17": Recipe,
    // ... other versions
  }
}
```

### Core Functions

#### Price Update Functions

```javascript
// Update single version price
async function updateVersionPrice(itemId, version, price, pricingType) {
	const updateData = {
		[`prices_by_version.${version}`]: price,
		pricing_type: pricingType
	}
	await updateDoc(doc(db, 'items', itemId), updateData)
}

// Update multiple versions
async function updateMultipleVersions(itemIds, versions, price, pricingType) {
	const batch = writeBatch(db)
	for (const itemId of itemIds) {
		const itemRef = doc(db, 'items', itemId)
		const updateData = {}
		for (const version of versions) {
			updateData[`prices_by_version.${version}`] = price
		}
		updateData.pricing_type = pricingType
		batch.update(itemRef, updateData)
	}
	await batch.commit()
}
```

#### Recipe Management Functions

```javascript
// Assign recipe to multiple items
async function assignRecipes(itemIds, version, recipe) {
	const batch = writeBatch(db)
	for (const itemId of itemIds) {
		const itemRef = doc(db, 'items', itemId)
		batch.update(itemRef, {
			[`recipes_by_version.${version}`]: recipe,
			pricing_type: 'dynamic'
		})
	}
	await batch.commit()
}

// Bulk price recalculation
async function recalculateDynamicPrices(itemIds, version) {
	const results = []
	for (const itemId of itemIds) {
		try {
			const result = await calculateRecipePrice(itemId, version)
			results.push({ itemId, success: true, price: result.price })
		} catch (error) {
			results.push({ itemId, success: false, error: error.message })
		}
	}
	return results
}
```

### Validation & Error Handling

#### Price Validation

-   **Range validation**: Ensure prices are reasonable (0-1,000,000)
-   **Type validation**: Ensure numeric values
-   **Inheritance validation**: Check for circular dependencies
-   **Recipe validation**: Verify all ingredients exist

#### Error Recovery

-   **Partial failure handling**: Continue processing on individual failures
-   **Rollback capability**: Revert changes on critical errors
-   **Detailed error reporting**: Show specific failure reasons
-   **Progress tracking**: Show completion status for long operations

## Integration Points

### Recipe Management System

-   **Import recipes**: Use existing recipe import functionality
-   **Recipe validation**: Leverage existing validation logic
-   **Price calculation**: Use existing `calculateRecipePrice` function

### Pricing Utilities

-   **Version inheritance**: Use existing `getEffectivePrice` logic
-   **Price formatting**: Use existing formatting functions
-   **Circular dependency detection**: Use existing detection logic

### Admin Authentication

-   **Permission checks**: Require `canBulkUpdate` and recipe permissions
-   **Audit logging**: Track all bulk operations
-   **User attribution**: Record who made changes

## Future Enhancements

### Phase 1: Core Functionality

-   [ ] Basic version-aware price updates
-   [ ] Single version operations
-   [ ] Simple inheritance management

### Phase 2: Advanced Features

-   [ ] Multi-version operations
-   [ ] Recipe integration
-   [ ] Bulk recalculation

### Phase 3: Optimization

-   [ ] Performance improvements
-   [ ] Advanced filtering
-   [ ] Batch size optimization

### Phase 4: Advanced UI

-   [ ] Drag-and-drop operations
-   [ ] Visual inheritance diagrams
-   [ ] Real-time preview

## Success Criteria

### Functional Requirements

-   [ ] Update prices for specific versions
-   [ ] Manage pricing types (static/dynamic)
-   [ ] Handle version inheritance correctly
-   [ ] Integrate with recipe system
-   [ ] Prevent circular dependencies
-   [ ] Provide detailed error reporting

### Performance Requirements

-   [ ] Handle 1000+ items efficiently
-   [ ] Process batch operations in <30 seconds
-   [ ] Real-time validation feedback
-   [ ] Responsive UI during operations

### User Experience Requirements

-   [ ] Clear visual separation of version data
-   [ ] Intuitive inheritance indicators
-   [ ] Comprehensive error messages
-   [ ] Progress tracking for long operations
-   [ ] Undo/rollback capabilities

## Migration Considerations

### From Legacy Bulk Update

-   **Remove price operations**: Price updates moved to new interface
-   **Preserve item detail operations**: Categories, images remain in main interface
-   **Update navigation**: Add link to new pricing interface

### Data Migration

-   **Leverage existing migration**: Use completed price field migration
-   **Validate data integrity**: Ensure all items have proper `prices_by_version`
-   **Test inheritance logic**: Verify version inheritance works correctly

## Security & Permissions

### Access Control

-   **Admin only**: Require admin authentication
-   **Recipe permissions**: Require recipe management access
-   **Audit logging**: Track all pricing changes

### Data Protection

-   **Validation**: Prevent invalid price updates
-   **Rate limiting**: Prevent abuse of bulk operations
-   **Backup**: Ensure data can be recovered

## Testing Strategy

### Unit Testing

-   [ ] Price update functions
-   [ ] Version inheritance logic
-   [ ] Recipe integration
-   [ ] Validation functions

### Integration Testing

-   [ ] End-to-end bulk operations
-   [ ] Recipe calculation integration
-   [ ] Database consistency
-   [ ] Performance testing

### User Acceptance Testing

-   [ ] Admin workflow testing
-   [ ] Error handling scenarios
-   [ ] Large dataset performance
-   [ ] UI/UX validation
