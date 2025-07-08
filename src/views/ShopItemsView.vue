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

// Initialize from URL parameters
onMounted(() => {
	const shopId = route.params.shopId || route.query.shop
	if (shopId) {
		selectedShopId.value = shopId
	}
})

// Watch for user changes - redirect if not logged in
watch(
	user,
	(newUser) => {
		if (newUser === null) {
			router.push('/login')
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

// Form handlers
function showAddItemForm() {
	if (!selectedShopId.value) {
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

async function handleItemDelete(shopItem) {
	const itemName = shopItem.itemData?.name || 'this item'
	if (
		!confirm(
			`Are you sure you want to remove "${itemName}" from your shop? This action cannot be undone.`
		)
	) {
		return
	}

	loading.value = true
	error.value = null

	try {
		await deleteShopItem(shopItem.id)
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
	<div class="p-4 pt-8">
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Shop Items</h1>
			<p class="text-gray-600">
				Manage your shop inventory with buy/sell prices and stock tracking.
			</p>
		</div>

		<!-- Error message -->
		<div v-if="error" class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
			{{ error }}
		</div>

		<!-- Loading state -->
		<div
			v-if="loading"
			class="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
			Processing...
		</div>

		<!-- No servers warning -->
		<div
			v-if="!hasServers && !loading"
			class="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
			<p class="font-medium">No servers found</p>
			<p class="text-sm mt-1">
				You need to create a server first before managing shop items.
				<router-link to="/servers" class="text-blue-600 hover:text-blue-800 underline">
					Go to Servers
				</router-link>
			</p>
		</div>

		<!-- No shops warning -->
		<div
			v-else-if="!hasShops && !loading"
			class="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
			<p class="font-medium">No shops found</p>
			<p class="text-sm mt-1">
				You need to create a shop first before managing shop items.
				<router-link to="/shops" class="text-blue-600 hover:text-blue-800 underline">
					Go to Shops
				</router-link>
			</p>
		</div>

		<!-- Main content -->
		<div v-else-if="hasShops && hasServers">
			<!-- Shop selector -->
			<div class="mb-6">
				<label for="shop-select" class="block text-sm font-medium text-gray-700 mb-2">
					Select Shop
				</label>
				<select
					id="shop-select"
					v-model="selectedShopId"
					class="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
					<option value="">Choose a shop...</option>
					<option v-for="shop in shops" :key="shop.id" :value="shop.id">
						{{ shop.name }} ({{ getServerName(shop.server_id) }})
					</option>
				</select>
			</div>

			<!-- Shop info and actions -->
			<div v-if="selectedShop && selectedServer" class="mb-6">
				<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
					<div class="flex flex-col md:flex-row md:items-center md:justify-between">
						<div>
							<h2 class="text-xl font-semibold text-gray-900">
								{{ selectedShop.name }}
							</h2>
							<p class="text-gray-600">
								{{ getServerName(selectedShop.server_id) }} • Minecraft
								{{ selectedServer.minecraft_version }}
							</p>
							<p v-if="selectedShop.location" class="text-sm text-gray-500 mt-1">
								📍 {{ selectedShop.location }}
							</p>
						</div>
						<div class="mt-4 md:mt-0">
							<button
								@click="showAddItemForm"
								class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors font-medium">
								+ Add Item
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Add/Edit item form -->
			<ShopItemForm
				v-if="showAddForm"
				ref="shopItemForm"
				:available-items="availableItemsForAdding"
				:editing-item="editingItem"
				:server="selectedServer"
				@submit="handleItemSubmit"
				@cancel="cancelForm" />

			<!-- Shop items display -->
			<div v-if="selectedShopId && shopItems">
				<div v-if="shopItems.length === 0" class="text-center py-12 bg-gray-50 rounded-lg">
					<div class="text-gray-500 text-lg mb-2">No items in this shop yet</div>
					<div class="text-sm text-gray-400 mb-4">
						Add your first item to start tracking prices and inventory
					</div>
					<button
						@click="showAddItemForm"
						class="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition-colors font-medium">
						+ Add Your First Item
					</button>
				</div>

				<!-- Items grouped by category -->
				<div v-else class="space-y-6">
					<div v-for="(categoryItems, category) in shopItemsByCategory" :key="category">
						<h3
							class="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
							{{ category }}
						</h3>
						<ShopItemTable
							:items="categoryItems"
							:server="selectedServer"
							:shop="selectedShop"
							@edit="showEditItemForm"
							@delete="handleItemDelete"
							@bulk-update="handleBulkUpdate"
							@quick-edit="handleQuickEdit" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>
