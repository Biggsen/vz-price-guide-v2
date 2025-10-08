# YAML Import Refactor Specification

## Overview

Replace the custom YAML parser with the `js-yaml` library to handle diverse Crazy Crates YAML file formats and improve import reliability.

## Problem Statement

The current implementation (`parseCrateRewardsYaml` in `src/utils/crateRewards.js`) uses a custom string-based parser that:

-   **Limited Format Support**: Only handles one specific YAML structure (Prizes at root level)
-   **Fragile Parsing**: String-based line parsing is error-prone
-   **No Validation**: Minimal error handling for malformed YAML
-   **Hard to Extend**: Adding support for new formats requires complex regex
-   **Missing Features**: Can't handle YAML anchors, multi-line strings, or complex nested structures

**Real-World Problem**: Different Crazy Crates configurations may structure their YAML files differently:

-   Some have `Prizes:` at the root level
-   Others nest everything under `Crate:` with additional metadata
-   Some include `Settings:`, `Preview-Items:`, `hologram:` sections
-   Different indentation styles and YAML features

## Goals

1. ✅ Use industry-standard `js-yaml` library for robust YAML parsing
2. ✅ Support multiple Crazy Crates YAML file formats
3. ✅ Maintain backward compatibility with existing files
4. ✅ Improve error messages for users
5. ✅ Handle edge cases (missing fields, unexpected structure)
6. ✅ Add validation and helpful import feedback

---

## YAML File Format Analysis

### Format 1: Root-Level Prizes (Current)

```yaml
Prizes:
    '1':
        DisplayName: '<white>16x bread'
        DisplayItem: 'bread'
        Settings: { Custom-Model-Data: -1, Model: { Namespace: '', Id: '' } }
        DisplayAmount: 16
        Weight: 60
        Items:
            - 'item:bread, amount:16'
```

**Characteristics**:

-   `Prizes:` at root level
-   Prize IDs as quoted strings
-   Simple structure

### Format 2: Nested Under Crate

```yaml
Crate:
    CrateName: 'Village Crate'
    Preview-Name: '<white>Village Crate'
    BalloonEffect: 'false'
    glowing: 'false'

    Prizes:
        '1':
            DisplayName: '<white>16x bread'
            DisplayItem: 'bread'
            Weight: 60
            Items:
                - 'item:bread, amount:16'
```

**Characteristics**:

-   Metadata at `Crate:` level
-   `Prizes:` nested under `Crate:`
-   Additional properties (BalloonEffect, glowing, etc.)

### Format 3: With Additional Sections

```yaml
Crate:
    CrateName: 'Epic Crate'

    hologram:
        Toggle: true
        Lines:
            - '&7Epic Crate'

    Preview-Items:
        Toggle: true

    Prizes:
        '1':
            DisplayName: 'Prize 1'
            Weight: 50
            Items:
                - 'item:diamond, amount:1'
```

**Characteristics**:

-   Multiple top-level sections
-   Complex nested structures
-   Optional configurations

---

## Technical Implementation

### Step 1: Install js-yaml

```bash
npm install js-yaml
```

**Package**: `js-yaml` - Standard YAML parser for JavaScript
**Version**: Latest stable (currently 4.x)
**Size**: ~19kb minified

### Step 2: Create YAML Parser Utility

Create new utility function to handle YAML parsing with format detection:

**File**: `src/utils/crateRewards.js`

**New Functions**:

#### `parseYamlFile(yamlContent)`

Parses YAML string into JavaScript object using js-yaml.

```javascript
import yaml from 'js-yaml'

/**
 * Parse YAML content into JavaScript object
 * @param {string} yamlContent - Raw YAML string
 * @returns {object} Parsed YAML object
 * @throws {Error} If YAML is invalid
 */
function parseYamlFile(yamlContent) {
	try {
		const parsed = yaml.load(yamlContent)
		if (!parsed || typeof parsed !== 'object') {
			throw new Error('YAML file is empty or invalid')
		}
		return parsed
	} catch (error) {
		console.error('YAML parsing error:', error)
		throw new Error(`Invalid YAML format: ${error.message}`)
	}
}
```

#### `detectYamlFormat(parsedYaml)`

Detects which Crazy Crates format the YAML file uses.

```javascript
/**
 * Detect the format of a Crazy Crates YAML file
 * @param {object} parsedYaml - Parsed YAML object
 * @returns {string} Format identifier: 'root-prizes', 'nested-crate', or 'unknown'
 */
function detectYamlFormat(parsedYaml) {
	// Format 1: Prizes at root level
	if (parsedYaml.Prizes && typeof parsedYaml.Prizes === 'object') {
		return 'root-prizes'
	}

	// Format 2: Nested under Crate
	if (parsedYaml.Crate && parsedYaml.Crate.Prizes) {
		return 'nested-crate'
	}

	// Unknown format
	return 'unknown'
}
```

#### `extractPrizesFromYaml(parsedYaml, format)`

Extracts prize data from parsed YAML based on detected format.

```javascript
/**
 * Extract prizes array from parsed YAML based on format
 * @param {object} parsedYaml - Parsed YAML object
 * @param {string} format - Detected format identifier
 * @returns {object} Extracted data { prizes: [], metadata: {} }
 */
function extractPrizesFromYaml(parsedYaml, format) {
	let prizesObject = null
	let metadata = {}

	switch (format) {
		case 'root-prizes':
			prizesObject = parsedYaml.Prizes
			break

		case 'nested-crate':
			prizesObject = parsedYaml.Crate.Prizes
			// Extract crate metadata if available
			metadata = {
				crateName: parsedYaml.Crate.CrateName,
				previewName: parsedYaml.Crate['Preview-Name'],
				balloonEffect: parsedYaml.Crate.BalloonEffect,
				glowing: parsedYaml.Crate.glowing
			}
			break

		default:
			throw new Error('Unable to locate Prizes section in YAML file')
	}

	if (!prizesObject || typeof prizesObject !== 'object') {
		throw new Error('Prizes section is empty or invalid')
	}

	// Convert prizes object to array format
	const prizes = []
	for (const [prizeId, prizeData] of Object.entries(prizesObject)) {
		if (!prizeData || typeof prizeData !== 'object') {
			console.warn(`Prize ${prizeId} has invalid data, skipping`)
			continue
		}

		prizes.push({
			id: prizeId,
			displayName: prizeData.DisplayName || '',
			displayItem: prizeData.DisplayItem || '',
			displayAmount: prizeData.DisplayAmount || 1,
			weight: prizeData.Weight || 50,
			items: Array.isArray(prizeData.Items) ? prizeData.Items : []
		})
	}

	return { prizes, metadata }
}
```

### Step 3: Update `parseCrateRewardsYaml`

Replace the existing string-based parser with the new js-yaml implementation:

**Current Location**: Lines 600-671 in `src/utils/crateRewards.js`

**New Implementation**:

```javascript
/**
 * Parse YAML content and extract prize data
 * Now uses js-yaml library for robust parsing
 * @param {string} yamlContent - Raw YAML string
 * @returns {Array} Array of prize objects
 */
export function parseCrateRewardsYaml(yamlContent) {
	try {
		// Step 1: Parse YAML
		const parsedYaml = parseYamlFile(yamlContent)

		// Step 2: Detect format
		const format = detectYamlFormat(parsedYaml)

		if (format === 'unknown') {
			throw new Error(
				'Unrecognized YAML format. Please ensure the file contains a "Prizes:" section.'
			)
		}

		// Step 3: Extract prizes
		const { prizes, metadata } = extractPrizesFromYaml(parsedYaml, format)

		if (prizes.length === 0) {
			throw new Error('No valid prizes found in YAML file')
		}

		console.log(`✅ Detected format: ${format}`)
		console.log(`✅ Found ${prizes.length} prizes`)
		if (metadata.crateName) {
			console.log(`✅ Crate name: ${metadata.crateName}`)
		}

		return prizes
	} catch (error) {
		console.error('Error parsing YAML:', error)
		throw new Error('Failed to parse YAML file: ' + error.message)
	}
}
```

### Step 4: Improve Error Messages

Add specific error messages for common issues:

```javascript
/**
 * Validate prize data before import
 * @param {object} prize - Prize object to validate
 * @returns {object|null} Validation result or null if valid
 */
function validatePrize(prize) {
	if (!prize.items || prize.items.length === 0) {
		return {
			prizeId: prize.id,
			error: 'No items found'
		}
	}

	if (!prize.weight || prize.weight < 1) {
		return {
			prizeId: prize.id,
			error: 'Invalid weight (must be >= 1)',
			suggestion: 'Setting weight to default value of 50'
		}
	}

	return null // Valid
}
```

### Step 5: Update Import Function

Enhance `importCrateRewardsFromYaml` with better feedback:

**Current Location**: Lines 792-886 in `src/utils/crateRewards.js`

**Enhancements**:

-   Add prize validation
-   Better error categorization (parse errors vs. match errors)
-   Return metadata (detected format, crate name if available)
-   Warnings for fixable issues

```javascript
/**
 * Import crate rewards from YAML content
 */
export async function importCrateRewardsFromYaml(
	crateId,
	yamlContent,
	allItems,
	crateName = null,
	userId = null
) {
	try {
		let targetCrateId = crateId

		// If no crateId provided, create a new crate first
		if (!targetCrateId && crateName && userId) {
			const newCrate = await createCrateReward(userId, {
				name: crateName,
				description: `Imported from YAML file`,
				minecraft_version: '1.20'
			})
			targetCrateId = newCrate.id
		}

		if (!targetCrateId) {
			throw new Error('No crate ID provided and unable to create new crate')
		}

		// Parse YAML (now using js-yaml)
		const prizes = parseCrateRewardsYaml(yamlContent)

		const importedItems = []
		const errors = []
		const warnings = []

		for (let i = 0; i < prizes.length; i++) {
			const prize = prizes[i]

			// Validate prize
			const validationError = validatePrize(prize)
			if (validationError) {
				if (validationError.suggestion) {
					warnings.push(
						`Prize ${prize.id}: ${validationError.error} - ${validationError.suggestion}`
					)
					// Apply fix if possible
					if (!prize.weight) prize.weight = 50
				} else {
					errors.push(`Prize ${prize.id}: ${validationError.error}`)
					continue
				}
			}

			if (!prize.items || prize.items.length === 0) {
				errors.push(`Prize ${prize.id}: No items found`)
				continue
			}

			// Parse the first item (we'll ignore multiple items for now)
			const itemString = prize.items[0]
			const parsedItem = parseItemString(itemString, allItems)

			if (!parsedItem) {
				errors.push(`Prize ${prize.id}: Failed to parse item string "${itemString}"`)
				continue
			}

			// Find matching item in our database
			const matchingItem = findMatchingItem(parsedItem, allItems)

			if (!matchingItem) {
				errors.push(
					`Prize ${prize.id}: No matching item found for "${parsedItem.materialId}"`
				)
				continue
			}

			// Create reward item data
			const rewardItemData = {
				item_id: matchingItem.id,
				quantity: parsedItem.amount,
				weight: prize.weight,
				enchantments: parsedItem.enchantments,
				material_id: matchingItem.material_id
			}

			// Add to crate reward
			try {
				const newItem = await addCrateRewardItem(
					targetCrateId,
					rewardItemData,
					matchingItem
				)
				importedItems.push(newItem)
			} catch (error) {
				errors.push(`Prize ${prize.id}: Failed to add item - ${error.message}`)
			}
		}

		return {
			success: true,
			importedCount: importedItems.length,
			errorCount: errors.length,
			warningCount: warnings.length,
			errors: errors,
			warnings: warnings
		}
	} catch (error) {
		console.error('Import process failed:', error)
		return {
			success: false,
			importedCount: 0,
			errorCount: 1,
			warningCount: 0,
			errors: [error.message],
			warnings: []
		}
	}
}
```

---

## UI Updates

### Update Import Modal

**File**: `src/views/CrateSingleView.vue`

**Current Location**: Lines 1850-1936

**Changes**:

1. **Add Format Detection Display**

```vue
<!-- Import Results -->
<div v-if="importResult" class="space-y-2">
	<!-- Format Detection Info -->
	<div v-if="importResult.format" class="p-3 bg-blue-50 border-l-4 border-l-blue-500">
		<div class="text-blue-800 text-sm">
			Detected format: <strong>{{ importResult.format }}</strong>
		</div>
	</div>

	<!-- Success Message -->
	<div v-if="importResult.success" class="...">
		...
	</div>
</div>
```

2. **Add Warnings Section**

```vue
<!-- Warnings -->
<div
	v-if="importResult.warnings && importResult.warnings.length > 0"
	class="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
	<div class="text-yellow-800 font-medium mb-2">Warnings:</div>
	<div class="text-yellow-700 text-sm space-y-1">
		<div v-for="warning in importResult.warnings" :key="warning">
			{{ warning }}
		</div>
	</div>
</div>
```

3. **Improve Error Display**

```vue
<!-- Errors -->
<div
	v-if="importResult.errors && importResult.errors.length > 0"
	class="p-3 bg-red-50 border border-red-200 rounded-lg">
	<div class="text-red-800 font-medium mb-2">
		Import Errors ({{ importResult.errorCount }}/{{ importResult.totalPrizes }}):
	</div>
	<div class="text-red-700 text-sm space-y-1 max-h-48 overflow-y-auto">
		<div v-for="error in importResult.errors" :key="error">
			{{ error }}
		</div>
	</div>
</div>
```

---

## Testing Strategy

### Test Files

Create test YAML files for each format:

**`tests/fixtures/crate-format-1-root.yaml`**

```yaml
Prizes:
    '1':
        DisplayName: 'Test Item'
        Weight: 50
        Items:
            - 'item:diamond, amount:1'
```

**`tests/fixtures/crate-format-2-nested.yaml`**

```yaml
Crate:
    CrateName: 'Test Crate'
    Prizes:
        '1':
            DisplayName: 'Test Item'
            Weight: 50
            Items:
                - 'item:diamond, amount:1'
```

**`tests/fixtures/crate-invalid.yaml`**

```yaml
NotAPrizeSection:
    foo: bar
```

### Test Cases

1. **Format Detection**

    - ✅ Detect root-level Prizes format
    - ✅ Detect nested Crate format
    - ✅ Return 'unknown' for unrecognized formats

2. **YAML Parsing**

    - ✅ Valid YAML files parse correctly
    - ✅ Invalid YAML throws descriptive error
    - ✅ Empty files throw error
    - ✅ Handles YAML anchors and aliases
    - ✅ Handles multi-line strings

3. **Prize Extraction**

    - ✅ Extract all prizes from format 1
    - ✅ Extract all prizes from format 2
    - ✅ Extract metadata when available
    - ✅ Handle missing optional fields
    - ✅ Skip invalid prize entries

4. **Item Matching**

    - ✅ Match simple items
    - ✅ Match enchanted items
    - ✅ Match enchanted books
    - ✅ Handle items not in database
    - ✅ Handle malformed item strings

5. **Error Handling**
    - ✅ Clear error for missing Prizes section
    - ✅ Clear error for malformed YAML
    - ✅ Per-prize error messages
    - ✅ Partial import continues on errors

### Manual Testing

1. Import existing YAML files that work with current parser
2. Import YAML files from different Crazy Crates versions
3. Import intentionally malformed files
4. Test with very large files (100+ prizes)
5. Test with special characters in display names

---

## Implementation Steps

### Phase 1: Setup (15 mins)

-   [ ] Install `js-yaml` package
-   [ ] Import js-yaml in `crateRewards.js`
-   [ ] Create test fixtures

### Phase 2: Core Functions (45 mins)

-   [ ] Implement `parseYamlFile()`
-   [ ] Implement `detectYamlFormat()`
-   [ ] Implement `extractPrizesFromYaml()`
-   [ ] Implement `validatePrize()`

### Phase 3: Update Existing Functions (30 mins)

-   [ ] Replace `parseCrateRewardsYaml()` implementation
-   [ ] Update `importCrateRewardsFromYaml()` with warnings
-   [ ] Ensure backward compatibility

### Phase 4: UI Updates (20 mins)

-   [ ] Add format detection display
-   [ ] Add warnings section
-   [ ] Improve error display
-   [ ] Update import feedback

### Phase 5: Testing (40 mins)

-   [ ] Test with existing YAML files
-   [ ] Test with new format files
-   [ ] Test error cases
-   [ ] Test edge cases

### Phase 6: Documentation (10 mins)

-   [ ] Update comments and JSDoc
-   [ ] Document supported formats
-   [ ] Add usage examples

**Total Estimated Time**: ~2.5 hours

---

## Backward Compatibility

**Guarantee**: All YAML files that work with the current parser will continue to work.

**How**: The new parser handles Format 1 (root-level Prizes) which is what the current parser expects.

**Migration Path**: No action required from users. New formats are automatically detected and supported.

---

## Benefits

1. **Robust Parsing**: Industry-standard YAML parser handles edge cases
2. **Format Flexibility**: Support multiple Crazy Crates YAML structures
3. **Better Errors**: Clear, actionable error messages for users
4. **Maintainability**: Less custom parsing code to maintain
5. **Future-Proof**: Easy to add support for new YAML formats
6. **Validation**: Better validation of prize data before import
7. **Feedback**: Warnings for fixable issues, errors only for blockers

---

## Risks & Mitigation

### Risk: Breaking existing imports

**Mitigation**:

-   Keep same function signatures
-   Test with all existing YAML files before deployment
-   Add format fallback to string parser if needed

### Risk: js-yaml bundle size

**Mitigation**:

-   js-yaml is only 19kb minified
-   Import only `load` function, not full library
-   Tree-shaking will remove unused code

### Risk: Different YAML features

**Mitigation**:

-   Use safe `yaml.load()` not `yaml.loadAll()`
-   Document which YAML features are supported
-   Add validation for unsupported features

---

## Success Criteria

-   ✅ All existing YAML files import successfully
-   ✅ New YAML formats import successfully
-   ✅ Error messages are clear and actionable
-   ✅ No regression in import speed
-   ✅ Bundle size increase < 25kb
-   ✅ Code is more maintainable than before
-   ✅ All tests pass

---

## Future Enhancements

After core implementation, consider:

1. **Auto-detect crate name**: Use metadata from YAML as crate name
2. **Multi-file import**: Import multiple YAML files at once
3. **Export format selection**: Export in different YAML formats
4. **YAML validation**: Pre-validate YAML before import attempt
5. **Import preview**: Show what will be imported before confirming
6. **Drag-and-drop**: Drag YAML files directly onto the UI

---

## Related Files

**Modified**:

-   `src/utils/crateRewards.js` - Core parsing logic
-   `src/views/CrateSingleView.vue` - Import modal UI
-   `package.json` - Add js-yaml dependency

**New**:

-   `tests/fixtures/crate-format-*.yaml` - Test fixtures (optional)

**Not Modified**:

-   `src/views/CrateRewardManagerView.vue` - Uses same import function
-   Export functionality - No changes needed

---

## Notes

-   Keep the existing `parseItemString()` function - it's already good
-   Keep the existing `findMatchingItem()` function - it works well
-   The custom parser removal will reduce code by ~70 lines
-   The new implementation will add ~150 lines but be more robust
-   Net increase of ~80 lines but with much better functionality
