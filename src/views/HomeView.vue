<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import ItemTable from '../components/ItemTable.vue'
import ExportModal from '../components/ExportModal.vue'
import SettingsModal from '../components/SettingsModal.vue'
import BaseButton from '../components/BaseButton.vue'
import SearchBar from '../components/SearchBar.vue'
import CategoryFilters from '../components/CategoryFilters.vue'
import ViewControls from '../components/ViewControls.vue'
import LoadingState from '../components/LoadingState.vue'
import { enabledCategories, versions, baseEnabledVersions } from '../constants.js'
import { FALLBACK_VERSIONS } from '../constants/homepage.js'
import { STORAGE_KEYS } from '../constants/homepage.js'
import { useAdmin } from '../utils/admin.js'
import { useEconomyConfig } from '../composables/useEconomyConfig.js'
import { useFilters } from '../composables/useFilters.js'
import { useItems } from '../composables/useItems.js'
import {
	RocketLaunchIcon
} from '@heroicons/vue/24/solid'
import { Cog6ToothIcon, ArrowDownTrayIcon, ArrowUpIcon } from '@heroicons/vue/24/outline'

const route = useRoute()
const { user, canEditItems } = useAdmin()

// Ensure versions array is available as fallback
const fallbackVersions = FALLBACK_VERSIONS

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

// Initialize composables
const filters = useFilters(enabledVersions)
const items = useItems(
	filters.selectedVersion,
	filters.visibleCategories,
	filters.searchQuery
)
const economyConfigComposable = useEconomyConfig(filters.selectedVersion)

// Shared hover panel state - only one recipe panel can be open at a time across all ItemTables
const openHoverPanel = ref(null) // Track which item has hover panel open (item.id)

// Feature flags
const showExportFeature = ref(true) // Set to true to enable export functionality
const disableAlert = ref(false) // Set to true to disable all alerts regardless of showAlert state

// Mounts of Mayhem announcement state
const mountsAnnouncementStorageKey = STORAGE_KEYS.MOUNTS_ANNOUNCEMENT_DISMISSED
const showMountsAnnouncement = ref(true)

function dismissMountsAnnouncement() {
	showMountsAnnouncement.value = false
	localStorage.setItem(mountsAnnouncementStorageKey, 'true')
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


// Modal states
const showExportModal = ref(false)
const showSettingsModal = ref(false)

// Alias composable values for easier template access
const {
	searchQuery,
	visibleCategories,
	selectedVersion,
	toggleCategory,
	clearAllCategories,
	resetFilters,
	initializeFromQuery
} = filters

const {
	isLoading,
	allItemsForCounts,
	groupedItems,
	allVisibleItems,
	categoryCounts: totalCategoryCounts,
	allCategoriesWithSearch,
	filteredGroupedItems,
	totalItemCount,
	getCacheStats
} = items

const {
	priceMultiplier,
	sellMargin,
	roundToWhole,
	showStackSize,
	showFullNumbers,
	viewMode,
	layout,
	economyConfig,
	loadConfig
} = economyConfigComposable

const showCategoryFilters = ref(false) // Hidden by default on mobile

// Back to top button state
const showBackToTop = ref(false)

function scrollToTop() {
	window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleScroll() {
	showBackToTop.value = window.scrollY > 300
}

// Initialize from query on mount
onMounted(() => {
	filters.initializeFromQuery()

	// Check if Mounts of Mayhem announcement was previously dismissed
	const mountsDismissed = localStorage.getItem(mountsAnnouncementStorageKey)
	if (mountsDismissed === 'true') {
		showMountsAnnouncement.value = false
	}

	// Initialize economy config from localStorage
	economyConfigComposable.loadConfig()

	// Add scroll listener for back to top button
	window.addEventListener('scroll', handleScroll)
	handleScroll() // Check initial scroll position
})

// Cleanup scroll listener
onUnmounted(() => {
	window.removeEventListener('scroll', handleScroll)
})

function toggleCategoryFilters() {
	showCategoryFilters.value = !showCategoryFilters.value
}

function resetCategories() {
	resetFilters()
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
	if (settings.currencyType) {
		economyConfigComposable.currencyType.value = settings.currencyType
	}
	if (settings.diamondItemId !== undefined) {
		economyConfigComposable.diamondItemId.value = settings.diamondItemId
	}
	if (settings.diamondRoundingDirection) {
		economyConfigComposable.diamondRoundingDirection.value = settings.diamondRoundingDirection
	}

	// Close the modal
	showSettingsModal.value = false
}

// Watch for changes in enabledVersions and re-initialize version from query
watch(
	enabledVersions,
	(newEnabledVersions) => {
		// Only re-initialize if we have enabled versions and there's a version param
		if (newEnabledVersions.length > 0 && route.query.version) {
			const versionParam = route.query.version
			if (newEnabledVersions.includes(versionParam)) {
				filters.selectedVersion.value = versionParam
			}
		}
	},
	{ immediate: true }
)

// Watch for user changes and update selected version if needed
watch(
	[user, canEditItems],
	() => {
		// Ensure enabledVersions has a valid value
		const currentEnabledVersions = enabledVersions.value || baseEnabledVersions

		// If selected version is no longer available for current user, reset to latest enabled
		if (!currentEnabledVersions.includes(filters.selectedVersion.value)) {
			filters.selectedVersion.value = currentEnabledVersions[currentEnabledVersions.length - 1]
		}
	},
	{ immediate: false } // Don't run immediately to avoid issues during initialization
)
</script>

<template>
	<!-- Mounts of Mayhem Announcement -->
	<div
		v-if="!disableAlert && showMountsAnnouncement"
		class="bg-semantic-info-light border-l-4 border-l-semantic-info text-heavy-metal p-2 sm:p-4 relative mb-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center">
				<RocketLaunchIcon class="w-7 h-7 sm:w-8 sm:h-8 mr-2 min-w-[2rem]" />
				<span class="text-sm sm:text-base">
					<strong>Mounts of Mayhem 1.21.11 items added!</strong>
					New items including spears, nautilus armor, and netherite horse armor are now available in the catalog.
					<span> </span>
					<router-link to="/updates" class="underline hover:text-gray-asparagus">
						<span>Read more</span>
					</router-link>
				</span>
			</div>
			<button
				@click="dismissMountsAnnouncement"
				class="text-gray-asparagus hover:text-heavy-metal ml-2 sm:ml-4 p-1"
				aria-label="Dismiss announcement"
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
		<SearchBar :model-value="searchQuery" @update:model-value="searchQuery = $event" @reset="resetCategories" />

		<CategoryFilters
			:visible-categories="visibleCategories"
			:search-query="searchQuery"
			:total-item-count="totalItemCount"
			:total-category-counts="totalCategoryCounts"
			:all-categories-with-search="allCategoriesWithSearch"
			:show-category-filters="showCategoryFilters"
			@toggle-category="toggleCategory"
			@clear-all="clearAllCategories"
			@toggle-visibility="toggleCategoryFilters" />

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

		<ViewControls
			:view-mode="viewMode"
			:layout="layout"
			@update:view-mode="viewMode = $event"
			@update:layout="layout = $event" />
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
				:allItems="allItemsForCounts"
				:viewMode="viewMode"
				:layout="layout"
				:showStackSize="showStackSize"
				:openHoverPanel="openHoverPanel"
				:toggleHoverPanel="toggleHoverPanel"
				:closeHoverPanel="closeHoverPanel" />
		</template>

		<LoadingState :is-loading="isLoading" :has-items="allVisibleItems.length > 0" />
	</template>

	<!-- List View -->
	<template v-if="viewMode === 'list'">
		<ItemTable
			v-if="allVisibleItems.length > 0"
			:collection="allVisibleItems"
			category="All Items"
			:categories="enabledCategories"
			:economyConfig="economyConfig"
			:allItems="allItemsForCounts"
			:viewMode="viewMode"
			:layout="layout"
			:showStackSize="showStackSize"
			:openHoverPanel="openHoverPanel"
			:toggleHoverPanel="toggleHoverPanel"
			:closeHoverPanel="closeHoverPanel" />

		<LoadingState :is-loading="isLoading" :has-items="allVisibleItems.length > 0" />
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

	<!-- Back to Top Button -->
	<button
		v-if="showBackToTop"
		@click="scrollToTop"
		class="fixed bottom-6 right-6 z-50 bg-amulet text-white p-3 opacity-50 hover:opacity-100 transition-all duration-200 flex items-center justify-center"
		aria-label="Back to top"
		data-cy="back-to-top">
		<ArrowUpIcon class="w-6 h-6" />
	</button>
</template>

<style scoped>
.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}
</style>
