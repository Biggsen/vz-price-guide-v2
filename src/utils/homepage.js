import { getEffectivePriceMemoized } from './pricing.js'

// Version comparison utility
export function isVersionLessOrEqual(itemVersion, targetVersion) {
	if (!itemVersion || !targetVersion) return false

	const [itemMajor, itemMinor] = itemVersion.split('.').map(Number)
	const [targetMajor, targetMinor] = targetVersion.split('.').map(Number)

	if (itemMajor < targetMajor) return true
	if (itemMajor > targetMajor) return false
	return itemMinor <= targetMinor
}

// Search term processing
export function processSearchTerms(query) {
	return query
		.split(',')
		.map((term) => term.trim())
		.filter((term) => term.length > 0)
}

// Item filtering utilities
export function filterItemsBySearch(items, searchTerms) {
	if (searchTerms.length === 0) return items

	return items.filter((item) => {
		if (!item.name) return false
		const itemName = item.name.toLowerCase()
		return searchTerms.some((term) => itemName.includes(term))
	})
}

export function filterItemsByVersion(items, selectedVersion) {
	if (!items) return []
	return items.filter((item) => {
		// Check if item was removed in or before selected version
		if (
			item.version_removed &&
			isVersionLessOrEqual(item.version_removed, selectedVersion)
		) {
			return false
		}
		return true
	})
}

export function filterItemsByPriceAndImage(items, user, selectedVersion) {
	if (!items) return []

	return items.filter((item) => {
		// Filter out items with null/empty categories (client-side filtering)
		if (!item.category || item.category.trim() === '') {
			return false
		}

		// Admin users see all items (except those with 0 prices)
		if (user?.email) {
			const effectivePrice = getEffectivePriceMemoized(
				item,
				selectedVersion.replace('.', '_')
			)
			return effectivePrice && effectivePrice !== 0
		}

		// Non-admin users need images and valid prices
		if (!item.image || item.image.trim() === '') {
			return false
		}

		const effectivePrice = getEffectivePriceMemoized(
			item,
			selectedVersion.replace('.', '_')
		)
		return effectivePrice && effectivePrice !== 0
	})
}

