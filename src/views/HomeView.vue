<script setup>
import { useFirestore, useCollection } from 'vuefire'
import { query, collection, orderBy } from 'firebase/firestore'
import { computed, ref, watch, onMounted } from 'vue'
import { useCurrentUser } from 'vuefire'
import { useRoute, useRouter } from 'vue-router'
import ItemTable from '../components/ItemTable.vue'
import { categories, enabledCategories } from '../constants.js'

const db = useFirestore()
const route = useRoute()
const router = useRouter()

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
	localStorage.setItem('homeAlertDismissed', 'true')
}

// Mobile filters visibility state
const showMobileFilters = ref(true)

function toggleMobileFilters() {
	showMobileFilters.value = !showMobileFilters.value
	localStorage.setItem('showMobileFilters', showMobileFilters.value.toString())
}

const groupedItems = computed(() => {
	if (!allItemsCollection.value) return {}
	return allItemsCollection.value.reduce((acc, item) => {
		if (!user.value?.email && (!item.image || item.image.trim() === '')) return acc
		if (!acc[item.category]) acc[item.category] = []
		acc[item.category].push(item)
		return acc
	}, {})
})

const uncategorizedItems = computed(() => {
	if (!allItemsCollection.value) return []
	return allItemsCollection.value.filter((item) => {
		const isUncat = !item.category || !categories.includes(item.category)
		const hasImage = item.image && item.image.trim() !== ''
		return isUncat && (user.value?.email || hasImage)
	})
})

const searchQuery = ref('')

// Make economyConfig reactive with localStorage persistence
const priceMultiplier = ref(1)
const sellMargin = ref(0.3)
const showEconomySettings = ref(false)
const roundToWhole = ref(false)
const viewMode = ref('categories') // 'categories' or 'list'

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
	roundToWhole: roundToWhole.value
}))

// Load config from localStorage
function loadEconomyConfig() {
	const savedPriceMultiplier = localStorage.getItem('priceMultiplier')
	const savedSellMargin = localStorage.getItem('sellMargin')
	const savedShowEconomySettings = localStorage.getItem('showEconomySettings')
	const savedRoundToWhole = localStorage.getItem('roundToWhole')
	const savedViewMode = localStorage.getItem('viewMode')

	if (savedPriceMultiplier !== null) {
		priceMultiplier.value = parseFloat(savedPriceMultiplier)
	}
	if (savedSellMargin !== null) {
		sellMargin.value = parseFloat(savedSellMargin)
	}
	if (savedShowEconomySettings !== null) {
		showEconomySettings.value = savedShowEconomySettings === 'true'
	}
	if (savedRoundToWhole !== null) {
		roundToWhole.value = savedRoundToWhole === 'true'
	}
	if (savedViewMode !== null) {
		viewMode.value = savedViewMode
	}
}

// Save config to localStorage
function saveEconomyConfig() {
	localStorage.setItem('priceMultiplier', priceMultiplier.value.toString())
	localStorage.setItem('sellMargin', sellMargin.value.toString())
	localStorage.setItem('showEconomySettings', showEconomySettings.value.toString())
	localStorage.setItem('roundToWhole', roundToWhole.value.toString())
	localStorage.setItem('viewMode', viewMode.value)
}

// Watch for changes and save to localStorage
watch([priceMultiplier, sellMargin, showEconomySettings, roundToWhole, viewMode], () => {
	saveEconomyConfig()
})

// Reset to defaults
function resetEconomyConfig() {
	priceMultiplier.value = 1
	sellMargin.value = 0.3
	roundToWhole.value = false
}

function toggleEconomySettings() {
	showEconomySettings.value = !showEconomySettings.value
}

const filteredGroupedItems = computed(() => {
	if (!allItemsCollection.value) return {}
	const query = searchQuery.value.trim().toLowerCase()
	return enabledCategories.reduce((acc, cat) => {
		const items = groupedItems.value[cat] || []
		acc[cat] = query
			? items.filter((item) => item.name && item.name.toLowerCase().includes(query))
			: items
		return acc
	}, {})
})

const filteredUncategorizedItems = computed(() => {
	if (!allItemsCollection.value) return []
	const query = searchQuery.value.trim().toLowerCase()
	const items = uncategorizedItems.value
	return query
		? items.filter((item) => item.name && item.name.toLowerCase().includes(query))
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
		items.push(...filteredUncategorizedItems.value)
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
const user = useCurrentUser()

// Initialize from URL query parameters
function initializeFromQuery() {
	const catParam = route.query.cat
	const uncatParam = route.query.uncat

	if (catParam) {
		const selectedCategories = catParam
			.split(',')
			.map((c) => c.trim())
			.filter((c) => enabledCategories.includes(c))
		if (selectedCategories.length > 0) {
			visibleCategories.value = selectedCategories
		}
	}

	if (uncatParam !== undefined) {
		showUncategorised.value = uncatParam === 'true' || uncatParam === '1'
	}
}

// Update URL query parameters
function updateQuery() {
	const query = {}

	// Only add cat param if not all categories are selected
	if (visibleCategories.value.length !== enabledCategories.length) {
		query.cat = visibleCategories.value.join(',')
	}

	// Only add uncat param if it's false (since true is default for logged in users)
	if (!showUncategorised.value) {
		query.uncat = 'false'
	}

	// Update URL without triggering navigation
	router.replace({ query })
}

// Watch for changes and update URL
watch(
	[visibleCategories, showUncategorised],
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
		}
	},
	{ immediate: true }
)

// Initialize from query on mount
onMounted(() => {
	initializeFromQuery()

	// Check if alert was previously dismissed
	const dismissed = localStorage.getItem('homeAlertDismissed')
	if (dismissed === 'true') {
		showAlert.value = false
	}

	// Initialize mobile filters visibility from localStorage
	const mobileFiltersState = localStorage.getItem('showMobileFilters')
	if (mobileFiltersState !== null) {
		showMobileFilters.value = mobileFiltersState === 'true'
	}

	// Initialize economy config from localStorage
	loadEconomyConfig()
})

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

console.log('visibleCategories', visibleCategories)
console.log('filteredGroupedItems', filteredGroupedItems)
</script>

<template>
	<!-- Dismissible Info Alert -->
	<div
		v-if="showAlert"
		class="bg-norway bg-opacity-20 border-l-4 border-laurel text-heavy-metal p-2 sm:p-4 relative mb-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center">
				<svg class="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clip-rule="evenodd"></path>
				</svg>
				<span class="text-sm sm:text-base">
					Hey! Check out the
					<router-link to="/updates" class="underline hover:text-gray-asparagus">
						<span>Updates</span>
					</router-link>
					page for latest updates and roadmap to see what I've got planned.
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

	<main>
		<div class="my-4 flex flex-col sm:flex-row sm:gap-4">
			<input
				type="text"
				v-model="searchQuery"
				placeholder="Search for an item..."
				class="border-2 border-gray-asparagus rounded px-3 py-2 w-full sm:max-w-md mb-2 sm:mb-0" />
			<div class="flex gap-2 sm:gap-0 sm:ml-2">
				<button
					@click="resetCategories"
					class="bg-laurel text-white border-2 border-gray-asparagus rounded px-3 py-2 transition flex-1 sm:flex-none sm:whitespace-nowrap sm:mr-2">
					Reset
				</button>
				<button
					@click="toggleAllCategories"
					:class="[
						allVisible
							? 'bg-norway text-heavy-metal border-2 border-gray-asparagus'
							: 'bg-gray-asparagus text-white border-2 border-gray-asparagus',
						'rounded px-3 py-2 transition flex-1 sm:flex-none text-sm sm:text-base sm:whitespace-nowrap'
					]">
					{{ allVisible ? 'Hide all categories' : 'Show all categories' }}
				</button>
			</div>
		</div>

		<!-- Customisation Section -->
		<div class="mb-4">
			<button
				@click="toggleEconomySettings"
				class="text-gray-asparagus hover:text-heavy-metal underline text-sm">
				{{ showEconomySettings ? 'Hide customisation' : 'Show customisation' }}
			</button>
		</div>

		<!-- Economy Configuration (Collapsible) -->
		<div
			v-if="showEconomySettings"
			class="bg-norway bg-opacity-20 border border-gray-300 rounded p-3 mb-4">
			<h4 class="text-base font-semibold text-heavy-metal mb-3">Prices</h4>
			<div class="flex flex-wrap items-center gap-4 mb-3">
				<!-- Price Multiplier -->
				<div class="flex items-center gap-2">
					<label
						for="priceMultiplier"
						class="text-sm font-medium text-heavy-metal whitespace-nowrap">
						Buy ×
					</label>
					<input
						id="priceMultiplier"
						v-model.number="priceMultiplier"
						type="number"
						min="0.1"
						max="10"
						step="0.1"
						class="border-2 border-gray-asparagus rounded px-2 py-1 w-16 text-sm" />
				</div>

				<!-- Sell Margin -->
				<div class="flex items-center gap-2">
					<label
						for="sellMargin"
						class="text-sm font-medium text-heavy-metal whitespace-nowrap">
						Sell %
					</label>
					<input
						id="sellMargin"
						v-model.number="sellMarginPercentage"
						type="number"
						min="1"
						max="100"
						step="1"
						class="border-2 border-gray-asparagus rounded px-2 py-1 w-16 text-sm" />
				</div>

				<!-- Reset Button -->
				<button
					@click="resetEconomyConfig"
					class="bg-laurel text-white border-2 border-gray-asparagus rounded px-2 py-1 text-sm transition hover:bg-opacity-90">
					Reset
				</button>
			</div>

			<!-- Round to Whole (separate line) -->
			<div class="flex items-center gap-2">
				<input id="roundToWhole" v-model="roundToWhole" type="checkbox" class="w-4 h-4" />
				<label for="roundToWhole" class="text-sm text-heavy-metal">Round to whole</label>
			</div>
		</div>

		<!-- Mobile filters toggle (only visible on mobile) -->
		<div class="block sm:hidden mb-3">
			<button
				@click="toggleMobileFilters"
				class="text-gray-asparagus hover:text-heavy-metal underline text-sm">
				{{ showMobileFilters ? 'Hide filters' : 'Show filters' }}
			</button>
		</div>

		<div
			:class="[
				'flex flex-wrap gap-2 mb-4 justify-start',
				{ hidden: !showMobileFilters },
				'sm:flex'
			]">
			<button
				v-for="cat in enabledCategories"
				:key="cat"
				@click="toggleCategory(cat)"
				:class="[
					visibleCategories.includes(cat)
						? 'bg-gray-asparagus text-white'
						: 'bg-norway text-heavy-metal',
					'border-2 border-gray-asparagus rounded px-3 py-1 transition',
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
					'border-2 border-gray-asparagus rounded px-3 py-1 transition',
					filteredUncategorizedItems.length === 0
						? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
						: ''
				]"
				:disabled="filteredUncategorizedItems.length === 0">
				Uncategorised ({{ filteredUncategorizedItems.length }})
			</button>
		</div>
		<div class="mb-4 text-sm text-gray-asparagus">
			Showing {{ allVisibleItems.length }} item{{ allVisibleItems.length === 1 ? '' : 's' }}
		</div>

		<!-- View Mode Toggle -->
		<div class="mb-4 flex items-center gap-3">
			<span class="text-sm font-medium text-heavy-metal">View as:</span>
			<div class="flex border-2 border-gray-asparagus rounded overflow-hidden">
				<button
					@click="viewMode = 'categories'"
					:class="[
						viewMode === 'categories'
							? 'bg-gray-asparagus text-white'
							: 'bg-norway text-heavy-metal hover:bg-gray-100',
						'px-3 py-1 text-sm font-medium transition border-r border-gray-asparagus last:border-r-0'
					]">
					Categories
				</button>
				<button
					@click="viewMode = 'list'"
					:class="[
						viewMode === 'list'
							? 'bg-gray-asparagus text-white'
							: 'bg-norway text-heavy-metal hover:bg-gray-100',
						'px-3 py-1 text-sm font-medium transition'
					]">
					List
				</button>
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
					:viewMode="viewMode" />
			</template>
			<ItemTable
				v-if="user?.email && showUncategorised && filteredUncategorizedItems.length > 0"
				:collection="filteredUncategorizedItems"
				category="Uncategorised"
				:categories="enabledCategories"
				:economyConfig="economyConfig"
				:viewMode="viewMode" />

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
				:viewMode="viewMode" />

			<!-- Empty state for list view -->
			<div v-if="allVisibleItems.length === 0" class="text-center py-12">
				<div class="text-gray-asparagus text-lg mb-2">No items found</div>
				<div class="text-sm text-gray-500">
					Try adjusting your search terms or category filters
				</div>
			</div>
		</template>
	</main>
</template>
