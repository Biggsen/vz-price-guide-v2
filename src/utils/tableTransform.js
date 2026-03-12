import { calculateProfitMargin, formatPrice, formatProfitMargin } from './pricing.js'
import { formatRelativeDate } from './date.js'

/**
 * Format pricing type label for table (server shop only)
 * @param {Object} shopItem - shop item with pricing_type (or legacy buy/sell_pricing_type)
 * @returns {string}
 */
function formatPricingType(shopItem) {
	const type =
		shopItem.pricing_type ||
		(shopItem.buy_pricing_type === 'from_recipe' || shopItem.sell_pricing_type === 'from_recipe'
			? 'from_recipe'
			: 'manual')
	if (type === 'from_recipe') return 'Recipe'
	if (type === 'base') return 'Base'
	return 'Custom'
}

/**
 * Transform shop item for table display
 * @param {Object} shopItem - Shop item object with itemData
 * @param {Object} options - Transformation options
 * @param {boolean} options.includeShop - Include shop information (for market overview)
 * @param {boolean} options.includeNotes - Include notes field (for shop items view)
 * @param {boolean} options.includeActions - Include actions field (for shop items view)
 * @param {boolean} options.includePricingTypes - Include buy/sell pricing type (server shop)
 * @returns {Object} Transformed item for table
 */
export function transformShopItemForTable(shopItem, options = {}) {
	const {
		includeShop = false,
		includeNotes = false,
		includeActions = false,
		includePricingTypes = false
	} = options
	const profitMargin = calculateProfitMargin(shopItem.buy_price, shopItem.sell_price)
	const lastUpdatedTimestamp = shopItem.last_updated
		? new Date(shopItem.last_updated).getTime()
		: 0

	const transformed = {
		id: shopItem.id,
		item: shopItem.itemData?.name || 'Unknown Item',
		image: shopItem.itemData?.image || null,
		buyPrice: formatPrice(shopItem.buy_price),
		sellPrice: formatPrice(shopItem.sell_price),
		profitMargin: formatProfitMargin(profitMargin),
		lastUpdated: formatRelativeDate(shopItem.last_updated),
		_lastUpdatedTimestamp: lastUpdatedTimestamp,
		_originalItem: shopItem,
		enchantments: Array.isArray(shopItem.enchantments) ? shopItem.enchantments : []
	}

	if (includeShop) {
		transformed.shop = shopItem.shopData?.name || 'Unknown Shop'
		transformed.shopPlayer = shopItem.shopData?.player || null
		transformed.shopLocation = shopItem.shopData?.location || null
		transformed.shopId = shopItem.shopData?.id || null
	}

	if (includeNotes) {
		transformed.notes = shopItem.notes || ''
	}

	if (includeActions) {
		transformed.actions = ''
	}

	if (includePricingTypes) {
		transformed.pricingTypes = formatPricingType(shopItem)
	}

	return transformed
}

