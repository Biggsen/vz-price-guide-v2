<script setup>
import { ref, onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useFirestore } from 'vuefire'
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { useAdmin } from '../../utils/admin.js'
import { ArrowUpIcon, ArrowDownIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
import { getImageUrl } from '../../utils/image.js'

const db = useFirestore()
const { user, canBulkUpdate } = useAdmin()
const dbItems = ref([])
const loading = ref(true)
const searchQuery = ref('')
const enchantableFilter = ref('all') // 'all', 'enchantable', 'not_enchantable'

const sortKey = ref('name')
const sortAsc = ref(true)

const updating = ref(false)
const updateResult = ref(null)
const updatingItem = ref(null)
const selectedItems = ref([])

// Load items from Firestore that have enchantCategories
async function loadDbItems() {
	const snapshot = await getDocs(collection(db, 'items'))
	// Filter items that have enchantCategories array with length > 0
	dbItems.value = snapshot.docs
		.map((doc) => ({ id: doc.id, ...doc.data() }))
		.filter((item) => item.enchantCategories && Array.isArray(item.enchantCategories) && item.enchantCategories.length > 0)
		.sort((a, b) => {
			const aName = a.material_id || a.name || ''
			const bName = b.material_id || b.name || ''
			return aName.localeCompare(bName)
		})
}

onMounted(async () => {
	await loadDbItems()
	loading.value = false
})

// Check if item is enchantable (defaults to true if flag is not set)
function isEnchantable(item) {
	return item.enchantable !== false
}

const filteredItems = computed(() => {
	let items = dbItems.value

	// Filter by search query
	if (searchQuery.value.trim()) {
		const query = searchQuery.value.toLowerCase().trim()
		items = items.filter(
			(item) =>
				item.material_id?.toLowerCase().includes(query) ||
				item.name?.toLowerCase().includes(query) ||
				item.displayName?.toLowerCase().includes(query)
		)
	}

	// Filter by enchantable status
	if (enchantableFilter.value === 'enchantable') {
		items = items.filter((item) => isEnchantable(item))
	} else if (enchantableFilter.value === 'not_enchantable') {
		items = items.filter((item) => !isEnchantable(item))
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

async function toggleEnchantable(item, newValue) {
	updatingItem.value = item.id
	try {
		await updateDoc(doc(db, 'items', item.id), {
			enchantable: newValue
		})
		await loadDbItems()
	} catch (e) {
		console.error('Failed to update item:', item.id, e)
	}
	updatingItem.value = null
}

async function updateSelectedItems(enchantableValue) {
	updating.value = true
	updateResult.value = null
	const toUpdate = filteredItems.value.filter((item) =>
		selectedItems.value.includes(item.id)
	)
	let updated = 0
	let failed = 0

	for (const item of toUpdate) {
		try {
			await updateDoc(doc(db, 'items', item.id), {
				enchantable: enchantableValue
			})
			updated++
		} catch (e) {
			console.error('Failed to update item:', item.id, e)
			failed++
		}
	}

	updateResult.value = `Updated: ${updated}, Failed: ${failed}`
	await loadDbItems()
	updating.value = false
	selectedItems.value = []
}

function toggleSelectAll(checked) {
	if (checked) {
		selectedItems.value = filteredItems.value.map((item) => item.id)
	} else {
		selectedItems.value = []
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

const allSelected = computed(() => {
	return filteredItems.value.length > 0 && filteredItems.value.every((item) => isSelected(item.id))
})

const anySelected = computed(() => selectedItems.value.length > 0)

const stats = computed(() => {
	const total = dbItems.value.length
	const enchantable = dbItems.value.filter((item) => isEnchantable(item)).length
	const notEnchantable = total - enchantable
	return { total, enchantable, notEnchantable }
})

// Reset filters
function resetFilters() {
	searchQuery.value = ''
	enchantableFilter.value = 'all'
}

// Get image URL for enchantable items
function getEnchantedImageUrl(materialId) {
	if (!materialId) return null
	return getImageUrl(`/images/items/${materialId}_enchanted.webp`)
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

		<h1 class="text-3xl font-bold text-gray-900 mb-6">Manage Enchantable Items</h1>

		<!-- Stats -->
		<div class="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
			<div class="bg-white rounded-lg shadow p-4 border border-gray-200">
				<div class="text-sm text-gray-600">Total Items</div>
				<div class="text-2xl font-bold text-gray-900">{{ stats.total }}</div>
			</div>
			<div class="bg-white rounded-lg shadow p-4 border border-green-200">
				<div class="text-sm text-gray-600">Enchantable</div>
				<div class="text-2xl font-bold text-green-600">{{ stats.enchantable }}</div>
			</div>
			<div class="bg-white rounded-lg shadow p-4 border border-red-200">
				<div class="text-sm text-gray-600">Not Enchantable</div>
				<div class="text-2xl font-bold text-red-600">{{ stats.notEnchantable }}</div>
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
					<span class="mr-2 text-sm font-medium">Filter:</span>
					<select
						v-model="enchantableFilter"
						class="px-3 py-1 border-2 border-gray-asparagus rounded focus:outline-none focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus">
						<option value="all">All Items</option>
						<option value="enchantable">Enchantable</option>
						<option value="not_enchantable">Not Enchantable</option>
					</select>
				</label>
			</div>

			<!-- Bulk Actions -->
			<div v-if="anySelected" class="mb-4 flex gap-2">
				<button
					@click="updateSelectedItems(true)"
					:disabled="updating"
					class="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600">
					Mark Selected as Enchantable
				</button>
				<button
					@click="updateSelectedItems(false)"
					:disabled="updating"
					class="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600">
					Mark Selected as Not Enchantable
				</button>
				<span v-if="updating" class="ml-2 self-center">Updating...</span>
				<span v-if="updateResult" class="ml-2 self-center text-sm">{{ updateResult }}</span>
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
										:checked="allSelected"
										@change="toggleSelectAll($event.target.checked)"
										:disabled="filteredItems.length === 0"
										class="checkbox-input" />
								</th>
								<th
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Image
								</th>
								<th
									@click="setSort('material_id')"
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
									<div class="flex items-center gap-1">
										Name
										<ArrowUpIcon
											v-if="sortKey === 'material_id' && sortAsc"
											class="w-4 h-4 text-gray-700" />
										<ArrowDownIcon
											v-else-if="sortKey === 'material_id' && !sortAsc"
											class="w-4 h-4 text-gray-700" />
									</div>
								</th>
								<th
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Enchantment Categories
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
								:key="item.id"
								:class="{
									'bg-green-50': isSelected(item.id) && isEnchantable(item),
									'bg-red-50': isSelected(item.id) && !isEnchantable(item),
									'opacity-75': !isEnchantable(item)
								}">
								<td class="px-4 py-3">
									<input
										type="checkbox"
										:checked="isSelected(item.id)"
										@change="toggleSelectItem(item.id)"
										class="checkbox-input" />
								</td>
								<td class="px-4 py-3">
									<img
										v-if="isEnchantable(item) && item.material_id"
										:src="getEnchantedImageUrl(item.material_id)"
										:alt="`${item.material_id} enchanted`"
										class="w-8 h-8 object-contain"
										loading="lazy"
										@error="$event.target.style.display = 'none'" />
								</td>
								<td class="px-4 py-3">
									<div class="font-medium text-gray-900">
										{{ item.displayName || item.name || item.material_id }}
									</div>
									<div class="text-sm text-gray-500">{{ item.material_id }}</div>
								</td>
								<td class="px-4 py-3">
									<div class="text-sm">
										<span
											v-if="item.enchantCategories && item.enchantCategories.length > 0"
											class="text-gray-900">
											{{ item.enchantCategories.join(', ') }}
										</span>
										<span v-else class="text-gray-400 italic">(none)</span>
									</div>
								</td>
								<td class="px-4 py-3">
									<span
										v-if="isEnchantable(item)"
										class="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
										Enchantable
									</span>
									<span
										v-else
										class="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
										Not Enchantable
									</span>
								</td>
								<td class="px-4 py-3">
									<button
										v-if="updatingItem !== item.id"
										@click="toggleEnchantable(item, !isEnchantable(item))"
										:class="[
											'px-3 py-1 text-sm rounded transition-colors',
											isEnchantable(item)
												? 'bg-red-100 text-red-700 hover:bg-red-200'
												: 'bg-green-100 text-green-700 hover:bg-green-200'
										]">
										{{ isEnchantable(item) ? 'Mark Not Enchantable' : 'Mark Enchantable' }}
									</button>
									<span v-else class="text-gray-500">Updating...</span>
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
				You need bulk update privileges to manage enchantable items.
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
