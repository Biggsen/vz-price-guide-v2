/**
 * Format enchantment name from enchantment ID
 * @param {string} enchantmentId - Enchantment item ID
 * @param {Function} getItemById - Function to get item by ID
 * @returns {string} Formatted enchantment name
 */
export function formatEnchantmentName(enchantmentId, getItemById) {
	if (!enchantmentId) return ''

	// Get enchantment item from allItems
	const enchantmentItem = getItemById(enchantmentId)
	if (!enchantmentItem) return enchantmentId

	// Try to extract from material_id first (most reliable)
	const materialId = enchantmentItem.material_id
	if (materialId && materialId.startsWith('enchanted_book_')) {
		// Extract enchantment name from material_id like "enchanted_book_aqua_affinity_1"
		const enchantmentPart = materialId.replace('enchanted_book_', '')

		// Try to extract enchantment with level first (e.g., "unbreaking_3" -> "unbreaking 3")
		const enchantWithLevelMatch = enchantmentPart.match(/^(.+)_(\d+)$/)
		if (enchantWithLevelMatch) {
			const enchantName = enchantWithLevelMatch[1]
			const level = enchantWithLevelMatch[2]

			// Replace underscores with spaces, then capitalize each word
			const capitalizedEnchant = enchantName
				.replace(/_/g, ' ')
				.replace(/\b\w/g, (l) => l.toUpperCase())
			return `${capitalizedEnchant} ${level}`
		}

		// Try enchantment without level (e.g., "silk_touch" -> "silk touch")
		const enchantWithoutLevelMatch = enchantmentPart.match(/^(.+)$/)
		if (enchantWithoutLevelMatch) {
			const enchantName = enchantWithoutLevelMatch[1]
			// Replace underscores with spaces, then capitalize each word
			const capitalizedEnchant = enchantName
				.replace(/_/g, ' ')
				.replace(/\b\w/g, (l) => l.toUpperCase())
			return capitalizedEnchant
		}
	}

	// Fallback: Try to extract from item name
	const itemName = enchantmentItem.name || enchantmentId

	// Expected format: "Enchanted Book (Sharpness IV)"
	const match = itemName.match(/Enchanted Book \((.+?)\s*(I|II|III|IV|V|X)?\)/)

	if (match) {
		const enchantment = match[1]
		const level = match[2]

		// Capitalize the first letter of each word in enchantment
		const capitalizedEnchantment = enchantment.replace(/\b\w/g, (l) => l.toUpperCase())

		if (level) {
			// Convert Roman numerals to numbers for consistency
			const levelMap = {
				I: '1',
				II: '2',
				III: '3',
				IV: '4',
				V: '5',
				X: '10'
			}
			const displayLevel = levelMap[level] || level
			return `${capitalizedEnchantment} ${displayLevel}`
		} else {
			// No level found, just return the enchantment name
			return capitalizedEnchantment
		}
	}

	// Final fallback - clean up the name
	return itemName
		.replace(/^enchanted book /i, '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (l) => l.toUpperCase())
}

/**
 * Extract enchantments from material_id
 * @param {string} materialId - Material ID (e.g., "enchanted_book_mending_1")
 * @returns {Array} Array of enchantment objects with id and level
 */
export function extractEnchantmentsFromMaterialId(materialId) {
	if (!materialId || !materialId.startsWith('enchanted_book_')) {
		return []
	}

	// Remove "enchanted_book_" prefix
	const enchantmentPart = materialId.replace('enchanted_book_', '')

	// Try to extract enchantment with level first (e.g., "mending_1" -> "mending:1")
	const enchantWithLevelMatch = enchantmentPart.match(/^(.+)_(\d+)$/)
	if (enchantWithLevelMatch) {
		const enchantName = enchantWithLevelMatch[1]
		const enchantLevel = parseInt(enchantWithLevelMatch[2])
		return [{ id: enchantName, level: enchantLevel }]
	}

	// Try to extract enchantment without level (e.g., "silk_touch" -> "silk_touch:1")
	const enchantWithoutLevelMatch = enchantmentPart.match(/^(.+)$/)
	if (enchantWithoutLevelMatch) {
		const enchantName = enchantWithoutLevelMatch[1]
		return [{ id: enchantName, level: 1 }]
	}

	return []
}

/**
 * Get enchantment IDs from either array or object format
 * @param {Array|Object} enchantments - Enchantments in array or object format
 * @returns {Array} Array of enchantment IDs
 */
export function getEnchantmentIds(enchantments) {
	if (!enchantments) return []

	// Handle array format (new structure)
	if (Array.isArray(enchantments)) {
		return enchantments
	}

	// Handle object format (legacy structure)
	if (typeof enchantments === 'object') {
		return Object.keys(enchantments)
	}

	return []
}



