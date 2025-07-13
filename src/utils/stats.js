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
