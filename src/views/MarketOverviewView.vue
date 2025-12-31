<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useCurrentUser, useFirestore, useCollection } from 'vuefire'
import { useRouter, useRoute } from 'vue-router'
import { query, collection, orderBy, where } from 'firebase/firestore'
import { useShops, useServerShops } from '../utils/shopProfile.js'
import { useServers, getMajorMinorVersion } from '../utils/serverProfile.js'
import { useServerShopItems, updateShopItem, markShopItemsAsChecked } from '../utils/shopItems.js'
import { isAdmin, enabledCategories } from '../constants'
import BaseStatCard from '../components/BaseStatCard.vue'
import BaseTable from '../components/BaseTable.vue'
import BaseCard from '../components/BaseCard.vue'
import BaseButton from '../components/BaseButton.vue'
import BaseModal from '../components/BaseModal.vue'
import BaseIconButton from '../components/BaseIconButton.vue'
import { getImageUrl } from '../utils/image.js'
import { generateMinecraftAvatar } from '../utils/userProfile.js'
import { transformShopItemForTable as transformShopItem } from '../utils/tableTransform.js'
import {
	ArchiveBoxIcon,
	ArchiveBoxXMarkIcon,
	ArrowPathIcon,
	BellIcon,
	BuildingStorefrontIcon,
	CheckCircleIcon,
	ChevronRightIcon,
	CurrencyDollarIcon,
	Cog6ToothIcon,
	FolderIcon,
	TagIcon,
	UserIcon,
	UsersIcon,
	WalletIcon,
	StarIcon as StarIconOutline
} from '@heroicons/vue/24/outline'
import { StarIcon } from '@heroicons/vue/24/solid'

const user = useCurrentUser()
const router = useRouter()
const route = useRoute()
const db = useFirestore()

// Reactive state
const selectedServerId = ref(route.query.serverId || '')
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')
const markingItemId = ref(null)

// View mode state
const viewMode = ref('categories') // 'categories' or 'list'
const layout = ref('comfortable') // 'comfortable' or 'condensed'
const showEnchantments = ref(true) // Show enchantments in item table
const hideOutOfStock = ref(false) // Hide items that are out of stock
const hideStockFull = ref(false) // Hide items that have full stock

// Settings modal state
const showSettingsModal = ref(false)

// Sorting state - initialize from sessionStorage if available
function loadSortSettings() {
	try {
		const savedSortField = sessionStorage.getItem('marketOverviewSortField')
		const savedSortDirection = sessionStorage.getItem('marketOverviewSortDirection')
		return {
			field: savedSortField || '',
			direction:
				savedSortDirection && ['asc', 'desc'].includes(savedSortDirection)
					? savedSortDirection
					: 'asc'
		}
	} catch (error) {
		console.warn('Error loading sort settings:', error)
		return { field: '', direction: 'asc' }
	}
}

const initialSortSettings = loadSortSettings()
const sortField = ref(initialSortSettings.field)
const sortDirection = ref(initialSortSettings.direction)

// Check if user is admin
const userIsAdmin = ref(false)
watch(
	user,
	async (newUser) => {
		if (newUser) {
			userIsAdmin.value = await isAdmin(newUser)
		} else {
			userIsAdmin.value = false
		}
	},
	{ immediate: true }
)

// Get user's shops and servers
const { shops } = useShops(computed(() => user.value?.uid))
const { servers } = useServers(computed(() => user.value?.uid))

// Only query all server shops if user is admin (to avoid permission errors for non-admins)
const serverIdForQuery = computed(() => {
	return userIsAdmin.value ? selectedServerId.value : null
})
const { shops: allServerShops } = useServerShops(serverIdForQuery)

// Filter shops based on admin status
// Note: useServerShops and useShops already filter out archived shops client-side
const serverShops = computed(() => {
	if (userIsAdmin.value) {
		// Admins can see all shops on the server (already filtered by useServerShops)
		return allServerShops.value || []
	} else {
		// Non-admins (including shopManager) can only see their own shops on the server (already filtered by useShops)
		if (!shops.value || !selectedServerId.value) return []
		return shops.value.filter((shop) => shop.server_id === selectedServerId.value)
	}
})

// Get shop IDs for all shops on server
const serverShopIds = computed(() => {
	if (!serverShops.value) return []
	return serverShops.value.map((shop) => shop.id)
})

// Get shop items from all shops on server
const serverShopItemsResult = useServerShopItems(selectedServerId, serverShopIds)

const shopItems = computed(() => {
	// Return empty array if there's an error or no data
	try {
		return serverShopItemsResult.items.value || []
	} catch (error) {
		console.warn('Error loading shop items:', error)
		return []
	}
})

// Computed properties
const hasShops = computed(() => shops.value && shops.value.length > 0)
const hasServers = computed(() => servers.value && servers.value.length > 0)
const selectedServer = computed(
	() => servers.value?.find((server) => server.id === selectedServerId.value) || null
)

// Get all items from the main collection for the item selector
const allItemsQuery = computed(() => {
	if (!selectedServer.value) return null

	// Use major.minor version for filtering (extract from full version if needed)
	const majorMinorVersion = getMajorMinorVersion(selectedServer.value.minecraft_version)

	return query(
		collection(db, 'items'),
		where('version', '<=', majorMinorVersion),
		orderBy('version', 'asc'),
		orderBy('category', 'asc'),
		orderBy('name', 'asc')
	)
})

const availableItems = useCollection(allItemsQuery)

// Get image URL, preferring enchanted version if item has enchantments
function getItemImageUrl(imagePath, enchantments) {
	if (!imagePath) return null

	// If item has enchantments, try to use enchanted version (always .webp)
	if (enchantments && enchantments.length > 0) {
		// Replace extension with _enchanted.webp
		const enchantedPath = imagePath.replace(/\.(png|webp|gif)$/i, '_enchanted.webp')
		return getImageUrl(enchantedPath)
	}

	return getImageUrl(imagePath)
}

// Format enchantment name for display
function formatEnchantmentName(enchantmentId) {
	if (!enchantmentId || !availableItems.value) return ''

	// Get enchantment item from availableItems
	const enchantmentItem = availableItems.value.find((item) => item.id === enchantmentId)
	if (!enchantmentItem) return ''

	// Try to extract from material_id first (most reliable)
	const materialId = enchantmentItem.material_id
	if (materialId && materialId.startsWith('enchanted_book_')) {
		// Extract enchantment name from material_id like "enchanted_book_aqua_affinity_1"
		const enchantmentPart = materialId.replace('enchanted_book_', '')

		// Try to extract enchantment with level first (e.g., "unbreaking_3" -> "unbreaking 3")
		const enchantWithLevelMatch = enchantmentPart.match(/^(.+)_(\d+)$/)
		if (enchantWithLevelMatch) {
			const enchantName = enchantWithLevelMatch[1]
			const level = enchantWithLevelMatch[2]

			// Replace underscores with spaces, then capitalize each word
			const capitalizedEnchant = enchantName
				.replace(/_/g, ' ')
				.replace(/\b\w/g, (l) => l.toUpperCase())
			
			// Don't display level 1 for single-level enchantments (max level 1)
			const maxLevel = enchantmentItem.enchantment_max_level
			if (level === '1' && maxLevel === 1) {
				return capitalizedEnchant
			}
			
			return `${capitalizedEnchant} ${level}`
		}

		// Try enchantment without level (e.g., "silk_touch" -> "silk touch")
		const enchantWithoutLevelMatch = enchantmentPart.match(/^(.+)$/)
		if (enchantWithoutLevelMatch) {
			const enchantName = enchantWithoutLevelMatch[1]
			// Replace underscores with spaces, then capitalize each word
			const capitalizedEnchant = enchantName
				.replace(/_/g, ' ')
				.replace(/\b\w/g, (l) => l.toUpperCase())
			return capitalizedEnchant
		}
	}

	// Fallback: Use item name
	return enchantmentItem.name || ''
}

// Group shop items by category for better organization
const shopItemsByCategory = computed(() => {
	if (!shopItems.value || !availableItems.value) return {}

	const grouped = {}

	shopItems.value.forEach((shopItem) => {
		// Find the corresponding item data from the main items collection
		const itemData = availableItems.value.find((item) => item.id === shopItem.item_id)
		if (itemData) {
			// Add shop data for market overview
			const shopData = serverShops.value?.find((shop) => shop.id === shopItem.shop_id)
			
			// Skip items from archived shops (treat undefined as not archived)
			if (!shopData || (shopData.archived === true)) {
				return
			}
			
			const category = itemData.category || 'Uncategorized'
			if (!grouped[category]) {
				grouped[category] = []
			}

			grouped[category].push({
				...shopItem,
				itemData,
				shopData
			})
		}
	})

	// Sort items within each category: first by item name, then by buy price (high to low)
	Object.keys(grouped).forEach((category) => {
		grouped[category].sort((a, b) => {
			// First sort by item name to group identical items together
			const itemNameA = a.itemData?.name || 'Unknown'
			const itemNameB = b.itemData?.name || 'Unknown'

			if (itemNameA !== itemNameB) {
				return itemNameA.localeCompare(itemNameB)
			}

			// If same item, sort by buy price (high to low)
			// Handle null/undefined prices by treating them as 0
			const priceA = a.buy_price || 0
			const priceB = b.buy_price || 0

			return priceB - priceA
		})
	})

	return grouped
})

// Count filtered items for search results
const filteredItemCount = computed(() => {
	return Object.values(filteredShopItemsByCategory.value).reduce(
		(total, items) => total + items.length,
		0
	)
})

// Filtered version for search and stock filters
const filteredShopItemsByCategory = computed(() => {
	if (!shopItemsByCategory.value) return {}

	const query = searchQuery.value.trim().toLowerCase()
	const filtered = {}

	Object.entries(shopItemsByCategory.value).forEach(([category, items]) => {
		const filteredItems = items.filter((item) => {
			if (!item.itemData?.name) return false

			// Filter by stock status
			if (hideOutOfStock.value && item.stock_quantity === 0) {
				return false
			}

			if (hideStockFull.value && item.stock_full === true) {
				return false
			}

			// Filter by search query if provided
			if (query) {
				const itemName = item.itemData.name.toLowerCase()

				// Split search query by commas only, then trim and filter out empty strings
				// Spaces within terms are preserved (e.g., "iron ingot" stays as one term)
				// Comma-separated terms use OR logic (e.g., "iron,ingot" matches items with "iron" OR "ingot")
				const searchTerms = query
					.split(',')
					.map((term) => term.trim())
					.filter((term) => term.length > 0)

				// If no valid search terms, return all items
				if (searchTerms.length === 0) return true

				// Check if item name contains any of the search terms (OR logic for comma-separated terms)
				if (!searchTerms.some((term) => itemName.includes(term))) {
					return false
				}
			}

			return true
		})

		if (filteredItems.length > 0) {
			filtered[category] = filteredItems
		}
	})

	return filtered
})

// Flat list view combining all visible items
const allVisibleItems = computed(() => {
	if (!filteredShopItemsByCategory.value) return []

	const items = []
	Object.values(filteredShopItemsByCategory.value).forEach((categoryItems) => {
		items.push(...categoryItems)
	})

	// Sort alphabetically by item name
	return items.sort((a, b) => {
		const nameA = a.itemData?.name?.toLowerCase() || ''
		const nameB = b.itemData?.name?.toLowerCase() || ''
		return nameA.localeCompare(nameB)
	})
})

// BaseTable column definitions
const baseTableColumns = computed(() => {
	const columns = [
		{ key: 'item', label: 'Item', sortable: true, headerAlign: 'center' },
		{ key: 'shop', label: 'Shop', sortable: true, headerAlign: 'center' },
		{
			key: 'buyPrice',
			label: 'Buy Price',
			align: 'right',
			headerAlign: 'center',
			sortable: true,
			width: 'w-32'
		},
		{
			key: 'sellPrice',
			label: 'Sell Price',
			align: 'right',
			headerAlign: 'center',
			sortable: true,
			width: 'w-32'
		},
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
		}
	]
	return columns
})

// BaseTable rows for list view
const baseTableRows = computed(() => {
	if (!allVisibleItems.value) return []
	return allVisibleItems.value.map((item) => transformShopItem(item, { includeShop: true }))
})

// BaseTable rows grouped by category
const baseTableRowsByCategory = computed(() => {
	if (!filteredShopItemsByCategory.value) return {}
	const grouped = {}
	Object.entries(filteredShopItemsByCategory.value).forEach(([category, categoryItems]) => {
		grouped[category] = categoryItems.map((item) =>
			transformShopItem(item, { includeShop: true })
		)
	})
	return grouped
})

// Sorted categories to match price guide order
const sortedCategories = computed(() => {
	if (!baseTableRowsByCategory.value) return []

	const categoryKeys = Object.keys(baseTableRowsByCategory.value)
	const orderedCategories = []

	// First, add categories in the order they appear in enabledCategories
	enabledCategories.forEach((category) => {
		if (categoryKeys.includes(category)) {
			orderedCategories.push(category)
		}
	})

	// Then, add any categories that aren't in enabledCategories (like 'Uncategorized')
	categoryKeys.forEach((category) => {
		if (!enabledCategories.includes(category)) {
			orderedCategories.push(category)
		}
	})

	return orderedCategories
})

// Navigate to shop items
function navigateToShopItems(shopId) {
	if (shopId) {
		router.push({ name: 'shop', params: { shopId } })
	}
}

// Toggle starred status
async function toggleStar(itemId, currentlyStarred, originalItem) {
	// Try multiple ways to get the shop_item document ID
	const shopItemId = itemId || originalItem?.id || originalItem?._originalItem?.id
	
	if (!shopItemId) {
		console.error('Cannot star item: missing item ID', { itemId, originalItem })
		return
	}
	
	try {
		await updateShopItem(shopItemId, { starred: !currentlyStarred })
		
		// Optimistically update local state for large arrays (>30 shops)
		// For small arrays, VueFire handles reactivity automatically
		if (serverShopItemsResult.updateItem) {
			serverShopItemsResult.updateItem(shopItemId, { starred: !currentlyStarred })
		}
	} catch (err) {
		console.error('Error toggling star:', err)
		error.value = err.message || 'Failed to update starred status. Please try again.'
	}
}

// Mark a single item as checked (updates last_updated)
async function handleMarkItemAsChecked(itemId, shopId) {
	if (!shopId || !itemId) return

	markingItemId.value = itemId
	error.value = null

	try {
		const now = new Date().toISOString()
		
		// Optimistically update local state for large arrays (>30 shops)
		// For small arrays, VueFire handles reactivity automatically
		if (serverShopItemsResult.updateItem) {
			serverShopItemsResult.updateItem(itemId, { last_updated: now })
		}
		
		await markShopItemsAsChecked(shopId, [itemId])
	} catch (err) {
		console.error('Error marking item as checked:', err)
		error.value = err.message || 'Failed to mark item as checked. Please try again.'
	} finally {
		markingItemId.value = null
	}
}

// Reset search
function resetSearch() {
	searchQuery.value = ''
}

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

// Watch for servers loading - handle server selection
watch(servers, (newServers) => {
	if (newServers && newServers.length > 0) {
		// If serverId from query param exists, validate it
		if (route.query.serverId) {
			const userServer = newServers.find((s) => s.id === route.query.serverId)
			if (!userServer) {
				// If server doesn't exist or user doesn't own it, redirect to shop manager
				console.warn('Server not found or access denied:', route.query.serverId)
				router.replace('/shop-manager')
				return
			}
			selectedServerId.value = route.query.serverId
		} else if (!selectedServerId.value) {
			// Auto-select first server if none selected
			selectedServerId.value = newServers[0].id
		}
	} else if (route.query.serverId) {
		// User has no servers but trying to access one - redirect to shop manager
		router.replace('/shop-manager')
	}
})

// Watch for route query changes - handle direct URL navigation
watch(
	() => route.query.serverId,
	(newServerId) => {
		if (newServerId && servers.value) {
			const userServer = servers.value.find((s) => s.id === newServerId)
			if (!userServer) {
				// If server doesn't exist or user doesn't own it, redirect to shop manager
				console.warn('Server not found or access denied:', newServerId)
				router.replace('/shop-manager')
				return
			}
			selectedServerId.value = newServerId
		}
	}
)

// Load view settings on mount
onMounted(() => {
	loadViewSettings()
})

// Save view settings when they change
watch(
	[viewMode, layout, searchQuery, showEnchantments, hideOutOfStock, hideStockFull],
	() => {
		saveViewSettings()
	},
	{ deep: true }
)

// Save sorting state when it changes
watch([sortField, sortDirection], () => {
	saveSortSettings()
})

// Handle sort event from BaseTable
function handleSort(event) {
	sortField.value = event.field
	sortDirection.value = event.direction
}

// Load and save view settings from localStorage
function loadViewSettings() {
	try {
		const savedViewMode = localStorage.getItem('marketOverviewViewMode')
		const savedLayout = localStorage.getItem('marketOverviewLayout')
		const savedSearchQuery = localStorage.getItem('marketOverviewSearchQuery')
		const savedShowEnchantments = localStorage.getItem('marketOverviewShowEnchantments')
		const savedHideOutOfStock = localStorage.getItem('marketOverviewHideOutOfStock')
		const savedHideStockFull = localStorage.getItem('marketOverviewHideStockFull')

		if (savedViewMode && ['categories', 'list'].includes(savedViewMode)) {
			viewMode.value = savedViewMode
		}

		if (savedLayout && ['comfortable', 'condensed'].includes(savedLayout)) {
			layout.value = savedLayout
		}

		if (savedSearchQuery !== null) {
			searchQuery.value = savedSearchQuery
		}

		if (savedShowEnchantments !== null) {
			showEnchantments.value = savedShowEnchantments === 'true'
		}

		if (savedHideOutOfStock !== null) {
			hideOutOfStock.value = savedHideOutOfStock === 'true'
		}

		if (savedHideStockFull !== null) {
			hideStockFull.value = savedHideStockFull === 'true'
		}
	} catch (error) {
		console.warn('Error loading view settings:', error)
	}
}

function saveViewSettings() {
	try {
		localStorage.setItem('marketOverviewViewMode', viewMode.value)
		localStorage.setItem('marketOverviewLayout', layout.value)
		localStorage.setItem('marketOverviewSearchQuery', searchQuery.value)
		localStorage.setItem('marketOverviewShowEnchantments', showEnchantments.value.toString())
		localStorage.setItem('marketOverviewHideOutOfStock', hideOutOfStock.value.toString())
		localStorage.setItem('marketOverviewHideStockFull', hideStockFull.value.toString())
	} catch (error) {
		console.warn('Error saving view settings:', error)
	}
}

function saveSortSettings() {
	try {
		if (sortField.value) {
			sessionStorage.setItem('marketOverviewSortField', sortField.value)
			sessionStorage.setItem('marketOverviewSortDirection', sortDirection.value)
		} else {
			sessionStorage.removeItem('marketOverviewSortField')
			sessionStorage.removeItem('marketOverviewSortDirection')
		}
	} catch (error) {
		console.warn('Error saving sort settings:', error)
	}
}

// Helper functions
function getServerName(serverId) {
	return servers.value?.find((server) => server.id === serverId)?.name || 'Unknown Server'
}

// Market analysis functions
const marketStats = computed(() => {
	if (!shopItems.value || !serverShops.value) return null

	// Count total items (unfiltered)
	const totalItemCount = Object.values(shopItemsByCategory.value).reduce(
		(total, items) => total + items.length,
		0
	)

	const stats = {
		totalItems: totalItemCount,
		totalShops: serverShops.value.length,
		userShops: serverShops.value.filter((shop) => shop.is_own_shop === true).length,
		competitorShops: serverShops.value.filter((shop) => shop.is_own_shop !== true).length,
		categoriesCount: Object.keys(shopItemsByCategory.value).length
	}

	return stats
})

// Price analysis functions
const priceAnalysis = computed(() => {
	if (!shopItems.value || shopItems.value.length === 0) return null

	const itemPrices = {}

	// Group items by item_id to analyze prices (excluding own shops and archived shops)
	shopItems.value.forEach((shopItem) => {
		const itemId = shopItem.item_id
		const shop = serverShops.value?.find((s) => s.id === shopItem.shop_id)

		// Skip own shops for trading opportunities
		if (shop?.is_own_shop) {
			return
		}
		
		// Skip archived shops (treat undefined as not archived)
		if (shop?.archived === true) {
			return
		}

		if (!itemPrices[itemId]) {
			itemPrices[itemId] = {
				buyPrices: [],
				sellPrices: [],
				shops: []
			}
		}

		// Only include buy prices if item is not out of stock
		if (
			shopItem.buy_price !== null &&
			shopItem.buy_price !== undefined &&
			shopItem.stock_quantity !== 0
		) {
			itemPrices[itemId].buyPrices.push({
				price: shopItem.buy_price,
				shopId: shopItem.shop_id,
				shopName: shop?.name || 'Unknown',
				shopItem: shopItem
			})
		}

		// Only include sell prices if item is not stock full
		if (
			shopItem.sell_price !== null &&
			shopItem.sell_price !== undefined &&
			!shopItem.stock_full
		) {
			itemPrices[itemId].sellPrices.push({
				price: shopItem.sell_price,
				shopId: shopItem.shop_id,
				shopName: shop?.name || 'Unknown',
				shopItem: shopItem
			})
		}
	})

	// Find best opportunities
	const opportunities = []

	Object.entries(itemPrices).forEach(([itemId, data]) => {
		// Filter out buy prices from shops that are out of stock
		const availableBuyPrices = data.buyPrices.filter((buyPrice) => {
			return buyPrice.shopItem?.stock_quantity !== 0
		})

		if (availableBuyPrices.length > 0 && data.sellPrices.length > 0) {
			const lowestBuy = Math.min(...availableBuyPrices.map((p) => p.price))

			// Filter out sell prices from shops that don't have enough funds
			const affordableSellPrices = data.sellPrices.filter((sellPrice) => {
				const shop = serverShops.value?.find((s) => s.id === sellPrice.shopId)
				if (!shop || shop.owner_funds === null || shop.owner_funds === undefined) {
					return true // Include if funds data is not available
				}
				return shop.owner_funds >= sellPrice.price
			})

			if (affordableSellPrices.length === 0) {
				return // Skip this item if no shops can afford to buy it
			}

			const highestSell = Math.max(...affordableSellPrices.map((p) => p.price))

			if (highestSell > lowestBuy) {
				const profit = highestSell - lowestBuy
				const profitMargin = (profit / lowestBuy) * 100

				const itemData = availableItems.value?.find((item) => item.id === itemId)
				const buyShop = availableBuyPrices.find((p) => p.price === lowestBuy)
				const sellShop = affordableSellPrices.find((p) => p.price === highestSell)

				const buyShopData = serverShops.value?.find((s) => s.id === buyShop?.shopId)
				const sellShopData = serverShops.value?.find((s) => s.id === sellShop?.shopId)

				opportunities.push({
					itemId,
					itemName: itemData?.name || 'Unknown Item',
					itemImage: itemData?.image,
					profit,
					profitMargin,
					buyPrice: lowestBuy,
					sellPrice: highestSell,
					buyShop: buyShop?.shopName,
					buyShopId: buyShop?.shopId,
					buyShopPlayer: buyShopData?.player || null,
					sellShop: sellShop?.shopName,
					sellShopId: sellShop?.shopId,
					sellShopPlayer: sellShopData?.player || null
				})
			}
		}
	})

	return {
		opportunities: opportunities.sort((a, b) => b.profit - a.profit).slice(0, 10) // Top 10 opportunities
	}
})
</script>

<template>
	<div class="p-4 pt-8">
		<!-- Back Button -->
		<div class="mb-4">
			<RouterLink
				to="/shop-manager"
				data-cy="market-overview-back-button"
				class="inline-flex items-center rounded-md bg-white text-gray-700 border-2 border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50 transition">
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
				</svg>
				Back to Shop Manager
			</RouterLink>
		</div>

		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">
				{{ selectedServer ? `${selectedServer.name} Market Overview` : 'Market Overview' }}
			</h1>
			<p class="text-gray-600">Browse and analyze items across all shops.</p>
		</div>

		<!-- Market stats -->
		<div v-if="selectedServer && marketStats" class="mb-6">
			<div class="flex flex-wrap gap-12">
				<BaseStatCard variant="inline">
					<template #icon>
						<TagIcon />
					</template>
					<template #subheading>Items</template>
					<template #number>{{ marketStats.totalItems }}</template>
				</BaseStatCard>
				<BaseStatCard variant="inline">
					<template #icon>
						<FolderIcon />
					</template>
					<template #subheading>Categories</template>
					<template #number>{{ marketStats.categoriesCount }}</template>
				</BaseStatCard>
				<BaseStatCard variant="inline">
					<template #icon>
						<BuildingStorefrontIcon />
					</template>
					<template #subheading>Shops</template>
					<template #number>{{ marketStats.totalShops }}</template>
				</BaseStatCard>
				<BaseStatCard variant="inline">
					<template #icon>
						<UserIcon />
					</template>
					<template #subheading>Your Shops</template>
					<template #number>{{ marketStats.userShops }}</template>
				</BaseStatCard>
				<BaseStatCard variant="inline">
					<template #icon>
						<UsersIcon />
					</template>
					<template #subheading>Player shops</template>
					<template #number>{{ marketStats.competitorShops }}</template>
				</BaseStatCard>
			</div>
		</div>

		<!-- Error message -->
		<div v-if="error" class="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
			{{ error }}
		</div>

		<!-- Loading state -->
		<div
			v-if="loading"
			class="mb-4 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded">
			Loading market data...
		</div>

		<!-- Main content -->
		<div v-if="hasServers">
			<!-- Trading opportunities -->
			<div
				v-if="selectedServer && priceAnalysis && priceAnalysis.opportunities.length > 0"
				class="mb-6"
				data-cy="market-overview-opportunities-section">
				<details class="group">
					<summary
						data-cy="market-overview-opportunities-toggle"
						class="text-lg font-semibold text-gray-900 mb-3 cursor-pointer list-none flex items-center gap-2">
						<BellIcon class="w-5 h-5" />
						<span>Opportunities</span>
						<ChevronRightIcon
							class="w-5 h-5 transition-transform duration-200 group-open:rotate-90" />
					</summary>
					<div class="space-y-4 mt-3">
						<div
							v-for="opportunity in priceAnalysis.opportunities"
							:key="opportunity.itemId"
							class="flex items-start">
							<div class="flex items-start">
								<div
									v-if="opportunity.itemImage"
									class="w-10 h-10 mr-3 flex-shrink-0">
									<img
										:src="opportunity.itemImage"
										:alt="opportunity.itemName"
										class="w-full h-full object-contain" />
								</div>
								<div>
									<div class="font-medium text-gray-900">
										{{ opportunity.itemName }}
									</div>
									<div class="text-sm text-gray-600 space-y-1">
										<div class="flex items-center gap-2">
											<span class="font-semibold w-20">Buy from:</span>
											<img
												v-if="opportunity.buyShopPlayer"
												:src="
													generateMinecraftAvatar(
														opportunity.buyShopPlayer
													)
												"
												:alt="opportunity.buyShopPlayer"
												class="w-4 h-4 rounded"
												@error="$event.target.style.display = 'none'" />
											<span>
												{{
													opportunity.buyShopPlayer || opportunity.buyShop
												}}
												<span
													v-if="
														opportunity.buyShopPlayer &&
														opportunity.buyShopPlayer !==
															opportunity.buyShop
													">
													- {{ opportunity.buyShop }}
												</span>
												at {{ opportunity.buyPrice }}
											</span>
										</div>
										<div class="flex items-center gap-2">
											<span class="font-semibold w-20">Sell to:</span>
											<img
												v-if="opportunity.sellShopPlayer"
												:src="
													generateMinecraftAvatar(
														opportunity.sellShopPlayer
													)
												"
												:alt="opportunity.sellShopPlayer"
												class="w-4 h-4 rounded"
												@error="$event.target.style.display = 'none'" />
											<span>
												{{
													opportunity.sellShopPlayer ||
													opportunity.sellShop
												}}
												<span
													v-if="
														opportunity.sellShopPlayer &&
														opportunity.sellShopPlayer !==
															opportunity.sellShop
													">
													- {{ opportunity.sellShop }}
												</span>
												at {{ opportunity.sellPrice }}
											</span>
										</div>
										<div class="flex items-center gap-2">
											<span class="font-semibold w-20">Profit:</span>
											<div class="font-bold text-semantic-success">
												+{{ opportunity.profit.toFixed(2) }}
											</div>
											<span class="text-sm text-gray-500">per item</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</details>
			</div>

			<!-- Search input -->
			<div v-if="selectedServerId" class="mb-6">
				<label for="item-search" class="block text-sm font-medium text-gray-700 mb-2">
					Search Items
				</label>
				<div class="flex flex-row gap-2">
					<div class="flex-1 sm:max-w-md">
						<input
							id="item-search"
							type="text"
							v-model="searchQuery"
							data-cy="market-overview-search-input"
							placeholder="Search for items..."
							class="border-2 border-gray-asparagus rounded px-3 py-2 w-full mb-1 h-10" />
						<p class="text-xs text-gray-500 mb-2 sm:mb-0 hidden sm:block">
							Tip: Use commas to search multiple terms
						</p>
					</div>
					<div class="flex gap-2 sm:gap-0 sm:ml-2">
						<BaseButton
							@click="resetSearch"
							variant="tertiary"
							data-cy="market-overview-reset-search-button"
							class="flex-1 sm:flex-none sm:whitespace-nowrap sm:mr-2 h-10">
							<ArrowPathIcon class="w-4 h-4 sm:mr-1.5" />
							<span class="hidden sm:inline">Reset</span>
						</BaseButton>
					</div>
				</div>
				<p class="text-xs text-gray-500 mt-1 sm:hidden">
					Tip: Use commas to search multiple terms
				</p>
				<div v-if="searchQuery" class="mt-2 text-sm text-gray-600">
					Showing {{ filteredItemCount }} item{{
						filteredItemCount === 1 ? '' : 's'
					}}
					matching "{{ searchQuery }}"
				</div>
			</div>

			<!-- Settings Button -->
			<div v-if="selectedServerId" class="mb-4">
				<BaseButton
					@click="showSettingsModal = true"
					variant="secondary"
					data-cy="market-overview-settings-button">
					<template #left-icon>
						<Cog6ToothIcon />
					</template>
					Settings
				</BaseButton>
			</div>

			<!-- View Mode and Layout Toggle -->
			<div v-if="selectedServerId" class="mb-4">
				<div class="flex flex-wrap items-center gap-6">
					<!-- View Mode -->
					<div>
						<span class="text-sm font-medium text-gray-700 block">View as:</span>
						<div
							class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden mt-1">
							<button
								data-cy="market-overview-view-mode-categories"
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
								data-cy="market-overview-view-mode-list"
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

					<!-- Layout -->
					<div>
						<span class="text-sm font-medium text-gray-700 block">Layout:</span>
						<div
							class="inline-flex border-2 border-gray-asparagus rounded overflow-hidden mt-1">
							<button
								data-cy="market-overview-layout-comfortable"
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
								data-cy="market-overview-layout-condensed"
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
			</div>

			<!-- Market items display -->
			<div v-if="selectedServerId && shopItems">
				<!-- Categories View -->
				<template v-if="viewMode === 'categories'">
					<div
						v-if="searchQuery && Object.keys(filteredShopItemsByCategory).length === 0"
						data-cy="market-overview-empty-search-state"
						class="text-gray-600">
						<p class="text-lg font-medium mb-2">
							No items found matching "{{ searchQuery }}"
						</p>
						<p class="text-sm">Try searching for a different item name</p>
					</div>
					<div v-else class="space-y-6">
						<div v-for="category in sortedCategories" :key="category" class="mb-6">
							<BaseTable
								:columns="baseTableColumns"
								:rows="baseTableRowsByCategory[category]"
								row-key="id"
								:layout="layout"
								:hoverable="true"
								:initial-sort-field="sortField"
								:initial-sort-direction="sortDirection"
								@sort="handleSort"
								:caption="
									category.charAt(0).toUpperCase() +
									category.slice(1).toLowerCase()
								">
								<template #cell-item="{ row, layout }">
									<div 
										class="flex items-center group"
										:class="[
											layout === 'condensed' ? '-mx-2 -my-1 px-2 py-1' : '-mx-4 -my-3 px-4 py-3'
										]">
										<div
											v-if="row.image"
											:class="[
												layout === 'condensed' ? 'w-6 h-6' : 'w-8 h-8',
												'mr-3 flex-shrink-0'
											]">
											<img
												:src="getItemImageUrl(row.image, row.enchantments)"
												:alt="row.item"
												@error="$event.target.src = getImageUrl(row.image)"
												class="w-full h-full object-contain"
												loading="lazy" />
										</div>
										<div class="flex-1 min-w-0">
											<div
												class="font-medium text-gray-900 flex items-center justify-between flex-1 min-w-0 relative">
												<span>
													{{ row.item }}
												</span>
											<div class="flex items-center gap-2 ml-2 flex-shrink-0">
												<button
													@click.stop="toggleStar(row.id, row._originalItem?.starred || false, row._originalItem)"
													class="flex-shrink-0 transition-opacity"
													:class="{
														'opacity-0 group-hover:opacity-100': !(row._originalItem?.starred || false),
														'opacity-100': row._originalItem?.starred || false
													}"
													:title="row._originalItem?.starred ? 'Unstar item' : 'Star item'">
													<StarIcon
														v-if="row._originalItem?.starred"
														:class="[
															layout === 'condensed' ? 'w-4 h-4' : 'w-5 h-5',
															'text-gray-asparagus'
														]" />
													<StarIconOutline
														v-else
														:class="[
															layout === 'condensed' ? 'w-4 h-4' : 'w-5 h-5',
															'text-gray-asparagus'
														]" />
												</button>
											</div>
										</div>
										<!-- Enchantments Display -->
										<div
											v-if="showEnchantments && row.enchantments && row.enchantments.length > 0"
											class="mt-1 pb-1">
											<div class="flex flex-wrap gap-1">
												<span
													v-for="enchantmentId in row.enchantments"
													:key="enchantmentId"
													class="px-1 border border-gray-asparagus text-heavy-metal text-[10px] font-medium rounded uppercase leading-[1.6]">
													{{ formatEnchantmentName(enchantmentId) }}
												</span>
											</div>
										</div>
									</div>
								</div>
							</template>
								<template #cell-shop="{ row }">
									<div
										@click="navigateToShopItems(row.shopId)"
										data-cy="market-overview-shop-link"
										class="flex items-center text-md text-gray-900 cursor-pointer hover:text-gray-asparagus hover:underline transition-colors">
										<template v-if="row.shopPlayer">
											<img
												:src="generateMinecraftAvatar(row.shopPlayer)"
												:alt="row.shopPlayer"
												class="w-5 h-5 rounded mr-2 flex-shrink-0"
												@error="$event.target.style.display = 'none'" />
											<span>
												{{ row.shopPlayer }}
												<span v-if="row.shopPlayer !== row.shop">
													- {{ row.shop }}
												</span>
											</span>
										</template>
										<template v-else>
											<img
												v-if="row.shop"
												:src="generateMinecraftAvatar(row.shop)"
												:alt="row.shop"
												class="w-5 h-5 rounded mr-2 flex-shrink-0"
												@error="$event.target.style.display = 'none'" />
											<span>{{ row.shop }}</span>
										</template>
									</div>
								</template>
								<template #cell-buyPrice="{ row, layout }">
									<div class="flex items-center justify-end gap-2">
										<div
											v-if="row._originalItem?.stock_quantity === 0"
											class="flex-shrink-0 mr-auto"
											title="Out of stock">
											<ArchiveBoxXMarkIcon
												:class="[
													layout === 'condensed' ? 'w-4 h-4' : 'w-5 h-5',
													'text-current'
												]"
												aria-label="Out of stock" />
											<span class="sr-only">Out of stock</span>
										</div>
										<div
											:class="[
												'text-right',
												row._originalItem?.stock_quantity === 0
													? 'line-through'
													: ''
											]">
											{{ row.buyPrice }}
										</div>
									</div>
								</template>
								<template #cell-sellPrice="{ row, layout }">
									<div class="flex items-center justify-end gap-2">
										<div
											v-if="
												row._originalItem?.stock_full ||
												(row._originalItem?.shopData?.owner_funds === 0 &&
													row._originalItem?.sell_price > 0)
											"
											class="flex-shrink-0 mr-auto"
											:title="
												row._originalItem?.shopData?.owner_funds === 0 &&
												row._originalItem?.sell_price > 0
													? 'Shop owner has run out of money'
													: 'Stock full'
											">
											<WalletIcon
												v-if="
													row._originalItem?.shopData?.owner_funds ===
														0 && row._originalItem?.sell_price > 0
												"
												:class="[
													layout === 'condensed' ? 'w-4 h-4' : 'w-5 h-5',
													'text-current'
												]"
												aria-label="Shop owner has run out of money" />
											<ArchiveBoxIcon
												v-else-if="row._originalItem?.stock_full"
												:class="[
													layout === 'condensed' ? 'w-4 h-4' : 'w-5 h-5',
													'text-current'
												]"
												aria-label="Stock full" />
											<span class="sr-only">
												{{
													row._originalItem?.shopData?.owner_funds ===
														0 && row._originalItem?.sell_price > 0
														? 'Shop owner has run out of money'
														: 'Stock full'
												}}
											</span>
										</div>
										<div
											:class="[
												'text-right',
												row._originalItem?.stock_full ||
												(row._originalItem?.shopData?.owner_funds === 0 &&
													row._originalItem?.sell_price > 0)
													? 'line-through'
													: ''
											]">
											{{ row.sellPrice }}
										</div>
									</div>
								</template>
								<template #cell-profitMargin="{ row }">
									<div class="text-center">{{ row.profitMargin }}</div>
								</template>
								<template #cell-lastUpdated="{ row }">
									<div class="flex items-center justify-end gap-2">
										<span>{{ row.lastUpdated }}</span>
										<BaseIconButton
											v-if="row._originalItem?.shopData && !row._originalItem.shopData.is_own_shop"
											variant="ghost-in-table"
											data-cy="market-overview-item-mark-checked-button"
											:ariaLabel="'Mark as price checked today'"
											title="Mark as price checked today"
											:loading="markingItemId === row._originalItem?.id"
											@click="
												handleMarkItemAsChecked(row._originalItem?.id, row._originalItem?.shop_id)
											"
											:disabled="markingItemId === row._originalItem?.id">
											<ArrowPathIcon />
										</BaseIconButton>
									</div>
								</template>
							</BaseTable>
						</div>
					</div>
				</template>

				<!-- List View -->
				<template v-else-if="viewMode === 'list'">
					<div v-if="allVisibleItems.length === 0" class="text-gray-600">
						<p class="text-lg font-medium mb-2">No items found</p>
						<p class="text-sm">
							{{
								searchQuery
									? 'Try searching for a different item name'
									: 'No items available in shops on this server'
							}}
						</p>
					</div>
					<div v-else>
						<BaseTable
							:columns="baseTableColumns"
							:rows="baseTableRows"
							row-key="id"
							:layout="layout"
							:hoverable="true"
							:initial-sort-field="sortField"
							:initial-sort-direction="sortDirection"
							@sort="handleSort"
							caption="All Items">
							<template #cell-item="{ row, layout }">
								<div 
									class="flex items-center group"
									:class="[
										layout === 'condensed' ? '-mx-2 -my-1 px-2 py-1' : '-mx-4 -my-3 px-4 py-3'
									]">
									<div
										v-if="row.image"
										:class="[
											layout === 'condensed' ? 'w-6 h-6' : 'w-8 h-8',
											'mr-3 flex-shrink-0'
										]">
										<img
											:src="getItemImageUrl(row.image, row.enchantments)"
											:alt="row.item"
											@error="$event.target.src = getImageUrl(row.image)"
											class="w-full h-full object-contain"
											loading="lazy" />
									</div>
									<div class="flex-1 min-w-0">
										<div
											class="font-medium text-gray-900 flex items-center justify-between flex-1 min-w-0 relative">
											<span>
												{{ row.item }}
											</span>
										<div class="flex items-center gap-2 ml-2 flex-shrink-0">
											<button
												@click.stop="toggleStar(row.id, row._originalItem?.starred || false, row._originalItem)"
												class="flex-shrink-0 transition-opacity"
												:class="{
													'opacity-0 group-hover:opacity-100': !(row._originalItem?.starred || false),
													'opacity-100': row._originalItem?.starred || false
												}"
												:title="row._originalItem?.starred ? 'Unstar item' : 'Star item'">
												<StarIcon
													v-if="row._originalItem?.starred"
													:class="[
														layout === 'condensed' ? 'w-4 h-4' : 'w-5 h-5',
														'text-gray-asparagus'
													]" />
												<StarIconOutline
													v-else
													:class="[
														layout === 'condensed' ? 'w-4 h-4' : 'w-5 h-5',
														'text-gray-asparagus'
													]" />
											</button>
										</div>
									</div>
								<!-- Enchantments Display -->
								<div
									v-if="showEnchantments && row.enchantments && row.enchantments.length > 0"
									class="mt-1 pb-1">
									<div class="flex flex-wrap gap-1">
										<span
											v-for="enchantmentId in row.enchantments"
											:key="enchantmentId"
											class="px-1 border border-gray-asparagus text-heavy-metal text-[10px] font-medium rounded uppercase leading-[1.6]">
											{{ formatEnchantmentName(enchantmentId) }}
										</span>
									</div>
								</div>
								</div>
							</div>
						</template>
						<template #cell-shop="{ row }">
							<div
								@click="navigateToShopItems(row.shopId)"
								data-cy="market-overview-shop-link"
								class="flex items-center text-md text-gray-900 cursor-pointer hover:text-gray-asparagus hover:underline transition-colors">
								<template v-if="row.shopPlayer">
									<img
										:src="generateMinecraftAvatar(row.shopPlayer)"
										:alt="row.shopPlayer"
										class="w-5 h-5 rounded mr-2 flex-shrink-0"
										@error="$event.target.style.display = 'none'" />
									<span>
										{{ row.shopPlayer }}
										<span v-if="row.shopPlayer !== row.shop">
											- {{ row.shop }}
										</span>
									</span>
								</template>
								<template v-else>
									<img
										v-if="row.shop"
										:src="generateMinecraftAvatar(row.shop)"
										:alt="row.shop"
										class="w-5 h-5 rounded mr-2 flex-shrink-0"
										@error="$event.target.style.display = 'none'" />
									<span>{{ row.shop }}</span>
								</template>
							</div>
						</template>
							<template #cell-buyPrice="{ row, layout }">
								<div class="flex items-center justify-end gap-2">
									<div
										v-if="row._originalItem?.stock_quantity === 0"
										class="flex-shrink-0 mr-auto"
										title="Out of stock">
										<ArchiveBoxXMarkIcon
											:class="[
												layout === 'condensed' ? 'w-4 h-4' : 'w-5 h-5',
												'text-current'
											]"
											aria-label="Out of stock" />
										<span class="sr-only">Out of stock</span>
									</div>
									<div
										:class="[
											'text-right',
											row._originalItem?.stock_quantity === 0
												? 'line-through'
												: ''
										]">
										{{ row.buyPrice }}
									</div>
								</div>
							</template>
							<template #cell-sellPrice="{ row, layout }">
								<div class="flex items-center justify-end gap-2">
									<div
										v-if="
											row._originalItem?.stock_full ||
											(row._originalItem?.shopData?.owner_funds === 0 &&
												row._originalItem?.sell_price > 0)
										"
										class="flex-shrink-0 mr-auto"
										:title="
											row._originalItem?.shopData?.owner_funds === 0 &&
											row._originalItem?.sell_price > 0
												? 'Shop owner has run out of money'
												: 'Stock full'
										">
										<WalletIcon
											v-if="
												row._originalItem?.shopData?.owner_funds === 0 &&
												row._originalItem?.sell_price > 0
											"
											:class="[
												layout === 'condensed' ? 'w-4 h-4' : 'w-5 h-5',
												'text-current'
											]"
											aria-label="Shop owner has run out of money" />
										<ArchiveBoxIcon
											v-else-if="row._originalItem?.stock_full"
											:class="[
												layout === 'condensed' ? 'w-4 h-4' : 'w-5 h-5',
												'text-current'
											]"
											aria-label="Stock full" />
										<span class="sr-only">
											{{
												row._originalItem?.shopData?.owner_funds === 0 &&
												row._originalItem?.sell_price > 0
													? 'Shop owner has run out of money'
													: 'Stock full'
											}}
										</span>
									</div>
									<div
										:class="[
											'text-right',
											row._originalItem?.stock_full ||
											(row._originalItem?.shopData?.owner_funds === 0 &&
												row._originalItem?.sell_price > 0)
												? 'line-through'
												: ''
										]">
										{{ row.sellPrice }}
									</div>
								</div>
							</template>
							<template #cell-profitMargin="{ row }">
								<div class="text-center">{{ row.profitMargin }}</div>
							</template>
							<template #cell-lastUpdated="{ row }">
								<div class="flex items-center justify-end gap-2">
									<span>{{ row.lastUpdated }}</span>
									<BaseIconButton
										v-if="row._originalItem?.shopData && !row._originalItem.shopData.is_own_shop"
										variant="ghost-in-table"
										data-cy="market-overview-item-mark-checked-button"
										:ariaLabel="'Mark as price checked today'"
										title="Mark as price checked today"
										:loading="markingItemId === row._originalItem?.id"
										@click="
											handleMarkItemAsChecked(row._originalItem?.id, row._originalItem?.shop_id)
										"
										:disabled="markingItemId === row._originalItem?.id">
										<ArrowPathIcon />
									</BaseIconButton>
								</div>
							</template>
						</BaseTable>
					</div>
				</template>
			</div>
		</div>
	</div>

	<!-- Settings Modal -->
	<BaseModal
		:isOpen="showSettingsModal"
		title="Settings"
		size="normal"
		maxWidth="max-w-md"
		data-cy="market-overview-settings-modal"
		@close="showSettingsModal = false">
		<div class="space-y-4">
			<div>
				<h3 class="text-sm font-semibold text-gray-900 mb-3">Items list</h3>
				<div class="space-y-3">
					<label
						class="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
						<input
							data-cy="market-overview-hide-enchantments-checkbox"
							:checked="!showEnchantments"
							@change="showEnchantments = !$event.target.checked"
							type="checkbox"
							class="checkbox-input" />
						<span>Hide enchantments</span>
					</label>
					<label
						class="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
						<input
							data-cy="market-overview-hide-out-of-stock-checkbox"
							:checked="hideOutOfStock"
							@change="hideOutOfStock = $event.target.checked"
							type="checkbox"
							class="checkbox-input" />
						<span>Hide out of stock</span>
					</label>
					<label
						class="flex items-center gap-2 text-sm font-semibold text-gray-800 cursor-pointer">
						<input
							data-cy="market-overview-hide-stock-full-checkbox"
							:checked="hideStockFull"
							@change="hideStockFull = $event.target.checked"
							type="checkbox"
							class="checkbox-input" />
						<span>Hide stock full</span>
					</label>
				</div>
			</div>
		</div>
	</BaseModal>
</template>
