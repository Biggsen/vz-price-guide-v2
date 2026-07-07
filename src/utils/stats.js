import { useFirestore, useCollection } from 'vuefire'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { ref, computed } from 'vue'

export const SHOP_MANAGER_STATS_EXCLUDED_USER_IDS = ['dx4cm54EArZeVE3d1CPJuU2kJbl2']

const MONTH_LABELS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
]

// Get basic collection counts
export async function getCollectionStats() {
	const db = useFirestore()

	try {
		// Get items count
		const itemsSnapshot = await getDocs(collection(db, 'items'))
		const itemsCount = itemsSnapshot.size

		// Get recipes count (items with recipes)
		const itemsWithRecipes = itemsSnapshot.docs.filter((doc) => {
			const data = doc.data()
			return data.recipes_by_version && Object.keys(data.recipes_by_version).length > 0
		})
		const recipesCount = itemsWithRecipes.length

		// Get users count
		const usersSnapshot = await getDocs(collection(db, 'users'))
		const usersCount = usersSnapshot.size

		// Get servers count
		const serversSnapshot = await getDocs(collection(db, 'servers'))
		const serversCount = serversSnapshot.size

		// Get shops count
		const shopsSnapshot = await getDocs(collection(db, 'shops'))
		const shopsCount = shopsSnapshot.size

		// Get shop items count
		const shopItemsSnapshot = await getDocs(collection(db, 'shop_items'))
		const shopItemsCount = shopItemsSnapshot.size

		// Get recent activity (last 7 days)
		const sevenDaysAgo = new Date()
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

		const recentShopItems = shopItemsSnapshot.docs.filter((doc) => {
			const data = doc.data()
			if (!data.last_updated) return false
			const lastUpdated = new Date(data.last_updated)
			return lastUpdated >= sevenDaysAgo
		})
		const recentActivityCount = recentShopItems.length

		// Get items by category
		const itemsByCategory = {}
		itemsSnapshot.docs.forEach((doc) => {
			const data = doc.data()
			const category = data.category || 'uncategorized'
			itemsByCategory[category] = (itemsByCategory[category] || 0) + 1
		})

		// Get items by version
		const itemsByVersion = {}
		itemsSnapshot.docs.forEach((doc) => {
			const data = doc.data()
			const version = data.version || 'unknown'
			itemsByVersion[version] = (itemsByVersion[version] || 0) + 1
		})

		return {
			itemsCount,
			recipesCount,
			usersCount,
			serversCount,
			shopsCount,
			shopItemsCount,
			recentActivityCount,
			itemsByCategory,
			itemsByVersion
		}
	} catch (error) {
		console.error('Error fetching collection stats:', error)
		return {
			itemsCount: 0,
			recipesCount: 0,
			usersCount: 0,
			serversCount: 0,
			shopsCount: 0,
			shopItemsCount: 0,
			recentActivityCount: 0,
			itemsByCategory: {},
			itemsByVersion: {}
		}
	}
}

// Composable for reactive stats
export function useStats() {
	const stats = ref({
		itemsCount: 0,
		recipesCount: 0,
		usersCount: 0,
		serversCount: 0,
		shopsCount: 0,
		shopItemsCount: 0,
		recentActivityCount: 0,
		itemsByCategory: {},
		itemsByVersion: {}
	})

	const loading = ref(true)
	const error = ref(null)

	const fetchStats = async () => {
		try {
			loading.value = true
			error.value = null
			const data = await getCollectionStats()
			stats.value = data
		} catch (err) {
			error.value = err
			console.error('Error fetching stats:', err)
		} finally {
			loading.value = false
		}
	}

	// Auto-fetch on mount
	fetchStats()

	return {
		stats,
		loading,
		error,
		refresh: fetchStats
	}
}

function isAdminShop(shop) {
	return shop.server_shop === true
}

function isOwnPlayerShop(shop) {
	return !isAdminShop(shop) && shop.is_own_shop === true
}

function isOtherPlayerShop(shop) {
	return !isAdminShop(shop) && shop.is_own_shop !== true
}

function parseFirestoreDate(value) {
	if (!value) return null
	if (value.toDate) return value.toDate()
	if (value instanceof Date) return value
	return new Date(value)
}

function isWithinLastSevenDays(value) {
	const date = parseFirestoreDate(value)
	if (!date || Number.isNaN(date.getTime())) return false
	const sevenDaysAgo = new Date()
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
	return date >= sevenDaysAgo
}

function isInMonthYear(value, year, monthIndex) {
	const date = parseFirestoreDate(value)
	if (!date || Number.isNaN(date.getTime())) return false
	return date.getFullYear() === year && date.getMonth() === monthIndex
}

function wasItemAddedRecently(item) {
	if (item.created_at && isWithinLastSevenDays(item.created_at)) return true
	return (
		!item.created_at &&
		!item.previous_price_date &&
		isWithinLastSevenDays(item.last_updated)
	)
}

function wasItemUpdatedRecently(item) {
	return isWithinLastSevenDays(item.last_updated) && !wasItemAddedRecently(item)
}

function wasItemAddedInMonth(item, year, monthIndex) {
	if (item.created_at && isInMonthYear(item.created_at, year, monthIndex)) return true
	return (
		!item.created_at &&
		!item.previous_price_date &&
		isInMonthYear(item.last_updated, year, monthIndex)
	)
}

function wasItemUpdatedInMonth(item, year, monthIndex) {
	return (
		isInMonthYear(item.last_updated, year, monthIndex) &&
		!wasItemAddedInMonth(item, year, monthIndex)
	)
}

function getShopItemActivityStats(items) {
	let itemsAdded7d = 0
	let itemsUpdated7d = 0

	items.forEach((item) => {
		if (wasItemAddedRecently(item)) {
			itemsAdded7d++
		} else if (wasItemUpdatedRecently(item)) {
			itemsUpdated7d++
		}
	})

	return {
		itemsAdded7d,
		itemsUpdated7d,
		itemsActive7d: itemsAdded7d + itemsUpdated7d
	}
}

async function fetchShopManagerCollections() {
	const db = useFirestore()
	const [serversSnapshot, shopsSnapshot, shopItemsSnapshot, usersSnapshot] = await Promise.all([
		getDocs(collection(db, 'servers')),
		getDocs(collection(db, 'shops')),
		getDocs(collection(db, 'shop_items')),
		getDocs(collection(db, 'users'))
	])

	return {
		servers: serversSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
		shops: shopsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
		shopItems: shopItemsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
		users: usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
	}
}

function filterShopManagerData({ servers, shops, shopItems, users }, excludeUserIds = []) {
	const excludeSet = new Set(excludeUserIds.filter(Boolean))
	if (excludeSet.size === 0) {
		return { servers, shops, shopItems, users }
	}

	const excludedShopIds = new Set(
		shops.filter((shop) => excludeSet.has(shop.owner_id)).map((shop) => shop.id)
	)

	return {
		servers: servers.filter((server) => !excludeSet.has(server.owner_id)),
		shops: shops.filter((shop) => !excludeSet.has(shop.owner_id)),
		shopItems: shopItems.filter((item) => !excludedShopIds.has(item.shop_id)),
		users: users.filter((user) => !excludeSet.has(user.id))
	}
}

function createEmptyMonthRow(monthIndex, year) {
	return {
		month: monthIndex + 1,
		label: MONTH_LABELS[monthIndex],
		newServers: 0,
		newManagedServers: 0,
		newShops: 0,
		newAdminShops: 0,
		newOwnPlayerShops: 0,
		newOtherPlayerShops: 0,
		itemsAdded: 0,
		itemsUpdated: 0,
		cumulativeServers: 0,
		cumulativeShops: 0,
		cumulativeAdminShops: 0
	}
}

function buildMonthlyRows(servers, shops, shopItems, year) {
	const rows = Array.from({ length: 12 }, (_, monthIndex) =>
		createEmptyMonthRow(monthIndex, year)
	)

	servers.forEach((server) => {
		const createdAt = parseFirestoreDate(server.created_at)
		if (!createdAt || createdAt.getFullYear() !== year) return
		const monthIndex = createdAt.getMonth()
		rows[monthIndex].newServers++
		if (server.user_manages_server === true) {
			rows[monthIndex].newManagedServers++
		}
	})

	shops.forEach((shop) => {
		const createdAt = parseFirestoreDate(shop.created_at)
		if (!createdAt || createdAt.getFullYear() !== year) return
		const monthIndex = createdAt.getMonth()
		rows[monthIndex].newShops++
		if (isAdminShop(shop)) rows[monthIndex].newAdminShops++
		else if (isOwnPlayerShop(shop)) rows[monthIndex].newOwnPlayerShops++
		else rows[monthIndex].newOtherPlayerShops++
	})

	shopItems.forEach((item) => {
		for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
			if (wasItemAddedInMonth(item, year, monthIndex)) {
				rows[monthIndex].itemsAdded++
			} else if (wasItemUpdatedInMonth(item, year, monthIndex)) {
				rows[monthIndex].itemsUpdated++
			}
		}
	})

	for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
		const endOfMonth = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999)
		rows[monthIndex].cumulativeServers = servers.filter((server) => {
			const createdAt = parseFirestoreDate(server.created_at)
			return createdAt && createdAt <= endOfMonth
		}).length
		rows[monthIndex].cumulativeShops = shops.filter((shop) => {
			const createdAt = parseFirestoreDate(shop.created_at)
			return createdAt && createdAt <= endOfMonth
		}).length
		rows[monthIndex].cumulativeAdminShops = shops.filter((shop) => {
			if (!isAdminShop(shop)) return false
			const createdAt = parseFirestoreDate(shop.created_at)
			return createdAt && createdAt <= endOfMonth
		}).length
	}

	return rows
}

function getShopSubsetStats(shops, shopItems) {
	const shopIds = new Set(shops.map((shop) => shop.id))
	const items = shopItems.filter((item) => shopIds.has(item.shop_id))
	const itemsByShop = {}

	items.forEach((item) => {
		if (item.shop_id) {
			itemsByShop[item.shop_id] = (itemsByShop[item.shop_id] || 0) + 1
		}
	})

	const shopsWithItems = new Set(items.map((item) => item.shop_id).filter(Boolean))
	const itemCounts = Object.values(itemsByShop)
	const itemActivity = getShopItemActivityStats(items)

	return {
		shops: shops.length,
		items: items.length,
		avgItemsPerShop:
			shops.length > 0 ? (items.length / shops.length).toFixed(2) : '0.00',
		maxItemsPerShop: itemCounts.length > 0 ? Math.max(...itemCounts) : 0,
		shopsWithoutItems: shops.filter((shop) => !shopsWithItems.has(shop.id)).length,
		recentShops: shops.filter((shop) => isWithinLastSevenDays(shop.created_at)).length,
		...itemActivity
	}
}

// Get detailed shop manager usage statistics
export async function getShopManagerStats(excludeUserId = null) {
	const db = useFirestore()

	try {
		// Get all collections
		const [serversSnapshot, shopsSnapshot, shopItemsSnapshot, usersSnapshot] =
			await Promise.all([
				getDocs(collection(db, 'servers')),
				getDocs(collection(db, 'shops')),
				getDocs(collection(db, 'shop_items')),
				getDocs(collection(db, 'users'))
			])

		let servers = serversSnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data()
		}))
		let shops = shopsSnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data()
		}))
		let shopItems = shopItemsSnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data()
		}))
		let users = usersSnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data()
		}))

		// Exclude current user's data if provided
		if (excludeUserId) {
			// Get shop IDs that belong to excluded user before filtering shops
			const excludedShopIds = new Set(
				shopsSnapshot.docs
					.map((doc) => {
						const data = doc.data()
						return data.owner_id === excludeUserId ? doc.id : null
					})
					.filter(Boolean)
			)

			// Filter out excluded user's data
			servers = servers.filter((server) => server.owner_id !== excludeUserId)
			shops = shops.filter((shop) => shop.owner_id !== excludeUserId)
			shopItems = shopItems.filter((item) => !excludedShopIds.has(item.shop_id))
			users = users.filter((user) => user.id !== excludeUserId)
		}

		const adminShops = shops.filter(isAdminShop)
		const ownPlayerShops = shops.filter(isOwnPlayerShop)
		const otherPlayerShops = shops.filter(isOtherPlayerShop)
		const playerShops = shops.filter((shop) => !isAdminShop(shop))

		const adminShopStats = getShopSubsetStats(adminShops, shopItems)
		const ownPlayerShopStats = getShopSubsetStats(ownPlayerShops, shopItems)
		const otherPlayerShopStats = getShopSubsetStats(otherPlayerShops, shopItems)
		const playerShopStats = getShopSubsetStats(playerShops, shopItems)
		const allShopStats = getShopSubsetStats(shops, shopItems)
		const itemActivity = getShopItemActivityStats(shopItems)

		// Basic counts
		const totalServers = servers.length
		const totalShops = shops.length
		const totalShopItems = shopItems.length
		const totalUsers = users.length
		const managedServers = servers.filter((server) => server.user_manages_server === true)
		const serversWithAdminShop = new Set(
			adminShops.map((shop) => shop.server_id).filter(Boolean)
		)
		const managedServersWithoutAdminShop = managedServers.filter(
			(server) => !serversWithAdminShop.has(server.id)
		).length

		// Active users (users who have created at least one server or shop)
		const serverOwnerIds = new Set(servers.map((s) => s.owner_id).filter(Boolean))
		const shopOwnerIds = new Set(shops.map((s) => s.owner_id).filter(Boolean))
		const activeUserIds = new Set([...serverOwnerIds, ...shopOwnerIds])
		const activeUsersCount = activeUserIds.size

		// Servers per user
		const serversByUser = {}
		servers.forEach((server) => {
			if (server.owner_id) {
				serversByUser[server.owner_id] = (serversByUser[server.owner_id] || 0) + 1
			}
		})
		const avgServersPerUser =
			activeUserIds.size > 0
				? (totalServers / activeUserIds.size).toFixed(2)
				: '0.00'
		const maxServersPerUser = Math.max(...Object.values(serversByUser), 0)

		// Player shops per user
		const shopsByUser = {}
		playerShops.forEach((shop) => {
			if (shop.owner_id) {
				shopsByUser[shop.owner_id] = (shopsByUser[shop.owner_id] || 0) + 1
			}
		})
		const avgShopsPerUser =
			activeUserIds.size > 0
				? (playerShops.length / activeUserIds.size).toFixed(2)
				: '0.00'
		const maxShopsPerUser = Math.max(...Object.values(shopsByUser), 0)

		// Player shops per server
		const playerShopsByServer = {}
		playerShops.forEach((shop) => {
			if (shop.server_id) {
				playerShopsByServer[shop.server_id] =
					(playerShopsByServer[shop.server_id] || 0) + 1
			}
		})
		const playerShopsPerServerCounts = Object.values(playerShopsByServer)
		const avgPlayerShopsPerServer =
			totalServers > 0 ? (playerShops.length / totalServers).toFixed(2) : '0.00'
		const maxPlayerShopsPerServer =
			playerShopsPerServerCounts.length > 0
				? Math.max(...playerShopsPerServerCounts)
				: 0

		const recentServers = servers.filter((server) =>
			isWithinLastSevenDays(server.created_at)
		).length

		// Servers with no shops
		const serversWithShops = new Set(shops.map((s) => s.server_id).filter(Boolean))
		const serversWithoutShops = servers.filter(
			(s) => !serversWithShops.has(s.id)
		).length

		return {
			totalServers,
			totalShops,
			totalShopItems,
			totalUsers,
			activeUsersCount,
			managedServersCount: managedServers.length,
			serversWithAdminShop: serversWithAdminShop.size,
			managedServersWithoutAdminShop,
			avgServersPerUser,
			maxServersPerUser,
			avgShopsPerUser,
			maxShopsPerUser,
			avgPlayerShopsPerServer,
			maxPlayerShopsPerServer,
			recentServers,
			serversWithoutShops,
			itemsAdded7d: itemActivity.itemsAdded7d,
			itemsUpdated7d: itemActivity.itemsUpdated7d,
			itemsActive7d: itemActivity.itemsActive7d,
			shopTypeStats: [
				{ key: 'admin', label: 'Admin shops', ...adminShopStats },
				{ key: 'ownPlayer', label: 'Own player shops', ...ownPlayerShopStats },
				{ key: 'otherPlayer', label: 'Other player shops', ...otherPlayerShopStats },
				{ key: 'player', label: 'All player shops', ...playerShopStats, isSubtotal: true },
				{ key: 'total', label: 'Total', ...allShopStats, isTotal: true }
			]
		}
	} catch (error) {
		console.error('Error fetching shop manager stats:', error)
		return {
			totalServers: 0,
			totalShops: 0,
			totalShopItems: 0,
			totalUsers: 0,
			activeUsersCount: 0,
			managedServersCount: 0,
			serversWithAdminShop: 0,
			managedServersWithoutAdminShop: 0,
			avgServersPerUser: '0.00',
			maxServersPerUser: 0,
			avgShopsPerUser: '0.00',
			maxShopsPerUser: 0,
			avgPlayerShopsPerServer: '0.00',
			maxPlayerShopsPerServer: 0,
			recentServers: 0,
			serversWithoutShops: 0,
			itemsAdded7d: 0,
			itemsUpdated7d: 0,
			itemsActive7d: 0,
			shopTypeStats: []
		}
	}
}

export async function getShopManagerMonthlyStats(year = 2026) {
	try {
		const collections = await fetchShopManagerCollections()
		const { servers, shops, shopItems } = filterShopManagerData(
			collections,
			SHOP_MANAGER_STATS_EXCLUDED_USER_IDS
		)
		const months = buildMonthlyRows(servers, shops, shopItems, year)
		const yearTotals = months.reduce(
			(totals, month) => ({
				newServers: totals.newServers + month.newServers,
				newManagedServers: totals.newManagedServers + month.newManagedServers,
				newShops: totals.newShops + month.newShops,
				newAdminShops: totals.newAdminShops + month.newAdminShops,
				newOwnPlayerShops: totals.newOwnPlayerShops + month.newOwnPlayerShops,
				newOtherPlayerShops: totals.newOtherPlayerShops + month.newOtherPlayerShops,
				itemsAdded: totals.itemsAdded + month.itemsAdded,
				itemsUpdated: totals.itemsUpdated + month.itemsUpdated
			}),
			{
				newServers: 0,
				newManagedServers: 0,
				newShops: 0,
				newAdminShops: 0,
				newOwnPlayerShops: 0,
				newOtherPlayerShops: 0,
				itemsAdded: 0,
				itemsUpdated: 0
			}
		)

		const latestCumulative = months[months.length - 1]

		return {
			year,
			excludedUserIds: [...SHOP_MANAGER_STATS_EXCLUDED_USER_IDS],
			months,
			yearTotals,
			endOfYearServers: latestCumulative?.cumulativeServers || 0,
			endOfYearShops: latestCumulative?.cumulativeShops || 0,
			endOfYearAdminShops: latestCumulative?.cumulativeAdminShops || 0
		}
	} catch (error) {
		console.error('Error fetching shop manager monthly stats:', error)
		return {
			year,
			excludedUserIds: [...SHOP_MANAGER_STATS_EXCLUDED_USER_IDS],
			months: [],
			yearTotals: {
				newServers: 0,
				newManagedServers: 0,
				newShops: 0,
				newAdminShops: 0,
				newOwnPlayerShops: 0,
				newOtherPlayerShops: 0,
				itemsAdded: 0,
				itemsUpdated: 0
			},
			endOfYearServers: 0,
			endOfYearShops: 0,
			endOfYearAdminShops: 0
		}
	}
}
