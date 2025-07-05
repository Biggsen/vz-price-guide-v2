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
	orderBy
} from 'firebase/firestore'
import { ref, computed, unref } from 'vue'

// Check if shop exists
export async function shopExists(shopId) {
	if (!shopId) return false

	try {
		const db = getFirestore()
		const docRef = doc(db, 'shops', shopId)
		const docSnap = await getDoc(docRef)
		return docSnap.exists()
	} catch (error) {
		console.error('Error checking shop existence:', error)
		return false
	}
}

// Create shop
export async function createShop(userId, shopData) {
	// Validation
	if (!userId) throw new Error('User ID is required')
	if (!shopData.name?.trim()) throw new Error('Shop name is required')
	if (!shopData.server_id?.trim()) throw new Error('Server ID is required')
	if (typeof shopData.is_own_shop !== 'boolean') {
		shopData.is_own_shop = false // Default to competitor
	}

	// Validate owner_funds if provided
	if (shopData.owner_funds !== null && shopData.owner_funds !== undefined) {
		if (isNaN(shopData.owner_funds) || shopData.owner_funds < 0) {
			throw new Error('Owner funds must be a valid positive number')
		}
	}

	try {
		const db = getFirestore()
		const shop = {
			name: shopData.name.trim(),
			server_id: shopData.server_id,
			owner_id: userId,
			is_own_shop: shopData.is_own_shop,
			location: shopData.location?.trim() || '',
			description: shopData.description?.trim() || '',
			owner_funds: shopData.owner_funds || null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		}

		const docRef = await addDoc(collection(db, 'shops'), shop)
		return { id: docRef.id, ...shop }
	} catch (error) {
		console.error('Error creating shop:', error)
		throw error
	}
}

// Update shop
export async function updateShop(shopId, updates) {
	// Validation
	if (!shopId) throw new Error('Shop ID is required')
	if (updates.name !== undefined && !updates.name?.trim()) {
		throw new Error('Shop name cannot be empty')
	}

	// Validate owner_funds if provided
	if (updates.owner_funds !== null && updates.owner_funds !== undefined) {
		if (isNaN(updates.owner_funds) || updates.owner_funds < 0) {
			throw new Error('Owner funds must be a valid positive number')
		}
	}

	try {
		const db = getFirestore()
		const updatedData = {
			...updates,
			updated_at: new Date().toISOString()
		}

		// Clean up string fields
		if (updatedData.name) updatedData.name = updatedData.name.trim()
		if (updatedData.location) updatedData.location = updatedData.location.trim()
		if (updatedData.description) updatedData.description = updatedData.description.trim()

		const docRef = doc(db, 'shops', shopId)
		await updateDoc(docRef, updatedData)
		return updatedData
	} catch (error) {
		console.error('Error updating shop:', error)
		throw error
	}
}

// Delete shop
export async function deleteShop(shopId) {
	if (!shopId) throw new Error('Shop ID is required')

	try {
		const db = getFirestore()
		const docRef = doc(db, 'shops', shopId)
		await deleteDoc(docRef)
		return true
	} catch (error) {
		console.error('Error deleting shop:', error)
		throw error
	}
}

// Get user's shops
export async function getUserShops(userId) {
	if (!userId) throw new Error('User ID is required')

	try {
		const db = getFirestore()
		const q = query(
			collection(db, 'shops'),
			where('owner_id', '==', userId),
			orderBy('created_at', 'desc')
		)

		// Note: This returns a query object, not the actual data
		// Use with useCollection in Vue components
		return q
	} catch (error) {
		console.error('Error getting user shops:', error)
		throw error
	}
}

// Get server's shops
export async function getServerShops(serverId) {
	if (!serverId) throw new Error('Server ID is required')

	try {
		const db = getFirestore()
		const q = query(
			collection(db, 'shops'),
			where('server_id', '==', serverId),
			orderBy('created_at', 'desc')
		)

		// Note: This returns a query object, not the actual data
		// Use with useCollection in Vue components
		return q
	} catch (error) {
		console.error('Error getting server shops:', error)
		throw error
	}
}

// Composable to use user's shops
export function useShops(userId) {
	const db = useFirestore()

	// Create a computed query that updates when userId changes
	const shopsQuery = computed(() => {
		const uid = unref(userId) // Unwrap the ref/computed to get the actual value

		if (!uid) {
			return null
		}

		return query(
			collection(db, 'shops'),
			where('owner_id', '==', uid),
			orderBy('created_at', 'desc')
		)
	})

	// Use the computed query with useCollection
	const shops = useCollection(shopsQuery)

	return { shops }
}

// Composable to use server's shops
export function useServerShops(serverId) {
	const db = useFirestore()

	// Create a computed query that updates when serverId changes
	const shopsQuery = computed(() => {
		const sid = unref(serverId) // Unwrap the ref/computed to get the actual value

		if (!sid) {
			return null
		}

		return query(
			collection(db, 'shops'),
			where('server_id', '==', sid),
			orderBy('created_at', 'desc')
		)
	})

	// Use the computed query with useCollection
	const shops = useCollection(shopsQuery)

	return { shops }
}

// Composable to use single shop
export function useShop(shopId) {
	const db = useFirestore()

	// Return null if no shopId
	if (!shopId) {
		return { shop: ref(null) }
	}

	// Create document reference
	const docRef = doc(db, 'shops', shopId)
	const shop = useDocument(docRef)

	return { shop }
}

// Get shop by ID (for non-reactive use)
export async function getShopById(shopId) {
	if (!shopId) throw new Error('Shop ID is required')

	try {
		const db = getFirestore()
		const docRef = doc(db, 'shops', shopId)
		const docSnap = await getDoc(docRef)

		if (docSnap.exists()) {
			return { id: docSnap.id, ...docSnap.data() }
		} else {
			return null
		}
	} catch (error) {
		console.error('Error getting shop by ID:', error)
		throw error
	}
}
