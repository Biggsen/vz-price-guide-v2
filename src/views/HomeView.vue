<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ItemTable from '../components/ItemTable.vue'
import ExportModal from '../components/ExportModal.vue'
import SettingsModal from '../components/SettingsModal.vue'
import BaseButton from '../components/BaseButton.vue'
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
import {
	EyeIcon,
	EyeSlashIcon,
	ArrowPathIcon,
	Cog6ToothIcon,
	ArrowDownTrayIcon
} from '@heroicons/vue/24/outline'

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

// Computed property to show category filters on desktop
const shouldShowCategoryFilters = computed(() => {
	return showCategoryFilters.value || window.innerWidth >= 640
})


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
				All categories ({{ totalItemCount }})
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
