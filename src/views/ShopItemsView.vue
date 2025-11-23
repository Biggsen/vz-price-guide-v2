<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useCurrentUser, useFirestore, useCollection } from 'vuefire'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { query, collection, orderBy, where } from 'firebase/firestore'
import { useShops, updateShop } from '../utils/shopProfile.js'
import { useServers } from '../utils/serverProfile.js'
import {
	useShopItems,
	addShopItem,
	updateShopItem,
	deleteShopItem,
	bulkUpdateShopItems
} from '../utils/shopItems.js'
import ShopItemForm from '../components/ShopItemForm.vue'
import ShopFormModal from '../components/ShopFormModal.vue'
import BaseTable from '../components/BaseTable.vue'
import InlinePriceInput from '../components/InlinePriceInput.vue'
import InlineNotesInput from '../components/InlineNotesInput.vue'
import BaseButton from '../components/BaseButton.vue'
import BaseModal from '../components/BaseModal.vue'
import BaseIconButton from '../components/BaseIconButton.vue'
import { ArrowLeftIcon, PlusIcon, ArrowPathIcon } from '@heroicons/vue/20/solid'
import { CurrencyDollarIcon } from '@heroicons/vue/24/outline'
import { PencilIcon, TrashIcon, ArchiveBoxIcon, ArchiveBoxXMarkIcon, WalletIcon } from '@heroicons/vue/24/outline'
import { XCircleIcon } from '@heroicons/vue/24/solid'
import { getImageUrl } from '../utils/image.js'
import { generateMinecraftAvatar } from '../utils/userProfile.js'

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

// Inline price editing state
const editingPriceId = ref(null)
const editingPriceType = ref(null) // 'buy' or 'sell'
const savingPriceId = ref(null)
const savingPriceType = ref(null)
const editingNotesId = ref(null)
const savingNotesId = ref(null)
const savingItemId = ref(null) // Track which item is being saved during quick edit
const showItemSavingSpinner = ref(null) // Show spinner after delay
let itemSavingTimeout = null

// Edit shop modal state
const showEditShopModal = ref(false)
const editingShop = ref(null)
const shopFormLoading = ref(false)
const shopFormError = ref(null)
const shopNameValidationError = ref(null)
const shopServerValidationError = ref(null)
const shopPlayerValidationError = ref(null)
const usePlayerAsShopName = ref(false)
const shopForm = ref({
	name: '',
	player: '',
	server_id: '',
	location: '',
	description: '',
	is_own_shop: false,
	owner_funds: null
})

function resetShopForm() {
	shopForm.value = {
		name: '',
		player: '',
		server_id: '',
		location: '',
		description: '',
		is_own_shop: false,
		owner_funds: null
	}
	usePlayerAsShopName.value = false
}

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

const isShopOutOfMoney = computed(() => {
	return selectedShop.value?.owner_funds === 0
})

async function handleOutOfMoneyChange(checked) {
	if (!selectedShop.value || !selectedShopId.value) return

	try {
		await updateShop(selectedShopId.value, {
			owner_funds: checked ? 0 : null
		})
	} catch (err) {
		console.error('Error updating shop funds:', err)
		error.value = err.message || 'Failed to update shop funds. Please try again.'
	}
}
const selectedServer = computed(() =>
	selectedShop.value && servers.value
		? servers.value.find((s) => s.id === selectedShop.value.server_id)
		: null
)

// Watch player name to auto-fill shop name when checkbox is checked
watch(() => shopForm.value.player, (newPlayer) => {
	if (usePlayerAsShopName.value && newPlayer) {
		shopForm.value.name = newPlayer
	}
})

// Watch checkbox to sync shop name field
watch(usePlayerAsShopName, (checked) => {
	if (checked && shopForm.value.player) {
		shopForm.value.name = shopForm.value.player
	} else if (!checked) {
		shopForm.value.name = ''
	}
})

// Clear validation errors when form fields change
watch(() => shopForm.value.name, () => {
	shopNameValidationError.value = null
	shopFormError.value = null
})
watch(() => shopForm.value.player, () => {
	shopPlayerValidationError.value = null
	shopFormError.value = null
})

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

// BaseTable column definitions
const baseTableColumns = computed(() => [
	{ key: 'item', label: 'Item', sortable: true, headerAlign: 'center' },
	{ key: 'buyPrice', label: 'Buy Price', align: 'right', headerAlign: 'center', sortable: true, width: 'w-32' },
	{ key: 'sellPrice', label: 'Sell Price', align: 'right', headerAlign: 'center', sortable: true, width: 'w-32' },
	{
		key: 'profitMargin',
		label: 'Profit %',
		align: 'center',
		headerAlign: 'center',
		sortable: true,
		width: 'w-32',
		sortFn: (a, b) => {
			// Extract numeric value from formatted string (e.g., "66.7%" -> 66.7)
			const valueA = a.profitMargin === '—' ? -Infinity : parseFloat(a.profitMargin) || 0
			const valueB = b.profitMargin === '—' ? -Infinity : parseFloat(b.profitMargin) || 0
			return valueA - valueB
		}
	},
	{ key: 'notes', label: 'Notes', sortable: true, headerAlign: 'center' },
	{
		key: 'lastUpdated',
		label: 'Last Updated',
		sortable: true,
		headerAlign: 'center',
		width: 'w-40',
		sortFn: (a, b) => {
			// Sort by timestamp
			const valueA = a._lastUpdatedTimestamp || 0
			const valueB = b._lastUpdatedTimestamp || 0
			return valueA - valueB
		}
	},
	{ key: 'actions', label: '', align: 'center', headerAlign: 'center', width: 'w-24' }
])

// Calculate profit margin helper
function calculateProfitMargin(buyPrice, sellPrice) {
	if (!buyPrice || !sellPrice || buyPrice === 0) {
		return null
	}
	const profit = buyPrice - sellPrice
	const margin = (profit / buyPrice) * 100
	return margin
}

// Format date helper (same as ShopItemTable)
function formatDate(dateString) {
	if (!dateString) return '—'

	const date = new Date(dateString)
	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

	const diffTime = today.getTime() - itemDate.getTime()
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

	if (diffDays === 0) {
		return 'Today'
	} else if (diffDays === 1) {
		return 'Yesterday'
	} else {
		return `${diffDays} days ago`
	}
}

// Transform shop items for BaseTable
function transformShopItemForTable(shopItem) {
	const profitMargin = calculateProfitMargin(shopItem.buy_price, shopItem.sell_price)
	const lastUpdatedTimestamp = shopItem.last_updated ? new Date(shopItem.last_updated).getTime() : 0
	return {
		id: shopItem.id,
		item: shopItem.itemData?.name || 'Unknown Item',
		image: shopItem.itemData?.image || null,
		buyPrice: shopItem.buy_price !== null && shopItem.buy_price !== undefined && shopItem.buy_price !== 0 ? shopItem.buy_price.toFixed(2) : '—',
		sellPrice: shopItem.sell_price !== null && shopItem.sell_price !== undefined && shopItem.sell_price !== 0 ? shopItem.sell_price.toFixed(2) : '—',
		profitMargin: profitMargin !== null ? `${profitMargin.toFixed(1)}%` : '—',
		notes: shopItem.notes || '',
		lastUpdated: formatDate(shopItem.last_updated),
		_lastUpdatedTimestamp: lastUpdatedTimestamp,
		actions: '',
		_originalItem: shopItem // Keep reference to original item for actions
	}
}

// BaseTable rows for list view
const baseTableRows = computed(() => {
	if (!allVisibleShopItems.value) return []
	
	return allVisibleShopItems.value.map(transformShopItemForTable)
})

// BaseTable rows grouped by category
const baseTableRowsByCategory = computed(() => {
	if (!shopItemsByCategory.value || !availableItems.value) return {}
	
	const grouped = {}
	
	Object.entries(shopItemsByCategory.value).forEach(([category, categoryItems]) => {
		grouped[category] = categoryItems.map(transformShopItemForTable)
	})
	
	return grouped
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
	const shopId = route.params.shopId
	if (shopId) {
		selectedShopId.value = shopId
	}

	// Load view settings
	loadViewSettings()
})

watch(
	() => route.params.shopId,
	shopId => {
		if (shopId && shopId !== selectedShopId.value) {
			selectedShopId.value = shopId
		}
	},
	{ immediate: false }
)

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
watch(selectedShopId, newShopId => {
	if (newShopId && route.params.shopId !== newShopId) {
		router.replace({
			name: 'shop',
			params: { shopId: newShopId },
			query: { ...route.query }
		})
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

// Watch savingItemId to show spinner after delay
watch(savingItemId, (newVal) => {
	// Clear any existing timeout
	if (itemSavingTimeout) {
		clearTimeout(itemSavingTimeout)
		itemSavingTimeout = null
	}

	if (newVal) {
		// Wait 500ms before showing spinner
		itemSavingTimeout = setTimeout(() => {
			// Only show if still saving after delay
			if (savingItemId.value === newVal) {
				showItemSavingSpinner.value = newVal
			}
		}, 500)
	} else {
		// Immediately hide spinner when not saving
		showItemSavingSpinner.value = null
	}
})

// Clean up timeout on unmount
onUnmounted(() => {
	if (itemSavingTimeout) {
		clearTimeout(itemSavingTimeout)
		itemSavingTimeout = null
	}
})

// Form handlers
function showAddItemForm() {
	if (!selectedShop.value || !selectedShopId.value || !selectedServer.value) {
		error.value = 'Shop is unavailable. Return to the Shop Manager and try again.'
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

	// Capture item ID before closing modal (editingItem gets cleared in cancelForm)
	const itemIdBeingEdited = editingItem.value?.id

	// Set saving state if editing an existing item
	if (itemIdBeingEdited) {
		savingItemId.value = itemIdBeingEdited
		console.log('ShopItemsView: Setting savingItemId to', itemIdBeingEdited, 'for modal edit')
	}

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
		// Clear saving state on error
		if (itemIdBeingEdited) {
			savingItemId.value = null
		}
	} finally {
		loading.value = false
		// Clear saving state
		if (itemIdBeingEdited) {
			savingItemId.value = null
		}
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

	// Set saving state for this item
	const isPriceUpdate = savingPriceId.value !== null
	if (!isPriceUpdate) {
		savingItemId.value = updatedItem.id
		console.log('ShopItemsView: Setting savingItemId to', updatedItem.id)
	}
	error.value = null

	try {
		// Extract the data to update (excluding the full item object)
		const updateData = {
			buy_price: updatedItem.buy_price,
			sell_price: updatedItem.sell_price,
			stock_quantity: updatedItem.stock_quantity,
			stock_full: updatedItem.stock_full,
			notes: updatedItem.notes !== undefined ? updatedItem.notes : ''
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
		// Clear saving state immediately on error
		const isPriceUpdate = savingPriceId.value !== null
		if (!isPriceUpdate) {
			savingItemId.value = null
		}
	} finally {
		// Clear saving state if not a price update
		const isPriceUpdate = savingPriceId.value !== null
		if (!isPriceUpdate) {
			savingItemId.value = null
		}
	}
}

// Inline price editing functions
function startEditPrice(itemId, priceType) {
	editingPriceId.value = itemId
	editingPriceType.value = priceType
}

async function savePrice(row, priceType, newPrice) {
	if (isNaN(newPrice) || newPrice < 0) {
		cancelEditPrice()
		return
	}

	const originalItem = row._originalItem
	if (!originalItem || !originalItem.id) {
		cancelEditPrice()
		return
	}

	// Create updated item object
	const updatedItem = {
		...originalItem,
		[priceType === 'buy' ? 'buy_price' : 'sell_price']: newPrice
	}

	// Only update if value changed
	const currentValue = priceType === 'buy' ? originalItem.buy_price : originalItem.sell_price
	if (newPrice !== currentValue) {
		// Set saving state for this specific price
		savingPriceId.value = originalItem.id
		savingPriceType.value = priceType
		
		try {
			await handleQuickEdit(updatedItem)
		} finally {
			// Clear saving state
			savingPriceId.value = null
			savingPriceType.value = null
		}
	}

	cancelEditPrice()
}

function cancelEditPrice() {
	editingPriceId.value = null
	editingPriceType.value = null
}

// Inline notes editing functions
function startEditNotes(itemId) {
	editingNotesId.value = itemId
}

async function saveNotes(row, newNotes) {
	const originalItem = row._originalItem
	if (!originalItem || !originalItem.id) {
		cancelEditNotes()
		return
	}

	// Ensure newNotes is a string and trim it
	const newNotesTrimmed = String(newNotes || '').trim()
	
	// Normalize current value for comparison (handle null/undefined as empty string)
	const currentNotes = String(originalItem.notes || '').trim()

	// Only update if value changed
	if (newNotesTrimmed !== currentNotes) {
		// Set saving state for this specific notes
		savingNotesId.value = originalItem.id
		
		// Create updated item object
		const updatedItem = {
			...originalItem,
			notes: newNotesTrimmed
		}
		
		try {
			await handleQuickEdit(updatedItem)
		} finally {
			// Clear saving state
			savingNotesId.value = null
		}
	}

	// Always cancel edit mode after save completes (or if no change)
	cancelEditNotes()
}

function cancelEditNotes() {
	editingNotesId.value = null
}

function openEditShopModal() {
	if (!selectedShop.value) return

	editingShop.value = selectedShop.value
	showEditShopModal.value = true
	shopFormError.value = null
	shopNameValidationError.value = null
	shopServerValidationError.value = null
	shopPlayerValidationError.value = null
	shopFormLoading.value = false
	shopForm.value = {
		name: selectedShop.value.name,
		player: selectedShop.value.player || '',
		server_id: selectedShop.value.server_id,
		location: selectedShop.value.location || '',
		description: selectedShop.value.description || '',
		is_own_shop: Boolean(selectedShop.value.is_own_shop),
		owner_funds:
			selectedShop.value.owner_funds === null ||
			selectedShop.value.owner_funds === undefined
				? null
				: selectedShop.value.owner_funds
	}
	usePlayerAsShopName.value = (selectedShop.value.player || '') === selectedShop.value.name
}

function closeEditShopModal() {
	showEditShopModal.value = false
	editingShop.value = null
	shopFormError.value = null
	shopNameValidationError.value = null
	shopServerValidationError.value = null
	shopPlayerValidationError.value = null
	shopFormLoading.value = false
	usePlayerAsShopName.value = false
	resetShopForm()
}

function handleShopFundsInput(event) {
	const value = event.target.value
	if (value === '' || value === null) {
		shopForm.value.owner_funds = null
	} else {
		const numValue = parseFloat(value)
		shopForm.value.owner_funds = Number.isNaN(numValue) ? null : numValue
	}
}

async function submitEditShop() {
	if (!editingShop.value) return

	shopNameValidationError.value = null
	shopServerValidationError.value = null
	shopPlayerValidationError.value = null
	shopFormError.value = null

	if (!shopForm.value.name.trim()) {
		shopNameValidationError.value = 'Shop name is required'
		return
	}

	if (!shopForm.value.is_own_shop && !shopForm.value.player.trim()) {
		shopPlayerValidationError.value = 'Player name is required'
		return
	}

	shopFormLoading.value = true

	try {
		const shopData = {
			name: shopForm.value.name.trim(),
			server_id: editingShop.value.server_id,
			location: shopForm.value.location?.trim() || '',
			description: shopForm.value.description?.trim() || '',
			is_own_shop: editingShop.value.is_own_shop,
			owner_funds: editingShop.value.owner_funds
		}
		
		if (!shopForm.value.is_own_shop) {
			shopData.player = shopForm.value.player?.trim() || ''
		}
		
		await updateShop(editingShop.value.id, shopData)
		closeEditShopModal()
	} catch (err) {
		console.error('Error updating shop:', err)
		shopFormError.value = err.message || 'Failed to update shop. Please try again.'
	} finally {
		shopFormLoading.value = false
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
		<!-- Back Button -->
		<div class="mb-4">
			<BaseButton variant="tertiary" @click="router.push('/shop-manager')">
				<template #left-icon>
					<ArrowLeftIcon />
				</template>
				Back to Shop Manager
			</BaseButton>
		</div>

		<div>
			<div v-if="selectedShop && selectedServer">
				<div class="flex items-center gap-3">
					<h1 class="text-3xl font-bold text-gray-900">
						{{ selectedShop.name }}
					</h1>
					<button
						type="button"
						@click="openEditShopModal"
						class="text-gray-700 hover:text-gray-900 transition-colors"
						aria-label="Edit shop">
						<PencilIcon class="w-5 h-5" />
					</button>
				</div>
				<div v-if="selectedShop.player" class="flex items-center gap-2 mt-2">
					<img
						:src="generateMinecraftAvatar(selectedShop.player)"
						:alt="selectedShop.player"
						class="w-6 h-6 rounded"
						@error="$event.target.style.display = 'none'" />
					<span class="text-lg font-semibold text-gray-600">{{ selectedShop.player }}</span>
				</div>
				<p
					v-if="selectedShop.description"
					class="text-gray-600 mt-1 max-w-2xl">
					{{ selectedShop.description }}
				</p>
				<div class="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-500">
					<span>
						<span class="font-medium">Server:</span>
						{{ getServerName(selectedShop.server_id) }}
					</span>
					<span>
						<span class="font-medium">Version:</span>
						{{ selectedServer.minecraft_version }}
					</span>
					<span v-if="selectedShop.location">
						<span class="font-medium">Location:</span>
						{{ selectedShop.location }}
					</span>
					<span v-if="selectedShop.created_at">
						<span class="font-medium">Created:</span>
						{{ new Date(selectedShop.created_at).toLocaleDateString() }}
					</span>
				</div>
			</div>
			<div v-else>
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Shop Items</h1>
				<p class="text-gray-600">
					This shop couldn't be found. Return to the manager to pick another one.
				</p>
			</div>
		</div>

		<!-- Error message -->
		<div
			v-if="error"
			class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
			{{ error }}
		</div>

		<!-- Loading state -->
		<div
			v-else-if="shops === null || servers === null"
			class="flex items-center justify-center py-12">
			<div class="flex flex-col items-center">
				<div
					class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-asparagus mb-4"></div>
				<p class="text-gray-600">Loading shops...</p>
			</div>
		</div>

		<div
			v-else-if="hasShops && hasServers && !selectedShop"
			class="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-4 text-yellow-800">
			<p class="font-semibold">Shop unavailable</p>
			<p class="text-sm mt-1">
				We couldn't find this shop in your list. Head back to
				<router-link to="/shop-manager" class="text-yellow-900 underline">
					Shop Manager
				</router-link>
				to choose another.
			</p>
		</div>

		<!-- Main content -->
		<div v-else-if="hasShops && hasServers && selectedShop" class="space-y-8">
			<!-- Out of Money Checkbox and Add Item Button (Top) -->
			<div class="mt-4 space-y-3">
				<label v-if="!selectedShop.is_own_shop" class="flex items-center cursor-pointer">
					<input
						:checked="isShopOutOfMoney"
						@change="handleOutOfMoneyChange($event.target.checked)"
						type="checkbox"
						class="checkbox-input" />
					<span class="ml-2 text-sm text-gray-700">Shop owner has run out of money</span>
				</label>
				<div v-if="shopItems && shopItems.length > 0" class="flex flex-col sm:flex-row justify-start gap-3">
					<BaseButton
						type="button"
						variant="primary"
						@click="showAddItemForm"
						:disabled="!selectedShop"
						class="w-full sm:w-auto justify-center sm:justify-start">
						<template #left-icon>
							<PlusIcon />
						</template>
						Add Item
					</BaseButton>
					<RouterLink
						v-if="selectedShop?.server_id"
						:to="`/market-overview?serverId=${selectedShop.server_id}`"
						class="w-full sm:w-auto">
						<BaseButton
							type="button"
							variant="tertiary"
							class="w-full justify-center sm:justify-start">
							<template #left-icon>
								<CurrencyDollarIcon class="w-4 h-4" />
							</template>
							Market Overview
						</BaseButton>
					</RouterLink>
				</div>
			</div>

			<!-- Inventory -->
			<div class="mt-8 space-y-6">
				<div
					v-if="shopItems.length > 0"
					class="mb-4">
					<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-8">
						<!-- View Mode -->
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium text-heavy-metal">View as:</span>
							<div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
								<button
									@click="viewMode = 'categories'"
									:class="[
										viewMode === 'categories'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-gray-100',
										'px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium transition border-r border-gray-asparagus last:border-r-0'
									]">
									Categories
								</button>
								<button
									@click="viewMode = 'list'"
									:class="[
										viewMode === 'list'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-gray-100',
										'px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium transition'
									]">
									List
								</button>
							</div>
						</div>

						<!-- Layout -->
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium text-heavy-metal">Layout:</span>
							<div class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden">
								<button
									@click="layout = 'comfortable'"
									:class="[
										layout === 'comfortable'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-gray-100',
										'px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium transition border-r border-gray-asparagus last:border-r-0'
									]">
									Comfortable
								</button>
								<button
									@click="layout = 'condensed'"
									:class="[
										layout === 'condensed'
											? 'bg-gray-asparagus text-white'
											: 'bg-norway text-heavy-metal hover:bg-gray-100',
										'px-2 py-1 sm:px-3 text-xs sm:text-sm font-medium transition'
									]">
									Compact
								</button>
							</div>
						</div>
					</div>
				</div>

				<div v-if="shopItems && shopItems.length > 0" class="space-y-4">
					<!-- BaseTable Implementation (New) -->
					<div class="mb-8">
						<template v-if="viewMode === 'categories'">
							<div
								v-for="(categoryRows, category) in baseTableRowsByCategory"
								:key="category"
								class="mb-6">
								<BaseTable
									:columns="baseTableColumns"
									:rows="categoryRows"
									row-key="id"
									:layout="layout"
									:hoverable="true"
									:caption="category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()">
									<template #cell-item="{ row, layout }">
										<div class="flex items-center">
											<div v-if="row.image" :class="[layout === 'condensed' ? 'w-6 h-6' : 'w-8 h-8', 'mr-3 flex-shrink-0']">
												<img
													:src="getImageUrl(row.image)"
													:alt="row.item"
													class="w-full h-full object-contain"
													loading="lazy" />
											</div>
											<div class="font-medium text-gray-900 flex items-center justify-between w-full">
												<span>{{ row.item }}</span>
												<ArrowPathIcon
													v-if="showItemSavingSpinner === row.id"
													class="w-4 h-4 text-gray-500 animate-spin" />
											</div>
										</div>
									</template>
									<template #cell-buyPrice="{ row, layout }">
										<div class="flex items-center justify-end gap-2">
											<div
												v-if="row._originalItem?.stock_quantity === 0"
												class="flex-shrink-0 mr-auto"
												title="Out of stock">
												<ArchiveBoxXMarkIcon
													class="w-5 h-5 text-current"
													aria-label="Out of stock" />
												<span class="sr-only">Out of stock</span>
											</div>
											<InlinePriceInput
												:value="row._originalItem?.buy_price"
												:layout="layout"
												:is-editing="editingPriceId === row.id && editingPriceType === 'buy'"
												:is-saving="savingPriceId === row.id && savingPriceType === 'buy'"
												:strikethrough="row._originalItem?.stock_quantity === 0"
												@update:is-editing="(val) => { if (val) startEditPrice(row.id, 'buy'); else cancelEditPrice() }"
												@save="(newPrice) => savePrice(row, 'buy', newPrice)"
												@cancel="cancelEditPrice" />
										</div>
									</template>
									<template #cell-sellPrice="{ row, layout }">
										<div class="flex items-center justify-end gap-2">
											<div
												v-if="row._originalItem?.stock_full || (isShopOutOfMoney && row._originalItem?.sell_price > 0)"
												class="flex-shrink-0 mr-auto"
												:title="isShopOutOfMoney && row._originalItem?.sell_price > 0 ? 'Shop owner has run out of money' : 'Stock full'">
												<WalletIcon
													v-if="isShopOutOfMoney && row._originalItem?.sell_price > 0"
													class="w-5 h-5 text-current"
													aria-label="Shop owner has run out of money" />
												<ArchiveBoxIcon
													v-else-if="row._originalItem?.stock_full"
													class="w-5 h-5 text-current"
													aria-label="Stock full" />
												<span class="sr-only">{{ isShopOutOfMoney && row._originalItem?.sell_price > 0 ? 'Shop owner has run out of money' : 'Stock full' }}</span>
											</div>
											<InlinePriceInput
												:value="row._originalItem?.sell_price"
												:layout="layout"
												:is-editing="editingPriceId === row.id && editingPriceType === 'sell'"
												:is-saving="savingPriceId === row.id && savingPriceType === 'sell'"
												:strikethrough="row._originalItem?.stock_full || (isShopOutOfMoney && row._originalItem?.sell_price > 0)"
												@update:is-editing="(val) => { if (val) startEditPrice(row.id, 'sell'); else cancelEditPrice() }"
												@save="(newPrice) => savePrice(row, 'sell', newPrice)"
												@cancel="cancelEditPrice" />
										</div>
									</template>
									<template #cell-notes="{ row, layout }">
										<InlineNotesInput
											:value="row._originalItem?.notes || ''"
											:layout="layout"
											:is-editing="editingNotesId === row.id"
											:is-saving="savingNotesId === row.id"
											@update:is-editing="(val) => { if (val) startEditNotes(row.id); else if (savingNotesId !== row.id) cancelEditNotes() }"
											@save="(newNotes) => saveNotes(row, newNotes)"
											@cancel="cancelEditNotes" />
									</template>
									<template #cell-actions="{ row }">
										<div class="flex items-center justify-end gap-2">
											<BaseIconButton
												variant="primary"
												aria-label="Edit item"
												@click="showEditItemForm(row._originalItem)">
												<PencilIcon />
											</BaseIconButton>
											<BaseIconButton
												variant="primary"
												aria-label="Delete item"
												@click="handleItemDelete(row._originalItem)">
												<TrashIcon />
											</BaseIconButton>
										</div>
									</template>
								</BaseTable>
							</div>
						</template>

						<template v-else>
							<BaseTable
								:columns="baseTableColumns"
								:rows="baseTableRows"
								row-key="id"
								:layout="layout"
								:hoverable="true">
								<template #cell-item="{ row, layout }">
									<div class="flex items-center">
										<div v-if="row.image" :class="[layout === 'condensed' ? 'w-6 h-6' : 'w-8 h-8', 'mr-3 flex-shrink-0']">
											<img
												:src="getImageUrl(row.image)"
												:alt="row.item"
												class="w-full h-full object-contain"
												loading="lazy" />
										</div>
										<div class="font-medium text-gray-900 flex items-center justify-between w-full">
											<span>{{ row.item }}</span>
											<ArrowPathIcon
												v-if="showItemSavingSpinner === row.id"
												class="w-4 h-4 text-gray-500 animate-spin" />
										</div>
									</div>
								</template>
								<template #cell-buyPrice="{ row, layout }">
									<div class="flex items-center justify-end gap-2">
										<div
											v-if="row._originalItem?.stock_quantity === 0"
											class="flex-shrink-0 mr-auto"
											title="Out of stock">
											<ArchiveBoxXMarkIcon
												class="w-5 h-5 text-current"
												aria-label="Out of stock" />
											<span class="sr-only">Out of stock</span>
										</div>
										<InlinePriceInput
											:value="row._originalItem?.buy_price"
											:layout="layout"
											:is-editing="editingPriceId === row.id && editingPriceType === 'buy'"
											:is-saving="savingPriceId === row.id && savingPriceType === 'buy'"
											:strikethrough="row._originalItem?.stock_quantity === 0"
											@update:is-editing="(val) => { if (val) startEditPrice(row.id, 'buy'); else cancelEditPrice() }"
											@save="(newPrice) => savePrice(row, 'buy', newPrice)"
											@cancel="cancelEditPrice" />
									</div>
								</template>
								<template #cell-sellPrice="{ row, layout }">
									<div class="flex items-center justify-end gap-2">
										<div
											v-if="row._originalItem?.stock_full || (isShopOutOfMoney && row._originalItem?.sell_price > 0)"
											class="flex-shrink-0 mr-auto"
											:title="isShopOutOfMoney && row._originalItem?.sell_price > 0 ? 'Shop owner has run out of money' : 'Stock full'">
											<WalletIcon
												v-if="isShopOutOfMoney && row._originalItem?.sell_price > 0"
												class="w-5 h-5 text-current"
												aria-label="Shop owner has run out of money" />
											<ArchiveBoxXMarkIcon
												v-else-if="row._originalItem?.stock_full"
												class="w-5 h-5 text-current"
												aria-label="Stock full" />
											<span class="sr-only">{{ isShopOutOfMoney && row._originalItem?.sell_price > 0 ? 'Shop owner has run out of money' : 'Stock full' }}</span>
										</div>
										<InlinePriceInput
											:value="row._originalItem?.sell_price"
											:layout="layout"
											:is-editing="editingPriceId === row.id && editingPriceType === 'sell'"
											:is-saving="savingPriceId === row.id && savingPriceType === 'sell'"
											:strikethrough="row._originalItem?.stock_full || (isShopOutOfMoney && row._originalItem?.sell_price > 0)"
											@update:is-editing="(val) => { if (val) startEditPrice(row.id, 'sell'); else cancelEditPrice() }"
											@save="(newPrice) => savePrice(row, 'sell', newPrice)"
											@cancel="cancelEditPrice" />
									</div>
									</template>
								<template #cell-notes="{ row, layout }">
									<InlineNotesInput
										:value="row._originalItem?.notes || ''"
										:layout="layout"
										:is-editing="editingNotesId === row.id"
										:is-saving="savingNotesId === row.id"
										@update:is-editing="(val) => { if (val) startEditNotes(row.id); else if (savingNotesId !== row.id) cancelEditNotes() }"
										@save="(newNotes) => saveNotes(row, newNotes)"
										@cancel="cancelEditNotes" />
								</template>
								<template #cell-actions="{ row }">
									<div class="flex items-center justify-end gap-2">
										<BaseIconButton
											variant="primary"
											aria-label="Edit item"
											@click="showEditItemForm(row._originalItem)">
											<PencilIcon />
										</BaseIconButton>
										<BaseIconButton
											variant="primary"
											aria-label="Delete item"
											@click="handleItemDelete(row._originalItem)">
											<TrashIcon />
										</BaseIconButton>
									</div>
								</template>
							</BaseTable>
						</template>
					</div>
				</div>

				<div v-else class="bg-white rounded-lg pt-6 pr-6 pb-6">
					<div class="text-gray-600">
						<p class="text-lg font-medium mb-2">No items in this shop yet</p>
						<p class="text-sm">Click "Add Item" to get started with your shop items.</p>
					</div>
				</div>

				<!-- Add Item Button -->
				<div class="mt-4 flex justify-start">
					<BaseButton
						type="button"
						variant="primary"
						@click="showAddItemForm"
						:disabled="!selectedShop">
						<template #left-icon>
							<PlusIcon />
						</template>
						Add Item
					</BaseButton>
				</div>
			</div>
		</div>
	</div>

	<ShopFormModal
		:isOpen="showEditShopModal"
		:editingShop="editingShop"
		v-model:shopForm="shopForm"
		v-model:usePlayerAsShopName="usePlayerAsShopName"
		:loading="shopFormLoading"
		:errors="{
			name: shopNameValidationError,
			player: shopPlayerValidationError,
			server: shopServerValidationError,
			create: null,
			edit: shopFormError
		}"
		:servers="servers"
		@submit="submitEditShop"
		@close="closeEditShopModal" />

	<BaseModal
		:isOpen="showAddForm"
		:title="editingItem ? 'Edit Shop Item' : 'Add Shop Item'"
		maxWidth="max-w-2xl"
		@close="cancelForm">
		<ShopItemForm
			ref="shopItemForm"
			:available-items="availableItemsForAdding"
			:editing-item="editingItem"
			:server="selectedServer"
			:shop="selectedShop"
			display-variant="modal"
			@submit="handleItemSubmit"
			@cancel="cancelForm" />
		<template #footer>
			<div class="flex items-center justify-end">
				<div class="flex space-x-3">
					<BaseButton type="button" variant="tertiary" @click="cancelForm">
						Cancel
					</BaseButton>
					<BaseButton
						type="button"
						variant="primary"
						:disabled="loading"
						@click="shopItemForm?.submit()">
						{{ loading ? 'Saving...' : editingItem ? 'Update Item' : 'Add Item' }}
					</BaseButton>
				</div>
			</div>
		</template>
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
