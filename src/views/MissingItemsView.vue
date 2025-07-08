<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useFirestore } from 'vuefire'
import { collection, getDocs, addDoc } from 'firebase/firestore'
import { useAdmin } from '../utils/admin.js'

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
				price: 1,
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
			price: 1,
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
				price: 1,
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
		<h2 class="text-xl font-bold mb-6">Missing Items Checker</h2>

		<!-- Version Selector -->
		<div class="mb-6">
			<label class="block text-sm font-medium mb-2">Minecraft Version:</label>
			<select
				v-model="selectedVersion"
				class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
				<option v-for="version in availableVersions" :key="version" :value="version">
					{{ version }}
				</option>
			</select>
		</div>

		<div v-if="loading">Loading...</div>
		<div v-else>
			<div class="mb-4">
				<button
					v-if="anySelected"
					@click="addSelectedMissing"
					:disabled="adding || selectedItems.length === 0"
					class="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800">
					Add Selected Missing Items
				</button>
				<button
					v-else
					@click="addAllMissing"
					:disabled="adding"
					class="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800">
					Add All Missing Items
				</button>
				<span v-if="adding" class="ml-2">Adding...</span>
				<span v-if="addResult" class="ml-2">{{ addResult }}</span>
			</div>
			<label class="block mb-4">
				<input type="checkbox" v-model="showOnlyMissing" class="mr-2 align-middle" />
				Show only missing items
			</label>
			<table class="table-auto w-full">
				<thead>
					<tr>
						<th>
							<input
								type="checkbox"
								:checked="allMissingSelected"
								@change="toggleSelectAllMissing($event.target.checked)"
								:disabled="
									filteredItems.filter((item) => !isInDb(item.name)).length === 0
								" />
						</th>
						<th @click="setSort('name')" class="cursor-pointer select-none">
							Name
							<span v-if="sortKey === 'name'">{{ sortAsc ? '▲' : '▼' }}</span>
						</th>
						<th @click="setSort('displayName')" class="cursor-pointer select-none">
							Display Name
							<span v-if="sortKey === 'displayName'">{{ sortAsc ? '▲' : '▼' }}</span>
						</th>
						<th>Stack Size</th>
						<th>In DB</th>
						<th>Add</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="item in filteredItems" :key="item.name">
						<td>
							<input
								v-if="!isInDb(item.name)"
								type="checkbox"
								:checked="isSelected(item.name)"
								@change="toggleSelectItem(item.name)" />
						</td>
						<td>{{ item.name }}</td>
						<td>{{ item.displayName }}</td>
						<td>{{ item.stackSize }}</td>
						<td>
							<span v-if="isInDb(item.name)" class="text-green-600 font-bold">
								Yes
							</span>
							<span v-else class="text-red-600 font-bold">No</span>
						</td>
						<td>
							<button
								v-if="!isInDb(item.name) && addingItem !== item.name"
								@click="addSingleItem(item)"
								class="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
								Add
							</button>
							<span v-else-if="addingItem === item.name">Adding...</span>
							<template v-else-if="isInDb(item.name)">
								<a
									v-if="getDbItemId(item.name)"
									:href="`/edit/${getDbItemId(item.name)}`"
									class="text-white bg-gray-asparagus px-4 py-2 rounded hover:bg-heavy-metal">
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
	<div v-else-if="user?.email" class="p-4 pt-8">
		<div class="text-center">
			<h2 class="text-xl font-bold mb-4">Access Denied</h2>
			<p class="text-gray-600 mb-4">You need admin privileges to view missing items.</p>
			<RouterLink to="/" class="text-blue-600 hover:underline">Return to Home</RouterLink>
		</div>
	</div>
	<div v-else class="p-4 pt-8">
		<RouterLink to="/login">Login to view this page</RouterLink>
	</div>
</template>

<style scoped>
table {
	border-collapse: collapse;
}
th,
td {
	border: 1px solid #ccc;
	padding: 0.5rem;
}
th.cursor-pointer {
	user-select: none;
}
</style>
