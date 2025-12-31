import { extractEnchantmentName } from './image.js'

/**
 * Check if an item can accept enchantments.
 * An item is enchantable if:
 * 1. It has enchantCategories array with length > 0
 * 2. The enchantable flag is not explicitly false
 *
 * @param {Object} item - The item to check
 * @returns {boolean} - True if item can be enchanted
 */
export function isItemEnchantable(item) {
	// Must have enchantCategories
	if (!item.enchantCategories || !Array.isArray(item.enchantCategories) || item.enchantCategories.length === 0) {
		return false
	}
	// Check explicit enchantable flag (defaults to true if not set)
	return item.enchantable !== false
}

/**
 * Filter enchantment list to only show compatible enchantments for an item.
 * Returns an array of enchanted book items that can be applied to the target item.
 *
 * @param {Object} item - The target item to check compatibility against
 * @param {Array<Object>} allEnchantmentItems - Array of all enchanted book items
 * @returns {Array<Object>} - Filtered array of compatible enchantment items
 */
export function getCompatibleEnchantments(item, allEnchantmentItems) {
	if (!isItemEnchantable(item)) return []

	const itemCategories = item.enchantCategories || []
	return allEnchantmentItems.filter((enchItem) => {
		const enchCategory = enchItem.enchantment_category
		return enchCategory && itemCategories.includes(enchCategory)
	})
}

/**
 * Check if a specific enchantment can be applied to an item.
 *
 * @param {Object} enchantmentItem - The enchanted book item to check
 * @param {Object} targetItem - The target item to check compatibility against
 * @returns {boolean} - True if enchantment is compatible with item
 */
export function isEnchantmentCompatibleWithItem(enchantmentItem, targetItem) {
	if (!isItemEnchantable(targetItem)) return false
	if (!enchantmentItem.enchantment_category) return false

	return targetItem.enchantCategories.includes(enchantmentItem.enchantment_category)
}

/**
 * Check if adding an enchantment would conflict with existing enchantments.
 * Checks for mutual exclusion rules (e.g., Sharpness vs Smite, Protection types, etc.).
 *
 * @param {string} newEnchantment - Document ID of the new enchantment to add
 * @param {Array<string>} existingEnchantments - Array of document IDs of existing enchantments
 * @param {Array<Object>} allEnchantmentItems - Array of all enchanted book items
 * @returns {boolean} - True if there is a conflict
 */
export function hasEnchantmentConflict(newEnchantment, existingEnchantments, allEnchantmentItems) {
	// Get the new enchantment item
	const newEnchItem = allEnchantmentItems.find((e) => e.id === newEnchantment)
	if (!newEnchItem) return false

	// Extract enchantment names from existing enchantment IDs
	const existingEnchNames = existingEnchantments
		.map((enchId) => {
			const enchItem = allEnchantmentItems.find((e) => e.id === enchId)
			return enchItem ? extractEnchantmentName(enchItem.material_id) : null
		})
		.filter(Boolean)

	// Check if new enchantment excludes any existing enchantments
	if (newEnchItem.enchantment_exclude && Array.isArray(newEnchItem.enchantment_exclude)) {
		const conflicts = newEnchItem.enchantment_exclude.filter((excludedName) =>
			existingEnchNames.some((name) => name === excludedName)
		)
		if (conflicts.length > 0) return true
	}

	// Check reverse: if any existing enchantment excludes the new one
	const newEnchName = extractEnchantmentName(newEnchItem.material_id)
	if (newEnchName) {
		for (const existingId of existingEnchantments) {
			const existingEnchItem = allEnchantmentItems.find((e) => e.id === existingId)
			if (
				existingEnchItem?.enchantment_exclude &&
				Array.isArray(existingEnchItem.enchantment_exclude) &&
				existingEnchItem.enchantment_exclude.includes(newEnchName)
			) {
				return true
			}
		}
	}

	return false
}

/**
 * Get user-friendly message explaining why an enchantment conflicts.
 *
 * @param {string} newEnchantment - Document ID of the new enchantment to add
 * @param {Array<string>} existingEnchantments - Array of document IDs of existing enchantments
 * @param {Array<Object>} allEnchantmentItems - Array of all enchanted book items
 * @returns {string|null} - Descriptive error message, or null if no conflict
 */
export function getEnchantmentConflictReason(newEnchantment, existingEnchantments, allEnchantmentItems) {
	// Get the new enchantment item
	const newEnchItem = allEnchantmentItems.find((e) => e.id === newEnchantment)
	if (!newEnchItem) return null

	const newEnchName = extractEnchantmentName(newEnchItem.material_id)
	if (!newEnchName) return null

	// Format enchantment name for display (e.g., "sharpness" -> "Sharpness")
	const formatEnchantName = (name) => {
		return name
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ')
	}

	const formattedNewName = formatEnchantName(newEnchName)

	// Extract enchantment names from existing enchantment IDs
	const existingEnchNames = existingEnchantments
		.map((enchId) => {
			const enchItem = allEnchantmentItems.find((e) => e.id === enchId)
			return enchItem ? extractEnchantmentName(enchItem.material_id) : null
		})
		.filter(Boolean)

	// Check if new enchantment excludes any existing enchantments
	if (newEnchItem.enchantment_exclude && Array.isArray(newEnchItem.enchantment_exclude)) {
		const conflicts = newEnchItem.enchantment_exclude.filter((excludedName) =>
			existingEnchNames.some((name) => name === excludedName)
		)
		if (conflicts.length > 0) {
			const conflictNames = conflicts.map(formatEnchantName).join(', ')
			return `Cannot combine ${formattedNewName} with ${conflictNames}`
		}
	}

	// Check reverse: if any existing enchantment excludes the new one
	for (const existingId of existingEnchantments) {
		const existingEnchItem = allEnchantmentItems.find((e) => e.id === existingId)
		if (
			existingEnchItem?.enchantment_exclude &&
			Array.isArray(existingEnchItem.enchantment_exclude) &&
			existingEnchItem.enchantment_exclude.includes(newEnchName)
		) {
			const existingEnchName = extractEnchantmentName(existingEnchItem.material_id)
			if (existingEnchName) {
				const formattedExistingName = formatEnchantName(existingEnchName)
				return `Cannot combine ${formattedExistingName} with ${formattedNewName}`
			}
		}
	}

	return null
}
