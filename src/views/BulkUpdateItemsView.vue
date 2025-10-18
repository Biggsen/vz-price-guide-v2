<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useFirestore } from 'vuefire'
import { collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { categories, versions } from '../constants.js'
import { useAdmin } from '../utils/admin.js'
import { getWikiUrl } from '../utils/image.js'
import BaseModal from '../components/BaseModal.vue'
import {
	NoSymbolIcon,
	ArrowUpIcon,
	ArrowDownIcon,
	PencilIcon,
	TrashIcon
} from '@heroicons/vue/24/outline'

const db = useFirestore()
const route = useRoute()
const { user, canBulkUpdate } = useAdmin()
const dbItems = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedItems = ref([])
const updating = ref(false)
const updateResult = ref(null)
const newCategory = ref('')
const newSubcategory = ref('')
const newImage = ref('')
const newUrl = ref('')
const newVersion = ref('')
const newPrice = ref('')
const sortKey = ref('name')
const sortAsc = ref(true)
const showOnlyNoCategory = ref(false)
const showCategoryColumns = ref(true)
const showImageColumn = ref(true)
const showNameColumn = ref(true)
const showVersionColumn = ref(false)
const showUrlColumn = ref(false)
const showPriceColumn = ref(true)
const showDocumentIdColumn = ref(false)
const selectedVersion = ref('all')
const selectedCategories = ref([])
const activeTab = ref('categories') // Add active tab state
const showDeleteModal = ref(false)
const itemToDelete = ref(null)

async function loadDbItems() {
	const snapshot = await getDocs(collection(db, 'items'))
	dbItems.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

onMounted(async () => {
	await loadDbItems()
	loading.value = false
})

// Watch for category filter changes to reset "show only no category" checkbox
watch(selectedCategories, (newCategories) => {
	if (newCategories.length > 0 && showOnlyNoCategory.value) {
		showOnlyNoCategory.value = false
	}
})

const filteredItems = computed(() => {
	const query = searchQuery.value.trim().toLowerCase()
	let items = dbItems.value.filter((item) => item.name && item.name.toLowerCase().includes(query))

	// Filter by version
	if (selectedVersion.value !== 'all') {
		items = items.filter((item) => {
			// Check if the item's version matches the selected version
			return item.version === selectedVersion.value
		})
	}

	// Filter by categories
	if (selectedCategories.value.length > 0) {
		items = items.filter((item) => {
			// Check if the item's category is in the selected categories
			return selectedCategories.value.includes(item.category)
		})
	}

	if (showOnlyNoCategory.value) {
		items = items.filter((item) => !item.category || item.category === '')
		// Override category filter when showing only items without category
		selectedCategories.value = []
	}
	if (sortKey.value) {
		items = [...items].sort((a, b) => {
			let aVal, bVal

			// Handle price sorting specially
			if (sortKey.value === 'price') {
				aVal = getPriceForVersion(a, selectedVersion.value) || 0
				bVal = getPriceForVersion(b, selectedVersion.value) || 0
				// For numeric sorting, don't convert to lowercase
				if (aVal < bVal) return sortAsc.value ? -1 : 1
				if (aVal > bVal) return sortAsc.value ? 1 : -1
				return 0
			} else {
				// Handle other fields normally
				aVal = a[sortKey.value]?.toString().toLowerCase() || ''
				bVal = b[sortKey.value]?.toString().toLowerCase() || ''
				if (aVal < bVal) return sortAsc.value ? -1 : 1
				if (aVal > bVal) return sortAsc.value ? 1 : -1
				return 0
			}
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

function getSortIcon(field) {
	if (sortKey.value !== field) return null
	return sortAsc.value ? 'up' : 'down'
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

function toggleCategory(category) {
	const index = selectedCategories.value.indexOf(category)
	if (index > -1) {
		selectedCategories.value.splice(index, 1)
	} else {
		selectedCategories.value.push(category)
	}
}

function isCategorySelected(category) {
	return selectedCategories.value.includes(category)
}

function clearAllCategories() {
	selectedCategories.value = []
}

function getCategoryItemCount(category) {
	// Get items that match current filters (search, version) but without category filter
	const query = searchQuery.value.trim().toLowerCase()
	let items = dbItems.value.filter((item) => item.name && item.name.toLowerCase().includes(query))

	// Filter by version
	if (selectedVersion.value !== 'all') {
		items = items.filter((item) => {
			return item.version === selectedVersion.value
		})
	}

	// Count items in this specific category
	return items.filter((item) => item.category === category).length
}

function getTotalItemCount() {
	// Get items that match current filters (search, version) but without category filter
	const query = searchQuery.value.trim().toLowerCase()
	let items = dbItems.value.filter((item) => item.name && item.name.toLowerCase().includes(query))

	// Filter by version
	if (selectedVersion.value !== 'all') {
		items = items.filter((item) => {
			return item.version === selectedVersion.value
		})
	}

	return items.length
}

function getPriceForVersion(item, version) {
	if (version === 'all' || !item.prices_by_version) return null
	const versionKey = version.replace('.', '_')
	const price = item.prices_by_version[versionKey]
	return price !== undefined ? price : null
}

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

async function updateSelectedImages() {
	if (!newImage.value || !anySelected.value) return
	updating.value = true
	updateResult.value = null
	let updated = 0,
		failed = 0

	// Prepend /images/items/ if the image doesn't already start with it
	const imageUrl = newImage.value.startsWith('/images/items/')
		? newImage.value
		: `/images/items/${newImage.value}`

	for (const id of selectedItems.value) {
		try {
			await updateDoc(doc(db, 'items', id), {
				image: imageUrl
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

async function updateSelectedVersions() {
	if (!newVersion.value || !anySelected.value) return
	updating.value = true
	updateResult.value = null
	let updated = 0,
		failed = 0
	for (const id of selectedItems.value) {
		try {
			await updateDoc(doc(db, 'items', id), {
				version: newVersion.value
			})
			updated++
		} catch (e) {
			failed++
		}
	}
	updateResult.value = `Version updated: ${updated}, Failed: ${failed}`
	await loadDbItems()
	updating.value = false
	selectedItems.value = []
	newVersion.value = ''
}

async function updateSelectedUrls() {
	if (!newUrl.value || !anySelected.value) return
	updating.value = true
	updateResult.value = null
	let updated = 0,
		failed = 0
	for (const id of selectedItems.value) {
		try {
			await updateDoc(doc(db, 'items', id), {
				url: newUrl.value
			})
			updated++
		} catch (e) {
			failed++
		}
	}
	updateResult.value = `URL updated: ${updated}, Failed: ${failed}`
	await loadDbItems()
	updating.value = false
	selectedItems.value = []
	newUrl.value = ''
}

async function updateSelectedPrices() {
	if (newPrice.value === '' || !anySelected.value || selectedVersion.value === 'all') return
	updating.value = true
	updateResult.value = null
	let updated = 0,
		failed = 0
	const versionKey = selectedVersion.value.replace('.', '_')
	for (const id of selectedItems.value) {
		try {
			await updateDoc(doc(db, 'items', id), {
				[`prices_by_version.${versionKey}`]: parseFloat(newPrice.value)
			})
			updated++
		} catch (e) {
			failed++
		}
	}
	updateResult.value = `Price updated for ${selectedVersion.value}: ${updated}, Failed: ${failed}`
	await loadDbItems()
	updating.value = false
	selectedItems.value = []
	newPrice.value = ''
}

// Create the redirect URL with current query parameters
function getEditLinkQuery() {
	// Use the current route's query object directly to avoid double-encoding
	const queryString = new URLSearchParams(route.query).toString()
	const redirectPath = route.path + (queryString ? `?${queryString}` : '')
	return {
		redirect: redirectPath
	}
}

function deleteItem(itemId) {
	const item = dbItems.value.find((item) => item.id === itemId)
	if (item) {
		itemToDelete.value = item
		showDeleteModal.value = true
	}
}

async function executeDelete() {
	if (!itemToDelete.value) return

	try {
		await deleteDoc(doc(db, 'items', itemToDelete.value.id))
		// Reload items after deletion
		await loadDbItems()
	} catch (error) {
		console.error('Error deleting item:', error)
	} finally {
		showDeleteModal.value = false
		itemToDelete.value = null
	}
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
				Back to Price Guide
			</RouterLink>
		</div>

		<h1 class="text-3xl font-bold text-gray-900 mb-6">Bulk update items</h1>
		<div v-if="loading">Loading...</div>
		<div v-else>
			<!-- Status notifications -->
			<div v-if="updating || updateResult" class="mb-4 p-3 bg-gray-100 rounded border">
				<span v-if="updating" class="text-blue-600 font-medium">Updating...</span>
				<span v-if="updateResult" class="text-green-600 font-medium">
					{{ updateResult }}
				</span>
			</div>

			<!-- Search and filters (always visible) -->
			<div class="mb-6">
				<!-- Search input -->
				<div class="mb-4">
					<input
						type="text"
						v-model="searchQuery"
						placeholder="Search for an item..."
						class="border-2 border-gray-asparagus rounded px-3 py-1 w-full max-w-md" />
				</div>

				<!-- Version filter -->
				<div class="mb-4">
					<div class="flex flex-wrap gap-2">
						<button
							@click="selectedVersion = 'all'"
							:class="[
								'px-3 py-1 rounded-full text-sm font-medium transition-colors',
								selectedVersion === 'all'
									? 'bg-blue-600 text-white'
									: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
							]">
							All versions
						</button>
						<button
							v-for="version in versions"
							:key="version"
							@click="selectedVersion = version"
							:class="[
								'px-3 py-1 rounded-full text-sm font-medium transition-colors',
								selectedVersion === version
									? 'bg-blue-600 text-white'
									: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
							]">
							{{ version }}
						</button>
					</div>
				</div>

				<!-- Category filter -->
				<div class="mb-12">
					<div class="flex flex-wrap gap-2 items-center">
						<button
							@click="clearAllCategories"
							:class="[
								'px-3 py-1 rounded-full text-sm font-medium transition-colors',
								selectedCategories.length === 0
									? 'bg-green-600 text-white'
									: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
							]">
							All categories ({{ getTotalItemCount() }})
						</button>
						<button
							v-for="category in categories"
							:key="category"
							@click="toggleCategory(category)"
							:class="[
								'px-3 py-1 rounded-full text-sm font-medium transition-colors',
								isCategorySelected(category)
									? 'bg-green-600 text-white'
									: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
							]">
							{{ category }} ({{ getCategoryItemCount(category) }})
						</button>
						<span
							v-if="selectedCategories.length > 0"
							class="text-sm text-gray-600 ml-2">
							({{ selectedCategories.length }} selected)
						</span>
					</div>
				</div>
			</div>

			<!-- Tabs -->
			<div class="flex mb-6 border-b border-gray-200">
				<button
					@click="activeTab = 'categories'"
					:class="[
						'px-6 py-3 font-medium transition-colors',
						activeTab === 'categories'
							? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
							: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
					]">
					Categories
				</button>
				<button
					@click="activeTab = 'version'"
					:class="[
						'px-6 py-3 font-medium transition-colors',
						activeTab === 'version'
							? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
							: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
					]">
					Version
				</button>
				<button
					@click="activeTab = 'image'"
					:class="[
						'px-6 py-3 font-medium transition-colors',
						activeTab === 'image'
							? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
							: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
					]">
					Image
				</button>
				<button
					@click="activeTab = 'url'"
					:class="[
						'px-6 py-3 font-medium transition-colors',
						activeTab === 'url'
							? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
							: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
					]">
					URL
				</button>
				<button
					@click="activeTab = 'price'"
					:class="[
						'px-6 py-3 font-medium transition-colors',
						activeTab === 'price'
							? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
							: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
					]">
					Price
				</button>
				<button
					@click="activeTab = 'settings'"
					:class="[
						'px-6 py-3 font-medium transition-colors',
						activeTab === 'settings'
							? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
							: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
					]">
					Settings
				</button>
			</div>

			<!-- Tab content -->
			<div v-if="activeTab === 'categories'">
				<div class="mb-4">
					<div class="flex gap-4 items-center mb-2">
						<select
							v-model="newCategory"
							class="border-2 border-gray-asparagus rounded px-3 py-1">
							<option value="">Set category...</option>
							<option v-for="cat in categories" :key="cat" :value="cat">
								{{ cat }}
							</option>
						</select>
						<input
							type="text"
							v-model="newSubcategory"
							placeholder="Subcategory (optional)"
							class="border-2 border-gray-asparagus rounded px-3 py-1 w-48" />
						<button
							@click="updateSelectedCategories"
							:disabled="!anySelected || !newCategory || updating"
							class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50">
							Update Category
						</button>
					</div>

					<!-- Clear button on its own line -->
					<div class="flex gap-2">
						<button
							@click="clearSelectedCategories"
							:disabled="!anySelected || updating"
							class="rounded-md bg-semantic-danger px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 flex items-center gap-2">
							<NoSymbolIcon class="w-4 h-4" />
							Clear Category
						</button>
					</div>
				</div>

				<!-- Category filter -->
				<div class="mb-4">
					<label class="inline-flex items-center">
						<input
							type="checkbox"
							v-model="showOnlyNoCategory"
							class="mr-2 checkbox-input" />
						Show only items without a category
					</label>
				</div>
			</div>

			<div v-if="activeTab === 'version'">
				<div class="mb-4">
					<div class="flex gap-4 items-center">
						<select
							v-model="newVersion"
							class="border-2 border-gray-asparagus rounded px-3 py-1">
							<option value="">Set version...</option>
							<option v-for="version in versions" :key="version" :value="version">
								{{ version }}
							</option>
						</select>
						<button
							@click="updateSelectedVersions"
							:disabled="!anySelected || !newVersion || updating"
							class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50">
							Update Version
						</button>
					</div>
				</div>
			</div>

			<div v-if="activeTab === 'image'">
				<div class="mb-4">
					<div class="flex gap-4 items-center">
						<input
							type="text"
							v-model="newImage"
							placeholder="Image"
							class="border-2 border-gray-asparagus rounded px-3 py-1 w-80" />
						<button
							@click="updateSelectedImages"
							:disabled="!anySelected || !newImage || updating"
							class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50">
							Update Image
						</button>
					</div>
				</div>
			</div>

			<div v-if="activeTab === 'url'">
				<div class="mb-4">
					<div class="flex gap-4 items-center">
						<input
							type="text"
							v-model="newUrl"
							placeholder="URL"
							class="border-2 border-gray-asparagus rounded px-3 py-1 w-80" />
						<button
							@click="updateSelectedUrls"
							:disabled="!anySelected || !newUrl || updating"
							class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50">
							Update URL
						</button>
					</div>
				</div>
			</div>

			<div v-if="activeTab === 'price'">
				<div class="mb-4">
					<div
						v-if="selectedVersion === 'all'"
						class="p-3 bg-yellow-50 border border-yellow-200 rounded">
						<p class="text-yellow-800 text-sm">
							⚠️ Please select a specific version to update prices. Prices are
							version-specific and cannot be updated when "All items" is selected.
						</p>
					</div>
					<div v-else class="flex gap-4 items-center">
						<input
							type="number"
							v-model="newPrice"
							placeholder="Price"
							step="0.01"
							min="0"
							class="border-2 border-gray-asparagus rounded px-3 py-1 w-32" />
						<button
							@click="updateSelectedPrices"
							:disabled="!anySelected || newPrice === '' || updating"
							class="rounded-md bg-semantic-success px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50">
							Update Price
						</button>
					</div>
				</div>
			</div>

			<div v-if="activeTab === 'settings'">
				<div class="mb-4">
					<h3 class="text-lg font-semibold mb-2">Table Display</h3>

					<!-- Column visibility options -->
					<div class="mb-2">
						<label class="inline-flex items-center">
							<input
								type="checkbox"
								v-model="showImageColumn"
								class="mr-2 checkbox-input" />
							Show Image column
						</label>
					</div>

					<div class="mb-2">
						<label class="inline-flex items-center">
							<input
								type="checkbox"
								v-model="showNameColumn"
								class="mr-2 checkbox-input" />
							Show Name column
						</label>
					</div>

					<div class="mb-2">
						<label class="inline-flex items-center">
							<input
								type="checkbox"
								v-model="showDocumentIdColumn"
								class="mr-2 checkbox-input" />
							Show Document ID column
						</label>
					</div>

					<div class="mb-2">
						<label class="inline-flex items-center">
							<input
								type="checkbox"
								v-model="showVersionColumn"
								class="mr-2 checkbox-input" />
							Show Version column
						</label>
					</div>

					<div class="mb-2">
						<label class="inline-flex items-center">
							<input
								type="checkbox"
								v-model="showCategoryColumns"
								class="mr-2 checkbox-input" />
							Show Categories columns
						</label>
					</div>

					<div class="mb-2">
						<label class="inline-flex items-center">
							<input
								type="checkbox"
								v-model="showUrlColumn"
								class="mr-2 checkbox-input" />
							Show URL column
						</label>
					</div>

					<div class="mb-2">
						<label class="inline-flex items-center">
							<input
								type="checkbox"
								v-model="showPriceColumn"
								class="mr-2 checkbox-input" />
							Show Price column
						</label>
					</div>
				</div>
			</div>

			<div class="mt-10">
				<div class="bg-white rounded-lg shadow-md overflow-hidden">
					<div class="overflow-x-auto">
						<table class="min-w-full divide-y divide-gray-200 border border-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th
										class="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 w-12">
										<input
											type="checkbox"
											:checked="allSelected"
											@change="toggleSelectAll($event.target.checked)"
											:disabled="filteredItems.length === 0"
											class="checkbox-input" />
									</th>
									<th
										v-if="showDocumentIdColumn"
										@click="setSort('id')"
										class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
										<div class="flex items-center gap-1">
											Document ID
											<ArrowUpIcon
												v-if="getSortIcon('id') === 'up'"
												class="w-4 h-4 text-gray-700" />
											<ArrowDownIcon
												v-else-if="getSortIcon('id') === 'down'"
												class="w-4 h-4 text-gray-700" />
										</div>
									</th>
									<th
										v-if="showImageColumn"
										@click="setSort('image')"
										class="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200 w-16">
										<div class="flex items-center justify-center gap-1">
											Image
											<ArrowUpIcon
												v-if="getSortIcon('image') === 'up'"
												class="w-3 h-3 text-gray-700" />
											<ArrowDownIcon
												v-else-if="getSortIcon('image') === 'down'"
												class="w-3 h-3 text-gray-700" />
										</div>
									</th>
									<th
										v-if="showNameColumn"
										@click="setSort('name')"
										class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
										<div class="flex items-center gap-1">
											Name / Material ID
											<ArrowUpIcon
												v-if="getSortIcon('name') === 'up'"
												class="w-4 h-4 text-gray-700" />
											<ArrowDownIcon
												v-else-if="getSortIcon('name') === 'down'"
												class="w-4 h-4 text-gray-700" />
										</div>
									</th>
									<th
										v-if="showVersionColumn"
										@click="setSort('version')"
										class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
										<div class="flex items-center gap-1">
											Version
											<ArrowUpIcon
												v-if="getSortIcon('version') === 'up'"
												class="w-4 h-4 text-gray-700" />
											<ArrowDownIcon
												v-else-if="getSortIcon('version') === 'down'"
												class="w-4 h-4 text-gray-700" />
										</div>
									</th>
									<th
										v-if="showCategoryColumns"
										@click="setSort('category')"
										class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
										<div class="flex items-center gap-1">
											Category
											<ArrowUpIcon
												v-if="getSortIcon('category') === 'up'"
												class="w-4 h-4 text-gray-700" />
											<ArrowDownIcon
												v-else-if="getSortIcon('category') === 'down'"
												class="w-4 h-4 text-gray-700" />
										</div>
									</th>
									<th
										v-if="showCategoryColumns"
										@click="setSort('subcategory')"
										class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
										<div class="flex items-center gap-1">
											Subcategory
											<ArrowUpIcon
												v-if="getSortIcon('subcategory') === 'up'"
												class="w-4 h-4 text-gray-700" />
											<ArrowDownIcon
												v-else-if="getSortIcon('subcategory') === 'down'"
												class="w-4 h-4 text-gray-700" />
										</div>
									</th>
									<th
										v-if="showUrlColumn"
										@click="setSort('url')"
										class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
										<div class="flex items-center gap-1">
											URL
											<ArrowUpIcon
												v-if="getSortIcon('url') === 'up'"
												class="w-4 h-4 text-gray-700" />
											<ArrowDownIcon
												v-else-if="getSortIcon('url') === 'down'"
												class="w-4 h-4 text-gray-700" />
										</div>
									</th>
									<th
										v-if="showPriceColumn"
										@click="setSort('price')"
										class="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none border-r border-gray-200">
										<div class="flex items-center gap-1">
											Price
											{{
												selectedVersion !== 'all'
													? `(${selectedVersion})`
													: ''
											}}
											<ArrowUpIcon
												v-if="getSortIcon('price') === 'up'"
												class="w-4 h-4 text-gray-700" />
											<ArrowDownIcon
												v-else-if="getSortIcon('price') === 'down'"
												class="w-4 h-4 text-gray-700" />
										</div>
									</th>
									<th
										class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
										Actions
									</th>
								</tr>
							</thead>
							<tbody class="bg-white divide-y divide-gray-200">
								<tr
									v-for="item in filteredItems"
									:key="item.id"
									:class="{
										'bg-green-50': isSelected(item.id)
									}">
									<td class="px-2 py-3 text-center border-r border-gray-200 w-12">
										<input
											type="checkbox"
											:checked="isSelected(item.id)"
											@change="toggleSelectItem(item.id)"
											class="checkbox-input" />
									</td>
									<td
										v-if="showDocumentIdColumn"
										class="px-2 py-2 text-gray-900 border-r border-gray-200"
										:title="item.id">
										<div class="font-mono text-sm">{{ item.id }}</div>
									</td>
									<td
										v-if="showImageColumn"
										class="px-1 py-2 text-center border-r border-gray-200 w-16">
										<img
											v-if="item.image"
											:src="item.image"
											:alt="item.name"
											class="w-10 h-10 object-cover rounded mx-auto"
											@error="$event.target.style.display = 'none'"
											@load="$event.target.style.display = 'block'" />
										<div
											v-else
											class="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500 mx-auto">
											?
										</div>
									</td>
									<td
										v-if="showNameColumn"
										class="px-2 py-2 text-gray-900 border-r border-gray-200"
										:title="item.name">
										<div class="font-medium">
											<a
												:href="getWikiUrl(item)"
												target="_blank"
												rel="noopener noreferrer"
												class="text-gray-900 hover:text-gray-asparagus hover:underline">
												{{ item.name }}
											</a>
										</div>
										<div class="text-sm text-gray-500 font-mono">
											{{ item.material_id }}
										</div>
									</td>
									<td
										v-if="showVersionColumn"
										class="px-2 py-2 text-gray-900 border-r border-gray-200">
										{{ item.version }}
									</td>
									<td
										v-if="showCategoryColumns"
										class="px-2 py-2 text-gray-500 border-r border-gray-200">
										{{ item.category }}
									</td>
									<td
										v-if="showCategoryColumns"
										class="px-2 py-2 text-gray-500 border-r border-gray-200">
										{{ item.subcategory }}
									</td>
									<td
										v-if="showUrlColumn"
										class="px-2 py-2 text-gray-500 border-r border-gray-200"
										:title="item.url || ''">
										<div class="truncate max-w-xs">{{ item.url || '' }}</div>
									</td>
									<td
										v-if="showPriceColumn"
										class="px-2 py-2 text-gray-900 border-r border-gray-200">
										{{
											getPriceForVersion(item, selectedVersion) !== null
												? getPriceForVersion(item, selectedVersion)
												: ''
										}}
									</td>
									<td class="px-2 py-2 text-center border-r border-gray-200">
										<div class="flex items-center justify-center gap-2">
											<RouterLink
												:to="{
													path: `/edit/${item.id}`,
													query: getEditLinkQuery()
												}"
												class="text-gray-asparagus hover:text-heavy-metal p-1 rounded transition-colors"
												title="Edit item">
												<PencilIcon class="w-4 h-4" />
											</RouterLink>
											<a
												href="#"
												@click.prevent="deleteItem(item.id)"
												class="text-gray-asparagus hover:text-heavy-metal p-1 rounded transition-colors"
												title="Delete item">
												<TrashIcon class="w-4 h-4" />
											</a>
										</div>
									</td>
								</tr>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div v-else-if="user?.email" class="p-4 pt-8">
		<div class="text-center">
			<h2 class="text-xl font-bold mb-4">Access Denied</h2>
			<p class="text-gray-600 mb-4">You need admin privileges to bulk update items.</p>
			<RouterLink to="/" class="text-blue-600 hover:underline">Return to Home</RouterLink>
		</div>
	</div>

	<!-- Delete Confirmation Modal -->
	<!-- prettier-ignore -->
	<BaseModal
		:isOpen="showDeleteModal"
		title="Delete Item"
		size="small"
		@close="showDeleteModal = false; itemToDelete = null">
		<div class="space-y-4">
			<div>
				<h3 class="font-normal text-gray-900">
					Are you sure you want to delete
					<span class="font-semibold">{{ itemToDelete?.name }}</span>
					?
				</h3>
				<p class="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end p-4">
				<div class="flex space-x-3">
					<!-- prettier-ignore -->
					<button
						type="button"
						@click="showDeleteModal = false; itemToDelete = null"
						class="btn-secondary--outline">
						Cancel
					</button>
					<button
						@click="executeDelete"
						class="bg-semantic-danger hover:bg-opacity-90 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
						Delete
					</button>
				</div>
			</div>
		</template>
	</BaseModal>
</template>

<style scoped>
/* Table is now styled using Tailwind classes from the styleguide */

.checkbox-input {
	@apply w-4 h-4 rounded;
	accent-color: theme('colors.gray-asparagus');
}
</style>
