import { useFirestore, useDocument, useCollection } from 'vuefire'
import {
	doc,
	setDoc,
	getDoc,
	getFirestore,
	collection,
	addDoc,
	updateDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	writeBatch,
	arrayUnion,
	arrayRemove
} from 'firebase/firestore'
import { ref, computed, unref } from 'vue'

// Check if shop item exists
export async function shopItemExists(itemId) {
	if (!itemId) return false

	try {
		const db = getFirestore()
		const docRef = doc(db, 'shop_items', itemId)
		const docSnap = await getDoc(docRef)
		return docSnap.exists()
	} catch (error) {
		console.error('Error checking shop item existence:', error)
		return false
	}
}

// Add shop item
export async function addShopItem(shopId, itemId, itemData) {
	// Validation
	if (!shopId) throw new Error('Shop ID is required')
	if (!itemId) throw new Error('Item ID is required')
	if (!itemData.buy_price && !itemData.sell_price) {
		throw new Error('At least one price (buy or sell) is required')
	}

	// Validate price values
	if (itemData.buy_price !== null && itemData.buy_price !== undefined) {
		if (isNaN(itemData.buy_price) || itemData.buy_price < 0) {
			throw new Error('Buy price must be a valid positive number')
		}
	}
	if (itemData.sell_price !== null && itemData.sell_price !== undefined) {
		if (isNaN(itemData.sell_price) || itemData.sell_price < 0) {
			throw new Error('Sell price must be a valid positive number')
		}
	}

	try {
		const db = getFirestore()
		const shopItem = {
			shop_id: shopId,
			item_id: itemId,
			buy_price: itemData.buy_price ?? null,
			sell_price: itemData.sell_price ?? null,
			previous_buy_price: null,
			previous_sell_price: null,
			previous_price_date: null,
			stock_quantity: itemData.stock_quantity ?? null,
			stock_full: itemData.stock_full || false,
			notes: itemData.notes?.trim() || '',
			last_updated: new Date().toISOString()
		}

		const docRef = await addDoc(collection(db, 'shop_items'), shopItem)
		return { id: docRef.id, ...shopItem }
	} catch (error) {
		console.error('Error adding shop item:', error)
		throw error
	}
}

// Update shop item with price history logic
export async function updateShopItem(itemId, updates) {
	// Validation
	if (!itemId) throw new Error('Item ID is required')

	// Validate price values if provided
	if (updates.buy_price !== null && updates.buy_price !== undefined) {
		if (isNaN(updates.buy_price) || updates.buy_price < 0) {
			throw new Error('Buy price must be a valid positive number')
		}
	}
	if (updates.sell_price !== null && updates.sell_price !== undefined) {
		if (isNaN(updates.sell_price) || updates.sell_price < 0) {
			throw new Error('Sell price must be a valid positive number')
		}
	}

	try {
		const db = getFirestore()
		const docRef = doc(db, 'shop_items', itemId)

		// Get current document for price history
		const docSnap = await getDoc(docRef)
		if (!docSnap.exists()) {
			throw new Error('Shop item not found')
		}

		const currentData = docSnap.data()
		const updatedData = { ...updates }

		// Implement price history logic - only save if prices actually changed
		if (updates.buy_price !== undefined || updates.sell_price !== undefined) {
			let pricesChanged = false

			// Check if buy price changed
			if (updates.buy_price !== undefined && updates.buy_price !== currentData.buy_price) {
				pricesChanged = true
			}

			// Check if sell price changed
			if (updates.sell_price !== undefined && updates.sell_price !== currentData.sell_price) {
				pricesChanged = true
			}

			// Only save price history if at least one price actually changed
			if (
				pricesChanged &&
				(currentData.buy_price !== null || currentData.sell_price !== null)
			) {
				updatedData.previous_buy_price = currentData.buy_price
				updatedData.previous_sell_price = currentData.sell_price
				updatedData.previous_price_date = currentData.last_updated
			}
		}

		// Clean up string fields - always include notes field, even if empty
		if (updatedData.notes !== undefined) {
			updatedData.notes = String(updatedData.notes || '').trim()
		}

		// Always update the last_updated timestamp
		updatedData.last_updated = new Date().toISOString()

		await updateDoc(docRef, updatedData)
		return updatedData
	} catch (error) {
		console.error('Error updating shop item:', error)
		throw error
	}
}

// Delete shop item
export async function deleteShopItem(itemId) {
	if (!itemId) throw new Error('Item ID is required')

	try {
		const db = getFirestore()
		const docRef = doc(db, 'shop_items', itemId)
		await deleteDoc(docRef)
		return true
	} catch (error) {
		console.error('Error deleting shop item:', error)
		throw error
	}
}

// Get shop items
export async function getShopItems(shopId) {
	if (!shopId) throw new Error('Shop ID is required')

	try {
		const db = getFirestore()
		const q = query(
			collection(db, 'shop_items'),
			where('shop_id', '==', shopId),
			orderBy('last_updated', 'desc')
		)

		// Note: This returns a query object, not the actual data
		// Use with useCollection in Vue components
		return q
	} catch (error) {
		console.error('Error getting shop items:', error)
		throw error
	}
}

// Get item across shops (for price comparison)
export async function getItemAcrossShops(itemId) {
	if (!itemId) throw new Error('Item ID is required')

	try {
		const db = getFirestore()
		const q = query(
			collection(db, 'shop_items'),
			where('item_id', '==', itemId),
			orderBy('last_updated', 'desc')
		)

		// Note: This returns a query object, not the actual data
		// Use with useCollection in Vue components
		return q
	} catch (error) {
		console.error('Error getting item across shops:', error)
		throw error
	}
}

// Bulk update shop items
export async function bulkUpdateShopItems(shopId, itemsArray) {
	if (!shopId) throw new Error('Shop ID is required')
	if (!Array.isArray(itemsArray) || itemsArray.length === 0) {
		throw new Error('Items array is required and cannot be empty')
	}

	try {
		const db = getFirestore()
		const batch = writeBatch(db)
		const results = []

		for (const itemData of itemsArray) {
			// Validation for each item
			if (!itemData.item_id) {
				throw new Error('Item ID is required for each item')
			}
			if (!itemData.buy_price && !itemData.sell_price) {
				throw new Error('At least one price (buy or sell) is required for each item')
			}

			// Validate price values
			if (itemData.buy_price !== null && itemData.buy_price !== undefined) {
				if (isNaN(itemData.buy_price) || itemData.buy_price < 0) {
					throw new Error(
						`Buy price must be a valid positive number for item ${itemData.item_id}`
					)
				}
			}
			if (itemData.sell_price !== null && itemData.sell_price !== undefined) {
				if (isNaN(itemData.sell_price) || itemData.sell_price < 0) {
					throw new Error(
						`Sell price must be a valid positive number for item ${itemData.item_id}`
					)
				}
			}

			if (itemData.id) {
				// Update existing item
				const docRef = doc(db, 'shop_items', itemData.id)

				// Get current document for price history
				const docSnap = await getDoc(docRef)
				if (docSnap.exists()) {
					const currentData = docSnap.data()
					const updatedData = { ...itemData }

					// Implement price history logic - only save if prices actually changed
					if (itemData.buy_price !== undefined || itemData.sell_price !== undefined) {
						let pricesChanged = false

						// Check if buy price changed
						if (
							itemData.buy_price !== undefined &&
							itemData.buy_price !== currentData.buy_price
						) {
							pricesChanged = true
						}

						// Check if sell price changed
						if (
							itemData.sell_price !== undefined &&
							itemData.sell_price !== currentData.sell_price
						) {
							pricesChanged = true
						}

						// Only save price history if at least one price actually changed
						if (
							pricesChanged &&
							(currentData.buy_price !== null || currentData.sell_price !== null)
						) {
							updatedData.previous_buy_price = currentData.buy_price
							updatedData.previous_sell_price = currentData.sell_price
							updatedData.previous_price_date = currentData.last_updated
						}
					}

					// Clean up string fields
					if (updatedData.notes) updatedData.notes = updatedData.notes.trim()

					// Always update the last_updated timestamp
					updatedData.last_updated = new Date().toISOString()

					batch.update(docRef, updatedData)
					results.push({ id: itemData.id, ...updatedData })
				}
			} else {
				// Create new item
				const newDocRef = doc(collection(db, 'shop_items'))
				const shopItem = {
					shop_id: shopId,
					item_id: itemData.item_id,
					buy_price: itemData.buy_price ?? null,
					sell_price: itemData.sell_price ?? null,
					previous_buy_price: null,
					previous_sell_price: null,
					previous_price_date: null,
					stock_quantity: itemData.stock_quantity ?? null,
					stock_full: itemData.stock_full || false,
					notes: itemData.notes?.trim() || '',
					last_updated: new Date().toISOString()
				}

				batch.set(newDocRef, shopItem)
				results.push({ id: newDocRef.id, ...shopItem })
			}
		}

		await batch.commit()
		return results
	} catch (error) {
		console.error('Error bulk updating shop items:', error)
		throw error
	}
}

// Get specific shop item by shop and item ID
export async function getSpecificShopItem(shopId, itemId) {
	if (!shopId) throw new Error('Shop ID is required')
	if (!itemId) throw new Error('Item ID is required')

	try {
		const db = getFirestore()
		const q = query(
			collection(db, 'shop_items'),
			where('shop_id', '==', shopId),
			where('item_id', '==', itemId)
		)

		// Note: This returns a query object, not the actual data
		// Use with useCollection in Vue components
		return q
	} catch (error) {
		console.error('Error getting specific shop item:', error)
		throw error
	}
}

// Composable to use shop items
export function useShopItems(shopId) {
	const db = useFirestore()

	// Create a computed query that updates when shopId changes
	const itemsQuery = computed(() => {
		const sid = unref(shopId) // Unwrap the ref/computed to get the actual value

		if (!sid) {
			return null
		}

		return query(
			collection(db, 'shop_items'),
			where('shop_id', '==', sid),
			orderBy('last_updated', 'desc')
		)
	})

	// Use VueFire's useCollection but transform the data to ensure IDs
	const rawItems = useCollection(itemsQuery)

	const items = computed(() => {
		if (!rawItems.value) return []

		console.log('useShopItems: Raw items from VueFire:', rawItems.value)
		console.log(
			'useShopItems: First item keys:',
			rawItems.value[0] ? Object.keys(rawItems.value[0]) : 'No items'
		)

		// Transform items to ensure they have proper document IDs
		const itemsWithIds = rawItems.value.map((item, index) => {
			let docId = item.id

			// Log the item structure for debugging
			console.log(`useShopItems: Item ${index}:`, {
				hasId: !!item.id,
				itemId: item.id,
				keys: Object.keys(item),
				item: item
			})

			// If no ID, this is a problem with VueFire setup
			if (!docId) {
				console.error('useShopItems: VueFire item missing ID:', item)
				docId = `missing-${index}-${Date.now()}`
			}

			return {
				...item,
				id: docId
			}
		})

		console.log('useShopItems: Final processed items:', itemsWithIds)
		return itemsWithIds
	})

	return { items }
}

// Composable to use item across shops (for price comparison)
export function useItemAcrossShops(itemId) {
	const db = useFirestore()

	// Create a computed query that updates when itemId changes
	const itemsQuery = computed(() => {
		const iid = unref(itemId) // Unwrap the ref/computed to get the actual value

		if (!iid) {
			return null
		}

		return query(
			collection(db, 'shop_items'),
			where('item_id', '==', iid),
			orderBy('last_updated', 'desc')
		)
	})

	// Use the computed query with useCollection
	const items = useCollection(itemsQuery)

	return { items }
}

// Composable to use single shop item
export function useShopItem(itemId) {
	const db = useFirestore()

	// Return null if no itemId
	if (!itemId) {
		return { item: ref(null) }
	}

	// Create document reference
	const docRef = doc(db, 'shop_items', itemId)
	const item = useDocument(docRef)

	return { item }
}

// Composable to use shop items from all shops on a server
export function useServerShopItems(serverId, shopIds) {
	const db = useFirestore()

	// Create a computed query that updates when serverId or shopIds changes
	const itemsQuery = computed(() => {
		const sid = unref(serverId) // Unwrap the ref/computed to get the actual value
		const sids = unref(shopIds) // Unwrap the ref/computed to get the actual value

		if (!sid || !sids || sids.length === 0) {
			return null
		}

		return query(
			collection(db, 'shop_items'),
			where('shop_id', 'in', sids),
			orderBy('last_updated', 'desc')
		)
	})

	// Use the computed query with useCollection
	const items = useCollection(itemsQuery)

	return { items }
}

// Composable for price comparison across multiple items
export function usePriceComparison(itemIds) {
	const db = useFirestore()

	// Create a computed query that updates when itemIds changes
	const itemsQuery = computed(() => {
		const ids = unref(itemIds) // Unwrap the ref/computed to get the actual value

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return null
		}

		return query(
			collection(db, 'shop_items'),
			where('item_id', 'in', ids),
			orderBy('last_updated', 'desc')
		)
	})

	// Use the computed query with useCollection
	const items = useCollection(itemsQuery)

	// Computed to organize items by item_id
	const itemsByType = computed(() => {
		if (!items.value) return {}

		const organized = {}
		items.value.forEach((item) => {
			if (!organized[item.item_id]) {
				organized[item.item_id] = []
			}
			organized[item.item_id].push(item)
		})

		return organized
	})

	return { items, itemsByType }
}

// Get shop item by ID (for non-reactive use)
export async function getShopItemById(itemId) {
	if (!itemId) throw new Error('Item ID is required')

	try {
		const db = getFirestore()
		const docRef = doc(db, 'shop_items', itemId)
		const docSnap = await getDoc(docRef)

		if (docSnap.exists()) {
			return { id: docSnap.id, ...docSnap.data() }
		} else {
			return null
		}
	} catch (error) {
		console.error('Error getting shop item by ID:', error)
		throw error
	}
}

// Helper function to calculate price trends
export function calculatePriceTrend(currentPrice, previousPrice) {
	if (!currentPrice || !previousPrice) return null

	const diff = currentPrice - previousPrice
	const percentChange = ((diff / previousPrice) * 100).toFixed(1)

	return {
		direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
		difference: diff,
		percentChange: parseFloat(percentChange)
	}
}

// Helper function to find best prices for an item across shops
export function findBestPrices(shopItems) {
	if (!shopItems || shopItems.length === 0) return null

	const buyPrices = shopItems.filter(
		(item) => item.buy_price !== null && item.buy_price !== undefined
	)
	const sellPrices = shopItems.filter(
		(item) => item.sell_price !== null && item.sell_price !== undefined
	)

	const bestBuyPrice =
		buyPrices.length > 0
			? buyPrices.reduce((min, current) =>
					current.buy_price < min.buy_price ? current : min
			  )
			: null

	const bestSellPrice =
		sellPrices.length > 0
			? sellPrices.reduce((max, current) =>
					current.sell_price > max.sell_price ? current : max
			  )
			: null

	return {
		bestBuy: bestBuyPrice,
		bestSell: bestSellPrice,
		totalShops: shopItems.length,
		shopsWithBuyPrices: buyPrices.length,
		shopsWithSellPrices: sellPrices.length
	}
}
