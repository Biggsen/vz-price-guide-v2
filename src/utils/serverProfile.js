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
	limit,
	getDocs,
	writeBatch
} from 'firebase/firestore'
import { ref, computed, unref } from 'vue'

// Check if server exists
export async function serverExists(serverId) {
	if (!serverId) return false

	try {
		const db = getFirestore()
		const docRef = doc(db, 'servers', serverId)
		const docSnap = await getDoc(docRef)
		return docSnap.exists()
	} catch (error) {
		console.error('Error checking server existence:', error)
		return false
	}
}

// Create server
export async function createServer(userId, serverData) {
	if (!userId) throw new Error('User ID is required')
	if (!serverData.name) throw new Error('Server name is required')
	if (!serverData.minecraft_version) throw new Error('Minecraft version is required')

	try {
		const db = getFirestore()
		const server = {
			name: serverData.name,
			minecraft_version: serverData.minecraft_version,
			owner_id: userId,
			description: serverData.description || '',
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			...serverData
		}

		const docRef = await addDoc(collection(db, 'servers'), server)
		return { id: docRef.id, ...server }
	} catch (error) {
		console.error('Error creating server:', error)
		throw error
	}
}

// Update server
export async function updateServer(serverId, updates) {
	if (!serverId) throw new Error('Server ID is required')

	try {
		const db = getFirestore()
		const updatedData = {
			...updates,
			updated_at: new Date().toISOString()
		}

		const docRef = doc(db, 'servers', serverId)
		await updateDoc(docRef, updatedData)
		return updatedData
	} catch (error) {
		console.error('Error updating server:', error)
		throw error
	}
}

// Delete server
export async function deleteServer(serverId) {
	if (!serverId) throw new Error('Server ID is required')

	try {
		const db = getFirestore()
		const shopsQuery = query(
			collection(db, 'shops'),
			where('server_id', '==', serverId),
			limit(50)
		)

		let snapshot
		do {
			snapshot = await getDocs(shopsQuery)
			if (!snapshot.empty) {
				const batch = writeBatch(db)
				snapshot.forEach((shopDoc) => {
					batch.delete(shopDoc.ref)
				})
				await batch.commit()
			}
		} while (!snapshot.empty)

		const docRef = doc(db, 'servers', serverId)
		await deleteDoc(docRef)
		return true
	} catch (error) {
		console.error('Error deleting server:', error)
		throw error
	}
}

// Get user's servers
export async function getUserServers(userId) {
	if (!userId) throw new Error('User ID is required')

	try {
		const db = getFirestore()
		const q = query(
			collection(db, 'servers'),
			where('owner_id', '==', userId),
			orderBy('created_at', 'desc')
		)

		// Note: This returns a query object, not the actual data
		// Use with useCollection in Vue components
		return q
	} catch (error) {
		console.error('Error getting user servers:', error)
		throw error
	}
}

// Composable to use user's servers
export function useServers(userId) {
	const db = useFirestore()

	// Create a computed query that updates when userId changes
	const serversQuery = computed(() => {
		const uid = unref(userId) // Unwrap the ref/computed to get the actual value

		if (!uid) {
			return null
		}

		return query(
			collection(db, 'servers'),
			where('owner_id', '==', uid),
			orderBy('created_at', 'desc')
		)
	})

	// Use the computed query with useCollection
	const servers = useCollection(serversQuery)

	return { servers }
}

// Composable to use single server
export function useServer(serverId) {
	const db = useFirestore()

	// Return null if no serverId
	if (!serverId) {
		return { server: ref(null) }
	}

	// Create document reference
	const docRef = doc(db, 'servers', serverId)
	const server = useDocument(docRef)

	return { server }
}

// Get server by ID (for non-reactive use)
export async function getServerById(serverId) {
	if (!serverId) throw new Error('Server ID is required')

	try {
		const db = getFirestore()
		const docRef = doc(db, 'servers', serverId)
		const docSnap = await getDoc(docRef)

		if (docSnap.exists()) {
			return { id: docSnap.id, ...docSnap.data() }
		} else {
			return null
		}
	} catch (error) {
		console.error('Error getting server by ID:', error)
		throw error
	}
}

// Get available Minecraft versions
export function getMinecraftVersions() {
	return [
		{ value: '1.16', label: 'Minecraft 1.16' },
		{ value: '1.17', label: 'Minecraft 1.17' },
		{ value: '1.18', label: 'Minecraft 1.18' },
		{ value: '1.19', label: 'Minecraft 1.19' },
		{ value: '1.20', label: 'Minecraft 1.20' },
		{ value: '1.21', label: 'Minecraft 1.21' }
	]
}
