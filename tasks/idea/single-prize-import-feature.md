# Single Prize Import Feature

## Overview

Allow users to import individual prizes into existing crates, providing granular control for adding custom items or specific rewards without requiring a full crate YAML file.

## Problem Statement

Currently, the crate import system only supports importing complete crate YAML files. This creates friction when users want to:

-   Add a single custom item to an existing crate
-   Import specific prizes from different sources
-   Test individual items before committing to a full crate structure
-   Mix and match items from various crate configurations

## Proposed Solution

### New Import Modes

Add a toggle in the import modal to switch between:

1. **Full Crate Import** (current behavior) - Import entire YAML file
2. **Single Prize Import** (new) - Import individual prize entries

### Single Prize Import UI

**Import Modal Enhancements:**

```vue
<div class="mb-4">
  <label class="block text-sm font-medium mb-2">Import Mode</label>
  <div class="flex space-x-4">
    <label class="flex items-center">
      <input
        type="radio"
        v-model="importMode"
        value="full"
        class="mr-2"
      />
      Full Crate YAML
    </label>
    <label class="flex items-center">
      <input
        type="radio"
        v-model="importMode"
        value="single"
        class="mr-2"
      />
      Single Prize Entry
    </label>
  </div>
</div>

<!-- Conditional UI based on mode -->
<div v-if="importMode === 'single'" class="space-y-4">
  <div>
    <label class="block text-sm font-medium mb-2">
      Prize Entry (YAML format)
    </label>
    <textarea
      v-model="singlePrizeYaml"
      placeholder="Paste a single prize entry here..."
      class="w-full h-32 p-3 border rounded-md font-mono text-sm"
    ></textarea>
    <p class="text-xs text-gray-600 mt-1">
      Example: Paste a single prize block from a Crazy Crates YAML file
    </p>
  </div>
</div>
```

### YAML Format Support

**Single Prize YAML Format:**

```yaml
# Example single prize entry
Prize1:
    Items: ['DIAMOND_SWORD 1 0']
    Weight: 50
    Display-Item: 'DIAMOND_SWORD'
    Display-Amount: 1
    Display-Name: '&6&lEpic Sword'
```

**Alternative formats to support:**

```yaml
# Minimal format
Items: ["DIAMOND_SWORD 1 0"]
Weight: 50

# With display info
Items: ["DIAMOND_SWORD 1 0"]
Weight: 50
Display-Item: "DIAMOND_SWORD"
Display-Amount: 1
Display-Name: "&6&lEpic Sword"

# With enchantments
Items: ["DIAMOND_SWORD 1 0"]
Weight: 50
Enchantments:
  - "SHARPNESS:5"
  - "FIRE_ASPECT:2"
```

### Backend Implementation

**New function in `src/utils/crateRewards.js`:**

```javascript
/**
 * Import a single prize entry into an existing crate
 * @param {string} crateId - Target crate ID
 * @param {string} prizeYaml - Single prize YAML content
 * @param {Array} allItems - All items from database
 * @param {string} userId - User ID for audit trail
 * @returns {Object} Import result with success, counts, errors, and warnings
 */
export async function importSinglePrizeToCrate(crateId, prizeYaml, allItems, userId) {
	try {
		if (!crateId) {
			throw new Error('Crate ID is required for single prize import')
		}

		// Parse the single prize YAML
		const parsedPrize = parseSinglePrizeYaml(prizeYaml)

		if (!parsedPrize) {
			throw new Error('Failed to parse prize YAML')
		}

		// Validate prize structure
		const validationError = validateSinglePrize(parsedPrize)
		if (validationError) {
			throw new Error(`Prize validation failed: ${validationError}`)
		}

		// Process items in the prize
		const importedItems = []
		const errors = []
		const warnings = []

		for (let i = 0; i < parsedPrize.items.length; i++) {
			const itemString = parsedPrize.items[i]
			const parsedItem = parseItemString(itemString, allItems)

			if (!parsedItem) {
				errors.push(`Failed to parse item string: "${itemString}"`)
				continue
			}

			// Create crate reward item document
			const rewardItem = {
				crate_reward_id: crateId,
				item_id: parsedItem.item_id,
				quantity: parsedItem.quantity || 1,
				weight: parsedPrize.weight || 50,
				display_name: parsedPrize.display_name || null,
				display_item: parsedPrize.display_item || null,
				display_amount: parsedPrize.display_amount || null,
				settings: parsedPrize.settings || {},
				enchantments: parsedItem.enchantments || {},
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
				created_by: userId
			}

			const docRef = await addDoc(collection(db, 'crate_reward_items'), rewardItem)

			importedItems.push({ id: docRef.id, ...rewardItem })
		}

		return {
			success: errors.length === 0,
			importedCount: importedItems.length,
			importedItems,
			errors,
			warnings,
			message: `Successfully imported ${importedItems.length} item(s) to crate`
		}
	} catch (error) {
		return {
			success: false,
			importedCount: 0,
			importedItems: [],
			errors: [error.message],
			warnings: [],
			message: `Import failed: ${error.message}`
		}
	}
}

/**
 * Parse single prize YAML content
 */
function parseSinglePrizeYaml(yamlContent) {
	try {
		// Clean comments
		const cleanedContent = yamlContent
			.split('\n')
			.filter((line) => !line.trim().startsWith('#'))
			.join('\n')

		const parsed = yaml.load(cleanedContent)

		// Handle different YAML structures
		if (parsed && typeof parsed === 'object') {
			// If it's a single prize object (Prize1: {...})
			const prizeKeys = Object.keys(parsed)
			if (prizeKeys.length === 1) {
				return {
					id: prizeKeys[0],
					...parsed[prizeKeys[0]]
				}
			}

			// If it's direct prize data
			if (parsed.Items || parsed.items) {
				return parsed
			}
		}

		return null
	} catch (error) {
		throw new Error(`YAML parsing failed: ${error.message}`)
	}
}

/**
 * Validate single prize structure
 */
function validateSinglePrize(prize) {
	if (!prize.Items && !prize.items) {
		return 'Prize must contain Items field'
	}

	const items = prize.Items || prize.items
	if (!Array.isArray(items) || items.length === 0) {
		return 'Items must be a non-empty array'
	}

	if (!prize.Weight && !prize.weight) {
		return 'Prize must have a Weight value'
	}

	return null
}
```

### UI Integration

**Update `CrateSingleView.vue` import modal:**

```vue
<!-- Add import mode selection -->
<div class="mb-4">
  <label class="block text-sm font-medium mb-2">Import Mode</label>
  <div class="flex space-x-4">
    <label class="flex items-center">
      <input
        type="radio"
        v-model="importMode"
        value="full"
        class="mr-2"
      />
      Full Crate YAML
    </label>
    <label class="flex items-center">
      <input
        type="radio"
        v-model="importMode"
        value="single"
        class="mr-2"
      />
      Single Prize Entry
    </label>
  </div>
</div>

<!-- File input for full crate mode -->
<div v-if="importMode === 'full'">
  <input
    id="yaml-file-input"
    type="file"
    accept=".yml,.yaml"
    @change="handleFileSelect"
    class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
  />
</div>

<!-- Textarea for single prize mode -->
<div v-if="importMode === 'single'">
  <label class="block text-sm font-medium mb-2">
    Prize Entry (YAML format)
  </label>
  <textarea
    v-model="singlePrizeYaml"
    placeholder="Paste a single prize entry here..."
    class="w-full h-32 p-3 border rounded-md font-mono text-sm"
  ></textarea>
  <p class="text-xs text-gray-600 mt-1">
    Example: Paste a single prize block from a Crazy Crates YAML file
  </p>
</div>
```

**Update import function:**

```javascript
async function importYamlFile() {
	if (importMode.value === 'full') {
		// Existing full crate import logic
		await importFullCrate()
	} else {
		// New single prize import logic
		await importSinglePrize()
	}
}

async function importSinglePrize() {
	if (!singlePrizeYaml.value.trim()) {
		importModalError.value = 'Please enter prize YAML content'
		return
	}

	isImporting.value = true
	importModalError.value = null

	try {
		const result = await importSinglePrizeToCrate(
			selectedCrateId.value,
			singlePrizeYaml.value,
			allItems.value,
			user.value.uid
		)

		importResult.value = result

		if (result.success && result.importedCount > 0) {
			// Clear the textarea
			singlePrizeYaml.value = ''
		}
	} catch (err) {
		importModalError.value = 'Failed to import prize: ' + err.message
	} finally {
		isImporting.value = false
	}
}
```

## Benefits

-   **Granular Control**: Add individual items without full crate structure
-   **Custom Item Support**: Easily add unique items or test configurations
-   **Flexibility**: Mix items from different crate sources
-   **Development Efficiency**: Test individual prizes before full integration
-   **User Experience**: Reduced friction for adding single items

## Use Cases

1. **Custom Items**: Add server-specific custom items to existing crates
2. **Testing**: Import individual prizes to test before full crate import
3. **Mixing Sources**: Combine items from different crate configurations
4. **Quick Additions**: Add single items without recreating entire crates
5. **Partial Imports**: Import specific prizes from large crate files

## Implementation Priority

**Medium** - Useful feature that enhances workflow flexibility but not critical for core functionality.

## Related Features

-   Full crate YAML import
-   Crate reward management
-   Item catalog integration
-   Prize validation and parsing
-   Custom item support

## Technical Considerations

-   **Validation**: Ensure single prize YAML follows expected format
-   **Error Handling**: Provide clear feedback for malformed YAML
-   **Performance**: Single prize imports should be fast and responsive
-   **Consistency**: Maintain same validation rules as full crate import
-   **Audit Trail**: Track who added prizes and when
