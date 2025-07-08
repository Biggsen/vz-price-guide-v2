<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useCurrentUser, useFirestore, useCollection } from 'vuefire'
import { useRouter } from 'vue-router'
import { query, collection, orderBy, where } from 'firebase/firestore'
import { useShops, useServerShops } from '../utils/shopProfile.js'
import { useServers } from '../utils/serverProfile.js'
import { useServerShopItems } from '../utils/shopItems.js'
import ShopItemTable from '../components/ShopItemTable.vue'

const user = useCurrentUser()
const router = useRouter()
const db = useFirestore()

// Reactive state
const selectedServerId = ref('')
const loading = ref(false)
const error = ref(null)
const searchQuery = ref('')

// View mode state
const viewMode = ref('categories') // 'categories' or 'list'

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

// Watch for servers loading - handle server selection
watch(servers, (newServers) => {
	if (newServers && newServers.length > 0) {
		if (!selectedServerId.value) {
			// Auto-select first server if none selected
			selectedServerId.value = newServers[0].id
		}
	}
})

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
		<div class="mb-6">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Market Overview</h1>
			<p class="text-gray-600">Browse and analyze items across all shops on your server.</p>
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
				<router-link to="/servers" class="text-blue-600 hover:text-blue-800 underline">
					Go to Servers
				</router-link>
			</p>
		</div>

		<!-- Main content -->
		<div v-else-if="hasServers">
			<!-- Server selector -->
			<div class="mb-6">
				<label for="server-select" class="block text-sm font-medium text-gray-700 mb-2">
					Select Server
				</label>
				<select
					id="server-select"
					v-model="selectedServerId"
					class="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
					<option value="">Choose a server...</option>
					<option v-for="server in servers" :key="server.id" :value="server.id">
						{{ server.name }} ({{ server.minecraft_version }})
					</option>
				</select>
			</div>

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
					class="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
				<p class="text-xs text-gray-500 mt-1">
					Tip: Use commas or spaces to search for multiple items
				</p>
				<div v-if="searchQuery" class="mt-2 text-sm text-gray-600">
					Showing {{ marketStats?.totalItems || 0 }} item{{
						marketStats?.totalItems === 1 ? '' : 's'
					}}
					matching "{{ searchQuery }}"
				</div>
			</div>

			<!-- View Mode Toggle -->
			<div v-if="selectedServerId" class="mb-6">
				<div class="flex flex-col gap-2 sm:flex-row sm:items-center">
					<div>
						<span class="text-sm font-medium text-gray-700 mb-2 block">View as:</span>
						<div class="inline-flex border-2 border-gray-300 rounded overflow-hidden">
							<button
								@click="viewMode = 'categories'"
								:class="[
									viewMode === 'categories'
										? 'bg-blue-600 text-white'
										: 'bg-white text-gray-700 hover:bg-gray-50',
									'px-4 py-2 text-sm font-medium transition border-r border-gray-300 last:border-r-0'
								]">
								Categories
							</button>
							<button
								@click="viewMode = 'list'"
								:class="[
									viewMode === 'list'
										? 'bg-blue-600 text-white'
										: 'bg-white text-gray-700 hover:bg-gray-50',
									'px-4 py-2 text-sm font-medium transition'
								]">
								List
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Market stats -->
			<div v-if="selectedServer && marketStats" class="mb-6">
				<div class="bg-white rounded-lg shadow-md p-6 border border-gray-200">
					<div class="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
						<div>
							<h2 class="text-xl font-semibold text-gray-900">
								{{ selectedServer.name }} Market
							</h2>
							<p class="text-gray-600">
								{{ selectedServer.name }} • Minecraft
								{{ selectedServer.minecraft_version }}
							</p>
						</div>
					</div>

					<!-- Stats grid -->
					<div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
						<div class="bg-blue-50 p-3 rounded-lg">
							<div class="text-2xl font-bold text-blue-600">
								{{ marketStats.totalItems }}
							</div>
							<div class="text-sm text-gray-600">Items</div>
						</div>
						<div class="bg-green-50 p-3 rounded-lg">
							<div class="text-2xl font-bold text-green-600">
								{{ marketStats.totalShops }}
							</div>
							<div class="text-sm text-gray-600">Shops</div>
						</div>
						<div class="bg-purple-50 p-3 rounded-lg">
							<div class="text-2xl font-bold text-purple-600">
								{{ marketStats.userShops }}
							</div>
							<div class="text-sm text-gray-600">Your Shops</div>
						</div>
						<div class="bg-orange-50 p-3 rounded-lg">
							<div class="text-2xl font-bold text-orange-600">
								{{ marketStats.competitorShops }}
							</div>
							<div class="text-sm text-gray-600">Competitors</div>
						</div>
						<div class="bg-gray-50 p-3 rounded-lg">
							<div class="text-2xl font-bold text-gray-600">
								{{ marketStats.categoriesCount }}
							</div>
							<div class="text-sm text-gray-600">Categories</div>
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
						to="/shop-items"
						class="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition-colors font-medium inline-block">
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
							v-for="(categoryItems, category) in filteredShopItemsByCategory"
							:key="category">
							<h3
								class="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
								{{ category }}
							</h3>
							<ShopItemTable
								:items="categoryItems"
								:server="selectedServer"
								:show-shop-names="true"
								:read-only="true" />
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
						<h3
							class="text-lg font-semibold text-gray-800 mb-3 pb-2 border-b border-gray-200">
							All Items
						</h3>
						<ShopItemTable
							:items="allVisibleItems"
							:server="selectedServer"
							:show-shop-names="true"
							:read-only="true" />
					</div>
				</template>
			</div>
		</div>
	</div>
</template>
