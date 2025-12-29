/**
 * Get display item image from a reward document
 * @param {Object} rewardDoc - The reward document
 * @param {Function} getItemById - Function to get item by ID
 * @returns {string|null} Image URL or null
 */
export function getDisplayItemImageFromDoc(rewardDoc, getItemById) {
	if (rewardDoc.display_item) {
		const displayItem = getItemById(rewardDoc.display_item)
		if (displayItem?.image) {
			return displayItem.image
		}
	}
	return null
}

/**
 * Get item name with fallback to display name
 * @param {string} itemId - Item ID
 * @param {Object|null} rewardItem - Reward item object (optional)
 * @param {Function} getItemById - Function to get item by ID
 * @returns {string} Item name
 */
export function getItemName(itemId, rewardItem, getItemById) {
	const item = getItemById(itemId)
	const name = rewardItem?.display_name || item?.name || 'Unknown Item'
	return stripColorCodes(name)
}

/**
 * Check if a reward document represents a multi-item reward
 * @param {Object} rewardDoc - The reward document
 * @returns {boolean} True if reward has multiple items
 */
export function isMultiItemReward(rewardDoc) {
	return rewardDoc.items && rewardDoc.items.length > 1
}

/**
 * Check if a reward document can be edited
 * @param {Object} rewardDoc - The reward document
 * @returns {boolean} True if reward can be edited (single-item only)
 */
export function canEditReward(rewardDoc) {
	// Can edit if single-item reward
	return !rewardDoc.items || rewardDoc.items.length <= 1
}

/**
 * Strip color codes from text
 * Removes both <color> format (e.g., <red>, <blue>) and § format (e.g., §c, §4)
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export function stripColorCodes(text) {
	if (!text) return ''

	// Remove <color> format (e.g., <red>, <blue>, <#ff0000>)
	let cleaned = text.replace(/<[^>]*>/g, '')

	// Remove § format color codes (e.g., §c, §4, §r)
	cleaned = cleaned.replace(/§[0-9a-fk-or]/gi, '')

	return cleaned.trim()
}



