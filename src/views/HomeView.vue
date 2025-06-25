<script setup>
import { useFirestore, useCollection } from 'vuefire'
import { query, collection, orderBy, where } from 'firebase/firestore'
import { computed, ref, watch, onMounted } from 'vue'
import { useCurrentUser } from 'vuefire'
import { useRoute, useRouter } from 'vue-router'

import HeaderIntro from '../components/HeaderIntro.vue'
import ItemTable from '../components/ItemTable.vue'
import { categories } from '../constants.js'

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
	return allItemsCollection.value.filter(item => {
		const isUncat = !item.category || !categories.includes(item.category)
		const hasImage = item.image && item.image.trim() !== ''
		return isUncat && (user.value?.email || hasImage)
	})
})

const searchQuery = ref('')

const filteredGroupedItems = computed(() => {
	if (!allItemsCollection.value) return {}
	const query = searchQuery.value.trim().toLowerCase()
	return categories.reduce((acc, cat) => {
		const items = groupedItems.value[cat] || []
		acc[cat] = query
			? items.filter(item => item.name && item.name.toLowerCase().includes(query))
			: items
		return acc
	}, {})
})

const filteredUncategorizedItems = computed(() => {
	if (!allItemsCollection.value) return []
	const query = searchQuery.value.trim().toLowerCase()
	const items = uncategorizedItems.value
	return query
		? items.filter(item => item.name && item.name.toLowerCase().includes(query))
		: items
})

const economyConfig = {
	priceMultiplier: 1,
	sellMargin: 0.3
}

const visibleCategories = ref([...categories])
const showUncategorised = ref(true)
const user = useCurrentUser()

// Initialize from URL query parameters
function initializeFromQuery() {
	const catParam = route.query.cat
	const uncatParam = route.query.uncat
	
	if (catParam) {
		const selectedCategories = catParam.split(',').map(c => c.trim()).filter(c => categories.includes(c))
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
	if (visibleCategories.value.length !== categories.length) {
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
watch([visibleCategories, showUncategorised], () => {
	updateQuery()
}, { deep: true })

// Hide Uncategorised by default for not logged in users
watch(user, (val) => {
	if (!val?.email) {
		showUncategorised.value = false
	} else {
		showUncategorised.value = true
	}
}, { immediate: true })

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
})

const allVisible = computed(() => visibleCategories.value.length === categories.length)

const totalVisibleItems = computed(() => {
	let total = 0
	// Count items from visible categories
	for (const cat of visibleCategories.value) {
		total += filteredGroupedItems.value[cat]?.length || 0
	}
	// Add uncategorized items if shown
	if (showUncategorised.value) {
		total += filteredUncategorizedItems.value.length
	}
	return total
})

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
	visibleCategories.value = [...categories]
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
	visibleCategories.value = [...categories]
	showUncategorised.value = true
	searchQuery.value = ''
}

console.log('visibleCategories', visibleCategories)
console.log('filteredGroupedItems', filteredGroupedItems)
</script>

<template>
	<!-- Dismissible Info Alert -->
	<div v-if="showAlert" class="bg-norway bg-opacity-20 border-l-4 border-laurel text-heavy-metal p-2 sm:p-4 relative mb-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center">
				<svg class="w-4 h-4 sm:w-5 sm:h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
				</svg>
				<span class="text-sm sm:text-base">Hey! Check out the <router-link to="/updates" class="underline hover:text-gray-asparagus">Updates</router-link> page for latest updates and roadmap to see what I've got planned.</span>
			</div>
			<button 
				@click="dismissAlert"
				class="text-gray-asparagus hover:text-heavy-metal ml-2 sm:ml-4 p-1"
				aria-label="Dismiss alert"
			>
				<svg class="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
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
				class="border-2 border-gray-asparagus rounded px-3 py-2 w-full sm:max-w-md mb-2 sm:mb-0"
			/>
			<div class="flex gap-2 sm:gap-0 sm:ml-2">
				<button
					@click="resetCategories"
					class="bg-laurel text-white border-2 border-gray-asparagus rounded px-3 py-2 transition flex-1 sm:flex-none sm:whitespace-nowrap sm:mr-2"
				>
					Reset
				</button>
				<button
					@click="toggleAllCategories"
					:class="[allVisible ? 'bg-norway text-heavy-metal border-2 border-gray-asparagus' : 'bg-gray-asparagus text-white border-2 border-gray-asparagus', 'rounded px-3 py-2 transition flex-1 sm:flex-none text-sm sm:text-base sm:whitespace-nowrap']"
				>
					{{ allVisible ? 'Hide all categories' : 'Show all categories' }}
				</button>
			</div>
		</div>
		
		<!-- Mobile filters toggle (only visible on mobile) -->
		<div class="block sm:hidden mb-3">
			<button
				@click="toggleMobileFilters"
				class="text-gray-asparagus hover:text-heavy-metal underline text-sm"
			>
				{{ showMobileFilters ? 'Hide filters' : 'Show filters' }}
			</button>
		</div>
		
		<div :class="['flex flex-wrap gap-2 mb-4 justify-start', {'hidden': !showMobileFilters}, 'sm:flex']">
			<button
				v-for="cat in categories"
				:key="cat"
				@click="toggleCategory(cat)"
				:class="[
					visibleCategories.includes(cat)
						? 'bg-gray-asparagus text-white'
						: 'bg-norway text-heavy-metal',
					'border-2 border-gray-asparagus rounded px-3 py-1 transition',
					(!filteredGroupedItems[cat] || filteredGroupedItems[cat].length === 0)
						? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
						: ''
				]"
				:disabled="!filteredGroupedItems[cat] || filteredGroupedItems[cat].length === 0"
			>
				{{ cat.charAt(0).toUpperCase() + cat.slice(1) }} ({{ filteredGroupedItems[cat]?.length || 0 }})
			</button>
			<button
				v-if="user?.email"
				@click="toggleUncategorised"
				:class="[
					showUncategorised
						? 'bg-gray-asparagus text-white'
						: 'bg-norway text-heavy-metal',
					'border-2 border-gray-asparagus rounded px-3 py-1 transition',
					(filteredUncategorizedItems.length === 0)
						? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
						: ''
				]"
				:disabled="filteredUncategorizedItems.length === 0"
			>
				Uncategorised ({{ filteredUncategorizedItems.length }})
			</button>
		</div>
		<div class="mb-4 text-sm text-gray-asparagus">
			Showing {{ totalVisibleItems }} item{{ totalVisibleItems === 1 ? '' : 's' }}
		</div>
		<template v-for="cat in categories" :key="cat">
			<ItemTable
				v-if="visibleCategories.includes(cat)"
				:collection="filteredGroupedItems[cat] || []"
				:category="cat"
				:categories="categories"
				:economyConfig="economyConfig"
			/>
		</template>
		<ItemTable
			v-if="user?.email && showUncategorised && filteredUncategorizedItems.length > 0"
			:collection="filteredUncategorizedItems"
			category="Uncategorised"
			:categories="categories"
			:economyConfig="economyConfig"
		/>
	</main>
	<footer class="bg-heavy-metal p-3 border-2 border-white">
		<a href="#top" class="text-norway underline block mb-4 text-sm">Back to top</a>
		<p class="text-norway text-sm">
			© Copyright 2021 Devillion Ltd<br />
			minecraft-economy-price-guide.net is not affiliated with
			<a href="https://minecraft.net/" class="underline">Mojang</a>.
		</p>
	</footer>
</template>
