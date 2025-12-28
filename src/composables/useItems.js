import { computed, ref, watch } from 'vue'
import { useFirestore, useCollection } from 'vuefire'
import { query, collection, orderBy, where } from 'firebase/firestore'
import { enabledCategories, baseEnabledVersions } from '../constants.js'
import { MAX_CATEGORIES_FOR_DB, LOADING_DELAY_FAST, LOADING_DELAY_SLOW, LOADING_THRESHOLD } from '../constants/homepage.js'
import { useAdmin } from '../utils/admin.js'
import {
	filterItemsByVersion,
	filterItemsByPriceAndImage,
	filterItemsBySearch,
	processSearchTerms,
	isVersionLessOrEqual
} from '../utils/homepage.js'
import { getCacheStats as getPricingCacheStats } from '../utils/pricing.js'

export function useItems(selectedVersion, visibleCategories, searchQuery) {
	const db = useFirestore()
	const { user } = useAdmin()

	// Loading state
	const isLoading = ref(true)
	const hasInitiallyLoaded = ref(false)
	const loadingStartTime = ref(Date.now())

	// Create reactive query based on selected version and categories
	const itemsQuery = computed(() => {
		const baseQuery = collection(db, 'items')

		// Build filters array
		const filters = []

		// Add version filtering - only get items available in selected version
		filters.push(where('version', '<=', selectedVersion.value))

		// Only do category filtering at DB level if we have few enough categories
		// Firestore limit is around 10-15 categories, so let's be safe with 10
		if (enabledCategories.length <= MAX_CATEGORIES_FOR_DB) {
			// If visibleCategories is empty, show all categories (no filter)
			// If visibleCategories has items, only show those specific categories
			if (visibleCategories.value.length > 0) {
				filters.push(where('category', 'in', visibleCategories.value))
			} else {
				// Empty array means all categories - add filter for all enabled categories
				filters.push(where('category', 'in', enabledCategories))
			}
		}
		// If we have too many categories, we'll filter them client-side to avoid disjunction limit

		// Note: We can't filter version_removed at DB level because:
		// 1. Firestore doesn't support != null queries
		// 2. Items with version_removed: null should be included
		// 3. Items with version_removed <= selectedVersion should be excluded
		// So we'll do this filtering client-side for now

		// Add ordering
		filters.push(orderBy('category', 'asc'))
		filters.push(orderBy('subcategory', 'asc'))
		filters.push(orderBy('name', 'asc'))

		return query(baseQuery, ...filters)
	})

	const allItemsCollection = useCollection(itemsQuery)

	// Separate query to get all items for category counts (unfiltered by category)
	const allItemsForCountsQuery = computed(() => {
		const baseQuery = collection(db, 'items')
		const filters = []

		// Keep version filtering at DB level (performance optimization)
		filters.push(where('version', '<=', selectedVersion.value))

		// Only do category filtering at DB level if we have few enough categories
		// Use same limit as main query to avoid disjunction limit
		if (enabledCategories.length <= MAX_CATEGORIES_FOR_DB) {
			filters.push(where('category', 'in', enabledCategories))
		}
		// If we have too many categories, we'll filter them client-side to avoid disjunction limit

		filters.push(orderBy('category', 'asc'))
		filters.push(orderBy('subcategory', 'asc'))
		filters.push(orderBy('name', 'asc'))

		return query(baseQuery, ...filters)
	})

	const allItemsForCounts = useCollection(allItemsForCountsQuery)

	// Watch for when data actually loads
	watch(
		[allItemsCollection, allItemsForCounts],
		([items, counts]) => {
			// Data is loaded when both collections have been populated (even if empty)
			if (items !== null && counts !== null && !hasInitiallyLoaded.value) {
				const loadTime = Date.now() - loadingStartTime.value
				// If data loads very quickly (< threshold), add a minimum delay to prevent flash
				const delay = loadTime < LOADING_THRESHOLD ? LOADING_DELAY_FAST : LOADING_DELAY_SLOW

				setTimeout(() => {
					isLoading.value = false
					hasInitiallyLoaded.value = true
				}, delay)
			}
		},
		{ immediate: true }
	)

	// Also reset loading state when version changes
	watch(selectedVersion, () => {
		if (hasInitiallyLoaded.value) {
			isLoading.value = true
			hasInitiallyLoaded.value = false
			loadingStartTime.value = Date.now()
		}
	})

	// Helper computed for version-filtered items
	const versionFilteredItems = computed(() => {
		return filterItemsByVersion(allItemsCollection.value, selectedVersion.value)
	})

	// Helper computed for items with valid images and prices
	const itemsWithValidPrices = computed(() => {
		return filterItemsByPriceAndImage(
			versionFilteredItems.value,
			user.value,
			selectedVersion.value
		)
	})

	// Group items by category
	const groupedItems = computed(() => {
		const items = itemsWithValidPrices.value

		// If we have more than MAX_CATEGORIES_FOR_DB categories, filter by enabled categories client-side
		// to avoid Firestore disjunction limit
		const shouldFilterByCategory = enabledCategories.length > MAX_CATEGORIES_FOR_DB

		let filteredItems = shouldFilterByCategory
			? items.filter((item) => enabledCategories.includes(item.category))
			: items

		// Apply category filtering based on visibleCategories
		// Empty array means show all categories, non-empty means show only selected categories
		if (visibleCategories.value.length > 0) {
			filteredItems = filteredItems.filter((item) =>
				visibleCategories.value.includes(item.category)
			)
		}

		return filteredItems.reduce((acc, item) => {
			if (!acc[item.category]) acc[item.category] = []
			acc[item.category].push(item)
			return acc
		}, {})
	})

	// Total category counts (unfiltered by selection) for button disabled state
	const categoryCounts = computed(() => {
		if (!allItemsForCounts.value) return {}
		// Use allItemsForCounts directly, not versionFilteredItems (which is already filtered)
		let items = allItemsForCounts.value

		// If we have more than MAX_CATEGORIES_FOR_DB categories, filter by enabled categories client-side
		// to avoid Firestore disjunction limit
		const shouldFilterByCategory = enabledCategories.length > MAX_CATEGORIES_FOR_DB

		if (shouldFilterByCategory) {
			items = items.filter((item) => enabledCategories.includes(item.category))
		}

		return enabledCategories.reduce((acc, cat) => {
			const categoryItems = items.filter((item) => {
				// Apply version filtering but not category filtering
				if (
					item.version_removed &&
					isVersionLessOrEqual(item.version_removed, selectedVersion.value)
				) {
					return false
				}
				// Apply same filtering as groupedItems but without search
				if (item.category !== cat) return false
				// Use the same price/image filtering logic
				const filtered = filterItemsByPriceAndImage(
					[item],
					user.value,
					selectedVersion.value
				)
				return filtered.length > 0
			})
			acc[cat] = categoryItems.length
			return acc
		}, {})
	})

	// All categories with search filtering (for count display)
	const allCategoriesWithSearch = computed(() => {
		if (!allItemsForCounts.value) return {} // Use allItemsForCounts as base
		const query = searchQuery.value.trim().toLowerCase()
		const searchTerms = processSearchTerms(query)

		return enabledCategories.reduce((acc, cat) => {
			// Get all items for this category from the unfiltered-by-category list
			const items = allItemsForCounts.value.filter((item) => item.category === cat)
			// Apply client-side version_removed filtering and price/image filtering
			const versionFiltered = filterItemsByVersion(items, selectedVersion.value)
			const versionAndPriceFilteredItems = filterItemsByPriceAndImage(
				versionFiltered,
				user.value,
				selectedVersion.value
			)
			acc[cat] = filterItemsBySearch(versionAndPriceFilteredItems, searchTerms)
			return acc
		}, {})
	})

	// Filtered grouped items with search applied
	const filteredGroupedItems = computed(() => {
		if (!allItemsCollection.value) return {}
		const query = searchQuery.value.trim().toLowerCase()
		const searchTerms = processSearchTerms(query)

		return enabledCategories.reduce((acc, cat) => {
			const items = groupedItems.value[cat] || []
			acc[cat] = filterItemsBySearch(items, searchTerms)
			return acc
		}, {})
	})

	// Flat list view combining all visible items
	const allVisibleItems = computed(() => {
		if (!allItemsCollection.value) return []
		let items = []

		// If visibleCategories is empty, show all categories
		// If visibleCategories has items, show only those specific categories
		const categoriesToShow =
			visibleCategories.value.length > 0 ? visibleCategories.value : enabledCategories

		for (const cat of categoriesToShow) {
			const categoryItems = filteredGroupedItems.value[cat] || []
			items.push(...categoryItems)
		}

		// Sort alphabetically by name
		return items.sort((a, b) => {
			const nameA = a.name?.toLowerCase() || ''
			const nameB = b.name?.toLowerCase() || ''
			return nameA.localeCompare(nameB)
		})
	})

	// Total item count for display
	const totalItemCount = computed(() => {
		// Get items that match current filters (search, version) but without category filter
		const query = searchQuery.value.trim().toLowerCase()
		const searchTerms = processSearchTerms(query)

		// Start with all items for counts
		let items = allItemsForCounts.value || []

		// Filter to only enabled categories first
		items = items.filter((item) => enabledCategories.includes(item.category))

		// Apply search filtering if there's a search query
		if (searchTerms.length > 0) {
			items = filterItemsBySearch(items, searchTerms)
		}

		// Apply version and price filtering (mirroring the logic from allCategoriesWithSearch)
		const versionFiltered = filterItemsByVersion(items, selectedVersion.value)
		const filteredItems = filterItemsByPriceAndImage(
			versionFiltered,
			user.value,
			selectedVersion.value
		)

		return filteredItems.length
	})

	function refreshItems() {
		// Force refresh by resetting loading state
		isLoading.value = true
		hasInitiallyLoaded.value = false
		loadingStartTime.value = Date.now()
	}

	function getCacheStats() {
		return getPricingCacheStats()
	}

	return {
		// State
		isLoading,
		hasInitiallyLoaded,

		// Data
		allItems: allItemsCollection,
		allItemsForCounts,
		groupedItems,
		allVisibleItems,
		categoryCounts,
		allCategoriesWithSearch,
		filteredGroupedItems,
		totalItemCount,

		// Methods
		refreshItems,
		getCacheStats
	}
}

