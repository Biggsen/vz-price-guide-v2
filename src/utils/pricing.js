import {
	compareVersions,
	versionToKey,
	keyToVersion,
	getOldestVersion,
	isVersionLessOrEqual
} from '../constants/minecraftVersions.js'

const OLDEST_VERSION_KEY = versionToKey(getOldestVersion())

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

export function formatCurrency(
	num,
	roundToWhole = false,
	useSmartNumberFormatting = true
) {
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
	const rounded = Math.round(num)
	if (!useSmartNumberFormatting) {
		return rounded.toString()
	}
	return formatNumber(rounded)
}

function shopBuyUnit(price, priceMultiplier, processingCost = 0) {
	return price * priceMultiplier + processingCost
}

/** Stack buy: materials × stack + stack-level processing cost (not unit fee × stack). */
function shopBuyStack(price, stack, priceMultiplier, stackProcessingCost = 0) {
	return price * priceMultiplier * stack + stackProcessingCost
}

export function buyUnitPrice(
	price,
	priceMultiplier,
	roundToWhole = false,
	useSmartNumberFormatting = true,
	processingCost = 0
) {
	return formatCurrency(
		shopBuyUnit(price, priceMultiplier, processingCost),
		roundToWhole,
		useSmartNumberFormatting
	)
}

export function sellUnitPrice(
	price,
	priceMultiplier,
	sellMargin,
	roundToWhole = false,
	useSmartNumberFormatting = true,
	processingCost = 0
) {
	return formatCurrency(
		shopBuyUnit(price, priceMultiplier, processingCost) * sellMargin,
		roundToWhole,
		useSmartNumberFormatting
	)
}

export function buyStackPrice(
	price,
	stack,
	priceMultiplier,
	roundToWhole = false,
	useSmartNumberFormatting = true,
	stackProcessingCost = 0
) {
	return formatCurrency(
		shopBuyStack(price, stack, priceMultiplier, stackProcessingCost),
		roundToWhole,
		useSmartNumberFormatting
	)
}

export function sellStackPrice(
	price,
	stack,
	priceMultiplier,
	sellMargin,
	roundToWhole = false,
	useSmartNumberFormatting = true,
	stackProcessingCost = 0
) {
	return formatCurrency(
		shopBuyStack(price, stack, priceMultiplier, stackProcessingCost) * sellMargin,
		roundToWhole,
		useSmartNumberFormatting
	)
}

// Raw number versions for export (no formatting)
// Matches formatCurrency logic exactly: preserve decimals when roundToWhole is false

// Helper function for rounding raw prices for export
function roundPriceForExport(rawPrice, roundToWhole = false) {
	if (rawPrice < 1) {
		return parseFloat(rawPrice.toFixed(2)) // Always show decimals for small prices
	}
	if (rawPrice < 1000) {
		if (roundToWhole) {
			return Math.round(rawPrice)
		}
		// Preserve decimals like formatCurrency does
		return parseFloat(rawPrice.toFixed(2))
	}
	// For large numbers (>= 1000), always round
	return Math.round(rawPrice)
}

export function buyUnitPriceRaw(
	price,
	priceMultiplier,
	roundToWhole = false,
	processingCost = 0
) {
	return roundPriceForExport(
		shopBuyUnit(price, priceMultiplier, processingCost),
		roundToWhole
	)
}

export function sellUnitPriceRaw(
	price,
	priceMultiplier,
	sellMargin,
	roundToWhole = false,
	processingCost = 0
) {
	return roundPriceForExport(
		shopBuyUnit(price, priceMultiplier, processingCost) * sellMargin,
		roundToWhole
	)
}

export function buyStackPriceRaw(
	price,
	stack,
	priceMultiplier,
	roundToWhole = false,
	stackProcessingCost = 0
) {
	return roundPriceForExport(
		shopBuyStack(price, stack, priceMultiplier, stackProcessingCost),
		roundToWhole
	)
}

export function sellStackPriceRaw(
	price,
	stack,
	priceMultiplier,
	sellMargin,
	roundToWhole = false,
	stackProcessingCost = 0
) {
	return roundPriceForExport(
		shopBuyStack(price, stack, priceMultiplier, stackProcessingCost) * sellMargin,
		roundToWhole
	)
}

/**
 * Get the effective price for an item with version inheritance support
 * @param {Object} item - The item object
 * @param {string} version - Version key (e.g., "1_16")
 * @returns {number} - The effective price
 */
export function getEffectivePrice(item, version = OLDEST_VERSION_KEY) {
	// Normalize prices_by_version to handle mixed version key formats
	const normalizedPrices = {}
	if (item.prices_by_version) {
		Object.entries(item.prices_by_version).forEach(([key, value]) => {
			const normalizedKey = versionToKey(key)
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
		const sortedVersions = Object.keys(normalizedPrices).sort((a, b) => compareVersions(b, a))

		for (const availableVersion of sortedVersions) {
			if (compareVersions(availableVersion, version) <= 0) {
				return extractPriceValue(normalizedPrices[availableVersion])
			}
		}
	}

	// Final fallback to legacy price field
	return item.price || 0
}

function normalizeRecipe(recipe) {
	if (!recipe) return null
	const ingredients = Array.isArray(recipe) ? recipe : recipe.ingredients
	const outputCount = Array.isArray(recipe) ? 1 : recipe.output_count || 1
	if (!ingredients || !Array.isArray(ingredients)) return null
	return {
		ingredients,
		output_count: outputCount,
		process: Array.isArray(recipe) ? undefined : recipe.process
	}
}

/**
 * Resolve the recipe for an item at a version, falling back to earlier versions.
 * @param {Object} item
 * @param {string} version - Version key (e.g. "1_16")
 * @returns {Object|null} { ingredients, output_count, process }
 */
export function getResolvedRecipe(item, version = OLDEST_VERSION_KEY) {
	if (!item?.recipes_by_version || typeof item.recipes_by_version !== 'object') {
		return null
	}

	const versionKey = versionToKey(version)
	let recipe = item.recipes_by_version[versionKey]
	if (!recipe) {
		const sortedVersions = Object.keys(item.recipes_by_version).sort((a, b) =>
			compareVersions(b, a)
		)
		for (const availableVersion of sortedVersions) {
			if (compareVersions(availableVersion, versionKey) <= 0) {
				recipe = item.recipes_by_version[availableVersion]
				break
			}
		}
	}

	return normalizeRecipe(recipe)
}

/**
 * @param {Object|null} recipe
 * @returns {boolean}
 */
export function isSmeltingRecipe(recipe) {
	return recipe?.process === 'smelting'
}

/**
 * Crafting vs smelting process for cost and icons.
 * Missing process + dynamic → crafting. Static with no recipe → null.
 * @param {Object} item
 * @param {string} version - Version key or dotted version
 * @returns {'crafting'|'smelting'|null}
 */
export function getRecipeProcess(item, version = OLDEST_VERSION_KEY) {
	const recipe = getResolvedRecipe(item, version)
	if (recipe?.process === 'smelting' || recipe?.process === 'crafting') {
		return recipe.process
	}
	if (item?.pricing_type === 'dynamic') {
		return 'crafting'
	}
	return null
}

export function clampProcessingCost(value) {
	const num = Number(value)
	if (!Number.isFinite(num)) return 0
	return Math.min(100, Math.max(0, num))
}

function isProcessCostEnabled(costConfig, enabledKey) {
	if (costConfig[enabledKey] !== undefined) return costConfig[enabledKey] === true
	return costConfig.processingCostEnabled === true
}

/**
 * Flat crafting/smelting cost for an item (full sitting fee / per-item smelt fee).
 * Not scaled by Buy ×.
 * @param {Object} item
 * @param {string} version
 * @param {Object} [costConfig]
 * @returns {number}
 */
export function getProcessingCostAmount(item, version, costConfig = {}) {
	const process = getRecipeProcess(item, version)
	if (!process) return 0
	if (process === 'smelting') {
		if (!isProcessCostEnabled(costConfig, 'smeltingCostEnabled')) return 0
		return clampProcessingCost(costConfig.smeltingCost)
	}
	if (!isProcessCostEnabled(costConfig, 'craftingCostEnabled')) return 0
	return clampProcessingCost(costConfig.craftingCost)
}

/**
 * Processing cost to add on a single unit buy.
 * Crafting: one craft’s fee split across output_count.
 * Smelting: full fee per unit.
 * @param {Object} item
 * @param {string} version
 * @param {Object} [costConfig]
 * @returns {number}
 */
export function getUnitProcessingCost(item, version, costConfig = {}) {
	const amount = getProcessingCostAmount(item, version, costConfig)
	if (!amount) return 0
	if (getRecipeProcess(item, version) !== 'crafting') return amount
	const recipe = getResolvedRecipe(item, version)
	const outputCount = Number(recipe?.output_count)
	const n = Number.isFinite(outputCount) && outputCount > 0 ? outputCount : 1
	return amount / n
}

/**
 * Processing cost to add on a stack buy (not unit fee × stack).
 * Crafting: fee once for the whole stack.
 * Smelting: full fee × stack.
 * @param {Object} item
 * @param {string} version
 * @param {Object} [costConfig]
 * @param {number} [stack]
 * @returns {number}
 */
export function getStackProcessingCost(item, version, costConfig = {}, stack = 64) {
	const amount = getProcessingCostAmount(item, version, costConfig)
	if (!amount) return 0
	if (getRecipeProcess(item, version) === 'crafting') return amount
	const stackSize = Number(stack)
	const n = Number.isFinite(stackSize) && stackSize > 0 ? stackSize : 64
	return amount * n
}

function processingCostConfigKey(costConfig = {}) {
	return [
		costConfig.craftingCostEnabled,
		costConfig.smeltingCostEnabled,
		costConfig.craftingCost,
		costConfig.smeltingCost,
		costConfig.processingCostEnabled
	].join('|')
}

/**
 * @param {Array|Map} allItems
 * @returns {Map<string, Object>|null}
 */
export function toItemsByMaterialId(allItems) {
	if (!allItems) return null
	if (allItems instanceof Map) return allItems
	const map = new Map()
	for (const item of allItems) {
		if (item?.material_id) map.set(item.material_id, item)
	}
	return map
}

/**
 * Material portion of listed unit buy (Buy × applied; nested craft/smelt fees chained).
 * Dynamic items live-walk the recipe using ingredient shop unit prices.
 * @param {Object} item
 * @param {string} version
 * @param {number} [priceMultiplier]
 * @param {Object} [costConfig]
 * @param {Array|Map} [allItems]
 * @param {Map} [memo]
 * @param {Set} [visited]
 * @returns {number}
 */
export function getShopMaterialUnitPrice(
	item,
	version,
	priceMultiplier = 1,
	costConfig = {},
	allItems = null,
	memo = null,
	visited = null
) {
	const versionKey = versionToKey(version)
	const mult = Number(priceMultiplier) || 1
	const id = item?.material_id
	const cache = memo ?? null
	const memoKey = id
		? `${id}|${versionKey}|${mult}|${processingCostConfigKey(costConfig)}|material`
		: null
	if (memoKey && cache?.has(memoKey)) return cache.get(memoKey)

	const fallback = () => getEffectivePrice(item, versionKey) * mult
	const recipe =
		item?.pricing_type === 'dynamic' ? getResolvedRecipe(item, versionKey) : null
	const itemsById = toItemsByMaterialId(allItems)

	let material = fallback()
	if (recipe?.ingredients?.length && itemsById?.size && id) {
		const visiting = visited ?? new Set()
		if (visiting.has(id)) {
			material = fallback()
		} else {
			visiting.add(id)
			let total = 0
			let complete = true
			for (const ingredient of recipe.ingredients) {
				const ingredientItem = itemsById.get(ingredient.material_id)
				if (!ingredientItem) {
					complete = false
					break
				}
				const qty = Number(ingredient.quantity) || 0
				total +=
					getShopBuyPrice(
						ingredientItem,
						versionKey,
						mult,
						costConfig,
						itemsById,
						cache,
						visiting
					) * qty
			}
			visiting.delete(id)
			if (complete) {
				const outputCount = Number(recipe.output_count)
				const n = Number.isFinite(outputCount) && outputCount > 0 ? outputCount : 1
				material = total / n
			}
		}
	}

	if (memoKey && cache) cache.set(memoKey, material)
	return material
}

/**
 * Listed unit buy: chained materials + this item’s unit processing cost.
 * @param {Object} item
 * @param {string} version
 * @param {number} [priceMultiplier]
 * @param {Object} [costConfig]
 * @param {Array|Map} [allItems]
 * @param {Map} [memo]
 * @param {Set} [visited]
 * @returns {number}
 */
export function getShopBuyPrice(
	item,
	version,
	priceMultiplier = 1,
	costConfig = {},
	allItems = null,
	memo = null,
	visited = null
) {
	const versionKey = versionToKey(version)
	const mult = Number(priceMultiplier) || 1
	const id = item?.material_id
	const cache = memo ?? null
	const memoKey = id
		? `${id}|${versionKey}|${mult}|${processingCostConfigKey(costConfig)}|unit`
		: null
	if (memoKey && cache?.has(memoKey)) return cache.get(memoKey)

	const material = getShopMaterialUnitPrice(
		item,
		versionKey,
		mult,
		costConfig,
		allItems,
		cache,
		visited
	)
	const result = material + getUnitProcessingCost(item, versionKey, costConfig)
	if (memoKey && cache) cache.set(memoKey, result)
	return result
}

/**
 * Listed stack buy: chained materials × stack + stack processing cost.
 * @param {Object} item
 * @param {string} version
 * @param {number} [priceMultiplier]
 * @param {Object} [costConfig]
 * @param {Array|Map} [allItems]
 * @param {Map} [memo]
 * @param {Set} [visited]
 * @returns {number}
 */
export function getShopBuyStackPrice(
	item,
	version,
	priceMultiplier = 1,
	costConfig = {},
	allItems = null,
	memo = null,
	visited = null
) {
	const versionKey = versionToKey(version)
	const stack = Number(item?.stack)
	const stackSize = Number.isFinite(stack) && stack > 0 ? stack : 64
	const material = getShopMaterialUnitPrice(
		item,
		versionKey,
		priceMultiplier,
		costConfig,
		allItems,
		memo,
		visited
	)
	return (
		material * stackSize +
		getStackProcessingCost(item, versionKey, costConfig, stackSize)
	)
}

export function getProcessingCostConfig(economyOrExportConfig = {}) {
	return {
		craftingCostEnabled: isProcessCostEnabled(economyOrExportConfig, 'craftingCostEnabled'),
		smeltingCostEnabled: isProcessCostEnabled(economyOrExportConfig, 'smeltingCostEnabled'),
		craftingCost: economyOrExportConfig.craftingCost ?? 2,
		smeltingCost: economyOrExportConfig.smeltingCost ?? 3
	}
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
export function calculateRecipePrice(item, allItems, version = OLDEST_VERSION_KEY, visited = new Set()) {
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
		const sortedVersions = Object.keys(item.recipes_by_version).sort((a, b) =>
			compareVersions(b, a)
		)
		for (const availableVersion of sortedVersions) {
			if (compareVersions(availableVersion, version) <= 0) {
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
 * Calculate profit margin percentage
 * @param {number} buyPrice - Buy price
 * @param {number} sellPrice - Sell price
 * @returns {number|null} Profit margin percentage or null if invalid
 */
export function calculateProfitMargin(buyPrice, sellPrice) {
	const b = Number(buyPrice)
	const s = Number(sellPrice)
	if (!Number.isFinite(b) || !Number.isFinite(s) || b <= 0 || s <= 0) return null
	const profit = b - s
	const margin = (profit / b) * 100
	return margin
}

/**
 * Format price for display
 * @param {number|null|undefined} price - Price to format
 * @returns {string} Formatted price or '—' if invalid
 */
export function formatPrice(price) {
	if (price !== null && price !== undefined && price !== 0) {
		const formatted = price.toFixed(2)
		return parseFloat(formatted).toString()
	}
	return '—'
}

/**
 * Format profit margin for display
 * @param {number|null} margin - Profit margin percentage
 * @returns {string} Formatted margin or '—' if invalid
 */
export function formatProfitMargin(margin) {
	return margin !== null ? `${margin.toFixed(1)}%` : '—'
}

// Price memoization cache
const priceCache = new Map()
const cacheStats = {
	hits: 0,
	misses: 0,
	size: 0
}

/**
 * Clear the price cache
 */
export function clearPriceCache() {
	priceCache.clear()
	cacheStats.hits = 0
	cacheStats.misses = 0
	cacheStats.size = 0
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
	return { ...cacheStats, size: priceCache.size }
}

/**
 * Memoized version of getEffectivePrice
 * @param {Object} item - The item object
 * @param {string} version - Version key (e.g., "1_16")
 * @returns {number} - The effective price
 */
export function getEffectivePriceMemoized(item, version = OLDEST_VERSION_KEY) {
	// Create cache key from item properties that affect price calculation
	const cacheKey = `${item.id || item.material_id}-${version}-${
		item.prices_by_version ? JSON.stringify(item.prices_by_version) : 'no-prices'
	}-${item.price || 0}`

	if (priceCache.has(cacheKey)) {
		cacheStats.hits++
		return priceCache.get(cacheKey)
	}

	cacheStats.misses++
	const price = getEffectivePrice(item, version)
	priceCache.set(cacheKey, price)
	cacheStats.size = priceCache.size

	return price
}

/**
 * Recalculate prices for all items with dynamic pricing for a specific version
 * @param {Array} allItems - Array of all items
 * @param {string} version - Version key (e.g., "1_16")
 * @returns {Object} - { success: Array, failed: Array, summary: Object }
 */
export function recalculateDynamicPrices(allItems, version = OLDEST_VERSION_KEY) {
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

	const selectedVersion = keyToVersion(version)

	// Helper function to check if item should be shown for selected version
	function shouldShowItemForVersion(item) {
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

	// Find all items with dynamic pricing that are available in the selected version
	const dynamicItems = allItems.filter(
		(item) => item.pricing_type === 'dynamic' && shouldShowItemForVersion(item)
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

// ============================================================================
// Diamond Currency Utility Functions
// ============================================================================

/**
 * Common Minecraft quantities for rounding diamond ratios
 */
const COMMON_QUANTITIES = [1, 2, 4, 6, 8, 16, 32, 48, 64, 128, 192, 256, 320, 384, 448, 512, 576, 640, 704, 768, 832, 896, 960, 1024, 1152, 1280, 1408, 1536, 1600, 1664, 1728, 1792, 1920, 2048, 2176, 2304, 2432, 2560, 2688, 2816, 2944, 3072, 3200, 3328, 3456] // 1728 = shulker size

/**
 * Round a number to the nearest common Minecraft quantity
 * @param {number} value - The value to round
 * @param {string} direction - 'nearest' | 'up' | 'down'
 * @returns {number} Rounded value
 */
export function roundToCommonQuantity(value, direction = 'nearest') {
	if (value <= 0) return 1

	let rounded

	if (direction === 'up') {
		// Round up to next common quantity
		rounded = COMMON_QUANTITIES.find((qty) => qty >= value) || COMMON_QUANTITIES[COMMON_QUANTITIES.length - 1]
	} else if (direction === 'down') {
		// Round down to previous common quantity
		const reversed = [...COMMON_QUANTITIES].reverse()
		rounded = reversed.find((qty) => qty <= value) || 1
	} else {
		// Round to nearest
		rounded = COMMON_QUANTITIES.reduce((prev, curr) => {
			return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
		})
	}

	return rounded
}

/**
 * Calculate diamond ratio from item prices
 * @param {number} itemPrice - The item's price
 * @param {number} diamondPrice - The diamond item's price
 * @param {string} roundingDirection - 'nearest' | 'up' | 'down'
 * @returns {{ diamonds: number, quantity: number }} Ratio object
 */
export function calculateDiamondRatio(itemPrice, diamondPrice, roundingDirection = 'nearest') {
	if (!itemPrice || !diamondPrice || itemPrice <= 0 || diamondPrice <= 0) {
		return { diamonds: 0, quantity: 1 }
	}

	// Calculate raw ratio: how many items per diamond
	const rawRatio = diamondPrice / itemPrice

	let diamonds, quantity

	if (rawRatio >= 1) {
		// Item is cheaper than diamond: calculate items per diamond and round to common quantity
		// Example: diamond=280, item=10, ratio=28, round to 32 → "1 diamond per 32 items"
		const itemsPerDiamond = rawRatio
		quantity = roundToCommonQuantity(itemsPerDiamond, roundingDirection)
		diamonds = 1
	} else {
		// Item is more expensive than diamond: "X diamonds per 1 item"
		// Round the number of diamonds to whole number
		const diamondsPerItem = 1 / rawRatio
		diamonds = Math.round(diamondsPerItem)
		quantity = 1
	}

	return { diamonds, quantity }
}

/**
 * Format diamond ratio for compact display (e.g., "1 per 32", "7 per 1")
 * @param {number} diamonds - Number of diamonds
 * @param {number} quantity - Quantity of items
 * @returns {string} Compact ratio string
 */
export function formatDiamondRatio(diamonds, quantity) {
	if (diamonds === 0 || quantity === 0) return '—'

	// For shulker boxes, check if quantity is a multiple of 27 (shulker has 27 slots)
	// This covers both 1728 (27×64) and 27 (27×1) cases
	if (quantity % 27 === 0 && quantity >= 27) {
		// Check if it's a standard shulker capacity (27 slots × common stack sizes)
		const stackSize = quantity / 27
		const commonStackSizes = [1, 16, 64] // Common Minecraft stack sizes
		if (commonStackSizes.includes(stackSize)) {
			return diamonds.toString()
		}
	}

	if (quantity === 1) {
		return `${diamonds} per 1`
	}

	return `${diamonds} per ${quantity}`
}

/**
 * Format diamond ratio for full display in tooltips
 * @param {number} diamonds - Number of diamonds
 * @param {number} quantity - Quantity of items
 * @param {string} itemName - Name of the item
 * @returns {string} Full ratio string
 */
export function formatDiamondRatioFull(diamonds, quantity, itemName) {
	if (diamonds === 0 || quantity === 0) return '—'

	const itemText = quantity === 1 ? itemName : `${quantity} ${itemName}`
	const diamondText = diamonds === 1 ? 'diamond' : 'diamonds'

	if (quantity === 1) {
		return `${diamonds} ${diamondText} per 1 ${itemName}`
	}

	return `${diamonds} ${diamondText} per ${itemText}`
}

/**
 * Get diamond pricing for an item (buy and sell ratios)
 * @param {Object} item - The item object
 * @param {Object} diamondItem - The diamond item object
 * @param {string} version - Version key (e.g., "1_16")
 * @param {number} sellMargin - Sell margin multiplier
 * @param {string} roundingDirection - 'nearest' | 'up' | 'down'
 * @returns {Object} Pricing object with buy/sell ratios
 */
export function getDiamondPricing(
	item,
	diamondItem,
	version,
	sellMargin = 0.3,
	roundingDirection = 'nearest',
	itemPriceOverride = null
) {
	if (!item || !diamondItem) {
		return {
			buy: { diamonds: 0, quantity: 1 },
			sell: { diamonds: 0, quantity: 1 }
		}
	}

	const versionKey = versionToKey(version)
	const itemPrice =
		itemPriceOverride != null ? itemPriceOverride : getEffectivePrice(item, versionKey)
	const diamondPrice = getEffectivePrice(diamondItem, versionKey)

	// Calculate buy ratio (using item price directly)
	const buyRatio = calculateDiamondRatio(itemPrice, diamondPrice, roundingDirection)

	// Calculate sell ratio (using item price * sellMargin)
	const sellItemPrice = itemPrice * sellMargin
	const sellRatio = calculateDiamondRatio(sellItemPrice, diamondPrice, roundingDirection)

	return {
		buy: buyRatio,
		sell: sellRatio
	}
}

/**
 * Calculate shulker pricing based on item stack size
 * A shulker box has 27 slots, so capacity = 27 × stack size
 * @param {Object} item - The item object
 * @param {Object} diamondItem - The diamond item object
 * @param {string} version - Version key
 * @param {number} sellMargin - Sell margin multiplier
 * @param {string} roundingDirection - 'nearest' | 'up' | 'down'
 * @param {number|null} [stackBuyPriceOverride] - Full stack buy price (materials + stack fee)
 * @returns {Object} Shulker pricing object
 */
export function getDiamondShulkerPricing(
	item,
	diamondItem,
	version,
	sellMargin = 0.3,
	roundingDirection = 'nearest',
	stackBuyPriceOverride = null
) {
	if (!item || !diamondItem) {
		return {
			buy: { diamonds: 0, quantity: 1728 },
			sell: { diamonds: 0, quantity: 1728 }
		}
	}

	const versionKey = versionToKey(version)
	const stackSize = item.stack || 64
	const stackBuyPrice =
		stackBuyPriceOverride != null
			? stackBuyPriceOverride
			: getEffectivePrice(item, versionKey) * stackSize
	const diamondPrice = getEffectivePrice(diamondItem, versionKey)

	// Calculate shulker capacity: 27 slots × stack size
	const SHULKER_CAPACITY = 27 * stackSize

	// 27 stacks; stack buy already includes once-per-stack crafting fee
	const shulkerBuyPrice = stackBuyPrice * 27
	const shulkerSellPrice = stackBuyPrice * sellMargin * 27

	// Calculate how many diamonds for a shulker
	const buyDiamonds = Math.round(shulkerBuyPrice / diamondPrice)
	const sellDiamonds = Math.round(shulkerSellPrice / diamondPrice)

	// Round to whole diamonds
	const buyRatio = {
		diamonds: buyDiamonds || 1,
		quantity: SHULKER_CAPACITY
	}

	const sellRatio = {
		diamonds: sellDiamonds || 1,
		quantity: SHULKER_CAPACITY
	}

	return {
		buy: buyRatio,
		sell: sellRatio
	}
}