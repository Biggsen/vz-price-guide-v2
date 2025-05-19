<script setup>
import { useFirestore, useCollection } from 'vuefire'
import { query, collection, orderBy, where } from 'firebase/firestore'
import { computed, ref, watch } from 'vue'
import { useCurrentUser } from 'vuefire'

import HeaderIntro from '../components/HeaderIntro.vue'
import ItemTable from '../components/ItemTable.vue'
import { categories } from '../constants.js'

const db = useFirestore()

const allItemsQuery = query(
	collection(db, 'items'),
	orderBy('category', 'asc'),
	orderBy('subcategory', 'asc'),
	orderBy('name', 'asc')
)
const allItemsCollection = useCollection(allItemsQuery)

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

// Hide Uncategorised by default for not logged in users
watch(user, (val) => {
	if (!val?.email) {
		showUncategorised.value = false
	} else {
		showUncategorised.value = true
	}
}, { immediate: true })

const allVisible = computed(() => visibleCategories.value.length === categories.length)

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
	<main>

		<div class="my-4 flex gap-4">
			<input
				type="text"
				v-model="searchQuery"
				placeholder="Search for an item..."
				class="border-2 border-gray-asparagus rounded px-3 py-1 w-full max-w-md"
			/>
			<button
				@click="resetCategories"
				class="bg-laurel text-white border-2 border-gray-asparagus rounded px-3 py-1 transition ml-2 whitespace-nowrap"
			>
				Reset
			</button>
			<button
				@click="toggleAllCategories"
				:class="[allVisible ? 'bg-norway text-heavy-metal border-2 border-gray-asparagus' : 'bg-gray-asparagus text-white border-2 border-gray-asparagus', 'rounded px-3 py-1 transition']"
			>
				{{ allVisible ? 'Hide all categories' : 'Show all categories' }}
			</button>
		</div>
		<div class="flex flex-wrap gap-2 mb-4 justify-start">
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
				{{ cat.charAt(0).toUpperCase() + cat.slice(1) }}
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
				Uncategorised
			</button>
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
