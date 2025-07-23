import { useFirestore, useDocument } from 'vuefire'
import {
	doc,
	setDoc,
	getDoc,
	getFirestore,
	collection,
	query,
	where,
	getDocs
} from 'firebase/firestore'
import { ref } from 'vue'

// Generate Minecraft avatar URL
export function generateMinecraftAvatar(username) {
	return `https://mc-heads.net/avatar/${username}/64`
}

// Check if user profile exists
export async function userProfileExists(userId) {
	if (!userId) return false

	try {
		const db = getFirestore()
		const docRef = doc(db, 'users', userId)
		const docSnap = await getDoc(docRef)
		return docSnap.exists()
	} catch (error) {
		console.error('Error checking user profile:', error)
		return false
	}
}

/**
 * Create user profile in Firestore. Supports optional fields like bio.
 * @param {string} userId
 * @param {Object} profileData - Should include minecraft_username, display_name, and optionally bio
 */
export async function createUserProfile(userId, profileData) {
	if (!userId) throw new Error('User ID is required')

	try {
		const db = getFirestore()
		const userProfile = {
			minecraft_username: profileData.minecraft_username,
			minecraft_avatar_url: generateMinecraftAvatar(profileData.minecraft_username),
			display_name: profileData.display_name || profileData.minecraft_username,
			created_at: new Date().toISOString(),
			...profileData
		}

		await setDoc(doc(db, 'users', userId), userProfile)
		return userProfile
	} catch (error) {
		console.error('Error creating user profile:', error)
		throw error
	}
}

// Update user profile
export async function updateUserProfile(userId, updates) {
	if (!userId) throw new Error('User ID is required')

	try {
		const db = getFirestore()
		const updatedData = { ...updates }

		// Auto-update avatar if minecraft_username changed
		if (updates.minecraft_username) {
			updatedData.minecraft_avatar_url = generateMinecraftAvatar(updates.minecraft_username)
		}

		await setDoc(doc(db, 'users', userId), updatedData, { merge: true })
		return updatedData
	} catch (error) {
		console.error('Error updating user profile:', error)
		throw error
	}
}

// Composable to use user profile
export function useUserProfile(userId) {
	const db = useFirestore()

	// Return null if no userId
	if (!userId) {
		return { userProfile: ref(null) }
	}

	// Create document reference
	const docRef = doc(db, 'users', userId)
	const userProfile = useDocument(docRef)

	return { userProfile }
}

// Check if a Minecraft username is already taken by another user
export async function isMinecraftUsernameTaken(minecraftUsername, excludeUserId = null) {
	if (!minecraftUsername) return false

	try {
		const db = getFirestore()
		const usersRef = collection(db, 'users')
		const q = query(usersRef, where('minecraft_username', '==', minecraftUsername))
		const querySnapshot = await getDocs(q)
		for (const docSnap of querySnapshot.docs) {
			if (!excludeUserId || docSnap.id !== excludeUserId) {
				return true
			}
		}
		return false
	} catch (error) {
		console.error('Error checking Minecraft username uniqueness:', error)
		return false
	}
}
