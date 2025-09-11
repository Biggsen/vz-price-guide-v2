<script setup>
import { useFirestore, useCollection } from 'vuefire'
import { query, collection, orderBy } from 'firebase/firestore'
import { computed, ref, watch, onMounted } from 'vue'
import { useCurrentUser } from 'vuefire'
import { useRoute, useRouter } from 'vue-router'
import ItemTable from '../components/ItemTable.vue'
import ExportModal from '../components/ExportModal.vue'
import SettingsModal from '../components/SettingsModal.vue'
import { categories, enabledCategories, versions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'
import { getEffectivePrice } from '../utils/pricing.js'
import {
	RocketLaunchIcon,
	EyeIcon,
	EyeSlashIcon,
	ArrowPathIcon,
	Cog6ToothIcon,
	ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'
import { Cog6ToothIcon as Cog6ToothIconSolid, UsersIcon } from '@heroicons/vue/16/solid'

const db = useFirestore()
const route = useRoute()
const router = useRouter()
const { user, canEditItems } = useAdmin()

// Define which versions are currently available for regular users
const baseEnabledVersions = ['1.16', '1.17', '1.18', '1.19', '1.20']

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

const allItemsQuery = query(
	collection(db, 'items'),
	orderBy('category', 'asc'),
	orderBy('subcategory', 'asc'),
	orderBy('name', 'asc')
)
const allItemsCollection = useCollection(allItemsQuery)

// Info alert state
const showAlert = ref(true)

function dismissAlert() {
	showAlert.value = false
	localStorage.setItem('userAccountsAlertDismissed', 'true')
}

// Version filtering state
const selectedVersion = ref(baseEnabledVersions[baseEnabledVersions.length - 1]) // Default to latest base enabled version

// Helper function to compare version strings (e.g., "1.16" vs "1.17")
function isVersionLessOrEqual(itemVersion, targetVersion) {
	if (!itemVersion || !targetVersion) return false

	const [itemMajor, itemMinor] = itemVersion.split('.').map(Number)
	const [targetMajor, targetMinor] = targetVersion.split('.').map(Number)

	if (itemMajor < targetMajor) return true
	if (itemMajor > targetMajor) return false
	return itemMinor <= targetMinor
}

// Helper function to check if item should be shown for selected version
function shouldShowItemForVersion(item, selectedVersion) {
	// Item must have a version and be <= selected version
	if (!item.version || !isVersionLessOrEqual(item.version, selectedVersion)) {
		return false
	}

	// If item has version_removed and it's <= selected version, don't show it
	if (item.version_removed && isVersionLessOrEqual(item.version_removed, selectedVersion)) {
		return false
	}

	return true
}

const groupedItems = computed(() => {
	if (!allItemsCollection.value) return {}
	return allItemsCollection.value.reduce((acc, item) => {
		// Skip items without images for non-admin users
		if (!user.value?.email && (!item.image || item.image.trim() === '')) return acc
		// Skip items not available in selected version
		if (!shouldShowItemForVersion(item, selectedVersion.value)) return acc
		// Skip zero-priced items unless admin has enabled showing them
		const effectivePrice = getEffectivePrice(item, selectedVersion.value.replace('.', '_'))
		if (!showZeroPricedItems.value && (!effectivePrice || effectivePrice === 0)) return acc

		if (!acc[item.category]) acc[item.category] = []
		acc[item.category].push(item)
		return acc
	}, {})
})

const uncategorizedItemsByVersion = computed(() => {
	if (!allItemsCollection.value) return {}

	const uncatByVersion = {}

	allItemsCollection.value.forEach((item) => {
		const isUncat = !item.category || !categories.includes(item.category)
		const hasImage = item.image && item.image.trim() !== ''
		const isAvailableInVersion = shouldShowItemForVersion(item, selectedVersion.value)
		const effectivePrice = getEffectivePrice(item, selectedVersion.value.replace('.', '_'))
		const hasValidPrice = showZeroPricedItems.value || (effectivePrice && effectivePrice !== 0)

		if (
			isUncat &&
			(user.value?.email || hasImage) &&
			isAvailableInVersion &&
			hasValidPrice &&
			item.version
		) {
			if (!uncatByVersion[item.version]) {
				uncatByVersion[item.version] = []
			}
			uncatByVersion[item.version].push(item)
		}
	})

	return uncatByVersion
})

// Get all uncategorized items as a flat array (for backwards compatibility)
const uncategorizedItems = computed(() => {
	const allUncategorized = []
	Object.values(uncategorizedItemsByVersion.value).forEach((versionItems) => {
		allUncategorized.push(...versionItems)
	})
	return allUncategorized
})

const searchQuery = ref('')

// Make economyConfig reactive with localStorage persistence
const priceMultiplier = ref(1)
const sellMargin = ref(0.3)
const roundToWhole = ref(false)
const viewMode = ref('categories') // 'categories' or 'list'
const layout = ref('comfortable') // 'comfortable' or 'condensed'

// Admin-only option to show zero-priced items
const showZeroPricedItems = ref(false)

// Modal states
const showExportModal = ref(false)
const showSettingsModal = ref(false)

// Computed property for percentage display (30 instead of 0.3)
const sellMarginPercentage = computed({
	get: () => Math.round(sellMargin.value * 100),
	set: (value) => {
		sellMargin.value = value / 100
	}
})

const economyConfig = computed(() => ({
	priceMultiplier: priceMultiplier.value,
	sellMargin: sellMargin.value,
	roundToWhole: roundToWhole.value,
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
	const savedShowZeroPricedItems = localStorage.getItem('showZeroPricedItems')

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
	// Only load from localStorage if there's no version query parameter
	const versionParam = route.query.version
	if (savedSelectedVersion !== null && !versionParam) {
		selectedVersion.value = savedSelectedVersion
	}
	if (savedShowZeroPricedItems !== null) {
		showZeroPricedItems.value = savedShowZeroPricedItems === 'true'
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
	localStorage.setItem('showZeroPricedItems', showZeroPricedItems.value.toString())
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
		showZeroPricedItems
	],
	() => {
		saveEconomyConfig()
	},
	{ deep: true }
)

// Reset to defaults
function resetEconomyConfig() {
	priceMultiplier.value = 1
	sellMargin.value = 0.3
	roundToWhole.value = false
}

const filteredGroupedItems = computed(() => {
	if (!allItemsCollection.value) return {}
	const query = searchQuery.value.trim().toLowerCase()
	return enabledCategories.reduce((acc, cat) => {
		const items = groupedItems.value[cat] || []
		acc[cat] = query
			? items.filter((item) => {
					if (!item.name) return false
					const itemName = item.name.toLowerCase()

					// Split search query by commas and/or spaces, then trim and filter out empty strings
					const searchTerms = query
						.split(/[,\s]+/)
						.map((term) => term.trim())
						.filter((term) => term.length > 0)

					// If no valid search terms, return all items
					if (searchTerms.length === 0) return true

					// Check if item name contains any of the search terms (OR logic)
					return searchTerms.some((term) => itemName.includes(term))
			  })
			: items
		return acc
	}, {})
})

const filteredUncategorizedItemsByVersion = computed(() => {
	if (!allItemsCollection.value) return {}
	const query = searchQuery.value.trim().toLowerCase()
	const result = {}

	Object.entries(uncategorizedItemsByVersion.value).forEach(([version, items]) => {
		result[version] = query
			? items.filter((item) => {
					if (!item.name) return false
					const itemName = item.name.toLowerCase()

					// Split search query by commas and/or spaces, then trim and filter out empty strings
					const searchTerms = query
						.split(/[,\s]+/)
						.map((term) => term.trim())
						.filter((term) => term.length > 0)

					// If no valid search terms, return all items
					if (searchTerms.length === 0) return true

					// Check if item name contains any of the search terms (OR logic)
					return searchTerms.some((term) => itemName.includes(term))
			  })
			: items
	})

	return result
})

// Get sorted versions for uncategorized items display
const uncategorizedVersions = computed(() => {
	return Object.keys(uncategorizedItemsByVersion.value).sort((a, b) => {
		const [aMajor, aMinor] = a.split('.').map(Number)
		const [bMajor, bMinor] = b.split('.').map(Number)

		if (aMajor !== bMajor) return aMajor - bMajor
		return aMinor - bMinor
	})
})

const filteredUncategorizedItems = computed(() => {
	if (!allItemsCollection.value) return []
	const query = searchQuery.value.trim().toLowerCase()
	const items = uncategorizedItems.value
	return query
		? items.filter((item) => {
				if (!item.name) return false
				const itemName = item.name.toLowerCase()

				// Split search query by commas and/or spaces, then trim and filter out empty strings
				const searchTerms = query
					.split(/[,\s]+/)
					.map((term) => term.trim())
					.filter((term) => term.length > 0)

				// If no valid search terms, return all items
				if (searchTerms.length === 0) return true

				// Check if item name contains any of the search terms (OR logic)
				return searchTerms.some((term) => itemName.includes(term))
		  })
		: items
})

// Flat list view combining all visible items
const allVisibleItems = computed(() => {
	if (!allItemsCollection.value) return []
	let items = []

	// Add items from visible categories
	for (const cat of visibleCategories.value) {
		const categoryItems = filteredGroupedItems.value[cat] || []
		items.push(...categoryItems)
	}

	// Add uncategorized items if shown AND user is admin
	if (showUncategorised.value && user.value?.email) {
		// Add all uncategorized items from all versions
		Object.values(filteredUncategorizedItemsByVersion.value).forEach((versionItems) => {
			items.push(...versionItems)
		})
	}

	// Sort alphabetically by name
	return items.sort((a, b) => {
		const nameA = a.name?.toLowerCase() || ''
		const nameB = b.name?.toLowerCase() || ''
		return nameA.localeCompare(nameB)
	})
})

const visibleCategories = ref([...enabledCategories])
const showUncategorised = ref(true)
const showCategoryFilters = ref(false) // Hidden by default on mobile

// Computed property to show category filters on desktop
const shouldShowCategoryFilters = computed(() => {
	return showCategoryFilters.value || window.innerWidth >= 640
})

// Version filter functions
function selectVersion(version) {
	// Only allow selecting enabled versions
	if (enabledVersions.value.includes(version)) {
		selectedVersion.value = version
	}
}

// Initialize from URL query parameters
function initializeFromQuery() {
	const catParam = route.query.cat
	const uncatParam = route.query.uncat
	const versionParam = route.query.version

	if (catParam !== undefined) {
		if (catParam === '') {
			// Empty cat param means no categories selected
			visibleCategories.value = []
		} else {
			const selectedCategories = catParam
				.split(',')
				.map((c) => c.trim())
				.filter((c) => enabledCategories.includes(c))
			if (selectedCategories.length > 0) {
				visibleCategories.value = selectedCategories
			}
		}
	}

	// Only process uncat param for admin users
	if (uncatParam !== undefined && user.value?.email) {
		showUncategorised.value = uncatParam === 'true' || uncatParam === '1'
	}

	if (versionParam && enabledVersions.value.includes(versionParam)) {
		selectedVersion.value = versionParam
	}
}

// Update URL query parameters
function updateQuery() {
	const query = {}

	// Always add cat param except when all categories are selected
	if (visibleCategories.value.length === enabledCategories.length) {
		// All categories selected - don't add cat param
	} else {
		// Some or no categories selected - add cat param (empty string if none selected)
		query.cat = visibleCategories.value.join(',')
	}

	// Always add uncat param for admin users to ensure filter state is preserved
	if (user.value?.email) {
		query.uncat = showUncategorised.value ? 'true' : 'false'
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
	[visibleCategories, showUncategorised, selectedVersion],
	() => {
		updateQuery()
	},
	{ deep: true }
)

// Hide Uncategorised by default for not logged in users
watch(
	user,
	(val) => {
		if (!val?.email) {
			showUncategorised.value = false
		} else {
			showUncategorised.value = true
			// Re-initialize from query when user logs in, in case there's an uncat param
			const uncatParam = route.query.uncat
			if (uncatParam !== undefined) {
				showUncategorised.value = uncatParam === 'true' || uncatParam === '1'
			}
		}
	},
	{ immediate: true }
)

// Initialize from query on mount
onMounted(() => {
	initializeFromQuery()

	// Check if alert was previously dismissed
	const dismissed = localStorage.getItem('userAccountsAlertDismissed')
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

const allVisible = computed(() => visibleCategories.value.length === enabledCategories.length)

function toggleCategory(cat) {
	const idx = visibleCategories.value.indexOf(cat)
	if (idx !== -1) {
		visibleCategories.value.splice(idx, 1)
	} else {
		visibleCategories.value.push(cat)
	}
}
function toggleUncategorised() {
	showUncategorised.value = !showUncategorised.value
}

function toggleCategoryFilters() {
	showCategoryFilters.value = !showCategoryFilters.value
}

function showAllCategories() {
	visibleCategories.value = [...enabledCategories]
	showUncategorised.value = true
}
function hideAllCategories() {
	visibleCategories.value = []
	showUncategorised.value = false
}

function toggleAllCategories() {
	if (allVisible.value && showUncategorised.value) {
		hideAllCategories()
	} else {
		showAllCategories()
	}
}
function resetCategories() {
	visibleCategories.value = [...enabledCategories]
	showUncategorised.value = true
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
	showZeroPricedItems.value = settings.showZeroPricedItems

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
		v-if="showAlert"
		class="bg-norway bg-opacity-20 border-l-4 border-laurel text-heavy-metal p-2 sm:p-4 relative mb-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center">
				<RocketLaunchIcon class="w-7 h-7 sm:w-8 sm:h-8 mr-2 min-w-[2rem]" />
				<span class="text-sm sm:text-base">
					<UsersIcon class="w-4 h-4 inline" />
					User accounts are now live! You can register, sign in, and manage your profile.
					Plus, you can now submit suggestions and feedback for the site using the new
					Suggestions feature. Check
					<router-link to="/updates" class="underline hover:text-gray-asparagus">
						<span>Updates</span>
					</router-link>
					for more details.
				</span>
			</div>
			<button
				@click="dismissAlert"
				class="text-gray-asparagus hover:text-heavy-metal ml-2 sm:ml-4 p-1"
				aria-label="Dismiss alert">
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
					Tip: Use commas or spaces to search for multiple items
				</p>
			</div>
			<div class="flex gap-2 sm:gap-0 sm:ml-2">
				<button
					@click="resetCategories"
					class="bg-laurel text-white border-2 border-gray-asparagus rounded px-3 py-2 transition flex-1 sm:flex-none sm:whitespace-nowrap sm:mr-2 h-10 flex items-center justify-center gap-1">
					<ArrowPathIcon class="w-4 h-4" />
					<span class="hidden sm:inline">Reset</span>
				</button>
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
			<button
				v-for="cat in enabledCategories"
				:key="cat"
				@click="toggleCategory(cat)"
				:class="[
					visibleCategories.includes(cat)
						? 'bg-gray-asparagus text-white'
						: 'bg-norway text-heavy-metal',
					'border border-gray-asparagus rounded px-2 py-1 sm:px-3 sm:py-2 transition text-xs sm:text-sm',
					!filteredGroupedItems[cat] || filteredGroupedItems[cat].length === 0
						? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
						: ''
				]"
				:disabled="!filteredGroupedItems[cat] || filteredGroupedItems[cat].length === 0">
				{{ cat.charAt(0).toUpperCase() + cat.slice(1) }} ({{
					filteredGroupedItems[cat]?.length || 0
				}})
			</button>
			<button
				v-if="user?.email"
				@click="toggleUncategorised"
				:class="[
					showUncategorised
						? 'bg-gray-asparagus text-white'
						: 'bg-norway text-heavy-metal',
					'border border-gray-asparagus rounded px-2 py-1 sm:px-3 sm:py-2 transition text-xs sm:text-sm',
					filteredUncategorizedItems.length === 0
						? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
						: ''
				]"
				:disabled="filteredUncategorizedItems.length === 0">
				Uncategorised ({{ filteredUncategorizedItems.length }})
			</button>
		</div>

		<!-- Toggle All Categories Link (Inside category filters section) -->
		<div v-show="shouldShowCategoryFilters" class="mb-4">
			<button
				@click="toggleAllCategories"
				class="text-gray-asparagus hover:text-heavy-metal underline text-sm flex items-center gap-1">
				<EyeSlashIcon v-if="allVisible" class="w-4 h-4" />
				<EyeIcon v-else class="w-4 h-4" />
				{{ allVisible ? 'Unselect all categories' : 'Select all categories' }}
			</button>
		</div>

		<!-- Customisation Section -->
		<div class="mb-4 flex items-center gap-4">
			<button @click="openSettingsModal" class="inline-flex items-center btn-secondary pl-3">
				<Cog6ToothIcon class="w-4 h-4 mr-1.5" />
				Settings
			</button>
			<button @click="openExportModal" class="inline-flex items-center btn-secondary pl-3">
				<ArrowDownTrayIcon class="w-4 h-4 mr-1.5" />
				Export price list
			</button>
		</div>

		<div class="mb-4 text-sm text-gray-asparagus font-medium">
			Showing {{ allVisibleItems.length }} item{{ allVisibleItems.length === 1 ? '' : 's' }}
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
				v-if="visibleCategories.includes(cat)"
				:collection="filteredGroupedItems[cat] || []"
				:category="cat"
				:categories="enabledCategories"
				:economyConfig="economyConfig"
				:viewMode="viewMode"
				:layout="layout" />
		</template>
		<template v-for="version in uncategorizedVersions" :key="`uncat-${version}`">
			<ItemTable
				v-if="
					user?.email &&
					showUncategorised &&
					filteredUncategorizedItemsByVersion[version]?.length > 0
				"
				:collection="filteredUncategorizedItemsByVersion[version]"
				:category="`Uncategorised ${version}`"
				:categories="enabledCategories"
				:economyConfig="economyConfig"
				:viewMode="viewMode"
				:layout="layout" />
		</template>

		<!-- Empty state for categories view -->
		<div v-if="allVisibleItems.length === 0" class="text-center py-12">
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
			:layout="layout" />

		<!-- Empty state for list view -->
		<div v-if="allVisibleItems.length === 0" class="text-center py-12">
			<div class="text-gray-asparagus text-lg mb-2">No items found</div>
			<div class="text-sm text-gray-500">
				Try adjusting your search terms or category filters
			</div>
		</div>
	</template>

	<!-- Export Modal -->
	<ExportModal
		:isOpen="showExportModal"
		:items="allItemsCollection"
		:economyConfig="economyConfig"
		:selectedVersion="selectedVersion"
		@close="closeExportModal"
		@update-version="selectVersion" />

	<!-- Settings Modal -->
	<SettingsModal
		:isOpen="showSettingsModal"
		@close="closeSettingsModal"
		@save-settings="handleSaveSettings" />
</template>

<style scoped>
.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}
</style>
