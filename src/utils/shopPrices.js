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

// Check if shop price exists
export async function shopPriceExists(priceId) {
	if (!priceId) return false

	try {
		const db = getFirestore()
		const docRef = doc(db, 'shop_prices', priceId)
		const docSnap = await getDoc(docRef)
		return docSnap.exists()
	} catch (error) {
		console.error('Error checking shop price existence:', error)
		return false
	}
}

// Add shop price
export async function addShopPrice(shopId, itemId, priceData) {
	// Validation
	if (!shopId) throw new Error('Shop ID is required')
	if (!itemId) throw new Error('Item ID is required')
	if (!priceData.buy_price && !priceData.sell_price) {
		throw new Error('At least one price (buy or sell) is required')
	}

	// Validate price values
	if (priceData.buy_price !== null && priceData.buy_price !== undefined) {
		if (isNaN(priceData.buy_price) || priceData.buy_price < 0) {
			throw new Error('Buy price must be a valid positive number')
		}
	}
	if (priceData.sell_price !== null && priceData.sell_price !== undefined) {
		if (isNaN(priceData.sell_price) || priceData.sell_price < 0) {
			throw new Error('Sell price must be a valid positive number')
		}
	}

	try {
		const db = getFirestore()
		const shopPrice = {
			shop_id: shopId,
			item_id: itemId,
			buy_price: priceData.buy_price || null,
			sell_price: priceData.sell_price || null,
			previous_buy_price: null,
			previous_sell_price: null,
			previous_price_date: null,
			stock_quantity: priceData.stock_quantity || null,
			stock_full: priceData.stock_full || false,
			notes: priceData.notes?.trim() || '',
			last_updated: new Date().toISOString()
		}

		const docRef = await addDoc(collection(db, 'shop_prices'), shopPrice)
		return { id: docRef.id, ...shopPrice }
	} catch (error) {
		console.error('Error adding shop price:', error)
		throw error
	}
}

// Update shop price with price history logic
export async function updateShopPrice(priceId, updates) {
	// Validation
	if (!priceId) throw new Error('Price ID is required')

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
		const docRef = doc(db, 'shop_prices', priceId)

		// Get current document for price history
		const docSnap = await getDoc(docRef)
		if (!docSnap.exists()) {
			throw new Error('Shop price not found')
		}

		const currentData = docSnap.data()
		const updatedData = { ...updates }

		// Implement price history logic
		if (updates.buy_price !== undefined || updates.sell_price !== undefined) {
			// Save current prices as previous before updating
			if (currentData.buy_price !== null || currentData.sell_price !== null) {
				updatedData.previous_buy_price = currentData.buy_price
				updatedData.previous_sell_price = currentData.sell_price
				updatedData.previous_price_date = currentData.last_updated
			}
		}

		// Clean up string fields
		if (updatedData.notes) updatedData.notes = updatedData.notes.trim()

		// Always update the last_updated timestamp
		updatedData.last_updated = new Date().toISOString()

		await updateDoc(docRef, updatedData)
		return updatedData
	} catch (error) {
		console.error('Error updating shop price:', error)
		throw error
	}
}

// Delete shop price
export async function deleteShopPrice(priceId) {
	if (!priceId) throw new Error('Price ID is required')

	try {
		const db = getFirestore()
		const docRef = doc(db, 'shop_prices', priceId)
		await deleteDoc(docRef)
		return true
	} catch (error) {
		console.error('Error deleting shop price:', error)
		throw error
	}
}

// Get shop prices
export async function getShopPrices(shopId) {
	if (!shopId) throw new Error('Shop ID is required')

	try {
		const db = getFirestore()
		const q = query(
			collection(db, 'shop_prices'),
			where('shop_id', '==', shopId),
			orderBy('last_updated', 'desc')
		)

		// Note: This returns a query object, not the actual data
		// Use with useCollection in Vue components
		return q
	} catch (error) {
		console.error('Error getting shop prices:', error)
		throw error
	}
}

// Get item prices across shops
export async function getItemPrices(itemId) {
	if (!itemId) throw new Error('Item ID is required')

	try {
		const db = getFirestore()
		const q = query(
			collection(db, 'shop_prices'),
			where('item_id', '==', itemId),
			orderBy('last_updated', 'desc')
		)

		// Note: This returns a query object, not the actual data
		// Use with useCollection in Vue components
		return q
	} catch (error) {
		console.error('Error getting item prices:', error)
		throw error
	}
}

// Bulk update prices for a shop
export async function bulkUpdatePrices(shopId, pricesArray) {
	if (!shopId) throw new Error('Shop ID is required')
	if (!Array.isArray(pricesArray) || pricesArray.length === 0) {
		throw new Error('Prices array is required and cannot be empty')
	}

	try {
		const db = getFirestore()
		const batch = writeBatch(db)
		const results = []

		for (const priceData of pricesArray) {
			// Validation for each price
			if (!priceData.item_id) {
				throw new Error('Item ID is required for each price')
			}
			if (!priceData.buy_price && !priceData.sell_price) {
				throw new Error('At least one price (buy or sell) is required for each item')
			}

			// Validate price values
			if (priceData.buy_price !== null && priceData.buy_price !== undefined) {
				if (isNaN(priceData.buy_price) || priceData.buy_price < 0) {
					throw new Error(
						`Buy price must be a valid positive number for item ${priceData.item_id}`
					)
				}
			}
			if (priceData.sell_price !== null && priceData.sell_price !== undefined) {
				if (isNaN(priceData.sell_price) || priceData.sell_price < 0) {
					throw new Error(
						`Sell price must be a valid positive number for item ${priceData.item_id}`
					)
				}
			}

			if (priceData.id) {
				// Update existing price
				const docRef = doc(db, 'shop_prices', priceData.id)

				// Get current document for price history
				const docSnap = await getDoc(docRef)
				if (docSnap.exists()) {
					const currentData = docSnap.data()
					const updatedData = { ...priceData }

					// Implement price history logic
					if (priceData.buy_price !== undefined || priceData.sell_price !== undefined) {
						// Save current prices as previous before updating
						if (currentData.buy_price !== null || currentData.sell_price !== null) {
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
					results.push({ id: priceData.id, ...updatedData })
				}
			} else {
				// Create new price
				const newDocRef = doc(collection(db, 'shop_prices'))
				const shopPrice = {
					shop_id: shopId,
					item_id: priceData.item_id,
					buy_price: priceData.buy_price || null,
					sell_price: priceData.sell_price || null,
					previous_buy_price: null,
					previous_sell_price: null,
					previous_price_date: null,
					stock_quantity: priceData.stock_quantity || null,
					stock_full: priceData.stock_full || false,
					notes: priceData.notes?.trim() || '',
					last_updated: new Date().toISOString()
				}

				batch.set(newDocRef, shopPrice)
				results.push({ id: newDocRef.id, ...shopPrice })
			}
		}

		await batch.commit()
		return results
	} catch (error) {
		console.error('Error bulk updating prices:', error)
		throw error
	}
}

// Get shop price by shop and item
export async function getShopItemPrice(shopId, itemId) {
	if (!shopId) throw new Error('Shop ID is required')
	if (!itemId) throw new Error('Item ID is required')

	try {
		const db = getFirestore()
		const q = query(
			collection(db, 'shop_prices'),
			where('shop_id', '==', shopId),
			where('item_id', '==', itemId)
		)

		// Note: This returns a query object, not the actual data
		// Use with useCollection in Vue components
		return q
	} catch (error) {
		console.error('Error getting shop item price:', error)
		throw error
	}
}

// Composable to use shop prices
export function useShopPrices(shopId) {
	const db = useFirestore()

	// Create a computed query that updates when shopId changes
	const pricesQuery = computed(() => {
		const sid = unref(shopId) // Unwrap the ref/computed to get the actual value

		if (!sid) {
			return null
		}

		return query(
			collection(db, 'shop_prices'),
			where('shop_id', '==', sid),
			orderBy('last_updated', 'desc')
		)
	})

	// Use the computed query with useCollection
	const prices = useCollection(pricesQuery)

	return { prices }
}

// Composable to use item prices across shops
export function useItemPrices(itemId) {
	const db = useFirestore()

	// Create a computed query that updates when itemId changes
	const pricesQuery = computed(() => {
		const iid = unref(itemId) // Unwrap the ref/computed to get the actual value

		if (!iid) {
			return null
		}

		return query(
			collection(db, 'shop_prices'),
			where('item_id', '==', iid),
			orderBy('last_updated', 'desc')
		)
	})

	// Use the computed query with useCollection
	const prices = useCollection(pricesQuery)

	return { prices }
}

// Composable to use single shop price
export function useShopPrice(priceId) {
	const db = useFirestore()

	// Return null if no priceId
	if (!priceId) {
		return { price: ref(null) }
	}

	// Create document reference
	const docRef = doc(db, 'shop_prices', priceId)
	const price = useDocument(docRef)

	return { price }
}

// Composable for price comparison across multiple items
export function usePriceComparison(itemIds) {
	const db = useFirestore()

	// Create a computed query that updates when itemIds changes
	const pricesQuery = computed(() => {
		const ids = unref(itemIds) // Unwrap the ref/computed to get the actual value

		if (!ids || !Array.isArray(ids) || ids.length === 0) {
			return null
		}

		return query(
			collection(db, 'shop_prices'),
			where('item_id', 'in', ids),
			orderBy('last_updated', 'desc')
		)
	})

	// Use the computed query with useCollection
	const prices = useCollection(pricesQuery)

	// Computed to organize prices by item
	const pricesByItem = computed(() => {
		if (!prices.value) return {}

		const organized = {}
		prices.value.forEach((price) => {
			if (!organized[price.item_id]) {
				organized[price.item_id] = []
			}
			organized[price.item_id].push(price)
		})

		return organized
	})

	return { prices, pricesByItem }
}

// Get shop price by ID (for non-reactive use)
export async function getShopPriceById(priceId) {
	if (!priceId) throw new Error('Price ID is required')

	try {
		const db = getFirestore()
		const docRef = doc(db, 'shop_prices', priceId)
		const docSnap = await getDoc(docRef)

		if (docSnap.exists()) {
			return { id: docSnap.id, ...docSnap.data() }
		} else {
			return null
		}
	} catch (error) {
		console.error('Error getting shop price by ID:', error)
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

// Helper function to find best prices for an item
export function findBestPrices(itemPrices) {
	if (!itemPrices || itemPrices.length === 0) return null

	const buyPrices = itemPrices.filter((p) => p.buy_price !== null && p.buy_price !== undefined)
	const sellPrices = itemPrices.filter((p) => p.sell_price !== null && p.sell_price !== undefined)

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
		totalShops: itemPrices.length,
		shopsWithBuyPrices: buyPrices.length,
		shopsWithSellPrices: sellPrices.length
	}
}
