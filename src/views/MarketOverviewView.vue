<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useCurrentUser, useFirestore, useCollection } from 'vuefire'
import { useRouter, useRoute } from 'vue-router'
import { query, collection, orderBy, where } from 'firebase/firestore'
import { useShops, useServerShops } from '../utils/shopProfile.js'
import { useServers } from '../utils/serverProfile.js'
import { useServerShopItems } from '../utils/shopItems.js'
import BaseStatCard from '../components/BaseStatCard.vue'
import BaseTable from '../components/BaseTable.vue'
import { getImageUrl } from '../utils/image.js'
import { generateMinecraftAvatar } from '../utils/userProfile.js'
import {
	BuildingStorefrontIcon,
	CheckCircleIcon,
	FolderIcon,
	TagIcon,
	UserIcon,
	UsersIcon
} from '@heroicons/vue/24/outline'

const user = useCurrentUser()
const router = useRouter()
const route = useRoute()
const db = useFirestore()

// Reactive state
const selectedServerId = ref(route.query.serverId || '')
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')

// View mode state
const viewMode = ref('categories') // 'categories' or 'list'
const layout = ref('comfortable') // 'comfortable' or 'condensed'

// Get user's shops and servers
const { shops } = useShops(computed(() => user.value?.uid))
const { servers } = useServers(computed(() => user.value?.uid))

// Get all shops on the selected server
const { shops: serverShops } = useServerShops(selectedServerId)

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

	return query(
		collection(db, 'items'),
		where('version', '<=', selectedServer.value.minecraft_version),
		orderBy('version', 'asc'),
		orderBy('category', 'asc'),
		orderBy('name', 'asc')
	)
})

const availableItems = useCollection(allItemsQuery)

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

			// Add shop data for market overview
			const shopData = serverShops.value?.find((shop) => shop.id === shopItem.shop_id)

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

// Filtered version for search
const filteredShopItemsByCategory = computed(() => {
	if (!shopItemsByCategory.value) return {}

	const query = searchQuery.value.trim().toLowerCase()
	if (!query) return shopItemsByCategory.value

	const filtered = {}

	Object.entries(shopItemsByCategory.value).forEach(([category, items]) => {
		const filteredItems = items.filter((item) => {
			if (!item.itemData?.name) return false
			const itemName = item.itemData.name.toLowerCase()

			// Split search query by commas and/or spaces, then trim and filter out empty strings
			const searchTerms = query
				.split(/[,\s]+/)
				.map((term) => term.trim())
				.filter((term) => term.length > 0)

			// If no valid search terms, return all items
			if (searchTerms.length === 0) return true

			// Check if item name contains any of the search terms (OR logic)
			return searchTerms.some((term) => itemName.includes(term))
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

// Format date helper
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

// Calculate profit margin helper
function calculateProfitMargin(buyPrice, sellPrice) {
	if (!buyPrice || !sellPrice || buyPrice === 0) return null
	const profit = buyPrice - sellPrice
	const margin = (profit / buyPrice) * 100
	return margin
}

// Transform shop items for BaseTable
function transformShopItemForTable(shopItem) {
	const profitMargin = calculateProfitMargin(shopItem.buy_price, shopItem.sell_price)
	const lastUpdatedTimestamp = shopItem.last_updated ? new Date(shopItem.last_updated).getTime() : 0
	return {
		id: shopItem.id,
		item: shopItem.itemData?.name || 'Unknown Item',
		image: shopItem.itemData?.image || null,
		shop: shopItem.shopData?.name || 'Unknown Shop',
		shopPlayer: shopItem.shopData?.player || null,
		shopLocation: shopItem.shopData?.location || null,
		shopId: shopItem.shopData?.id || null,
		buyPrice: shopItem.buy_price !== null && shopItem.buy_price !== undefined ? shopItem.buy_price.toFixed(2) : '—',
		sellPrice: shopItem.sell_price !== null && shopItem.sell_price !== undefined ? shopItem.sell_price.toFixed(2) : '—',
		profitMargin: profitMargin !== null ? `${profitMargin.toFixed(1)}%` : '—',
		lastUpdated: formatDate(shopItem.last_updated),
		_lastUpdatedTimestamp: lastUpdatedTimestamp,
		_originalItem: shopItem // Keep reference to original item
	}
}

// BaseTable rows for list view
const baseTableRows = computed(() => {
	if (!allVisibleItems.value) return []
	return allVisibleItems.value.map(transformShopItemForTable)
})

// BaseTable rows grouped by category
const baseTableRowsByCategory = computed(() => {
	if (!filteredShopItemsByCategory.value) return {}
	const grouped = {}
	Object.entries(filteredShopItemsByCategory.value).forEach(([category, categoryItems]) => {
		grouped[category] = categoryItems.map(transformShopItemForTable)
	})
	return grouped
})

// Navigate to shop items
function navigateToShopItems(shopId) {
	if (shopId) {
		router.push({ name: 'shop', params: { shopId } })
	}
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
		// If serverId from query param exists and is valid, use it
		if (route.query.serverId && newServers.some(s => s.id === route.query.serverId)) {
			selectedServerId.value = route.query.serverId
		} else if (!selectedServerId.value) {
			// Auto-select first server if none selected
			selectedServerId.value = newServers[0].id
		}
	}
})

// Load view settings on mount
onMounted(() => {
	loadViewSettings()
})

// Save view settings when they change
watch(
	[viewMode, layout],
	() => {
		saveViewSettings()
	},
	{ deep: true }
)

// Load and save view settings from localStorage
function loadViewSettings() {
	try {
		const savedViewMode = localStorage.getItem('marketOverviewViewMode')
		const savedLayout = localStorage.getItem('marketOverviewLayout')

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
		localStorage.setItem('marketOverviewViewMode', viewMode.value)
		localStorage.setItem('marketOverviewLayout', layout.value)
	} catch (error) {
		console.warn('Error saving view settings:', error)
	}
}

// Helper functions
function getServerName(serverId) {
	return servers.value?.find((server) => server.id === serverId)?.name || 'Unknown Server'
}

// Market analysis functions
const marketStats = computed(() => {
	if (!shopItems.value || !serverShops.value) return null

	// Count filtered items for display
	const filteredItemCount = Object.values(filteredShopItemsByCategory.value).reduce(
		(total, items) => total + items.length,
		0
	)

	const stats = {
		totalItems: filteredItemCount,
		totalShops: serverShops.value.length,
		userShops: serverShops.value.filter((shop) => shop.is_own_shop === true).length,
		competitorShops: serverShops.value.filter((shop) => shop.is_own_shop !== true).length,
		categoriesCount: Object.keys(filteredShopItemsByCategory.value).length
	}

	return stats
})

// Price analysis functions
const priceAnalysis = computed(() => {
	if (!shopItems.value || shopItems.value.length === 0) return null

	const itemPrices = {}

	// Group items by item_id to analyze prices (excluding own shops)
	shopItems.value.forEach((shopItem) => {
		const itemId = shopItem.item_id
		const shop = serverShops.value?.find((s) => s.id === shopItem.shop_id)

		// Skip own shops for trading opportunities
		if (shop?.is_own_shop) {
			return
		}

		if (!itemPrices[itemId]) {
			itemPrices[itemId] = {
				buyPrices: [],
				sellPrices: [],
				shops: []
			}
		}

		if (shopItem.buy_price !== null && shopItem.buy_price !== undefined) {
			itemPrices[itemId].buyPrices.push({
				price: shopItem.buy_price,
				shopId: shopItem.shop_id,
				shopName: shop?.name || 'Unknown'
			})
		}

		if (shopItem.sell_price !== null && shopItem.sell_price !== undefined) {
			itemPrices[itemId].sellPrices.push({
				price: shopItem.sell_price,
				shopId: shopItem.shop_id,
				shopName: shop?.name || 'Unknown'
			})
		}
	})

	// Find best opportunities
	const opportunities = []

	Object.entries(itemPrices).forEach(([itemId, data]) => {
		if (data.buyPrices.length > 0 && data.sellPrices.length > 0) {
			const lowestBuy = Math.min(...data.buyPrices.map((p) => p.price))

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
				const buyShop = data.buyPrices.find((p) => p.price === lowestBuy)
				const sellShop = affordableSellPrices.find((p) => p.price === highestSell)

				opportunities.push({
					itemId,
					itemName: itemData?.name || 'Unknown Item',
					itemImage: itemData?.image,
					profit,
					profitMargin,
					buyPrice: lowestBuy,
					sellPrice: highestSell,
					buyShop: buyShop?.shopName,
					sellShop: sellShop?.shopName
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

		<!-- No servers warning -->
		<div
			v-if="!hasServers && !loading"
			class="mb-6 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
			<p class="font-medium">No servers found</p>
			<p class="text-sm mt-1">
				You need to create a server first to view market data.
				<router-link to="/shop-manager" class="text-blue-600 hover:text-blue-800 underline">
					Go to Shop Manager
				</router-link>
			</p>
		</div>

		<!-- Main content -->
		<div v-else-if="hasServers">
			<!-- Search input -->
			<div v-if="selectedServerId" class="mb-6">
				<label for="item-search" class="block text-sm font-medium text-gray-700 mb-2">
					Search Items
				</label>
				<input
					id="item-search"
					type="text"
					v-model="searchQuery"
					placeholder="Search for items..."
					class="w-full md:w-1/2 border-2 border-gray-asparagus rounded px-3 py-2 mb-1 h-10" />
				<p class="text-xs text-gray-500 mt-1">Tip: Use commas to search multiple terms</p>
				<div v-if="searchQuery" class="mt-2 text-sm text-gray-600">
					Showing {{ marketStats?.totalItems || 0 }} item{{
						marketStats?.totalItems === 1 ? '' : 's'
					}}
					matching "{{ searchQuery }}"
				</div>
			</div>

			<!-- View Mode and Layout Toggle -->
			<div v-if="selectedServerId" class="mb-6">
				<div class="flex flex-wrap items-center gap-6">
					<!-- View Mode -->
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

					<!-- Layout -->
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
			</div>

			<!-- Trading opportunities -->
			<div
				v-if="selectedServer && priceAnalysis && priceAnalysis.opportunities.length > 0"
				class="mb-6">
				<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
					<h3 class="text-lg font-semibold text-gray-900 mb-4">
						🚀 Trading Opportunities
					</h3>
					<div class="space-y-3">
						<div
							v-for="opportunity in priceAnalysis.opportunities"
							:key="opportunity.itemId"
							class="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
							<div class="flex items-center">
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
									<div class="text-sm text-gray-600">
										Buy from {{ opportunity.buyShop }} at
										{{ opportunity.buyPrice }} → Sell to
										{{ opportunity.sellShop }} at {{ opportunity.sellPrice }}
									</div>
								</div>
							</div>
							<div class="text-right">
								<div class="font-bold text-green-600">
									+{{ opportunity.profit.toFixed(2) }}
								</div>
								<div class="text-sm text-gray-500">
									{{ opportunity.profitMargin.toFixed(1) }}% profit
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Market items display -->
			<div v-if="selectedServerId && shopItems">
				<div v-if="shopItems.length === 0" class="text-center py-12 bg-gray-50 rounded-lg">
					<div class="text-gray-500 text-lg mb-2">
						No items found in any shops on this server
					</div>
					<div class="text-sm text-gray-400 mb-4">
						Shops on this server haven't added any items yet
					</div>
					<router-link
						:to="{ name: 'shop' }"
						class="bg-semantic-info text-white px-6 py-3 rounded hover:bg-opacity-80 transition-colors font-medium inline-block">
						Manage Your Shop Items
					</router-link>
				</div>

				<!-- Categories View -->
				<template v-else-if="viewMode === 'categories'">
					<div
						v-if="searchQuery && Object.keys(filteredShopItemsByCategory).length === 0"
						class="text-center py-12 bg-gray-50 rounded-lg">
						<div class="text-gray-500 text-lg mb-2">
							No items found matching "{{ searchQuery }}"
						</div>
						<div class="text-sm text-gray-400">
							Try searching for a different item name
						</div>
					</div>
					<div v-else class="space-y-6">
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
										<div class="font-medium text-gray-900">{{ row.item }}</div>
									</div>
								</template>
								<template #cell-shop="{ row }">
									<div>
										<div
											@click="navigateToShopItems(row.shopId)"
											class="flex items-center text-md text-gray-900 cursor-pointer hover:text-gray-asparagus hover:underline transition-colors">
											<img
												v-if="row.shopPlayer || row.shop"
												:src="generateMinecraftAvatar(row.shopPlayer || row.shop)"
												:alt="row.shop"
												class="w-5 h-5 rounded mr-2 flex-shrink-0"
												@error="$event.target.style.display = 'none'" />
											<span>{{ row.shop }}</span>
										</div>
										<div v-if="row.shopLocation" class="text-xs text-gray-500">
											📍 {{ row.shopLocation }}
										</div>
									</div>
								</template>
								<template #cell-buyPrice="{ row }">
									<div class="text-right">{{ row.buyPrice }}</div>
								</template>
								<template #cell-sellPrice="{ row }">
									<div class="text-right">{{ row.sellPrice }}</div>
								</template>
								<template #cell-profitMargin="{ row }">
									<div class="text-center">{{ row.profitMargin }}</div>
								</template>
								<template #cell-lastUpdated="{ row }">
									<div class="text-center">{{ row.lastUpdated }}</div>
								</template>
							</BaseTable>
						</div>
					</div>
				</template>

				<!-- List View -->
				<template v-else-if="viewMode === 'list'">
					<div
						v-if="allVisibleItems.length === 0"
						class="text-center py-12 bg-gray-50 rounded-lg">
						<div class="text-gray-500 text-lg mb-2">No items found</div>
						<div class="text-sm text-gray-400">
							{{
								searchQuery
									? 'Try searching for a different item name'
									: 'No items available in shops on this server'
							}}
						</div>
					</div>
					<div v-else>
						<BaseTable
							:columns="baseTableColumns"
							:rows="baseTableRows"
							row-key="id"
							:layout="layout"
							:hoverable="true"
							caption="All Items">
							<template #cell-item="{ row, layout }">
								<div class="flex items-center">
									<div v-if="row.image" :class="[layout === 'condensed' ? 'w-6 h-6' : 'w-8 h-8', 'mr-3 flex-shrink-0']">
										<img
											:src="getImageUrl(row.image)"
											:alt="row.item"
											class="w-full h-full object-contain"
											loading="lazy" />
									</div>
									<div class="font-medium text-gray-900">{{ row.item }}</div>
								</div>
							</template>
							<template #cell-shop="{ row }">
								<div>
									<div
										@click="navigateToShopItems(row.shopId)"
										class="flex items-center text-md text-gray-900 cursor-pointer hover:text-gray-asparagus hover:underline transition-colors">
										<img
											v-if="row.shopPlayer || row.shop"
											:src="generateMinecraftAvatar(row.shopPlayer || row.shop)"
											:alt="row.shop"
											class="w-5 h-5 rounded mr-2 flex-shrink-0"
											@error="$event.target.style.display = 'none'" />
										<span>{{ row.shop }}</span>
									</div>
									<div v-if="row.shopLocation" class="text-xs text-gray-500">
										📍 {{ row.shopLocation }}
									</div>
								</div>
							</template>
							<template #cell-buyPrice="{ row }">
								<div class="text-right">{{ row.buyPrice }}</div>
							</template>
							<template #cell-sellPrice="{ row }">
								<div class="text-right">{{ row.sellPrice }}</div>
							</template>
							<template #cell-profitMargin="{ row }">
								<div class="text-center">{{ row.profitMargin }}</div>
							</template>
							<template #cell-lastUpdated="{ row }">
								<div class="text-center">{{ row.lastUpdated }}</div>
							</template>
						</BaseTable>
					</div>
				</template>
			</div>
		</div>
	</div>
</template>
