/**
 * Get the appropriate image URL based on environment
 * @param {string} imageUrl - The original image URL
 * @param {Object} options - Optional parameters for image processing
 * @param {number} options.width - Image width (default: 64)
 * @param {string} options.format - Image format (default: 'webp')
 * @param {number} options.quality - Image quality (default: 70)
 * @returns {string} The processed image URL
 */
export function getImageUrl(imageUrl, options = {}) {
	const { width = 64, format = 'webp', quality = 90 } = options

	if (process.env.NODE_ENV === 'production') {
		return `/.netlify/images?url=${imageUrl}&w=${width}&fm=${format}&q=${quality}`
	}

	return imageUrl
}

/**
 * Extract enchantment name from enchanted book material_id
 * @param {string} materialId - The material_id (e.g., "enchanted_book_unbreaking_1")
 * @returns {string|null} - The enchantment name (e.g., "unbreaking") or null if not an enchanted book
 */
export function extractEnchantmentName(materialId) {
	if (!materialId || !materialId.startsWith('enchanted_book_')) {
		return null
	}

	// Remove "enchanted_book_" prefix
	const enchantmentPart = materialId.replace('enchanted_book_', '')

	// Try to extract enchantment with level first (e.g., "unbreaking_1" -> "unbreaking")
	const enchantWithLevelMatch = enchantmentPart.match(/^(.+)_(\d+)$/)
	if (enchantWithLevelMatch) {
		return enchantWithLevelMatch[1] // Return just the enchantment name
	}

	// Try to extract enchantment without level (e.g., "silk_touch" -> "silk_touch")
	const enchantWithoutLevelMatch = enchantmentPart.match(/^(.+)$/)
	if (enchantWithoutLevelMatch) {
		return enchantWithoutLevelMatch[1]
	}

	return null
}

/**
 * Generate the appropriate wiki URL for an item
 * @param {Object} item - The item object with material_id
 * @returns {string} - The wiki URL
 */
export function getWikiUrl(item) {
	if (!item?.material_id) {
		return '#'
	}

	// Check if this is an enchanted book
	const enchantmentName = extractEnchantmentName(item.material_id)
	if (enchantmentName) {
		// For enchanted books, link to the enchantment page
		return `https://minecraft.wiki/w/${enchantmentName}`
	}

	// For regular items, use the material_id
	return `https://minecraft.wiki/w/${item.material_id}`
}
