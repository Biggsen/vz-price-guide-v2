/**
 * Shared export data generation utilities.
 * Single source of truth for both direct (ExportModal) and donation (ExportSuccessView) exports.
 */

import {
	getEffectivePrice,
	buyUnitPriceRaw,
	sellUnitPriceRaw,
	buyStackPriceRaw,
	sellStackPriceRaw,
	getDiamondPricing,
	getDiamondShulkerPricing
} from './pricing.js'

/**
 * Generates export data from items and config.
 *
 * @param {Array} items - Array of item objects to export
 * @param {Object} config - Export configuration
 * @param {string} config.version - Minecraft version (e.g., '1.21')
 * @param {Array<string>} config.priceFields - Price fields to include ['unit_buy', 'unit_sell', 'stack_buy', 'stack_sell']
 * @param {boolean} config.roundToWhole - Whether to round prices to whole numbers
 * @param {boolean} config.includeMetadata - Whether to include item metadata (name, category, stack)
 * @param {number} config.priceMultiplier - Price multiplier (default: 1)
 * @param {number} config.sellMargin - Sell margin (default: 0.3)
 * @param {string} config.currencyType - Currency type: 'money' or 'diamond'
 * @param {Object|null} config.diamondItem - Diamond item for ratio calculations (required if currencyType is 'diamond')
 * @param {string} config.diamondRoundingDirection - Diamond rounding: 'nearest', 'up', or 'down'
 * @param {string} config.sortField - Sort field used (for metadata)
 * @param {string} config.sortDirection - Sort direction used (for metadata)
 * @param {boolean} config.isDonation - Whether this export is from a donation flow
 * @returns {Object} Export data object ready for serialization
 */
export function generateExportData(items, config) {
	const {
		version,
		priceFields = ['unit_buy', 'unit_sell', 'stack_buy', 'stack_sell'],
		roundToWhole = false,
		includeMetadata = false,
		priceMultiplier = 1,
		sellMargin = 0.3,
		currencyType = 'money',
		diamondItem = null,
		diamondRoundingDirection = 'nearest',
		sortField = 'default',
		sortDirection = 'asc',
		isDonation = false
	} = config

	const versionKey = version.replace('.', '_')
	const isDiamondCurrency = currencyType === 'diamond' && diamondItem !== null
	const data = {}

	items.forEach((item) => {
		const basePrice = getEffectivePrice(item, versionKey)
		const stackSize = item.stack || 64
		const itemData = {}

		// Add item metadata if requested
		if (includeMetadata) {
			itemData.name = item.name
			itemData.category = item.category
			itemData.stack = stackSize
		}

		// Handle diamond currency vs money currency differently
		if (isDiamondCurrency) {
			// Diamond currency: export ratio objects with simpler property names
			const diamondPricing = getDiamondPricing(
				item,
				diamondItem,
				versionKey,
				sellMargin,
				diamondRoundingDirection
			)
			const shulkerPricing = getDiamondShulkerPricing(
				item,
				diamondItem,
				versionKey,
				sellMargin,
				diamondRoundingDirection
			)

			if (priceFields.includes('unit_buy')) {
				itemData.buy = diamondPricing.buy
			}
			if (priceFields.includes('unit_sell')) {
				itemData.sell = diamondPricing.sell
			}
			if (priceFields.includes('stack_buy')) {
				itemData.shulker_buy = shulkerPricing.buy
			}
			if (priceFields.includes('stack_sell')) {
				itemData.shulker_sell = shulkerPricing.sell
			}
		} else {
			// Money currency: export raw numbers with existing property names
			if (priceFields.includes('unit_buy')) {
				itemData.unit_buy = buyUnitPriceRaw(basePrice, priceMultiplier, roundToWhole)
			}
			if (priceFields.includes('unit_sell')) {
				itemData.unit_sell = sellUnitPriceRaw(
					basePrice,
					priceMultiplier,
					sellMargin,
					roundToWhole
				)
			}
			if (priceFields.includes('stack_buy')) {
				itemData.stack_buy = buyStackPriceRaw(
					basePrice,
					stackSize,
					priceMultiplier,
					roundToWhole
				)
			}
			if (priceFields.includes('stack_sell')) {
				itemData.stack_sell = sellStackPriceRaw(
					basePrice,
					stackSize,
					priceMultiplier,
					sellMargin,
					roundToWhole
				)
			}
		}

		data[item.material_id] = itemData
	})

	// Add export metadata
	data._export_metadata = {
		source: "Verzion's Economy Price Guide",
		url: 'https://minecraft-economy-price-guide.net',
		version: version,
		export_date: new Date().toISOString(),
		item_count: items.length,
		currency_type: currencyType,
		price_multiplier: priceMultiplier,
		sell_margin: sellMargin,
		round_to_whole: roundToWhole,
		sort_field: sortField,
		sort_direction: sortField === 'default' ? 'curated' : sortDirection
	}

	// Add donation flag if applicable
	if (isDonation) {
		data._export_metadata.donated = true
	}

	// Add diamond-specific metadata if applicable
	if (isDiamondCurrency) {
		data._export_metadata.diamond_item_id = diamondItem.material_id
		data._export_metadata.diamond_rounding_direction = diamondRoundingDirection
	}

	return data
}

/**
 * Serializes export data to a JSON string.
 *
 * @param {Object} data - Export data object
 * @param {boolean} includeMetadata - Whether to include _export_metadata (default: true)
 * @returns {string} JSON string
 */
export function serializeJSON(data, includeMetadata = true) {
	if (!includeMetadata) {
		const { _export_metadata, ...items } = data
		return JSON.stringify(items, null, 2)
	}
	return JSON.stringify(data, null, 2)
}

/**
 * Serializes export data to a YAML string.
 * Note: This is a simple YAML generator, not a full YAML library.
 *
 * @param {Object} data - Export data object
 * @param {boolean} includeMetadata - Whether to include _export_metadata (default: false for cleaner output)
 * @returns {string} YAML string
 */
export function serializeYAML(data, includeMetadata = false) {
	let yaml = ''
	for (const [key, value] of Object.entries(data)) {
		// Skip metadata unless explicitly requested
		if (key === '_export_metadata') {
			if (!includeMetadata) continue
		}

		yaml += `${key}:\n`
		for (const [field, val] of Object.entries(value)) {
			// Handle ratio objects for diamond currency
			if (typeof val === 'object' && val !== null && 'diamonds' in val && 'quantity' in val) {
				yaml += `  ${field}:\n`
				yaml += `    diamonds: ${val.diamonds}\n`
				yaml += `    quantity: ${val.quantity}\n`
			} else {
				yaml += `  ${field}: ${val}\n`
			}
		}
		yaml += '\n'
	}
	return yaml
}

/**
 * Finds the diamond item from an items array.
 * Used by ExportSuccessView which doesn't have access to the computed diamondItem.
 *
 * @param {Array} items - Array of all items
 * @param {string|null} diamondItemId - Specific diamond item ID from config, or null
 * @returns {Object|null} Diamond item or null if not found
 */
export function findDiamondItem(items, diamondItemId = null) {
	if (!items || items.length === 0) {
		return null
	}

	if (diamondItemId) {
		return (
			items.find((item) => item.id === diamondItemId || item.material_id === 'diamond') ||
			null
		)
	}

	// Fallback: find by material_id 'diamond'
	return items.find((item) => item.material_id === 'diamond') || null
}
