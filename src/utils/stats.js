import { useFirestore, useCollection } from 'vuefire'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { ref, computed } from 'vue'

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

		// Basic counts
		const totalServers = servers.length
		const totalShops = shops.length
		const totalShopItems = shopItems.length
		const totalUsers = users.length

		// Users with shop manager access
		const usersWithShopManagerAccess = users.filter(
			(user) => user.shopManager === true
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

		// Shops per user
		const shopsByUser = {}
		shops.forEach((shop) => {
			if (shop.owner_id) {
				shopsByUser[shop.owner_id] = (shopsByUser[shop.owner_id] || 0) + 1
			}
		})
		const avgShopsPerUser =
			activeUserIds.size > 0
				? (totalShops / activeUserIds.size).toFixed(2)
				: '0.00'
		const maxShopsPerUser = Math.max(...Object.values(shopsByUser), 0)

		// Shops per server
		const shopsByServer = {}
		shops.forEach((shop) => {
			if (shop.server_id) {
				shopsByServer[shop.server_id] = (shopsByServer[shop.server_id] || 0) + 1
			}
		})
		const avgShopsPerServer =
			totalServers > 0 ? (totalShops / totalServers).toFixed(2) : '0.00'
		const maxShopsPerServer = Math.max(...Object.values(shopsByServer), 0)

		// Shop items per shop
		const shopItemsByShop = {}
		shopItems.forEach((item) => {
			if (item.shop_id) {
				shopItemsByShop[item.shop_id] = (shopItemsByShop[item.shop_id] || 0) + 1
			}
		})
		const avgShopItemsPerShop =
			totalShops > 0 ? (totalShopItems / totalShops).toFixed(2) : '0.00'
		const maxShopItemsPerShop = Math.max(...Object.values(shopItemsByShop), 0)

		// Recent activity (last 7 days)
		const sevenDaysAgo = new Date()
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

		const recentServers = servers.filter((server) => {
			if (!server.created_at) return false
			let createdAt
			if (server.created_at.toDate) {
				createdAt = server.created_at.toDate()
			} else if (server.created_at instanceof Date) {
				createdAt = server.created_at
			} else {
				createdAt = new Date(server.created_at)
			}
			return createdAt >= sevenDaysAgo
		}).length

		const recentShops = shops.filter((shop) => {
			if (!shop.created_at) return false
			let createdAt
			if (shop.created_at.toDate) {
				createdAt = shop.created_at.toDate()
			} else if (shop.created_at instanceof Date) {
				createdAt = shop.created_at
			} else {
				createdAt = new Date(shop.created_at)
			}
			return createdAt >= sevenDaysAgo
		}).length

		const recentShopItems = shopItems.filter((item) => {
			if (!item.last_updated) return false
			let lastUpdated
			if (item.last_updated.toDate) {
				lastUpdated = item.last_updated.toDate()
			} else if (item.last_updated instanceof Date) {
				lastUpdated = item.last_updated
			} else {
				lastUpdated = new Date(item.last_updated)
			}
			return lastUpdated >= sevenDaysAgo
		}).length

		// Servers with no shops
		const serversWithShops = new Set(shops.map((s) => s.server_id).filter(Boolean))
		const serversWithoutShops = servers.filter(
			(s) => !serversWithShops.has(s.id)
		).length

		// Shops with no items
		const shopsWithItems = new Set(shopItems.map((i) => i.shop_id).filter(Boolean))
		const shopsWithoutItems = shops.filter((s) => !shopsWithItems.has(s.id)).length

		return {
			totalServers,
			totalShops,
			totalShopItems,
			totalUsers,
			usersWithShopManagerAccess,
			activeUsersCount,
			avgServersPerUser,
			maxServersPerUser,
			avgShopsPerUser,
			maxShopsPerUser,
			avgShopsPerServer,
			maxShopsPerServer,
			avgShopItemsPerShop,
			maxShopItemsPerShop,
			recentServers,
			recentShops,
			recentShopItems,
			serversWithoutShops,
			shopsWithoutItems
		}
	} catch (error) {
		console.error('Error fetching shop manager stats:', error)
		return {
			totalServers: 0,
			totalShops: 0,
			totalShopItems: 0,
			totalUsers: 0,
			usersWithShopManagerAccess: 0,
			activeUsersCount: 0,
			avgServersPerUser: '0.00',
			maxServersPerUser: 0,
			avgShopsPerUser: '0.00',
			maxShopsPerUser: 0,
			avgShopsPerServer: '0.00',
			maxShopsPerServer: 0,
			avgShopItemsPerShop: '0.00',
			maxShopItemsPerShop: 0,
			recentServers: 0,
			recentShops: 0,
			recentShopItems: 0,
			serversWithoutShops: 0,
			shopsWithoutItems: 0
		}
	}
}
