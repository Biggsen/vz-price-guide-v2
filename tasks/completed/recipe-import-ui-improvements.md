# Recipe Import UI and Functionality Improvements

> **✅ Status: Not Needed - Issues Resolved**  
> This specification was created to address recipe import workflow issues. The core problems have been resolved through bug fixes and incremental improvements. The major features described in this spec (list view, bulk import, view toggle) were not implemented as they were not necessary - the existing sequential workflow works well after the fixes.

## Overview

~~Enhance the recipe import workflow to reduce friction when importing recipes, especially when many recipes have already been imported. The current system requires clicking through each recipe one-by-one, including those that already exist, making it tedious to find and import new recipes.~~

**RESOLVED:** The core issues have been fixed through bug fixes and incremental improvements:
- "All recipes" now automatically filters to only show unimported recipes
- Ingredient filter excludes ingredients with only invalid recipes
- Statistics dashboard shows breakdown of recipe status
- Ingredient dropdown hides when no valid recipes available
- Circular dependency detection added (prefers compression over decompression)
- Manage recipes page enhanced with circular filter, sortable status, active indicators, and counters

The major features described below (list view, bulk import, view toggle) were not implemented as they proved unnecessary - the existing sequential workflow works well after the fixes.

## Problem Statement

The current recipe import system has several usability issues:

1. **No filtering of already-imported recipes**: Users must click through recipes that already exist just to find new ones
2. **Sequential navigation only**: Recipes are shown one at a time with no way to preview or jump to specific recipes
3. **No bulk operations**: Each recipe must be imported individually, even when multiple recipes are ready to import
4. **Limited visibility**: Users can't see the full list of recipes, their status, or filter by various criteria before starting
5. **Inefficient workflow**: The ingredient filter exists but doesn't help when you need to skip many already-imported recipes

## Goals

- Allow users to quickly identify and focus on recipes that need importing
- Provide a list/grid view of recipes with status indicators before starting the import process
- Enable filtering and sorting by multiple criteria (status, ingredient, output item, etc.)
- Support bulk import operations for recipes that are ready to import
- Maintain the existing one-by-one review workflow for recipes that need attention
- Improve overall efficiency when importing recipes for new versions

## Non-Goals

- Changing the underlying recipe data structure or validation logic
- Modifying how recipes are stored in Firestore
- Changing the version inheritance/fallback behavior
- Removing the existing ingredient filter functionality

## Target Users

- Admins and content editors with permissions to manage recipes
- Users importing recipes for new Minecraft versions

## User Stories

- As an editor, I want to see a list of all recipes with their import status so I can quickly identify which ones need attention
- As an editor, I want to filter out recipes that already exist so I only see new recipes
- As an editor, I want to bulk import multiple valid recipes at once instead of clicking through each one
- As an editor, I want to search for specific recipes by output item name or ingredient
- As an editor, I want to sort recipes by status, output item, or number of ingredients
- As an editor, I want to jump directly to a specific recipe instead of clicking through many recipes
- As an editor, I want to see a summary of import statistics before and after importing

## Proposed Solution

### 1. Recipe List View (Pre-Import)

Add a new view mode that shows all recipes in a table/list format before starting the import process.

**Features:**
- Display all recipes with key information (output item, ingredients count, status)
- Status indicators: New, Already Exists, Invalid, Has Warnings
- Clickable rows to jump directly to a recipe for review
- Bulk selection checkboxes for recipes ready to import
- Search/filter bar for quick filtering
- Sortable columns

**UI Layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ Recipe Import - Version 1.21                                │
├─────────────────────────────────────────────────────────────┤
│ [Filter: All ▼] [Search: ________] [Sort: Status ▼]         │
│                                                              │
│ ☑ Select All  [Bulk Import Selected] [Start Sequential]     │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☐ │ Status │ Output Item │ Ingredients │ Actions       │ │
│ ├───┼────────┼─────────────┼─────────────┼───────────────┤ │
│ │ ☑ │ New    │ diamond_sword │ 2 items  │ [Review] [Skip]│ │
│ │ ☐ │ Exists │ iron_ingot    │ 1 item   │ [Review] [Skip]│ │
│ │ ☑ │ New    │ gold_block    │ 9 items  │ [Review] [Skip]│ │
│ │ ☐ │ Invalid│ custom_item   │ 0 items  │ [Review] [Skip]│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Showing 45 of 120 recipes (75 already exist)                │
└─────────────────────────────────────────────────────────────┘
```

### 2. Enhanced Filtering

Expand filtering capabilities beyond just ingredients:

**Filter Options:**
- **Status Filter**: All / New Only / Already Exists / Invalid / Has Warnings
- **Ingredient Filter**: (existing functionality, keep as-is)
- **Output Item Search**: Filter by output item material_id
- **Ingredient Count**: Filter by number of ingredients (e.g., "recipes with 2-4 ingredients")
- **Combined Filters**: Support multiple active filters simultaneously

**Filter UI:**

```vue
<div class="flex flex-wrap gap-4 mb-4">
  <!-- Status Filter -->
  <select v-model="statusFilter" class="border rounded px-3 py-2">
    <option value="all">All Status</option>
    <option value="new">New Only</option>
    <option value="exists">Already Exists</option>
    <option value="invalid">Invalid</option>
    <option value="warnings">Has Warnings</option>
  </select>

  <!-- Ingredient Filter (existing) -->
  <select v-model="selectedIngredient" class="border rounded px-3 py-2">
    <option value="">All Ingredients</option>
    <option v-for="ing in availableIngredients" :value="ing">
      {{ ing }}
    </option>
  </select>

  <!-- Output Item Search -->
  <input
    v-model="outputItemSearch"
    type="text"
    placeholder="Search output item..."
    class="border rounded px-3 py-2"
  />

  <!-- Clear All Filters -->
  <button @click="clearAllFilters" class="text-sm text-gray-600">
    Clear All
  </button>
</div>
```

### 3. Bulk Import Functionality

Allow importing multiple recipes at once when they're all valid and ready.

**Bulk Import Flow:**
1. User selects multiple recipes using checkboxes
2. System validates all selected recipes
3. User clicks "Bulk Import Selected"
4. System shows a confirmation dialog with summary (X recipes will be imported, Y will be overwritten)
5. On confirm, all selected recipes are imported in batch
6. Progress indicator shows batch import status
7. Results summary shows success/failure for each recipe

**Bulk Import Logic:**

```javascript
async function bulkImportRecipes(selectedRecipes) {
	const results = {
		success: [],
		failed: [],
		overwritten: [],
		skipped: []
	}

	for (const recipe of selectedRecipes) {
		if (!recipe.isValid) {
			results.skipped.push({
				recipe,
				reason: 'Invalid recipe'
			})
			continue
		}

		try {
			const internalRecipe = toInternalFormat(recipe)
			if (internalRecipe) {
				const itemQuery = dbItems.value.find(
					(item) => item.material_id === internalRecipe.material_id
				)
				if (itemQuery) {
					const itemRef = doc(db, 'items', itemQuery.id)
					const versionKey = selectedVersion.value.replace('.', '_')
					await updateDoc(itemRef, {
						[`recipes_by_version.${versionKey}`]: {
							ingredients: internalRecipe.ingredients,
							output_count: internalRecipe.output_count
						},
						pricing_type: 'dynamic'
					})

					if (recipe.alreadyExists) {
						results.overwritten.push(recipe)
					} else {
						results.success.push(recipe)
					}
				}
			}
		} catch (error) {
			results.failed.push({
				recipe,
				error: error.message
			})
		}
	}

	return results
}
```

### 4. Recipe Status Indicators

Clear visual indicators for recipe status:

**Status Types:**
- **New** (green): Recipe doesn't exist, ready to import
- **Already Exists** (orange): Recipe exists in this or previous version
- **Invalid** (red): Recipe has validation errors (missing ingredients, etc.)
- **Has Warnings** (yellow): Recipe is valid but has warnings

**Status Badge Component:**

```vue
<span
	:class="{
		'bg-green-100 text-green-800': status === 'new',
		'bg-orange-100 text-orange-800': status === 'exists',
		'bg-red-100 text-red-800': status === 'invalid',
		'bg-yellow-100 text-yellow-800': status === 'warnings'
	}"
	class="px-2 py-1 rounded text-xs font-medium">
	{{ statusLabel }}
</span>
```

### 5. Quick Navigation

Allow jumping directly to specific recipes:

**Navigation Options:**
- Click on a recipe row to jump directly to that recipe for review
- "Jump to Recipe" input field to search and navigate by material_id
- Keyboard shortcuts for navigation (arrow keys, Enter to import, Space to skip)
- Breadcrumb showing current position (e.g., "Recipe 15 of 120")

### 6. Import Statistics Dashboard

Show comprehensive statistics about the import process:

**Statistics Display:**

```
┌─────────────────────────────────────────┐
│ Import Statistics                        │
├─────────────────────────────────────────┤
│ Total Recipes: 120                       │
│ New Recipes: 45                          │
│ Already Exist: 75                        │
│ Invalid: 0                               │
│ Has Warnings: 2                          │
│                                          │
│ Progress: 12 / 45 (27%)                 │
│ ✅ Imported: 8                           │
│ ⚠️ Overwritten: 4                        │
│ ⏭️ Skipped: 0                            │
└─────────────────────────────────────────┘
```

### 7. View Mode Toggle

Allow switching between list view and sequential view:

**Toggle Options:**
- **List View** (new): See all recipes in a table, filter, sort, bulk import
- **Sequential View** (existing): One-by-one review workflow

Users can start in list view to get an overview, then switch to sequential view for detailed review of specific recipes.

## Implementation Details

### Component Structure

**New Components:**
- `RecipeImportListView.vue` - List/grid view of recipes
- `RecipeStatusBadge.vue` - Status indicator component
- `BulkImportDialog.vue` - Confirmation dialog for bulk imports
- `ImportStatistics.vue` - Statistics dashboard component

**Modified Components:**
- `RecipeImportView.vue` - Add view mode toggle, integrate list view

### State Management

**New State Variables:**

```javascript
const viewMode = ref('list') // 'list' or 'sequential'
const statusFilter = ref('all') // 'all', 'new', 'exists', 'invalid', 'warnings'
const outputItemSearch = ref('')
const selectedRecipes = ref([]) // Array of recipe IDs for bulk import
const showBulkImportDialog = ref(false)
const importStatistics = ref({
	total: 0,
	new: 0,
	exists: 0,
	invalid: 0,
	warnings: 0,
	imported: 0,
	overwritten: 0,
	skipped: 0
})
```

**Computed Properties:**

```javascript
const filteredRecipes = computed(() => {
	let recipes = allRecipes.value

	// Status filter
	if (statusFilter.value !== 'all') {
		recipes = recipes.filter((recipe) => {
			if (statusFilter.value === 'new') return !checkRecipeExists(recipe)
			if (statusFilter.value === 'exists') return checkRecipeExists(recipe)
			if (statusFilter.value === 'invalid') return !recipe.isValid
			if (statusFilter.value === 'warnings') return recipe.warnings?.length > 0
			return true
		})
	}

	// Ingredient filter (existing)
	if (selectedIngredient.value) {
		recipes = recipes.filter((recipe) =>
			recipe.ingredients.some(
				(ingredient) => ingredient.material_id === selectedIngredient.value
			)
		)
	}

	// Output item search
	if (outputItemSearch.value) {
		const searchTerm = outputItemSearch.value.toLowerCase()
		recipes = recipes.filter((recipe) =>
			recipe.outputItem?.material_id?.toLowerCase().includes(searchTerm)
		)
	}

	return recipes
})

const recipesByStatus = computed(() => {
	return {
		new: filteredRecipes.value.filter((r) => !checkRecipeExists(r) && r.isValid),
		exists: filteredRecipes.value.filter((r) => checkRecipeExists(r)),
		invalid: filteredRecipes.value.filter((r) => !r.isValid),
		warnings: filteredRecipes.value.filter((r) => r.warnings?.length > 0)
	}
})
```

### Data Flow

1. **Load Recipes**: Same as current - fetch from resource files
2. **Pre-process**: Check status for all recipes upfront (not on-demand)
3. **Display**: Show in list view with filters applied
4. **User Actions**:
	- Filter/search to narrow down recipes
	- Select recipes for bulk import
	- Click individual recipe to review in detail
	- Switch to sequential view for one-by-one review
5. **Import**: Either bulk import selected recipes or import individually

### Performance Considerations

- **Pre-compute status**: Check `checkRecipeExists()` for all recipes when loading, not during filtering
- **Virtual scrolling**: For large recipe lists (100+), use virtual scrolling in the table
- **Debounced search**: Debounce search input to avoid excessive filtering
- **Lazy validation**: Only validate ingredients when viewing a recipe, not for all recipes upfront

## UX Requirements

### List View Requirements

- Table should be responsive and work on mobile (stack columns on small screens)
- Recipes should be sortable by: Status, Output Item, Ingredient Count, Number of Missing Ingredients
- Row hover states should indicate clickability
- Selected recipes should be visually distinct
- Status badges should be color-coded and accessible

### Filter Requirements

- Filters should be clearly labeled
- Active filters should be visually indicated
- "Clear All Filters" should reset to default state
- Filter state should persist during the session (but not across page reloads)

### Bulk Import Requirements

- Bulk import button should be disabled when no valid recipes are selected
- Confirmation dialog should show:
	- Number of recipes to import
	- Number that will overwrite existing recipes
	- List of any invalid recipes that will be skipped
- Progress indicator during bulk import
- Success/error summary after completion

### Navigation Requirements

- Clicking a recipe row should switch to sequential view at that recipe
- "Back to List" button in sequential view
- Keyboard navigation in sequential view (existing functionality)
- Breadcrumb showing position in list

## Validation & Error Handling

- Validate all selected recipes before bulk import
- Show validation errors for each recipe in the list view
- Prevent bulk import if any selected recipe is invalid (unless user explicitly chooses to skip invalid ones)
- Handle network errors gracefully during bulk import
- Show partial success if some recipes in a batch fail

## Permissions & Security

- Require existing admin/editor authentication checks
- Bulk import should respect the same permissions as individual import
- Firestore rules should remain unchanged

## Testing Strategy

### Unit Tests

- Filter logic (status, ingredient, search)
- Recipe status computation
- Bulk import batch processing
- Statistics calculation

### Integration Tests

- End-to-end bulk import flow
- Filter combinations
- View mode switching
- Recipe navigation

### Cypress Tests

- Load recipes and verify list view displays correctly
- Apply filters and verify results
- Select recipes and perform bulk import
- Navigate between list and sequential views
- Verify statistics update correctly

## Migration & Rollout

- No data migration required
- Feature can be added incrementally:
	1. Add list view alongside existing sequential view
	2. Add filtering capabilities
	3. Add bulk import functionality
	4. Add statistics dashboard
- Existing workflow remains available as "Sequential View"
- Default to list view for new users, but allow preference setting

## Documentation

- Update `/docs/recipes.md` with new import workflow
- Add screenshots of list view and bulk import
- Document keyboard shortcuts
- Add changelog entry to `data/updates.json`

## Success Metrics

- **Time to import**: Reduce time to import 50 recipes by 60%+
- **User satisfaction**: Positive feedback on reduced clicking
- **Adoption**: 80%+ of imports use list view or bulk import
- **Error rate**: Maintain or reduce current error rate during imports

## Future Enhancements

- **Export/Import filters**: Save and reuse filter presets
- **Recipe comparison**: Side-by-side comparison of existing vs new recipe
- **Batch validation**: Pre-validate all recipes and show summary before starting
- **Import templates**: Save common import configurations
- **Keyboard shortcuts**: Full keyboard navigation in list view
- **Recipe grouping**: Group recipes by category or ingredient type

## Related Features

- Existing recipe import workflow
- Recipe management view
- Ingredient filtering (existing)
- Recipe validation system

