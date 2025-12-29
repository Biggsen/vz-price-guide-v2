import { getEffectivePrice } from './pricing.js'

/**
 * Calculate the total value of a reward document
 * @param {Object} rewardDoc - The reward document
 * @param {Array} allItems - Array of all items from the items collection
 * @param {string} currentVersion - Current Minecraft version (e.g., '1_20')
 * @param {Function} getItemById - Function to get item by ID
 * @returns {number} Total value of the reward
 */
export function getRewardDocValue(rewardDoc, allItems, currentVersion, getItemById) {
	// Check for custom value first (works for both item-based and itemless rewards)
	if (rewardDoc.value_source === 'custom' && rewardDoc.custom_value) {
		return rewardDoc.custom_value
	}

	// For catalog-based pricing, we need items
	if (!rewardDoc.items || !rewardDoc.items.length || !allItems) return 0

	let totalValue = 0
	rewardDoc.items.forEach((item) => {
		const itemData = getItemById(item.item_id)
		if (itemData) {
			const unitPrice = getEffectivePrice(itemData, currentVersion)
			const baseValue = unitPrice * (item.quantity || 1)

			// Calculate enchantment values from item's actual enchantments
			let enchantmentValue = 0
			if (item.enchantments && Array.isArray(item.enchantments)) {
				item.enchantments.forEach((enchId) => {
					const enchItem = getItemById(enchId)
					if (enchItem) {
						enchantmentValue += getEffectivePrice(enchItem, currentVersion)
					}
				})
			}

			totalValue += baseValue + enchantmentValue
		}
	})

	return totalValue
}

/**
 * Calculate the chance percentage of a reward document
 * @param {Object} rewardDoc - The reward document
 * @param {number} totalWeight - Total weight of all rewards in the crate
 * @returns {number} Chance percentage (0-100)
 */
export function getRewardDocChance(rewardDoc, totalWeight) {
	if (!totalWeight || totalWeight === 0) return 0
	return ((rewardDoc.weight || 0) / totalWeight) * 100
}

/**
 * Get display value for a reward document
 * @param {Object} rewardDoc - The reward document
 * @param {Array} allItems - Array of all items from the items collection
 * @param {string} currentVersion - Current Minecraft version (e.g., '1_20')
 * @param {Function} getItemById - Function to get item by ID
 * @returns {string|number} Display value or 'Unknown' if value is 0
 */
export function getValueDisplay(rewardDoc, allItems, currentVersion, getItemById) {
	const value = getRewardDocValue(rewardDoc, allItems, currentVersion, getItemById)

	// Show "Unknown" if value is 0
	if (value === 0) {
		return 'Unknown'
	}

	return Math.ceil(value)
}



