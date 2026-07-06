import { getEffectivePriceMemoized } from './pricing.js'
import { isVersionLessOrEqual, versionToKey } from '../constants/minecraftVersions.js'

export { isVersionLessOrEqual } from '../constants/minecraftVersions.js'

export {
	SEARCH_INPUT_TIP,
	processSearchTerms,
	hasActiveSearchTerms,
	countSearchTerms,
	textMatchesSearch,
	filterItemsBySearch
} from './search.js'

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

	const versionKey = versionToKey(selectedVersion)

	return items.filter((item) => {
		// Filter out items with null/empty categories (client-side filtering)
		if (!item.category || item.category.trim() === '') {
			return false
		}

		// Admin users see all items (except those with 0 prices)
		if (user?.email) {
			const effectivePrice = getEffectivePriceMemoized(item, versionKey)
			return effectivePrice && effectivePrice !== 0
		}

		// Non-admin users need images and valid prices
		if (!item.image || item.image.trim() === '') {
			return false
		}

		const effectivePrice = getEffectivePriceMemoized(item, versionKey)
		return effectivePrice && effectivePrice !== 0
	})
}
