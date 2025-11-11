<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useCurrentUser, useFirestore, useCollection } from 'vuefire'
import { useRouter, useRoute } from 'vue-router'
import { query, collection, orderBy, where } from 'firebase/firestore'
import { useShops } from '../utils/shopProfile.js'
import { useServers } from '../utils/serverProfile.js'
import {
	useShopItems,
	addShopItem,
	updateShopItem,
	deleteShopItem,
	bulkUpdateShopItems
} from '../utils/shopItems.js'
import ShopItemForm from '../components/ShopItemForm.vue'
import ShopItemTable from '../components/ShopItemTable.vue'
import BaseButton from '../components/BaseButton.vue'
import BaseModal from '../components/BaseModal.vue'
import {
	ArrowLeftIcon,
	PlusIcon,
	MapPinIcon,
	BanknotesIcon,
	CalendarDaysIcon,
	Squares2X2Icon
} from '@heroicons/vue/20/solid'

const user = useCurrentUser()
const router = useRouter()
const route = useRoute()
const db = useFirestore()

// Reactive state
const selectedShopId = ref('')
const showAddForm = ref(false)
const editingItem = ref(null)
const loading = ref(false)
const error = ref(null)
const shopItemForm = ref(null)

// View mode settings
const viewMode = ref('categories') // 'categories' or 'list'
const layout = ref('comfortable') // 'comfortable' or 'condensed'

// Get user's shops and servers
const { shops } = useShops(computed(() => user.value?.uid))
const { servers } = useServers(computed(() => user.value?.uid))

// Get shop items for selected shop (with error handling)
const safeShopId = computed(() => {
	// Only return shop ID if user owns the shop and is authenticated
	if (!user.value?.uid || !selectedShopId.value || !shops.value) return null

	const userShop = shops.value.find((shop) => shop.id === selectedShopId.value)
	return userShop ? selectedShopId.value : null
})

const shopItemsResult = useShopItems(safeShopId)
const shopItems = computed(() => {
	// Return empty array if there's an error or no data
	try {
		const items = shopItemsResult.items.value || []
		console.log('Final shop items in view:', items)
		return items
	} catch (error) {
		console.warn('Error loading shop items:', error)
		return []
	}
})

// Computed properties - Define these FIRST before using them in other computeds
const hasShops = computed(() => shops.value && shops.value.length > 0)
const hasServers = computed(() => servers.value && servers.value.length > 0)
const selectedShop = computed(
	() => shops.value?.find((shop) => shop.id === selectedShopId.value) || null
)
const selectedServer = computed(() =>
	selectedShop.value && servers.value
		? servers.value.find((s) => s.id === selectedShop.value.server_id)
		: null
)

// Get all items from the main collection for the item selector
const allItemsQuery = computed(() => {
	if (!selectedShop.value?.server_id) return null

	// Get the server to determine Minecraft version
	const server = servers.value?.find((s) => s.id === selectedShop.value.server_id)
	if (!server) return null

	return query(
		collection(db, 'items'),
		where('version', '<=', server.minecraft_version),
		orderBy('version', 'asc'),
		orderBy('category', 'asc'),
		orderBy('name', 'asc')
	)
})

const availableItems = useCollection(allItemsQuery)

// Filter out items that are already in the shop
const availableItemsForAdding = computed(() => {
	if (!availableItems.value || !shopItems.value) return availableItems.value || []

	const existingItemIds = shopItems.value.map((shopItem) => shopItem.item_id)
	return availableItems.value.filter((item) => !existingItemIds.includes(item.id))
})

// Group shop items by category for better organization
const shopItemsByCategory = computed(() => {
	if (!shopItems.value || !availableItems.value) return {}

	const grouped = {}

	shopItems.value.forEach((shopItem) => {
		// Find the corresponding item data from the main items collection
		const itemData = availableItems.value.find((item) => item.id === shopItem.item_id)
		if (itemData) {
			const category = itemData.category || 'Uncategorized'
			if (!grouped[category]) {
				grouped[category] = []
			}
			grouped[category].push({
				...shopItem,
				itemData
			})
		}
	})

	return grouped
})

// Flat list view combining all shop items
const allVisibleShopItems = computed(() => {
	if (!shopItems.value || !availableItems.value) return []

	return shopItems.value
		.map((shopItem) => {
			// Find the corresponding item data from the main items collection
			const itemData = availableItems.value.find((item) => item.id === shopItem.item_id)
			return {
				...shopItem,
				itemData
			}
		})
		.sort((a, b) => {
			// Sort alphabetically by name
			const nameA = a.itemData?.name?.toLowerCase() || ''
			const nameB = b.itemData?.name?.toLowerCase() || ''
			return nameA.localeCompare(nameB)
		})
})

// Load and save view settings from localStorage
function loadViewSettings() {
	try {
		const savedViewMode = localStorage.getItem('shopItemsViewMode')
		const savedLayout = localStorage.getItem('shopItemsLayout')

		if (savedViewMode && ['categories', 'list'].includes(savedViewMode)) {
			viewMode.value = savedViewMode
		}

		if (savedLayout && ['comfortable', 'condensed'].includes(savedLayout)) {
			layout.value = savedLayout
		}
	} catch (error) {
		console.warn('Error loading view settings:', error)
	}
}

function saveViewSettings() {
	try {
		localStorage.setItem('shopItemsViewMode', viewMode.value)
		localStorage.setItem('shopItemsLayout', layout.value)
	} catch (error) {
		console.warn('Error saving view settings:', error)
	}
}

// Initialize from URL parameters
onMounted(() => {
	const shopId = route.params.shopId || route.query.shop
	if (shopId) {
		selectedShopId.value = shopId
	}

	// Load view settings
	loadViewSettings()
})

// Watch for user changes - redirect if not logged in
watch(
	user,
	(newUser) => {
		if (newUser === null) {
			router.push('/signin')
		}
	},
	{ immediate: true }
)

// Watch for shops loading - handle shop selection
watch(shops, (newShops) => {
	if (newShops && newShops.length > 0) {
		if (selectedShopId.value) {
			// Validate that the selected shop exists and user owns it
			const userShop = newShops.find((shop) => shop.id === selectedShopId.value)
			if (!userShop) {
				// If selected shop doesn't exist or user doesn't own it, clear selection and show error
				console.warn('Shop not found or access denied:', selectedShopId.value)
				error.value = 'You do not have access to this shop or it does not exist.'
				selectedShopId.value = newShops[0].id
			}
		} else {
			// If no shop selected, select the first one
			selectedShopId.value = newShops[0].id
		}
	} else if (selectedShopId.value) {
		// User has no shops but trying to access one
		error.value = 'No shops found. Please create a shop first.'
		selectedShopId.value = ''
	}
})

// Update URL when shop selection changes
watch(selectedShopId, (newShopId) => {
	if (newShopId && route.query.shop !== newShopId) {
		router.replace({ query: { ...route.query, shop: newShopId } })
	}
})

// Save view settings when they change
watch(
	[viewMode, layout],
	() => {
		saveViewSettings()
	},
	{ deep: true }
)

// Form handlers
function showAddItemForm() {
	if (!selectedShopId.value || !selectedServer.value) {
		error.value = 'Please select a shop first'
		return
	}
	showAddForm.value = true
	editingItem.value = null

	// Focus search input after form is shown
	setTimeout(() => {
		if (shopItemForm.value) {
			shopItemForm.value.focusSearchInput()
		}
	}, 100)
}

function showEditItemForm(shopItem) {
	console.log('ShopItemsView: Opening edit form for item:', shopItem.id)
	console.log('ShopItemsView: Full item data:', shopItem)

	// Ensure the item has a proper document ID
	if (!shopItem.id) {
		console.error('ShopItemsView: Cannot edit item without document ID')
		error.value = 'Cannot edit item: missing document ID'
		return
	}

	editingItem.value = shopItem
	showAddForm.value = true
}

function cancelForm() {
	showAddForm.value = false
	editingItem.value = null
	error.value = null
}

// CRUD operations
async function handleItemSubmit(itemData) {
	console.log('ShopItemsView: handleItemSubmit called')
	console.log('Is editing:', !!editingItem.value)

	if (!user.value?.uid || !selectedShopId.value) return

	loading.value = true
	error.value = null

	try {
		if (editingItem.value) {
			// Update existing shop item
			console.log('ShopItemsView: Updating existing item with ID:', editingItem.value.id)

			// Validate that we have a document ID
			if (!editingItem.value.id) {
				throw new Error('Cannot update item: missing document ID')
			}

			await updateShopItem(editingItem.value.id, itemData)
		} else {
			// Add new shop item
			console.log('ShopItemsView: Adding new item')
			await addShopItem(selectedShopId.value, itemData.item_id, itemData)
		}

		// Close form
		cancelForm()
	} catch (err) {
		console.error('Error saving shop item:', err)
		error.value = err.message || 'Failed to save shop item. Please try again.'
	} finally {
		loading.value = false
	}
}

const showDeleteItemModal = ref(false)
const itemPendingDelete = ref(null)

function handleItemDelete(shopItem) {
	itemPendingDelete.value = shopItem
	showDeleteItemModal.value = true
}

async function confirmDeleteItem() {
	if (!itemPendingDelete.value) return

	loading.value = true
	error.value = null

	try {
		await deleteShopItem(itemPendingDelete.value.id)
		showDeleteItemModal.value = false
		itemPendingDelete.value = null
	} catch (err) {
		console.error('Error deleting shop item:', err)
		error.value = err.message || 'Failed to delete shop item. Please try again.'
	} finally {
		loading.value = false
	}
}

async function handleBulkUpdate(itemsArray) {
	if (!selectedShopId.value || !itemsArray.length) return

	loading.value = true
	error.value = null

	try {
		await bulkUpdateShopItems(selectedShopId.value, itemsArray)
	} catch (err) {
		console.error('Error bulk updating shop items:', err)
		error.value = err.message || 'Failed to bulk update shop items. Please try again.'
	} finally {
		loading.value = false
	}
}

// Handle quick edit from table
async function handleQuickEdit(updatedItem) {
	console.log('ShopItemsView: handleQuickEdit called for item:', updatedItem.id)
	console.log('ShopItemsView: Full updated item data:', updatedItem)

	// Validate that we have a document ID
	if (!updatedItem.id) {
		console.error('ShopItemsView: Cannot quick edit item without document ID')
		error.value = 'Cannot update item: missing document ID'
		return
	}

	if (!user.value?.uid || !selectedShopId.value) return

	loading.value = true
	error.value = null

	try {
		// Extract the data to update (excluding the full item object)
		const updateData = {
			buy_price: updatedItem.buy_price,
			sell_price: updatedItem.sell_price,
			stock_quantity: updatedItem.stock_quantity,
			stock_full: updatedItem.stock_full,
			notes: updatedItem.notes
		}

		console.log('ShopItemsView: Updating item ID:', updatedItem.id, 'with data:', updateData)
		await updateShopItem(updatedItem.id, updateData)

		// Handle shop owner_funds update if needed
		if (updatedItem._setOwnerFunds !== undefined && updatedItem._shopId) {
			console.log(
				'ShopItemsView: Setting owner_funds to',
				updatedItem._setOwnerFunds,
				'for shop:',
				updatedItem._shopId
			)

			// Import shop utilities if needed
			const { updateShop } = await import('../utils/shopProfile.js')
			await updateShop(updatedItem._shopId, { owner_funds: updatedItem._setOwnerFunds })
		}
	} catch (err) {
		console.error('Error updating shop item:', err)
		error.value = err.message || 'Failed to update shop item. Please try again.'
	} finally {
		loading.value = false
	}
}

// Helper functions
function getShopName(shopId) {
	return shops.value?.find((shop) => shop.id === shopId)?.name || 'Unknown Shop'
}

function getServerName(serverId) {
	return servers.value?.find((server) => server.id === serverId)?.name || 'Unknown Server'
}
</script>

<template>
	<div class="p-4 pt-8 space-y-8">
		<!-- Back Button -->
		<div>
			<BaseButton variant="tertiary" @click="router.push('/shop-manager')">
				<template #left-icon>
					<ArrowLeftIcon />
				</template>
				Back to Shop Manager
			</BaseButton>
		</div>

		<div>
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Shop Items</h1>
			<p class="text-gray-600">
				Manage your shop inventory with buy/sell prices and stock tracking.
			</p>
		</div>

		<!-- Error message -->
		<div
			v-if="error"
			class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
			{{ error }}
		</div>

		<!-- Loading state -->
		<div
			v-if="loading"
			class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-700">
			Processing...
		</div>

		<!-- No servers warning -->
		<div
			v-if="!hasServers && !loading"
			class="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-4 text-yellow-800">
			<p class="font-semibold">No servers found</p>
			<p class="text-sm mt-1">
				Create a server before managing shop items.
				<router-link to="/servers" class="text-yellow-900 underline">
					Go to Servers
				</router-link>
			</p>
		</div>

		<!-- No shops warning -->
		<div
			v-else-if="!hasShops && !loading"
			class="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-4 text-yellow-800">
			<p class="font-semibold">No shops found</p>
			<p class="text-sm mt-1">
				Create a shop before managing items.
				<router-link to="/shops" class="text-yellow-900 underline">Go to Shops</router-link>
			</p>
		</div>

		<!-- Main content -->
		<div v-else-if="hasShops && hasServers" class="space-y-8">
			<!-- Shop selector -->
			<div>
				<label for="shop-select" class="block text-sm font-medium text-gray-700 mb-2">
					Select Shop
				</label>
				<select
					id="shop-select"
					v-model="selectedShopId"
					class="mt-2 block w-full rounded border-2 border-gray-asparagus px-3 py-1 text-gray-900 focus:ring-2 focus:ring-gray-asparagus focus:border-gray-asparagus font-sans md:w-1/3">
					<option value="">Choose a shop...</option>
					<option v-for="shop in shops" :key="shop.id" :value="shop.id">
						{{ shop.name }} ({{ getServerName(shop.server_id) }})
					</option>
				</select>
			</div>

			<!-- Shop info -->
			<div
				v-if="selectedShop && selectedServer"
				class="bg-sea-mist rounded-lg shadow-md border-2 border-amulet overflow-hidden">
				<div class="bg-amulet px-4 py-3 border-x-2 border-t-2 border-white flex flex-wrap items-center justify-between gap-4">
					<div>
						<h2 class="text-xl font-semibold text-heavy-metal flex items-center gap-2">
							<Squares2X2Icon class="w-5 h-5" />
							{{ selectedShop.name }}
						</h2>
						<p class="text-sm text-heavy-metal mt-1">
							{{ getServerName(selectedShop.server_id) }} • Minecraft
							{{ selectedServer.minecraft_version }}
						</p>
					</div>
				</div>

				<div class="bg-norway border-x-2 border-b-2 border-white px-4 py-5">
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<div class="flex items-center gap-3 text-sm text-heavy-metal">
							<MapPinIcon class="w-5 h-5 flex-shrink-0 text-gray-asparagus" />
							<span>
								<span class="font-medium">Location:</span>
								{{ selectedShop.location || 'Not set' }}
							</span>
						</div>
						<div class="flex items-center gap-3 text-sm text-heavy-metal">
							<BanknotesIcon class="w-5 h-5 flex-shrink-0 text-gray-asparagus" />
							<span>
								<span class="font-medium">Funds:</span>
								{{
									selectedShop.owner_funds !== null &&
									selectedShop.owner_funds !== undefined
										? selectedShop.owner_funds.toFixed(2)
										: 'Auto'
								}}
							</span>
						</div>
						<div
							v-if="selectedShop.created_at"
							class="flex items-center gap-3 text-sm text-heavy-metal">
							<CalendarDaysIcon class="w-5 h-5 flex-shrink-0 text-gray-asparagus" />
							<span>
								<span class="font-medium">Created:</span>
								{{ new Date(selectedShop.created_at).toLocaleDateString() }}
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Inventory -->
			<div v-if="selectedShopId" class="space-y-6">
				<div>
					<h2 class="text-2xl font-semibold text-heavy-metal">Inventory</h2>
					<p class="text-sm text-gray-600">
						{{ shopItems.length }} item{{ shopItems.length === 1 ? '' : 's' }} tracked
					</p>
				</div>

				<div class="flex flex-wrap items-center justify-between gap-3">
					<div
						v-if="shopItems.length > 0"
						class="flex flex-wrap items-center gap-6">
						<div>
							<span class="text-sm font-medium text-gray-700 block">View as:</span>
							<div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden mt-1">
								<button
									@click="viewMode = 'categories'"
									:class="[
										viewMode === 'categories'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-sea-mist',
										'px-3 py-1 text-sm font-medium transition border-r-2 border-gray-asparagus last:border-r-0'
									]">
									Categories
								</button>
								<button
									@click="viewMode = 'list'"
									:class="[
										viewMode === 'list'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-sea-mist',
										'px-3 py-1 text-sm font-medium transition'
									]">
									List
								</button>
							</div>
						</div>

						<div>
							<span class="text-sm font-medium text-gray-700 block">Layout:</span>
							<div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden mt-1">
								<button
									@click="layout = 'comfortable'"
									:class="[
										layout === 'comfortable'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-sea-mist',
										'px-3 py-1 text-sm font-medium transition border-r-2 border-gray-asparagus last:border-r-0'
									]">
									Comfortable
								</button>
								<button
									@click="layout = 'condensed'"
									:class="[
										layout === 'condensed'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-sea-mist',
										'px-3 py-1 text-sm font-medium transition'
									]">
									Condensed
								</button>
							</div>
						</div>
					</div>

					<BaseButton
						type="button"
						variant="primary"
						@click="showAddItemForm"
						:disabled="!selectedShopId">
						<template #left-icon>
							<PlusIcon />
						</template>
						Add Item
					</BaseButton>
				</div>

				<div v-if="shopItems && shopItems.length > 0" class="space-y-4">
					<div class="text-sm text-heavy-metal">
						Showing {{ allVisibleShopItems.length }} item{{
							allVisibleShopItems.length === 1 ? '' : 's'
						}}
					</div>

					<template v-if="viewMode === 'categories'">
						<div
							v-for="(categoryItems, category) in shopItemsByCategory"
							:key="category"
							class="space-y-3">
							<h3 class="text-lg font-semibold text-heavy-metal uppercase tracking-wide">
								{{ category }}
							</h3>
							<ShopItemTable
								:items="categoryItems"
								:server="selectedServer"
								:shop="selectedShop"
								:view-mode="viewMode"
								:layout="layout"
								appearance="guide"
								@edit="showEditItemForm"
								@delete="handleItemDelete"
								@bulk-update="handleBulkUpdate"
								@quick-edit="handleQuickEdit" />
						</div>
					</template>

					<template v-else>
						<ShopItemTable
							:items="allVisibleShopItems"
							:server="selectedServer"
							:shop="selectedShop"
							:view-mode="viewMode"
							:layout="layout"
							appearance="guide"
							@edit="showEditItemForm"
							@delete="handleItemDelete"
							@bulk-update="handleBulkUpdate"
							@quick-edit="handleQuickEdit" />
					</template>
				</div>

				<div
					v-else
					class="bg-norway border-2 border-dashed border-gray-asparagus/40 rounded-lg px-6 py-10 text-center text-heavy-metal space-y-3">
					<div class="text-xl font-semibold">No items in this shop yet</div>
					<p class="text-sm text-gray-600">
						Add your first item to start tracking prices and inventory.
					</p>
					<BaseButton
						type="button"
						variant="primary"
						@click="showAddItemForm"
						:disabled="!selectedShopId">
						<template #left-icon>
							<PlusIcon />
						</template>
						Add Your First Item
					</BaseButton>
				</div>
			</div>
		</div>
	</div>

	<BaseModal
		:isOpen="showAddForm"
		:title="editingItem ? 'Edit Shop Item' : 'Add Shop Item'"
		maxWidth="max-w-3xl"
		@close="cancelForm">
		<ShopItemForm
			ref="shopItemForm"
			:available-items="availableItemsForAdding"
			:editing-item="editingItem"
			:server="selectedServer"
			display-variant="modal"
			@submit="handleItemSubmit"
			@cancel="cancelForm" />
	</BaseModal>

	<BaseModal
		:isOpen="showDeleteItemModal"
		title="Delete Item"
		size="small"
		@close="showDeleteItemModal = false; itemPendingDelete = null">
		<div class="space-y-4">
			<div>
				<h3 class="font-normal text-gray-900">
					Remove
					<span class="font-semibold">
						{{ itemPendingDelete?.itemData?.name || 'this item' }}
					</span>
					from your shop?
				</h3>
				<p class="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
			</div>
		</div>

		<template #footer>
			<div class="flex items-center justify-end p-4">
				<div class="flex space-x-3">
					<button
						type="button"
						class="btn-secondary--outline"
						@click="showDeleteItemModal = false; itemPendingDelete = null">
						Cancel
					</button>
					<BaseButton
						type="button"
						variant="primary"
						class="bg-semantic-danger hover:bg-opacity-90"
						:disabled="loading"
						@click="confirmDeleteItem">
						{{ loading ? 'Deleting...' : 'Delete' }}
					</BaseButton>
				</div>
			</div>
		</template>
	</BaseModal>
</template>
