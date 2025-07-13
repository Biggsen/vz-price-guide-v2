export function formatNumber(num) {
	if (num === undefined || num === null || typeof num !== 'number' || isNaN(num)) {
		return '0'
	}

	const units = [
		{ value: 1000000000, suffix: 'B' },
		{ value: 1000000, suffix: 'M' },
		{ value: 1000, suffix: 'k' }
	]

	for (const { value, suffix } of units) {
		if (num >= value) {
			const scaled = num / value
			const rounded = scaled === Math.floor(scaled) ? scaled : Math.round(scaled * 10) / 10
			return rounded + suffix
		}
	}

	return num.toString()
}

export function formatCurrency(num, roundToWhole = false) {
	if (num === undefined || num === null || typeof num !== 'number' || isNaN(num)) {
		return '0'
	}
	if (num < 1) {
		return parseFloat(num.toFixed(2)).toString()
	}
	if (num < 1000) {
		if (roundToWhole) {
			return Math.round(num).toString()
		}
		// Show up to 2 decimal places, but remove trailing zeros
		return parseFloat(num.toFixed(2)).toString()
	}
	return formatNumber(Math.round(num))
}

export function buyUnitPrice(price, priceMultiplier, roundToWhole = false) {
	return formatCurrency(price * priceMultiplier, roundToWhole)
}

export function sellUnitPrice(price, priceMultiplier, sellMargin, roundToWhole = false) {
	return formatCurrency(price * priceMultiplier * sellMargin, roundToWhole)
}

export function buyStackPrice(price, stack, priceMultiplier, roundToWhole = false) {
	return formatCurrency(price * stack * priceMultiplier, roundToWhole)
}

export function sellStackPrice(price, stack, priceMultiplier, sellMargin, roundToWhole = false) {
	return formatCurrency(price * stack * priceMultiplier * sellMargin, roundToWhole)
}

/**
 * Get the effective price for an item with version inheritance support
 * @param {Object} item - The item object
 * @param {string} version - Version key (e.g., "1_16")
 * @returns {number} - The effective price
 */
export function getEffectivePrice(item, version = '1_16') {
	// Normalize prices_by_version to handle mixed version key formats
	const normalizedPrices = {}
	if (item.prices_by_version) {
		Object.entries(item.prices_by_version).forEach(([key, value]) => {
			const normalizedKey = key.replace('.', '_')
			normalizedPrices[normalizedKey] = value
		})
	}

	// Apply price inheritance for all items (both static and dynamic)
	if (Object.keys(normalizedPrices).length > 0) {
		// First try the requested version
		if (normalizedPrices[version] !== undefined) {
			return extractPriceValue(normalizedPrices[version])
		}

		// If not found, try earlier versions in descending order
		const availableVersions = Object.keys(normalizedPrices)
		const sortedVersions = availableVersions.sort((a, b) => {
			// Convert version keys like "1_16" to comparable format
			const aVersion = a.replace('_', '.')
			const bVersion = b.replace('_', '.')
			const [aMajor, aMinor] = aVersion.split('.').map(Number)
			const [bMajor, bMinor] = bVersion.split('.').map(Number)

			// Sort in descending order (newest first)
			if (aMajor !== bMajor) return bMajor - aMajor
			return bMinor - aMinor
		})

		// Find the latest version that's not newer than the requested version
		const requestedVersion = version.replace('_', '.')
		const [reqMajor, reqMinor] = requestedVersion.split('.').map(Number)

		for (const availableVersion of sortedVersions) {
			const availableVersionFormatted = availableVersion.replace('_', '.')
			const [avMajor, avMinor] = availableVersionFormatted.split('.').map(Number)

			// Use this version if it's not newer than requested
			if (avMajor < reqMajor || (avMajor === reqMajor && avMinor <= reqMinor)) {
				return extractPriceValue(normalizedPrices[availableVersion])
			}
		}
	}

	// Final fallback to legacy price field
	return item.price || 0
}

/**
 * Extract the actual price value from a prices_by_version entry
 * @param {*} priceData - The price data (could be a number or structured object)
 * @returns {number} - The extracted price value
 */
function extractPriceValue(priceData) {
	// Handle simple numeric values (preferred format)
	if (typeof priceData === 'number') {
		return priceData
	}

	// Handle legacy structured pricing data (backward compatibility)
	if (typeof priceData === 'object' && priceData !== null) {
		if (priceData.type === 'static') {
			return priceData.value || 0
		} else if (priceData.type === 'dynamic') {
			// For dynamic pricing, prefer calculated_value, fallback to 0
			return priceData.calculated_value || 0
		}
	}

	// Fallback for any other format
	return 0
}

/**
 * Calculate the price of an item based on its recipe ingredients
 * @param {Object} item - The item with recipe data
 * @param {Array} allItems - Array of all items for ingredient lookup
 * @param {string} version - Version key (e.g., "1_16")
 * @param {Set} visited - Set to track visited items (prevents infinite recursion)
 * @returns {Object} - { price: number|null, error: string|null, chain: string[] }
 */
export function calculateRecipePrice(item, allItems, version = '1_16', visited = new Set()) {
	// Prevent infinite recursion
	if (visited.has(item.material_id)) {
		return {
			price: null,
			error: `Circular dependency detected for ${item.material_id}`,
			chain: Array.from(visited)
		}
	}

	// Fallback logic: find the nearest previous version with a recipe
	let recipe = item.recipes_by_version?.[version]
	if (!recipe && item.recipes_by_version) {
		const availableVersions = Object.keys(item.recipes_by_version)
		const sortedVersions = availableVersions.sort((a, b) => {
			const aVersion = a.replace('_', '.')
			const bVersion = b.replace('_', '.')
			const [aMajor, aMinor] = aVersion.split('.').map(Number)
			const [bMajor, bMinor] = bVersion.split('.').map(Number)
			if (aMajor !== bMajor) return bMajor - aMajor
			return bMinor - aMinor
		})
		const requestedVersion = version.replace('_', '.')
		const [reqMajor, reqMinor] = requestedVersion.split('.').map(Number)
		for (const availableVersion of sortedVersions) {
			const availableVersionFormatted = availableVersion.replace('_', '.')
			const [avMajor, avMinor] = availableVersionFormatted.split('.').map(Number)
			if (avMajor < reqMajor || (avMajor === reqMajor && avMinor <= reqMinor)) {
				recipe = item.recipes_by_version[availableVersion]
				break
			}
		}
	}
	if (!recipe) {
		return {
			price: null,
			error: `No recipe found for ${item.material_id} in version ${version} or any previous version`,
			chain: []
		}
	}

	// Handle both old format (array) and new format (object)
	const ingredients = Array.isArray(recipe) ? recipe : recipe.ingredients
	const outputCount = Array.isArray(recipe) ? 1 : recipe.output_count || 1

	if (!ingredients || !Array.isArray(ingredients)) {
		return {
			price: null,
			error: `Invalid recipe format for ${item.material_id} in version ${version}`,
			chain: []
		}
	}

	// Add this item to visited set
	visited.add(item.material_id)

	let totalCost = 0
	const calculationChain = []

	// Calculate cost for each ingredient
	for (const ingredient of ingredients) {
		const ingredientItem = allItems.find((i) => i.material_id === ingredient.material_id)

		if (!ingredientItem) {
			visited.delete(item.material_id)
			return {
				price: null,
				error: `Ingredient ${ingredient.material_id} not found in database`,
				chain: []
			}
		}

		let ingredientPrice = null

		// If ingredient also has dynamic pricing, calculate recursively
		if (ingredientItem.pricing_type === 'dynamic') {
			const result = calculateRecipePrice(ingredientItem, allItems, version, new Set(visited))
			if (result.price !== null) {
				ingredientPrice = result.price
				calculationChain.push(`${ingredient.material_id}: ${ingredientPrice} (calculated)`)
			} else {
				// Recipe calculation failed, fall back to existing price
				ingredientPrice = getEffectivePrice(ingredientItem, version)
				calculationChain.push(`${ingredient.material_id}: ${ingredientPrice} (fallback)`)
			}
		} else {
			// Use existing price
			ingredientPrice = getEffectivePrice(ingredientItem, version)
			calculationChain.push(`${ingredient.material_id}: ${ingredientPrice} (static)`)
		}

		if (ingredientPrice === null || ingredientPrice === undefined) {
			visited.delete(item.material_id)
			return {
				price: null,
				error: `Could not determine price for ingredient ${ingredient.material_id}`,
				chain: calculationChain
			}
		}

		totalCost += ingredientPrice * ingredient.quantity
	}

	// Remove from visited set
	visited.delete(item.material_id)

	// Calculate price per unit by dividing total cost by output count
	const pricePerUnit = totalCost / outputCount

	return {
		price: pricePerUnit,
		error: null,
		chain: [
			...calculationChain,
			`Total cost: ${totalCost} ÷ ${outputCount} units = ${pricePerUnit} per unit`
		]
	}
}

export function customRoundPrice(price) {
	if (price < 5) {
		return Math.ceil(price * 10) / 10
	} else {
		return Math.ceil(price)
	}
}

/**
 * Recalculate prices for all items with dynamic pricing for a specific version
 * @param {Array} allItems - Array of all items
 * @param {string} version - Version key (e.g., "1_16")
 * @returns {Object} - { success: Array, failed: Array, summary: Object }
 */
export function recalculateDynamicPrices(allItems, version = '1_16') {
	const results = {
		success: [],
		failed: [],
		summary: {
			total: 0,
			calculated: 0,
			failed: 0,
			unchanged: 0
		}
	}

	// Helper function to check if item should be shown for selected version
	function shouldShowItemForVersion(item, selectedVersion) {
		// Item must have a version and be <= selected version
		if (!item.version || !isVersionLessOrEqual(item.version, selectedVersion)) {
			return false
		}

		// If item has version_removed and it's <= selected version, don't show it
		if (item.version_removed && isVersionLessOrEqual(item.version_removed, selectedVersion)) {
			return false
		}

		return true
	}

	// Helper function to compare version strings (e.g., "1.16" vs "1.17")
	function isVersionLessOrEqual(itemVersion, targetVersion) {
		if (!itemVersion || !targetVersion) return false

		const [itemMajor, itemMinor] = itemVersion.split('.').map(Number)
		const [targetMajor, targetMinor] = targetVersion.split('.').map(Number)

		if (itemMajor < targetMajor) return true
		if (itemMajor > targetMajor) return false
		return itemMinor <= targetMinor
	}

	// Find all items with dynamic pricing that are available in the selected version
	const dynamicItems = allItems.filter(
		(item) =>
			item.pricing_type === 'dynamic' &&
			shouldShowItemForVersion(item, version.replace('_', '.'))
	)
	results.summary.total = dynamicItems.length

	for (const item of dynamicItems) {
		const calculation = calculateRecipePrice(item, allItems, version)

		if (calculation.price !== null) {
			const oldPrice = getEffectivePrice(item, version)
			const newPrice = customRoundPrice(calculation.price)

			results.success.push({
				material_id: item.material_id,
				name: item.name,
				oldPrice,
				newPrice,
				changed: oldPrice !== newPrice,
				chain: calculation.chain
			})

			if (oldPrice !== newPrice) {
				results.summary.calculated++
			} else {
				results.summary.unchanged++
			}
		} else {
			results.failed.push({
				material_id: item.material_id,
				name: item.name,
				error: calculation.error,
				chain: calculation.chain
			})
			results.summary.failed++
		}
	}

	return results
}
