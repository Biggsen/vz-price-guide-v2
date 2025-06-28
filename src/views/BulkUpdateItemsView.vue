<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useFirestore } from 'vuefire'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { enabledCategories } from '../constants.js'
import { useAdmin } from '../utils/admin.js'

const db = useFirestore()
const { user, canBulkUpdate } = useAdmin()
const dbItems = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedItems = ref([])
const updating = ref(false)
const updateResult = ref(null)
const newCategory = ref('')
const newSubcategory = ref('')
const newPrice = ref('')
const newImage = ref('')
const sortKey = ref('name')
const sortAsc = ref(true)
const showOnlyNoCategory = ref(false)
const showCategoryColumns = ref(true)
const showPriceColumn = ref(false)
const showImageColumn = ref(false)

async function loadDbItems() {
	const snapshot = await getDocs(collection(db, 'items'))
	dbItems.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

onMounted(async () => {
	await loadDbItems()
	loading.value = false
})

const filteredItems = computed(() => {
	const query = searchQuery.value.trim().toLowerCase()
	let items = dbItems.value.filter((item) => item.name && item.name.toLowerCase().includes(query))
	if (showOnlyNoCategory.value) {
		items = items.filter((item) => !item.category || item.category === '')
	}
	if (sortKey.value) {
		items = [...items].sort((a, b) => {
			let aVal = a[sortKey.value]?.toString().toLowerCase() || ''
			let bVal = b[sortKey.value]?.toString().toLowerCase() || ''
			if (aVal < bVal) return sortAsc.value ? -1 : 1
			if (aVal > bVal) return sortAsc.value ? 1 : -1
			return 0
		})
	}
	return items
})

function setSort(key) {
	if (sortKey.value === key) {
		sortAsc.value = !sortAsc.value
	} else {
		sortKey.value = key
		sortAsc.value = true
	}
}

function isSelected(itemId) {
	return selectedItems.value.includes(itemId)
}

function toggleSelectItem(itemId) {
	if (isSelected(itemId)) {
		selectedItems.value = selectedItems.value.filter((id) => id !== itemId)
	} else {
		selectedItems.value.push(itemId)
	}
}

function toggleSelectAll(checked) {
	if (checked) {
		selectedItems.value = filteredItems.value.map((item) => item.id)
	} else {
		selectedItems.value = []
	}
}

const allSelected = computed(() => {
	return (
		filteredItems.value.length > 0 &&
		filteredItems.value.every((item) => selectedItems.value.includes(item.id))
	)
})

const anySelected = computed(() => selectedItems.value.length > 0)

async function updateSelectedCategories() {
	if (!newCategory.value) return
	updating.value = true
	updateResult.value = null
	let updated = 0,
		failed = 0
	for (const id of selectedItems.value) {
		try {
			await updateDoc(doc(db, 'items', id), {
				category: newCategory.value,
				subcategory: newSubcategory.value
			})
			updated++
		} catch (e) {
			failed++
		}
	}
	updateResult.value = `Updated: ${updated}, Failed: ${failed}`
	await loadDbItems()
	updating.value = false
	selectedItems.value = []
	newCategory.value = ''
	newSubcategory.value = ''
}

async function clearSelectedCategories() {
	if (!anySelected.value) return
	updating.value = true
	updateResult.value = null
	let updated = 0,
		failed = 0
	for (const id of selectedItems.value) {
		try {
			await updateDoc(doc(db, 'items', id), {
				category: '',
				subcategory: ''
			})
			updated++
		} catch (e) {
			failed++
		}
	}
	updateResult.value = `Cleared: ${updated}, Failed: ${failed}`
	await loadDbItems()
	updating.value = false
	selectedItems.value = []
}

async function updateSelectedPrices() {
	if (!newPrice.value || !anySelected.value) return
	updating.value = true
	updateResult.value = null
	let updated = 0,
		failed = 0
	for (const id of selectedItems.value) {
		try {
			await updateDoc(doc(db, 'items', id), {
				price: parseFloat(newPrice.value)
			})
			updated++
		} catch (e) {
			failed++
		}
	}
	updateResult.value = `Price updated: ${updated}, Failed: ${failed}`
	await loadDbItems()
	updating.value = false
	selectedItems.value = []
	newPrice.value = ''
}

async function updateSelectedImages() {
	if (!newImage.value || !anySelected.value) return
	updating.value = true
	updateResult.value = null
	let updated = 0,
		failed = 0
	for (const id of selectedItems.value) {
		try {
			await updateDoc(doc(db, 'items', id), {
				image: newImage.value
			})
			updated++
		} catch (e) {
			failed++
		}
	}
	updateResult.value = `Image updated: ${updated}, Failed: ${failed}`
	await loadDbItems()
	updating.value = false
	selectedItems.value = []
	newImage.value = ''
}
</script>

<template>
	<div v-if="canBulkUpdate" class="p-4 pt-8">
		<h2 class="text-xl font-bold mb-6">Bulk update items</h2>
		<div v-if="loading">Loading...</div>
		<div v-else>
			<!-- Search input on its own line -->
			<div class="mb-4">
				<input
					type="text"
					v-model="searchQuery"
					placeholder="Search for an item..."
					class="border-2 border-gray-asparagus rounded px-3 py-1 w-full max-w-md" />
			</div>

			<!-- Categories section -->
			<div class="mb-4">
				<h3 class="text-lg font-semibold mb-2">Categories</h3>
				<div class="flex gap-4 items-center mb-2">
					<select
						v-model="newCategory"
						class="border-2 border-gray-asparagus rounded px-3 py-1">
						<option value="">Set category...</option>
						<option v-for="cat in enabledCategories" :key="cat" :value="cat">
							{{ cat }}
						</option>
					</select>
					<input
						type="text"
						v-model="newSubcategory"
						placeholder="Subcategory (optional)"
						class="border-2 border-gray-asparagus rounded px-3 py-1 w-48" />
				</div>

				<!-- Buttons on their own line -->
				<div class="flex gap-4 items-center">
					<button
						@click="updateSelectedCategories"
						:disabled="!anySelected || !newCategory || updating"
						class="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800 disabled:opacity-50">
						Update Selected
					</button>
					<button
						@click="clearSelectedCategories"
						:disabled="!anySelected || updating"
						class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
						Clear Category
					</button>
					<span v-if="updating" class="ml-2">Updating...</span>
					<span v-if="updateResult" class="ml-2">{{ updateResult }}</span>
				</div>

				<!-- Column visibility checkbox -->
				<div class="mt-2">
					<label class="inline-flex items-center">
						<input
							type="checkbox"
							v-model="showCategoryColumns"
							class="mr-2 align-middle" />
						Show categories columns
					</label>
				</div>
			</div>

			<div class="mb-4">
				<label class="inline-flex items-center">
					<input type="checkbox" v-model="showOnlyNoCategory" class="mr-2 align-middle" />
					Show only items without a category
				</label>
			</div>

			<!-- Price section -->
			<div class="mb-4">
				<h3 class="text-lg font-semibold mb-2">Price</h3>
				<div class="flex gap-4 items-center">
					<input
						type="number"
						v-model="newPrice"
						placeholder="New price"
						step="0.01"
						min="0"
						class="border-2 border-gray-asparagus rounded px-3 py-1 w-32" />
					<button
						@click="updateSelectedPrices"
						:disabled="!anySelected || !newPrice || updating"
						class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
						Update Price
					</button>
				</div>

				<!-- Column visibility checkbox -->
				<div class="mt-2">
					<label class="inline-flex items-center">
						<input
							type="checkbox"
							v-model="showPriceColumn"
							class="mr-2 align-middle" />
						Show price column
					</label>
				</div>
			</div>

			<!-- Image section -->
			<div class="mb-4">
				<h3 class="text-lg font-semibold mb-2">Image</h3>
				<div class="flex gap-4 items-center">
					<input
						type="text"
						v-model="newImage"
						placeholder="Image URL"
						class="border-2 border-gray-asparagus rounded px-3 py-1 w-80" />
					<button
						@click="updateSelectedImages"
						:disabled="!anySelected || !newImage || updating"
						class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">
						Update Image
					</button>
				</div>

				<!-- Column visibility checkbox -->
				<div class="mt-2">
					<label class="inline-flex items-center">
						<input
							type="checkbox"
							v-model="showImageColumn"
							class="mr-2 align-middle" />
						Show image column
					</label>
				</div>
			</div>
			<table class="table-auto w-full">
				<thead>
					<tr>
						<th>
							<input
								type="checkbox"
								:checked="allSelected"
								@change="toggleSelectAll($event.target.checked)"
								:disabled="filteredItems.length === 0" />
						</th>
						<th>Material ID</th>
						<th @click="setSort('name')" class="cursor-pointer select-none">
							Name
							<span v-if="sortKey === 'name'">{{ sortAsc ? '▲' : '▼' }}</span>
						</th>
						<th
							v-if="showCategoryColumns"
							@click="setSort('category')"
							class="cursor-pointer select-none">
							Category
							<span v-if="sortKey === 'category'">{{ sortAsc ? '▲' : '▼' }}</span>
						</th>
						<th
							v-if="showCategoryColumns"
							@click="setSort('subcategory')"
							class="cursor-pointer select-none">
							Subcategory
							<span v-if="sortKey === 'subcategory'">{{ sortAsc ? '▲' : '▼' }}</span>
						</th>
						<th
							v-if="showPriceColumn"
							@click="setSort('price')"
							class="cursor-pointer select-none">
							Price
							<span v-if="sortKey === 'price'">{{ sortAsc ? '▲' : '▼' }}</span>
						</th>
						<th
							v-if="showImageColumn"
							@click="setSort('image')"
							class="cursor-pointer select-none">
							Image
							<span v-if="sortKey === 'image'">{{ sortAsc ? '▲' : '▼' }}</span>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="item in filteredItems" :key="item.id">
						<td>
							<input
								type="checkbox"
								:checked="isSelected(item.id)"
								@change="toggleSelectItem(item.id)" />
						</td>
						<td>{{ item.material_id }}</td>
						<td>{{ item.name }}</td>
						<td v-if="showCategoryColumns">{{ item.category }}</td>
						<td v-if="showCategoryColumns">{{ item.subcategory }}</td>
						<td v-if="showPriceColumn">{{ item.price || 0 }}</td>
						<td v-if="showImageColumn" class="image-cell" :title="item.image || ''">
							{{ item.image || '' }}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
	<div v-else-if="user?.email" class="p-4 pt-8">
		<div class="text-center">
			<h2 class="text-xl font-bold mb-4">Access Denied</h2>
			<p class="text-gray-600 mb-4">You need admin privileges to bulk update items.</p>
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
.image-cell {
	max-width: 200px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
