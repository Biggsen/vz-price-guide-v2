<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useFirestore } from 'vuefire'
import { collection, getDocs, updateDoc, doc, query, where } from 'firebase/firestore'
import { useAdmin } from '../../utils/admin.js'
import { ArrowUpIcon, ArrowDownIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'

const db = useFirestore()
const { user, canBulkUpdate } = useAdmin()

const enchantmentsJson = ref([])
const dbBooks = ref([])
const loading = ref(true)
const selectedVersion = ref('1.21')
const searchQuery = ref('')
const statusFilter = ref('') // 'needs_update', 'up_to_date', 'not_found', ''

const sortKey = ref('name')
const sortAsc = ref(true)

const updating = ref(false)
const updateResult = ref(null)
const updatingItem = ref(null)
const updatedItems = ref([])
const selectedItems = ref([])

// Available Minecraft versions
const availableVersions = ['1.16', '1.17', '1.18', '1.19', '1.20', '1.21']

// Load enchantments from JSON file based on selected version
async function loadEnchantmentsJson() {
	const versionKey = selectedVersion.value.replace('.', '_')
	const response = await fetch(`/resource/enchantments_${versionKey}.json`)
	enchantmentsJson.value = await response.json()
}

// Watch for version changes and reload data
watch(selectedVersion, async () => {
	loading.value = true
	selectedItems.value = []
	updatedItems.value = []
	updateResult.value = null
	await loadEnchantmentsJson()
	await loadDbBooks()
	loading.value = false
})

// Load enchanted book items from Firestore
async function loadDbBooks() {
	const q = query(collection(db, 'items'), where('category', '==', 'enchantments'))
	const snapshot = await getDocs(q)
	dbBooks.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

onMounted(async () => {
	await loadEnchantmentsJson()
	await loadDbBooks()
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

// Extract enchantment name and level from material_id
// Pattern: enchanted_book_{enchantment_name}_{level}
function extractEnchantmentName(materialId) {
	const match = materialId.match(/^enchanted_book_(.+)_(\d+)$/)
	if (match) {
		return match[1] // Return enchantment name (e.g., "sharpness", "thorns")
	}
	// Fallback for edge cases
	const fallbackMatch = materialId.match(/^enchanted_book_(.+)$/)
	return fallbackMatch ? fallbackMatch[1] : null
}

// Find enchantment data in PrismarineJS JSON by name
function findEnchantmentData(enchantmentName) {
	return enchantmentsJson.value.find((ench) => ench.name === enchantmentName)
}

// Check if book needs update
function needsUpdate(book) {
	const enchantmentName = extractEnchantmentName(book.material_id)
	if (!enchantmentName) return false

	const enchantmentData = findEnchantmentData(enchantmentName)
	if (!enchantmentData) return false

	// Compare current vs proposed metadata
	const currentCategory = book.enchantment_category || null
	const currentExclude = book.enchantment_exclude || []
	const currentMaxLevel = book.enchantment_max_level || null

	const proposedCategory = enchantmentData.category
		? normalizeCategory(enchantmentData.category)
		: null
	const proposedExclude = enchantmentData.exclude || []
	const proposedMaxLevel = enchantmentData.maxLevel || null

	// Normalize arrays for comparison
	const currentExcludeNormalized = [...currentExclude].sort().join(',')
	const proposedExcludeNormalized = [...proposedExclude].sort().join(',')

	return (
		currentCategory !== proposedCategory ||
		currentExcludeNormalized !== proposedExcludeNormalized ||
		currentMaxLevel !== proposedMaxLevel
	)
}

// Get status for a book
function getBookStatus(book) {
	const enchantmentName = extractEnchantmentName(book.material_id)
	if (!enchantmentName) return 'not_found'

	const enchantmentData = findEnchantmentData(enchantmentName)
	if (!enchantmentData) return 'not_found'

	if (needsUpdate(book)) return 'needs_update'
	return 'up_to_date'
}

// Get current metadata
function getCurrentMetadata(book) {
	return {
		category: book.enchantment_category || null,
		exclude: book.enchantment_exclude || [],
		maxLevel: book.enchantment_max_level || null
	}
}

// Get proposed metadata from PrismarineJS (normalized)
function getProposedMetadata(book) {
	const enchantmentName = extractEnchantmentName(book.material_id)
	const enchantmentData = findEnchantmentData(enchantmentName)
	if (!enchantmentData) return null

	return {
		category: enchantmentData.category ? normalizeCategory(enchantmentData.category) : null,
		exclude: enchantmentData.exclude || [],
		maxLevel: enchantmentData.maxLevel || null
	}
}

const filteredBooks = computed(() => {
	let books = dbBooks.value

	// Filter by search query
	if (searchQuery.value.trim()) {
		const query = searchQuery.value.toLowerCase().trim()
		books = books.filter(
			(book) =>
				book.material_id?.toLowerCase().includes(query) ||
				book.name?.toLowerCase().includes(query) ||
				extractEnchantmentName(book.material_id)?.toLowerCase().includes(query)
		)
	}

	// Filter by status
	if (statusFilter.value) {
		books = books.filter((book) => getBookStatus(book) === statusFilter.value)
	}

	// Sort
	return [...books].sort((a, b) => {
		let aVal = ''
		let bVal = ''

		if (sortKey.value === 'name') {
			aVal = extractEnchantmentName(a.material_id) || ''
			bVal = extractEnchantmentName(b.material_id) || ''
		} else if (sortKey.value === 'material_id') {
			aVal = a.material_id?.toLowerCase() || ''
			bVal = b.material_id?.toLowerCase() || ''
		} else {
			aVal = a[sortKey.value]?.toString().toLowerCase() || ''
			bVal = b[sortKey.value]?.toString().toLowerCase() || ''
		}

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

async function updateSelectedBooks() {
	updating.value = true
	updateResult.value = null
	const toUpdate = filteredBooks.value.filter((book) =>
		selectedItems.value.includes(book.id)
	)
	let updated = 0
	let skipped = 0
	let failed = 0

	for (const book of toUpdate) {
		if (!needsUpdate(book)) {
			skipped++
			continue
		}

		const proposed = getProposedMetadata(book)
		if (!proposed) {
			skipped++
			continue
		}

		try {
			await updateDoc(doc(db, 'items', book.id), {
				enchantment_category: proposed.category,
				enchantment_exclude: proposed.exclude,
				enchantment_max_level: proposed.maxLevel
			})
			updated++
			updatedItems.value.push(book.id)
		} catch (e) {
			console.error('Failed to update book:', book.material_id, e)
			failed++
		}
	}

	updateResult.value = `Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`
	await loadDbBooks()
	updating.value = false
	selectedItems.value = []
}

async function updateSingleBook(book) {
	if (!needsUpdate(book)) return

	const proposed = getProposedMetadata(book)
	if (!proposed) return

	updatingItem.value = book.id
	try {
		await updateDoc(doc(db, 'items', book.id), {
			enchantment_category: proposed.category,
			enchantment_exclude: proposed.exclude,
			enchantment_max_level: proposed.maxLevel
		})
		updatedItems.value.push(book.id)
		await loadDbBooks()
	} catch (e) {
		console.error('Failed to update book:', book.material_id, e)
	}
	updatingItem.value = null
}

function toggleSelectAllNeedingUpdate(checked) {
	if (checked) {
		selectedItems.value = filteredBooks.value
			.filter((book) => needsUpdate(book))
			.map((book) => book.id)
	} else {
		selectedItems.value = []
	}
}

function isSelected(bookId) {
	return selectedItems.value.includes(bookId)
}

function toggleSelectItem(bookId) {
	if (isSelected(bookId)) {
		selectedItems.value = selectedItems.value.filter((id) => id !== bookId)
	} else {
		selectedItems.value.push(bookId)
	}
}

const allNeedingUpdateSelected = computed(() => {
	const needingUpdate = filteredBooks.value
		.filter((book) => needsUpdate(book))
		.map((book) => book.id)
	return needingUpdate.length > 0 && needingUpdate.every((id) => isSelected(id))
})

const anySelected = computed(() => selectedItems.value.length > 0)

// Reset filters
function resetFilters() {
	searchQuery.value = ''
	statusFilter.value = ''
}

// Format array for display
function formatArray(arr) {
	if (!arr || arr.length === 0) return '(none)'
	return arr.join(', ')
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

		<h1 class="text-3xl font-bold text-gray-900 mb-6">Migrate Enchantment Metadata</h1>

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
						placeholder="Search by enchantment name or material_id..."
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
						v-model="statusFilter"
						class="px-3 py-1 border-2 border-gray-asparagus rounded focus:outline-none focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus">
						<option value="">All Status</option>
						<option value="needs_update">Needs Update</option>
						<option value="up_to_date">Up to Date</option>
						<option value="not_found">Not Found</option>
					</select>
				</label>
			</div>

			<!-- Bulk Actions -->
			<div class="mb-4">
				<button
					v-if="anySelected"
					@click="updateSelectedBooks"
					:disabled="updating || selectedItems.length === 0"
					class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
					Update Selected Books
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
											filteredBooks.filter((book) => needsUpdate(book)).length === 0
										"
										class="checkbox-input" />
								</th>
								<th
									@click="setSort('name')"
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
									<div class="flex items-center gap-1">
										Enchantment
										<ArrowUpIcon
											v-if="sortKey === 'name' && sortAsc"
											class="w-4 h-4 text-gray-700" />
										<ArrowDownIcon
											v-else-if="sortKey === 'name' && !sortAsc"
											class="w-4 h-4 text-gray-700" />
									</div>
								</th>
								<th
									@click="setSort('material_id')"
									class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
									<div class="flex items-center gap-1">
										Material ID
										<ArrowUpIcon
											v-if="sortKey === 'material_id' && sortAsc"
											class="w-4 h-4 text-gray-700" />
										<ArrowDownIcon
											v-else-if="sortKey === 'material_id' && !sortAsc"
											class="w-4 h-4 text-gray-700" />
									</div>
								</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Current Metadata
								</th>
								<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
									Proposed Metadata
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
								v-for="book in filteredBooks"
								:key="book.id"
								:class="{
									'bg-green-50': isSelected(book.id)
								}">
								<td class="px-4 py-3">
									<input
										v-if="needsUpdate(book)"
										type="checkbox"
										:checked="isSelected(book.id)"
										@change="toggleSelectItem(book.id)"
										class="checkbox-input" />
								</td>
								<td class="px-4 py-3">
									<div class="font-medium text-gray-900">
										{{ extractEnchantmentName(book.material_id) || 'Unknown' }}
									</div>
								</td>
								<td class="px-4 py-3">
									<div class="text-sm text-gray-600">{{ book.material_id }}</div>
								</td>
								<td class="px-4 py-3 text-sm">
									<div class="space-y-1">
										<div>
											<span class="font-semibold">Category:</span>
											<span class="ml-2">
												{{ getCurrentMetadata(book).category || '(none)' }}
											</span>
										</div>
										<div>
											<span class="font-semibold">Exclude:</span>
											<span class="ml-2">
												{{ formatArray(getCurrentMetadata(book).exclude) }}
											</span>
										</div>
										<div>
											<span class="font-semibold">Max Level:</span>
											<span class="ml-2">
												{{ getCurrentMetadata(book).maxLevel || '(none)' }}
											</span>
										</div>
									</div>
								</td>
								<td class="px-4 py-3 text-sm">
									<div v-if="getProposedMetadata(book)" class="space-y-1">
										<div>
											<span class="font-semibold">Category:</span>
											<span class="ml-2">
												{{ getProposedMetadata(book).category || '(none)' }}
											</span>
										</div>
										<div>
											<span class="font-semibold">Exclude:</span>
											<span class="ml-2">
												{{ formatArray(getProposedMetadata(book).exclude) }}
											</span>
										</div>
										<div>
											<span class="font-semibold">Max Level:</span>
											<span class="ml-2">
												{{ getProposedMetadata(book).maxLevel || '(none)' }}
											</span>
										</div>
									</div>
									<div v-else class="text-gray-400 italic">Not found in PrismarineJS</div>
								</td>
								<td class="px-4 py-3">
									<span
										v-if="getBookStatus(book) === 'needs_update'"
										class="px-2 py-1 text-xs font-semibold rounded bg-yellow-100 text-yellow-800">
										Needs Update
									</span>
									<span
										v-else-if="getBookStatus(book) === 'up_to_date'"
										class="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
										Up to Date
									</span>
									<span
										v-else
										class="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
										Not Found
									</span>
								</td>
								<td class="px-4 py-3">
									<button
										v-if="needsUpdate(book) && updatingItem !== book.id"
										@click="updateSingleBook(book)"
										class="rounded bg-semantic-success px-3 py-1 text-sm text-white hover:bg-opacity-80 transition-colors">
										Update
									</button>
									<span v-else-if="updatingItem === book.id" class="text-gray-500">
										Updating...
									</span>
									<span
										v-else-if="getBookStatus(book) === 'up_to_date'"
										class="text-green-600">
										✓
									</span>
									<span
										v-else-if="getBookStatus(book) === 'not_found'"
										class="text-gray-400 text-sm">
										-
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
				You need bulk update privileges to migrate enchantment metadata.
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
