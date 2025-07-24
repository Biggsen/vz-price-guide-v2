<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useFirestore } from 'vuefire'
import { collection, getDocs, addDoc } from 'firebase/firestore'
import { useAdmin } from '../utils/admin.js'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/vue/24/outline'

const db = useFirestore()
const { user, canViewMissingItems } = useAdmin()
const itemsJson = ref([])
const dbItems = ref([])
const loading = ref(true)
const showOnlyMissing = ref(true)
const selectedVersion = ref('1.16')

const sortKey = ref('name')
const sortAsc = ref(true)

const adding = ref(false)
const addResult = ref(null)
const addingItem = ref(null)
const addedItems = ref([])
const selectedItems = ref([])

// Available Minecraft versions
const availableVersions = ['1.16', '1.17', '1.18', '1.19', '1.20', '1.21']

// Load items from JSON file based on selected version
async function loadJsonItems() {
	const response = await fetch(`/resource/items_${selectedVersion.value.replace('.', '_')}.json`)
	itemsJson.value = await response.json()
}

// Watch for version changes and reload data
watch(selectedVersion, async () => {
	loading.value = true
	selectedItems.value = [] // Clear selected items when version changes
	addedItems.value = [] // Clear added items tracking
	addResult.value = null // Clear previous add results
	await loadJsonItems()
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

function isInDb(jsonName) {
	return (
		dbItems.value.some((item) => item.material_id === jsonName) ||
		addedItems.value.includes(jsonName)
	)
}

const filteredItems = computed(() => {
	let items = itemsJson.value
	if (showOnlyMissing.value) {
		items = items.filter((item) => !isInDb(item.name))
	}
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

async function addAllMissing() {
	adding.value = true
	addResult.value = null
	const missing = itemsJson.value.filter((item) => !isInDb(item.name))
	let added = 0,
		failed = 0
	for (const item of missing) {
		try {
			await addDoc(collection(db, 'items'), {
				material_id: item.name,
				name: item.displayName.toLowerCase(),
				stack: item.stackSize,
				image: '',
				url: '',
				prices_by_version: {
					[selectedVersion.value.replace('.', '_')]: 1
				},
				pricing_type: 'static',
				category: '',
				subcategory: '',
				version: selectedVersion.value
			})
			added++
			addedItems.value.push(item.name)
		} catch (e) {
			failed++
		}
	}
	addResult.value = `Added: ${added}, Failed: ${failed}`
	await loadDbItems() // Refresh DB items
	adding.value = false
}

async function addSingleItem(item) {
	addingItem.value = item.name
	try {
		await addDoc(collection(db, 'items'), {
			material_id: item.name,
			name: item.displayName.toLowerCase(),
			stack: item.stackSize,
			image: '',
			url: '',
			prices_by_version: {
				[selectedVersion.value.replace('.', '_')]: 1
			},
			pricing_type: 'static',
			category: '',
			subcategory: '',
			version: selectedVersion.value
		})
		addedItems.value.push(item.name)
		await loadDbItems()
	} catch (e) {
		// Optionally handle error
	}
	addingItem.value = null
}

function getDbItemId(jsonName) {
	const found = dbItems.value.find((item) => item.material_id === jsonName)
	return found ? found.id : null
}

function toggleSelectAllMissing(checked) {
	if (checked) {
		selectedItems.value = itemsJson.value
			.filter((item) => !isInDb(item.name))
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

const allMissingSelected = computed(() => {
	const missing = itemsJson.value.filter((item) => !isInDb(item.name)).map((item) => item.name)
	return missing.length > 0 && missing.every((name) => selectedItems.value.includes(name))
})

const anySelected = computed(() => selectedItems.value.length > 0)

async function addSelectedMissing() {
	adding.value = true
	addResult.value = null
	const toAdd = itemsJson.value.filter((item) => selectedItems.value.includes(item.name))
	let added = 0,
		failed = 0
	for (const item of toAdd) {
		try {
			await addDoc(collection(db, 'items'), {
				material_id: item.name,
				name: item.displayName.toLowerCase(),
				stack: item.stackSize,
				image: '',
				url: '',
				prices_by_version: {
					[selectedVersion.value.replace('.', '_')]: 1
				},
				pricing_type: 'static',
				category: '',
				subcategory: '',
				version: selectedVersion.value
			})
			added++
			addedItems.value.push(item.name)
		} catch (e) {
			failed++
		}
	}
	addResult.value = `Added: ${added}, Failed: ${failed}`
	await loadDbItems()
	adding.value = false
	selectedItems.value = []
}
</script>

<template>
	<div v-if="canViewMissingItems" class="p-4 pt-8">
		<h1 class="text-3xl font-bold text-gray-900 mb-6">Missing Items Checker</h1>

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
			<div class="mb-4">
				<button
					v-if="anySelected"
					@click="addSelectedMissing"
					:disabled="adding || selectedItems.length === 0"
					class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
					Add Selected Missing Items
				</button>
				<button
					v-else
					@click="addAllMissing"
					:disabled="adding"
					class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
					Add All Missing Items
				</button>
				<span v-if="adding" class="ml-2">Adding...</span>
				<span v-if="addResult" class="ml-2">{{ addResult }}</span>
			</div>
			<label class="block mb-4">
				<input type="checkbox" v-model="showOnlyMissing" class="mr-2 checkbox-input" />
				Show only missing items
			</label>
			<div class="bg-white rounded-lg shadow-md overflow-hidden">
				<div class="overflow-x-auto">
					<table class="min-w-full divide-y divide-gray-200">
						<thead class="bg-gray-50">
							<tr>
								<th
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									<input
										type="checkbox"
										:checked="allMissingSelected"
										@change="toggleSelectAllMissing($event.target.checked)"
										:disabled="
											filteredItems.filter((item) => !isInDb(item.name))
												.length === 0
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
									@click="setSort('displayName')"
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
									<div class="flex items-center gap-1">
										Display Name
										<ArrowUpIcon
											v-if="sortKey === 'displayName' && sortAsc"
											class="w-4 h-4 text-gray-700" />
										<ArrowDownIcon
											v-else-if="sortKey === 'displayName' && !sortAsc"
											class="w-4 h-4 text-gray-700" />
									</div>
								</th>
								<th
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Stack Size
								</th>
								<th
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									In DB
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
										v-if="!isInDb(item.name)"
										type="checkbox"
										:checked="isSelected(item.name)"
										@change="toggleSelectItem(item.name)"
										class="checkbox-input" />
								</td>
								<td class="px-4 py-3">
									<div class="font-medium text-gray-900">{{ item.name }}</div>
								</td>
								<td class="px-4 py-3 text-gray-900">{{ item.displayName }}</td>
								<td class="px-4 py-3 text-gray-900">{{ item.stackSize }}</td>
								<td class="px-4 py-3">
									<span v-if="isInDb(item.name)" class="text-green-600 font-bold">
										Yes
									</span>
									<span v-else class="text-red-600 font-bold">No</span>
								</td>
								<td class="px-4 py-3">
									<button
										v-if="!isInDb(item.name) && addingItem !== item.name"
										@click="addSingleItem(item)"
										class="rounded bg-semantic-success px-3 py-1 text-sm text-white hover:bg-opacity-80 transition-colors">
										Add
									</button>
									<span
										v-else-if="addingItem === item.name"
										class="text-gray-500">
										Adding...
									</span>
									<template v-else-if="isInDb(item.name)">
										<a
											v-if="getDbItemId(item.name)"
											:href="`/edit/${getDbItemId(item.name)}`"
											class="rounded bg-semantic-info px-3 py-1 text-sm text-white hover:bg-opacity-80 transition-colors">
											Edit
										</a>
										<span v-else class="text-green-600">✔</span>
									</template>
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
			<p class="text-gray-600 mb-4">You need admin privileges to view missing items.</p>
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
