<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useFirestore } from 'vuefire'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { useAdmin } from '../../utils/admin.js'
import { ArrowUpIcon, ArrowDownIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'

const db = useFirestore()
const { user, canBulkUpdate } = useAdmin()
const itemsJson = ref([])
const dbItems = ref([])
const loading = ref(true)
const showOnlyNeedingUpdate = ref(true)
const selectedVersion = ref('1.21')
const searchQuery = ref('')

const sortKey = ref('name')
const sortAsc = ref(true)

const updating = ref(false)
const updateResult = ref(null)
const updatingItem = ref(null)
const updatedItems = ref([])
const selectedItems = ref([])

// Available Minecraft versions
const availableVersions = ['1.16', '1.17', '1.18', '1.19', '1.20', '1.21']

// Load items from JSON file based on selected version
async function loadJsonItems() {
	const versionKey = selectedVersion.value.replace('.', '_')
	const response = await fetch(`/resource/items_${versionKey}.json`)
	itemsJson.value = await response.json()
}

// Watch for version changes and reload data
watch(selectedVersion, async () => {
	loading.value = true
	selectedItems.value = []
	updatedItems.value = []
	updateResult.value = null
	await loadJsonItems()
	await loadDbItems()
	loading.value = false
})

// Load items from Firestore
async function loadDbItems() {
	const snapshot = await getDocs(collection(db, 'items'))
	dbItems.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

onMounted(async () => {
	await loadJsonItems()
	await loadDbItems()
	loading.value = false
})

// Normalize category names to 1.21 standard names
function normalizeCategory(category) {
	const normalizations = {
		'breakable': 'durability',
		'wearable': 'equippable',
		'digger': 'mining',
		'fishing_rod': 'fishing',
		'vanishable': 'vanishing',
		'armor_feet': 'foot_armor',
		'armor_head': 'head_armor'
	}
	return normalizations[category] || category
}

// Find DB item by material_id
function findDbItem(jsonName) {
	return dbItems.value.find((item) => item.material_id === jsonName)
}

// Check if item needs update
function needsUpdate(item) {
	const dbItem = findDbItem(item.name)
	if (!dbItem) return false

	const jsonCategories = (item.enchantCategories || []).map(normalizeCategory)
	const dbCategories = dbItem.enchantCategories || []

	// Normalize arrays for comparison (sort and compare)
	const jsonNormalized = [...jsonCategories].sort().join(',')
	const dbNormalized = [...dbCategories].sort().join(',')

	return jsonNormalized !== dbNormalized
}

// Get status for an item
function getItemStatus(item) {
	const dbItem = findDbItem(item.name)
	if (!dbItem) return 'not_in_db'

	if (needsUpdate(item)) return 'needs_update'
	return 'up_to_date'
}

// Get current enchantCategories from DB
function getCurrentCategories(item) {
	const dbItem = findDbItem(item.name)
	return dbItem?.enchantCategories || []
}

// Get proposed enchantCategories from JSON (normalized)
function getProposedCategories(item) {
	const categories = item.enchantCategories || []
	return categories.map(normalizeCategory)
}

const filteredItems = computed(() => {
	let items = itemsJson.value

	// Filter by search query
	if (searchQuery.value.trim()) {
		const query = searchQuery.value.toLowerCase().trim()
		items = items.filter(
			(item) =>
				item.name?.toLowerCase().includes(query) ||
				item.displayName?.toLowerCase().includes(query)
		)
	}

	// Filter by status
	if (showOnlyNeedingUpdate.value) {
		items = items.filter((item) => needsUpdate(item))
	}

	// Sort
	return [...items].sort((a, b) => {
		let aVal = a[sortKey.value]?.toString().toLowerCase() || ''
		let bVal = b[sortKey.value]?.toString().toLowerCase() || ''
		if (aVal < bVal) return sortAsc.value ? -1 : 1
		if (aVal > bVal) return sortAsc.value ? 1 : -1
		return 0
	})
})

function setSort(key) {
	if (sortKey.value === key) {
		sortAsc.value = !sortAsc.value
	} else {
		sortKey.value = key
		sortAsc.value = true
	}
}

async function updateSelectedItems() {
	updating.value = true
	updateResult.value = null
	const toUpdate = filteredItems.value.filter((item) =>
		selectedItems.value.includes(item.name)
	)
	let updated = 0
	let skipped = 0
	let failed = 0

	for (const item of toUpdate) {
		const dbItem = findDbItem(item.name)
		if (!dbItem || !needsUpdate(item)) {
			skipped++
			continue
		}

		try {
			const proposedCategories = getProposedCategories(item)
			await updateDoc(doc(db, 'items', dbItem.id), {
				enchantCategories: proposedCategories,
				enchantable: true
			})
			updated++
			updatedItems.value.push(item.name)
		} catch (e) {
			console.error('Failed to update item:', item.name, e)
			failed++
		}
	}

	updateResult.value = `Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`
	await loadDbItems()
	updating.value = false
	selectedItems.value = []
}

async function updateSingleItem(item) {
	const dbItem = findDbItem(item.name)
	if (!dbItem || !needsUpdate(item)) return

	updatingItem.value = item.name
	try {
		const proposedCategories = getProposedCategories(item)
		await updateDoc(doc(db, 'items', dbItem.id), {
			enchantCategories: proposedCategories,
			enchantable: true
		})
		updatedItems.value.push(item.name)
		await loadDbItems()
	} catch (e) {
		console.error('Failed to update item:', item.name, e)
	}
	updatingItem.value = null
}

function toggleSelectAllNeedingUpdate(checked) {
	if (checked) {
		selectedItems.value = filteredItems.value
			.filter((item) => needsUpdate(item))
			.map((item) => item.name)
	} else {
		selectedItems.value = []
	}
}

function isSelected(itemName) {
	return selectedItems.value.includes(itemName)
}

function toggleSelectItem(itemName) {
	if (isSelected(itemName)) {
		selectedItems.value = selectedItems.value.filter((name) => name !== itemName)
	} else {
		selectedItems.value.push(itemName)
	}
}

const allNeedingUpdateSelected = computed(() => {
	const needingUpdate = filteredItems.value
		.filter((item) => needsUpdate(item))
		.map((item) => item.name)
	return needingUpdate.length > 0 && needingUpdate.every((name) => isSelected(name))
})

const anySelected = computed(() => selectedItems.value.length > 0)

// Reset filters
function resetFilters() {
	searchQuery.value = ''
	showOnlyNeedingUpdate.value = true
}
</script>

<template>
	<div v-if="canBulkUpdate" class="p-4 pt-8">
		<!-- Back Button -->
		<div class="mb-4">
			<RouterLink
				to="/admin"
				class="inline-flex items-center rounded-md bg-white text-gray-700 border-2 border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 transition">
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
				</svg>
				Back to Admin
			</RouterLink>
		</div>

		<h1 class="text-3xl font-bold text-gray-900 mb-6">Migrate Enchantment Categories</h1>

		<!-- Version Selector -->
		<div class="mb-6">
			<div class="flex items-center gap-2">
				<label class="font-semibold">Version:</label>
				<select
					v-model="selectedVersion"
					class="px-3 py-1 border-2 border-gray-asparagus rounded focus:outline-none focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus">
					<option v-for="version in availableVersions" :key="version" :value="version">
						{{ version }}
					</option>
				</select>
			</div>
		</div>

		<div v-if="loading">Loading...</div>
		<div v-else>
			<!-- Search and Filters -->
			<div class="mb-4">
				<div class="mb-4 flex gap-2">
					<input
						type="text"
						v-model="searchQuery"
						placeholder="Search by name or material_id..."
						class="border-2 border-gray-asparagus rounded px-3 py-1 flex-1 max-w-md" />
					<button
						@click="resetFilters"
						class="inline-flex items-center px-3 py-1 border-2 border-gray-asparagus rounded text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
						<ArrowPathIcon class="w-4 h-4 mr-1" />
						Reset
					</button>
				</div>
				<label class="flex items-center">
					<input
						type="checkbox"
						v-model="showOnlyNeedingUpdate"
						class="mr-2 checkbox-input" />
					Show only items needing updates
				</label>
			</div>

			<!-- Bulk Actions -->
			<div class="mb-4">
				<button
					v-if="anySelected"
					@click="updateSelectedItems"
					:disabled="updating || selectedItems.length === 0"
					class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
					Update Selected Items
				</button>
				<span v-if="updating" class="ml-2">Updating...</span>
				<span v-if="updateResult" class="ml-2">{{ updateResult }}</span>
			</div>

			<!-- Table -->
			<div class="bg-white rounded-lg shadow-md overflow-hidden">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									<input
										type="checkbox"
										:checked="allNeedingUpdateSelected"
										@change="toggleSelectAllNeedingUpdate($event.target.checked)"
										:disabled="
											filteredItems.filter((item) => needsUpdate(item)).length === 0
										"
										class="checkbox-input" />
								</th>
								<th
									@click="setSort('name')"
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
									<div class="flex items-center gap-1">
										Name
										<ArrowUpIcon
											v-if="sortKey === 'name' && sortAsc"
											class="w-4 h-4 text-gray-700" />
										<ArrowDownIcon
											v-else-if="sortKey === 'name' && !sortAsc"
											class="w-4 h-4 text-gray-700" />
									</div>
								</th>
								<th
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Current (DB)
								</th>
								<th
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Proposed (Resource)
								</th>
								<th
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Status
								</th>
								<th
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Action
								</th>
							</tr>
						</thead>
						<tbody class="bg-white divide-y divide-gray-200">
							<tr
								v-for="item in filteredItems"
								:key="item.name"
								:class="{
									'bg-green-50': isSelected(item.name)
								}">
								<td class="px-4 py-3">
									<input
										v-if="needsUpdate(item)"
										type="checkbox"
										:checked="isSelected(item.name)"
										@change="toggleSelectItem(item.name)"
										class="checkbox-input" />
								</td>
								<td class="px-4 py-3">
									<div class="font-medium text-gray-900">{{ item.displayName }}</div>
									<div class="text-sm text-gray-500">{{ item.name }}</div>
								</td>
								<td class="px-4 py-3">
									<div class="text-sm">
										<span
											v-if="getCurrentCategories(item).length > 0"
											class="text-gray-900">
											{{ getCurrentCategories(item).join(', ') }}
										</span>
										<span v-else class="text-gray-400 italic">(none)</span>
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="text-sm">
										<span
											v-if="getProposedCategories(item).length > 0"
											class="text-gray-900">
											{{ getProposedCategories(item).join(', ') }}
										</span>
										<span v-else class="text-gray-400 italic">(none)</span>
									</div>
								</td>
								<td class="px-4 py-3">
									<span
										v-if="getItemStatus(item) === 'needs_update'"
										class="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
										Needs Update
									</span>
									<span
										v-else-if="getItemStatus(item) === 'up_to_date'"
										class="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
										Up to Date
									</span>
									<span
										v-else
										class="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
										Not in DB
									</span>
								</td>
								<td class="px-4 py-3">
									<button
										v-if="needsUpdate(item) && updatingItem !== item.name"
										@click="updateSingleItem(item)"
										class="rounded bg-semantic-success px-3 py-1 text-sm text-white hover:bg-opacity-80 transition-colors">
										Update
									</button>
									<span v-else-if="updatingItem === item.name" class="text-gray-500">
										Updating...
									</span>
									<span
										v-else-if="getItemStatus(item) === 'up_to_date'"
										class="text-green-600">
										✓
									</span>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
	<div v-else-if="user?.email" class="p-4 pt-8">
		<div class="text-center">
			<h2 class="text-xl font-bold mb-4">Access Denied</h2>
			<p class="text-gray-600 mb-4">
				You need bulk update privileges to migrate enchantment categories.
			</p>
			<RouterLink to="/" class="text-blue-600 hover:underline">Return to Home</RouterLink>
		</div>
	</div>
</template>

<style scoped>
.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}
</style>
