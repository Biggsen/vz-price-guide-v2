<script setup>
import { useFirestore, useCollection } from 'vuefire'
import { query, collection, orderBy, where } from 'firebase/firestore'
import { computed, ref, watch, onMounted, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ItemTable from '../components/ItemTable.vue'
import ExportModal from '../components/ExportModal.vue'
import SettingsModal from '../components/SettingsModal.vue'
import BaseButton from '../components/BaseButton.vue'
import { enabledCategories, versions, baseEnabledVersions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'
import { getEffectivePriceMemoized, clearPriceCache, getCacheStats } from '../utils/pricing.js'
import {
	BeakerIcon
} from '@heroicons/vue/24/solid'
import {
	EyeIcon,
	EyeSlashIcon,
	ArrowPathIcon,
	Cog6ToothIcon,
	ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'

const db = useFirestore()
const route = useRoute()
const router = useRouter()
const { user, canEditItems } = useAdmin()

// Ensure versions array is available as fallback
const fallbackVersions = ['1.16', '1.17', '1.18', '1.19', '1.20', '1.21']

// Computed property for enabled versions based on user type
const enabledVersions = computed(() => {
	try {
		// Admin users can access all versions (but only if admin status is fully loaded)
		if (user.value?.email && canEditItems.value === true) {
			return [...(versions || fallbackVersions)] // Return a copy to avoid mutations
		}
		// Regular users only get base enabled versions
		return [...baseEnabledVersions] // Return a copy to avoid mutations
	} catch (error) {
		// Fallback to base enabled versions if anything goes wrong
		console.warn('Error in enabledVersions computed:', error)
		return [...baseEnabledVersions]
	}
})

// Version filtering state - declare before itemsQuery
const selectedVersion = ref(baseEnabledVersions[baseEnabledVersions.length - 1]) // Default to latest base enabled version

// Shared hover panel state - only one recipe panel can be open at a time across all ItemTables
const openHoverPanel = ref(null) // Track which item has hover panel open (item.id)

// Category filtering state - declare before itemsQuery
// Empty array means "all categories" (default state)
// Non-empty array means "only these specific categories"
const visibleCategories = shallowRef([])

// Create reactive query based on selected version and categories
const itemsQuery = computed(() => {
	const baseQuery = collection(db, 'items')

	// Build filters array
	const filters = []

	// Add version filtering - only get items available in selected version
	filters.push(where('version', '<=', selectedVersion.value))

	// Only do category filtering at DB level if we have few enough categories
	// Firestore limit is around 10-15 categories, so let's be safe with 10
	const maxCategoriesForDB = 10
	if (enabledCategories.length <= maxCategoriesForDB) {
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
	const maxCategoriesForDB = 10
	if (enabledCategories.length <= maxCategoriesForDB) {
		filters.push(where('category', 'in', enabledCategories))
	}
	// If we have too many categories, we'll filter them client-side to avoid disjunction limit

	filters.push(orderBy('category', 'asc'))
	filters.push(orderBy('subcategory', 'asc'))
	filters.push(orderBy('name', 'asc'))

	return query(baseQuery, ...filters)
})

const allItemsForCounts = useCollection(allItemsForCountsQuery)

// Loading state - true when data is initially loading
const isLoading = ref(true)
const hasInitiallyLoaded = ref(false)
const loadingStartTime = ref(Date.now())

// Watch for when data actually loads
watch(
	[allItemsCollection, allItemsForCounts],
	([items, counts]) => {
		// Data is loaded when both collections have been populated (even if empty)
		if (items !== null && counts !== null && !hasInitiallyLoaded.value) {
			const loadTime = Date.now() - loadingStartTime.value
			// If data loads very quickly (< 100ms), add a minimum delay to prevent flash
			const delay = loadTime < 100 ? 300 : 100

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

// Feature flags
const showExportFeature = ref(true) // Set to true to enable export functionality
const disableAlert = ref(false) // Set to true to disable all alerts regardless of showAlert state

// Info alert state
const alertStorageKey = 'brewingCategoryUpdateAlertDismissed'
const showAlert = ref(true)

function dismissAlert() {
	showAlert.value = false
	localStorage.setItem(alertStorageKey, 'true')
}

// Functions to manage shared hover panel state
function toggleHoverPanel(itemId) {
	if (openHoverPanel.value === itemId) {
		openHoverPanel.value = null
	} else {
		openHoverPanel.value = itemId
	}
}

function closeHoverPanel() {
	openHoverPanel.value = null
}

// Helper function to compare version strings (e.g., "1.16" vs "1.17")
function isVersionLessOrEqual(itemVersion, targetVersion) {
	if (!itemVersion || !targetVersion) return false

	const [itemMajor, itemMinor] = itemVersion.split('.').map(Number)
	const [targetMajor, targetMinor] = targetVersion.split('.').map(Number)

	if (itemMajor < targetMajor) return true
	if (itemMajor > targetMajor) return false
	return itemMinor <= targetMinor
}

// Helper computed for version-filtered items
// Now we only need to filter version_removed client-side since version is filtered at DB level
const versionFilteredItems = computed(() => {
	if (!allItemsCollection.value) return []
	return allItemsCollection.value.filter((item) => {
		// Check if item was removed in or before selected version
		if (
			item.version_removed &&
			isVersionLessOrEqual(item.version_removed, selectedVersion.value)
		) {
			return false
		}
		return true
	})
})

// Helper computed for items with valid images
const itemsWithImages = computed(() => {
	const items = versionFilteredItems.value
	if (user.value?.email) return items // Admin users see all items

	return items.filter((item) => item.image && item.image.trim() !== '')
})

// Helper computed for items with valid prices and categories
const itemsWithValidPrices = computed(() => {
	const items = itemsWithImages.value

	return items.filter((item) => {
		// Filter out items with null/empty categories (client-side filtering)
		if (!item.category || item.category.trim() === '') {
			return false
		}

		// Filter out items with 0 prices
		const effectivePrice = getEffectivePriceMemoized(
			item,
			selectedVersion.value.replace('.', '_')
		)
		return effectivePrice && effectivePrice !== 0
	})
})

const groupedItems = computed(() => {
	const items = itemsWithValidPrices.value

	// If we have more than 10 categories, filter by enabled categories client-side
	// to avoid Firestore disjunction limit
	const maxCategoriesForDB = 10
	const shouldFilterByCategory = enabledCategories.length > maxCategoriesForDB

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
const totalCategoryCounts = computed(() => {
	if (!allItemsForCounts.value) return {}
	// Use allItemsForCounts directly, not versionFilteredItems (which is already filtered)
	let items = allItemsForCounts.value

	// If we have more than 10 categories, filter by enabled categories client-side
	// to avoid Firestore disjunction limit
	const maxCategoriesForDB = 10
	const shouldFilterByCategory = enabledCategories.length > maxCategoriesForDB

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
			if (user.value?.email) return item.category === cat
			return item.category === cat && item.image && item.image.trim() !== ''
		})
		acc[cat] = categoryItems.length
		return acc
	}, {})
})

const searchQuery = ref('')

// Make economyConfig reactive with localStorage persistence
const priceMultiplier = ref(1)
const sellMargin = ref(0.3)
const roundToWhole = ref(false)
const showStackSize = ref(false)
const showFullNumbers = ref(false)
const viewMode = ref('categories') // 'categories' or 'list'
const layout = ref('comfortable') // 'comfortable' or 'condensed'

// Admin-only option to show zero-priced items

// Modal states
const showExportModal = ref(false)
const showSettingsModal = ref(false)

const economyConfig = computed(() => ({
	priceMultiplier: priceMultiplier.value,
	sellMargin: sellMargin.value,
	roundToWhole: roundToWhole.value,
	showStackSize: showStackSize.value,
	showFullNumbers: showFullNumbers.value,
	version: selectedVersion.value
}))

// Load config from localStorage
function loadEconomyConfig() {
	const savedPriceMultiplier = localStorage.getItem('priceMultiplier')
	const savedSellMargin = localStorage.getItem('sellMargin')
	const savedRoundToWhole = localStorage.getItem('roundToWhole')
	const savedViewMode = localStorage.getItem('viewMode')
	const savedLayout = localStorage.getItem('layout')
	const savedSelectedVersion = localStorage.getItem('selectedVersion')
	const savedShowStackSize = localStorage.getItem('showStackSize')
	const savedShowFullNumbers = localStorage.getItem('showFullNumbers')

	if (savedPriceMultiplier !== null) {
		priceMultiplier.value = parseFloat(savedPriceMultiplier)
	}
	if (savedSellMargin !== null) {
		sellMargin.value = parseFloat(savedSellMargin)
	}
	if (savedRoundToWhole !== null) {
		roundToWhole.value = savedRoundToWhole === 'true'
	}
	if (savedViewMode !== null) {
		viewMode.value = savedViewMode
	}
	if (savedLayout !== null) {
		layout.value = savedLayout
	}
	if (savedShowStackSize !== null) {
		showStackSize.value = savedShowStackSize === 'true'
	}
	if (savedShowFullNumbers !== null) {
		showFullNumbers.value = savedShowFullNumbers === 'true'
	}
	// Only load from localStorage if there's no version query parameter
	const versionParam = route.query.version
	if (savedSelectedVersion !== null && !versionParam) {
		selectedVersion.value = savedSelectedVersion
	}
}

// Save config to localStorage
function saveEconomyConfig() {
	localStorage.setItem('priceMultiplier', priceMultiplier.value.toString())
	localStorage.setItem('sellMargin', sellMargin.value.toString())
	localStorage.setItem('roundToWhole', roundToWhole.value.toString())
	localStorage.setItem('viewMode', viewMode.value)
	localStorage.setItem('layout', layout.value)
	localStorage.setItem('selectedVersion', selectedVersion.value)
	localStorage.setItem('showStackSize', showStackSize.value.toString())
	localStorage.setItem('showFullNumbers', showFullNumbers.value.toString())
}

// Watch for changes and save to localStorage
watch(
	[
		priceMultiplier,
		sellMargin,
		roundToWhole,
		viewMode,
		layout,
		selectedVersion,
		showStackSize,
		showFullNumbers
	],
	() => {
		saveEconomyConfig()
		// Clear price cache when economy config changes
		clearPriceCache()
	},
	{ deep: true }
)

// Helper function for search term processing
function processSearchTerms(query) {
	return query
		.split(',')
		.map((term) => term.trim())
		.filter((term) => term.length > 0)
}

// Helper function for item filtering
function filterItemsBySearch(items, searchTerms) {
	if (searchTerms.length === 0) return items

	return items.filter((item) => {
		if (!item.name) return false
		const itemName = item.name.toLowerCase()
		return searchTerms.some((term) => itemName.includes(term))
	})
}

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

// All categories with search filtering (for count display)
const allCategoriesWithSearch = computed(() => {
	if (!allItemsForCounts.value) return {} // Use allItemsForCounts as base
	const query = searchQuery.value.trim().toLowerCase()
	const searchTerms = processSearchTerms(query)

	return enabledCategories.reduce((acc, cat) => {
		// Get all items for this category from the unfiltered-by-category list
		const items = allItemsForCounts.value.filter((item) => item.category === cat)
		// Apply client-side version_removed filtering and price/image filtering
		const versionAndPriceFilteredItems = items.filter((item) => {
			// Apply version_removed filtering (client-side)
			if (
				item.version_removed &&
				isVersionLessOrEqual(item.version_removed, selectedVersion.value)
			) {
				return false
			}
			// Apply price/image filtering (mirroring itemsWithValidPrices logic)
			if (user.value?.email) return true // Admin users see all items
			if (!item.image || item.image.trim() === '') return false // Non-admin users need images
			// Always filter out zero-priced items
			const effectivePrice = getEffectivePriceMemoized(
				item,
				selectedVersion.value.replace('.', '_')
			)
			if (!effectivePrice || effectivePrice === 0) return false
			return true
		})
		acc[cat] = filterItemsBySearch(versionAndPriceFilteredItems, searchTerms)
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

const showCategoryFilters = ref(false) // Hidden by default on mobile

// Computed property to show category filters on desktop
const shouldShowCategoryFilters = computed(() => {
	return showCategoryFilters.value || window.innerWidth >= 640
})

// Initialize from URL query parameters
function initializeFromQuery() {
	const catParam = route.query.cat
	const versionParam = route.query.version

	if (catParam !== undefined) {
		if (catParam === '') {
			// Empty cat param means no categories selected (show all)
			visibleCategories.value = []
		} else {
			const selectedCategories = catParam
				.split(',')
				.map((c) => c.trim())
				.filter((c) => enabledCategories.includes(c))
			// Set to selected categories (non-empty array means specific categories)
			visibleCategories.value = selectedCategories
		}
	}

	if (versionParam && enabledVersions.value.includes(versionParam)) {
		selectedVersion.value = versionParam
	}
}

// Update URL query parameters
function updateQuery() {
	const query = {}

	// Add cat param only when specific categories are selected (non-empty array)
	// Empty array means "all categories" so no cat param needed
	if (visibleCategories.value.length > 0) {
		query.cat = visibleCategories.value.join(',')
	}

	// Only add version param if not the default version (latest enabled)
	if (selectedVersion.value !== enabledVersions.value[enabledVersions.value.length - 1]) {
		query.version = selectedVersion.value
	}

	// Update URL without triggering navigation
	router.replace({ query })
}

// Watch for changes and update URL
watch(
	[visibleCategories, selectedVersion],
	() => {
		updateQuery()
	},
	{ deep: true }
)

// Initialize from query on mount
onMounted(() => {
	initializeFromQuery()

	// Check if alert was previously dismissed
	const dismissed = localStorage.getItem(alertStorageKey)
	if (dismissed === 'true') {
		showAlert.value = false
	}

	// Initialize economy config from localStorage
	loadEconomyConfig()
})

// Watch for changes in enabledVersions and re-initialize version from query
watch(
	enabledVersions,
	(newEnabledVersions) => {
		// Only re-initialize if we have enabled versions and there's a version param
		if (newEnabledVersions.length > 0 && route.query.version) {
			const versionParam = route.query.version
			if (newEnabledVersions.includes(versionParam)) {
				selectedVersion.value = versionParam
			}
		}
	},
	{ immediate: true }
)

function toggleCategory(cat) {
	const idx = visibleCategories.value.indexOf(cat)
	if (idx !== -1) {
		// Remove category - create new array without the item
		visibleCategories.value = visibleCategories.value.filter((c) => c !== cat)
	} else {
		// Add category - create new array with the item
		visibleCategories.value = [...visibleCategories.value, cat]
	}
}

function toggleCategoryFilters() {
	showCategoryFilters.value = !showCategoryFilters.value
}

function getTotalItemCount() {
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
	const filteredItems = items.filter((item) => {
		// Apply version_removed filtering (client-side)
		if (
			item.version_removed &&
			isVersionLessOrEqual(item.version_removed, selectedVersion.value)
		) {
			return false
		}
		// Apply price/image filtering (mirroring itemsWithValidPrices logic)
		if (user.value?.email) return true // Admin users see all items
		if (!item.image || item.image.trim() === '') return false // Non-admin users need images
		// Always filter out zero-priced items
		const effectivePrice = getEffectivePriceMemoized(
			item,
			selectedVersion.value.replace('.', '_')
		)
		if (!effectivePrice || effectivePrice === 0) return false
		return true
	})

	return filteredItems.length
}
function clearAllCategories() {
	visibleCategories.value = []
}

function resetCategories() {
	visibleCategories.value = []
	searchQuery.value = ''
}

function openExportModal() {
	showExportModal.value = true
}

function closeExportModal() {
	showExportModal.value = false
}

function openSettingsModal() {
	showSettingsModal.value = true
}

function closeSettingsModal() {
	showSettingsModal.value = false
}

function handleSaveSettings(settings) {
	// Apply the settings changes
	selectedVersion.value = settings.selectedVersion
	priceMultiplier.value = settings.priceMultiplier
	sellMargin.value = settings.sellMargin
	roundToWhole.value = settings.roundToWhole
	showStackSize.value = settings.showStackSize
	showFullNumbers.value = settings.showFullNumbers === true

	// Close the modal
	showSettingsModal.value = false
}

// Watch for user changes and update selected version if needed
watch(
	[user, canEditItems],
	() => {
		// Ensure enabledVersions has a valid value
		const currentEnabledVersions = enabledVersions.value || baseEnabledVersions

		// If selected version is no longer available for current user, reset to latest enabled
		if (!currentEnabledVersions.includes(selectedVersion.value)) {
			selectedVersion.value = currentEnabledVersions[currentEnabledVersions.length - 1]
		}
	},
	{ immediate: false } // Don't run immediately to avoid issues during initialization
)
</script>

<template>
	<!-- Dismissible Info Alert -->
	<div
		v-if="!disableAlert && showAlert"
		class="bg-semantic-info-light border-l-4 border-l-semantic-info text-heavy-metal p-2 sm:p-4 relative mb-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center">
				<BeakerIcon class="w-7 h-7 sm:w-8 sm:h-8 mr-2 min-w-[2rem]" />
				<span class="text-sm sm:text-base">
					<strong>New Brewing category is live!</strong>
					Added 173 brewing items including base potions, effect potions, splash potions, lingering potions, and tipped arrows - all with accurate pricing.
					<span> </span>
					<router-link to="/updates" class="underline hover:text-gray-asparagus">
						<span>Read the release notes</span>
					</router-link>
				</span>
			</div>
			<button
				@click="dismissAlert"
				class="text-gray-asparagus hover:text-heavy-metal ml-2 sm:ml-4 p-1"
				aria-label="Dismiss alert"
				data-cy="dismiss-alert">
				<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						clip-rule="evenodd"></path>
				</svg>
			</button>
		</div>
	</div>

	<div class="px-2">
		<div class="my-4 flex flex-row gap-2">
			<div class="flex-1 sm:max-w-md">
				<input
					type="text"
					v-model="searchQuery"
					placeholder="Search for items..."
					class="border-2 border-gray-asparagus rounded px-3 py-2 w-full mb-1 h-10" />
				<p class="text-xs text-gray-500 mb-2 sm:mb-0 hidden sm:block">
					Tip: Use commas to search multiple terms
				</p>
			</div>
			<div class="flex gap-2 sm:gap-0 sm:ml-2">
				<BaseButton
					@click="resetCategories"
					variant="tertiary"
					class="flex-1 sm:flex-none sm:whitespace-nowrap sm:mr-2 h-10">
					<ArrowPathIcon class="w-4 h-4 sm:mr-1.5" />
					<span class="hidden sm:inline">Reset</span>
				</BaseButton>
			</div>
		</div>

		<!-- Hide Category Filters Toggle (Mobile Only) -->
		<div class="sm:hidden mb-4">
			<button
				@click="toggleCategoryFilters"
				class="text-gray-asparagus hover:text-heavy-metal underline text-sm flex items-center gap-1">
				<EyeSlashIcon v-if="showCategoryFilters" class="w-4 h-4" />
				<EyeIcon v-else class="w-4 h-4" />
				{{ showCategoryFilters ? 'Hide category filters' : 'Show category filters' }}
			</button>
		</div>

		<div v-show="shouldShowCategoryFilters" class="flex flex-wrap gap-2 mb-4 justify-start">
			<!-- All Categories Button -->
			<button
				@click="clearAllCategories"
				:class="[
					'rounded-xl px-2.5 py-1 transition text-xs sm:text-sm font-medium',
					visibleCategories.length === 0
						? 'bg-gray-asparagus text-white'
						: 'bg-norway text-heavy-metal hover:bg-amulet'
				]">
				All categories ({{ getTotalItemCount() }})
			</button>

			<!-- Individual Category Buttons -->
			<button
				v-for="cat in enabledCategories"
				:key="cat"
				@click="toggleCategory(cat)"
				:class="[
					visibleCategories.includes(cat)
						? 'bg-gray-asparagus text-white'
						: 'bg-norway text-heavy-metal',
					'rounded-xl px-2.5 py-1 transition text-xs sm:text-sm',
					(
						searchQuery && searchQuery.trim()
							? (allCategoriesWithSearch[cat]?.length || 0) === 0
							: totalCategoryCounts[cat] === 0
					)
						? 'cursor-not-allowed opacity-40'
						: ''
				]"
				:disabled="
					searchQuery && searchQuery.trim()
						? (allCategoriesWithSearch[cat]?.length || 0) === 0
						: totalCategoryCounts[cat] === 0
				">
				{{ cat.charAt(0).toUpperCase() + cat.slice(1) }} ({{
					searchQuery && searchQuery.trim()
						? allCategoriesWithSearch[cat]?.length || 0
						: totalCategoryCounts[cat] || 0
				}})
			</button>
		</div>

		<!-- Customisation Section -->
		<div class="mb-4 flex items-center gap-4">
			<BaseButton @click="openSettingsModal" variant="secondary">
				<template #left-icon>
					<Cog6ToothIcon />
				</template>
				Settings
			</BaseButton>
			<BaseButton
				v-if="showExportFeature || canEditItems"
				@click="openExportModal"
				variant="secondary">
				<template #left-icon>
					<ArrowDownTrayIcon />
				</template>
				Export price list
			</BaseButton>
		</div>

		<div class="mb-4 text-sm text-gray-asparagus font-medium">
			<span v-if="isLoading">Loading price guide...</span>
			<span v-else>
				<span class="text-xl text-heavy-metal font-bold">MC {{ selectedVersion }}</span>
				<span v-if="canEditItems" class="ml-4 text-xs text-gray-500">
					Cache: {{ getCacheStats().hits }}/{{
						getCacheStats().hits + getCacheStats().misses
					}}
					hits ({{ getCacheStats().size }} entries)
				</span>
			</span>
		</div>

		<!-- View Mode and Layout Toggle -->
		<div class="mb-4">
			<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-8">
				<!-- View Mode -->
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium text-heavy-metal">View as:</span>
					<div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
						<button
							@click="viewMode = 'categories'"
							:class="[
								viewMode === 'categories'
									? 'bg-gray-asparagus text-white'
									: 'bg-norway text-heavy-metal hover:bg-gray-100',
								'px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium transition border-r border-gray-asparagus last:border-r-0'
							]">
							Categories
						</button>
						<button
							@click="viewMode = 'list'"
							:class="[
								viewMode === 'list'
									? 'bg-gray-asparagus text-white'
									: 'bg-norway text-heavy-metal hover:bg-gray-100',
								'px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium transition'
							]">
							List
						</button>
					</div>
				</div>

				<!-- Layout -->
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium text-heavy-metal">Layout:</span>
					<div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
						<button
							@click="layout = 'comfortable'"
							:class="[
								layout === 'comfortable'
									? 'bg-gray-asparagus text-white'
									: 'bg-norway text-heavy-metal hover:bg-gray-100',
								'px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium transition border-r border-gray-asparagus last:border-r-0'
							]">
							Comfortable
						</button>
						<button
							@click="layout = 'condensed'"
							:class="[
								layout === 'condensed'
									? 'bg-gray-asparagus text-white'
									: 'bg-norway text-heavy-metal hover:bg-gray-100',
								'px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium transition'
							]">
							Compact
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Categories View -->
	<template v-if="viewMode === 'categories'">
		<template v-for="cat in enabledCategories" :key="cat">
			<ItemTable
				v-if="visibleCategories.length === 0 || visibleCategories.includes(cat)"
				:collection="filteredGroupedItems[cat] || []"
				:category="cat"
				:categories="enabledCategories"
				:economyConfig="economyConfig"
				:viewMode="viewMode"
				:layout="layout"
				:showStackSize="showStackSize"
				:openHoverPanel="openHoverPanel"
				:toggleHoverPanel="toggleHoverPanel"
				:closeHoverPanel="closeHoverPanel" />
		</template>

		<!-- Loading state for categories view -->
		<div v-if="isLoading" class="text-center py-12">
			<div class="text-gray-asparagus text-lg mb-2">Loading price guide...</div>
			<div class="text-sm text-gray-500">Please wait while we fetch the latest prices</div>
		</div>

		<!-- Empty state for categories view -->
		<div v-else-if="allVisibleItems.length === 0" class="text-center py-12">
			<div class="text-gray-asparagus text-lg mb-2">No items found</div>
			<div class="text-sm text-gray-500">
				Try adjusting your search terms or category filters
			</div>
		</div>
	</template>

	<!-- List View -->
	<template v-if="viewMode === 'list'">
		<ItemTable
			v-if="allVisibleItems.length > 0"
			:collection="allVisibleItems"
			category="All Items"
			:categories="enabledCategories"
			:economyConfig="economyConfig"
			:viewMode="viewMode"
			:layout="layout"
			:showStackSize="showStackSize"
			:openHoverPanel="openHoverPanel"
			:toggleHoverPanel="toggleHoverPanel"
			:closeHoverPanel="closeHoverPanel" />

		<!-- Loading state for list view -->
		<div v-if="isLoading" class="text-center py-12">
			<div class="text-gray-asparagus text-lg mb-2">Loading price guide...</div>
			<div class="text-sm text-gray-500">Please wait while we fetch the latest prices</div>
		</div>

		<!-- Empty state for list view -->
		<div v-else-if="allVisibleItems.length === 0" class="text-center py-12">
			<div class="text-gray-asparagus text-lg mb-2">No items found</div>
			<div class="text-sm text-gray-500">
				Try adjusting your search terms or category filters
			</div>
		</div>
	</template>

	<!-- Export Modal -->
	<ExportModal
		:isOpen="showExportModal"
		:items="allItemsForCounts"
		:economyConfig="economyConfig"
		:selectedVersion="selectedVersion"
		@close="closeExportModal" />

	<!-- Settings Modal -->
	<SettingsModal
		:isOpen="showSettingsModal"
		:selectedVersion="selectedVersion"
		@close="closeSettingsModal"
		@save-settings="handleSaveSettings" />
</template>

<style scoped>
.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}
</style>
