<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useFirestore } from 'vuefire'
import { collection, getDocs } from 'firebase/firestore'
import { enabledCategories, versions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'
import { filterItemsByVersion, filterItemsByPriceAndImage } from '../utils/homepage.js'
import { getItemImageUrl } from '../utils/image.js'
import { getEffectivePriceMemoized, formatCurrency } from '../utils/pricing.js'
import { SparklesIcon } from '@heroicons/vue/24/solid'

const db = useFirestore()
const { user } = useAdmin()

const loading = ref(true)
const allItems = ref([])
const selectedVersion = ref('1.21')

const randomCategoryResult = ref(null)
const randomItemsCount = ref(5)
const randomItemsResult = ref([])

const selectedCategories = ref([])
const randomFromCategoriesCount = ref(5)
const randomFromCategoriesResult = ref([])

const versionFilteredItems = computed(() => {
	const items = allItems.value.filter((item) => {
		if (!item.version) return false
		const [itemMaj, itemMin] = item.version.split('.').map(Number)
		const [targetMaj, targetMin] = selectedVersion.value.split('.').map(Number)
		if (itemMaj > targetMaj) return false
		if (itemMaj < targetMaj) return true
		return itemMin <= targetMin
	})
	return filterItemsByVersion(items, selectedVersion.value)
})

const eligibleItems = computed(() => {
	return filterItemsByPriceAndImage(
		versionFilteredItems.value,
		user.value,
		selectedVersion.value
	)
})

function shuffle(arr) {
	const a = [...arr]
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[a[i], a[j]] = [a[j], a[i]]
	}
	return a
}

function getRandomCategory() {
	randomCategoryResult.value =
		enabledCategories[Math.floor(Math.random() * enabledCategories.length)]
}

function getRandomItems() {
	const count = Math.min(
		Math.max(1, Math.floor(Number(randomItemsCount.value)) || 5),
		50
	)
	randomItemsResult.value = shuffle(eligibleItems.value).slice(0, count)
}

function toggleCategory(cat) {
	const idx = selectedCategories.value.indexOf(cat)
	if (idx >= 0) {
		selectedCategories.value = selectedCategories.value.filter((c) => c !== cat)
	} else {
		selectedCategories.value = [...selectedCategories.value, cat]
	}
}

function getRandomFromCategories() {
	if (selectedCategories.value.length === 0) {
		randomFromCategoriesResult.value = []
		return
	}
	const pool = eligibleItems.value.filter((item) =>
		selectedCategories.value.includes(item.category)
	)
	const count = Math.min(
		Math.max(1, Math.floor(Number(randomFromCategoriesCount.value)) || 5),
		50
	)
	randomFromCategoriesResult.value = shuffle(pool).slice(0, count)
}

function getItemPrice(item) {
	const versionKey = selectedVersion.value.replace('.', '_')
	const price = getEffectivePriceMemoized(item, versionKey)
	return price ? formatCurrency(price) : '—'
}

async function loadItems() {
	loading.value = true
	const snapshot = await getDocs(collection(db, 'items'))
	allItems.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
	loading.value = false
}

onMounted(loadItems)
</script>

<template>
	<div class="p-4 pt-8">
		<RouterLink
			to="/admin"
			class="inline-flex items-center rounded-md bg-white text-gray-700 border-2 border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 transition mb-6">
			<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18" />
			</svg>
			Back to Admin
		</RouterLink>
		<div class="mb-8">
			<div class="flex items-center mb-4">
				<div
					class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mr-4">
					<SparklesIcon class="w-6 h-6 text-indigo-600" />
				</div>
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Random Picker</h1>
					<p class="text-gray-600">
						Pull random categories and items from the price guide. Handy for testing
						or when you just want to leave it to fate.
					</p>
				</div>
			</div>
		</div>

		<div v-if="loading" class="text-gray-500 py-8">Loading items…</div>

		<template v-else>
			<div class="mb-6">
				<label class="block text-sm font-medium text-gray-700 mb-1"
					>Minecraft version</label
				>
				<select
					v-model="selectedVersion"
					class="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
					<option v-for="v in versions" :key="v" :value="v">{{ v }}</option>
				</select>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
				<div class="bg-white rounded-lg shadow border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-3">Random category</h2>
					<p class="text-sm text-gray-600 mb-4">
						Pick one random category from the price guide.
					</p>
					<button
						@click="getRandomCategory"
						class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
						<SparklesIcon class="w-4 h-4 mr-2" />
						Pick random category
					</button>
					<div
						v-if="randomCategoryResult"
						class="mt-4 p-4 bg-indigo-50 rounded-md border border-indigo-100">
						<span class="text-sm font-medium text-gray-700">Result: </span>
						<span class="font-semibold text-indigo-700 capitalize">{{
							randomCategoryResult
						}}</span>
					</div>
				</div>

				<div class="bg-white rounded-lg shadow border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-3">Random items</h2>
					<p class="text-sm text-gray-600 mb-4">
						Pick random items from the entire guide (any category).
					</p>
					<div class="flex flex-wrap items-center gap-3 mb-4">
						<input
							v-model.number="randomItemsCount"
							type="number"
							min="1"
							max="50"
							class="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
						<span class="text-sm text-gray-600">items</span>
						<button
							@click="getRandomItems"
							class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
							<SparklesIcon class="w-4 h-4 mr-2" />
							Pick random
						</button>
					</div>
					<div
						v-if="randomItemsResult.length"
						class="flex flex-wrap gap-2 mt-4 max-h-48 overflow-y-auto">
						<RouterLink
							v-for="item in randomItemsResult"
							:key="item.id"
							:to="{ path: '/edit/' + item.id }"
							class="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition text-sm">
							<img
								v-if="item.image"
								:src="getItemImageUrl(item.image, item.enchantments)"
								:alt="item.name"
								class="w-6 h-6 object-contain" />
							<span class="font-medium text-gray-900">{{ item.name }}</span>
							<span class="text-gray-500">{{ getItemPrice(item) }}</span>
						</RouterLink>
					</div>
				</div>
			</div>

			<div class="bg-white rounded-lg shadow border border-gray-200 p-6">
				<h2 class="text-lg font-semibold text-gray-900 mb-3">
					Random items from selected categories
				</h2>
				<p class="text-sm text-gray-600 mb-4">
					Pick categories below, then draw random items from only those categories.
				</p>
				<div class="flex flex-wrap gap-2 mb-4">
					<button
						v-for="cat in enabledCategories"
						:key="cat"
						@click="toggleCategory(cat)"
						:class="[
							'px-3 py-1.5 rounded-full text-sm font-medium transition',
							selectedCategories.includes(cat)
								? 'bg-indigo-600 text-white'
								: 'bg-gray-100 text-gray-700 hover:bg-gray-200'
						]">
						{{ cat }}
					</button>
				</div>
				<div class="flex flex-wrap items-center gap-3 mb-4">
					<input
						v-model.number="randomFromCategoriesCount"
						type="number"
						min="1"
						max="50"
						class="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
					<span class="text-sm text-gray-600">items</span>
					<button
						@click="getRandomFromCategories"
						:disabled="selectedCategories.length === 0"
						class="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
						<SparklesIcon class="w-4 h-4 mr-2" />
						Pick random from selected
					</button>
				</div>
				<div
					v-if="randomFromCategoriesResult.length"
					class="flex flex-wrap gap-2 mt-4 max-h-48 overflow-y-auto">
					<RouterLink
						v-for="item in randomFromCategoriesResult"
						:key="item.id"
						:to="{ path: '/edit/' + item.id }"
						class="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition text-sm">
						<img
							v-if="item.image"
							:src="getItemImageUrl(item.image, item.enchantments)"
							:alt="item.name"
							class="w-6 h-6 object-contain" />
						<span class="font-medium text-gray-900">{{ item.name }}</span>
						<span class="text-gray-500">{{ getItemPrice(item) }}</span>
					</RouterLink>
				</div>
				<p
					v-else-if="selectedCategories.length === 0"
					class="text-sm text-gray-400 mt-2">
					Select at least one category to pick from.
				</p>
			</div>
		</template>
	</div>
</template>
