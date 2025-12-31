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
		const docRef = doc(db, 'users', userId)

		// Get existing document to preserve created_at if it exists
		// (should exist from signup, but preserve it for old accounts)
		const docSnap = await getDoc(docRef)
		const existingCreatedAt = docSnap.exists() ? docSnap.data().created_at : null

		const userProfile = {
			minecraft_username: profileData.minecraft_username,
			minecraft_avatar_url: generateMinecraftAvatar(profileData.minecraft_username),
			display_name: profileData.display_name || profileData.minecraft_username,
			...profileData
		}

		// Preserve created_at if it exists (set during signup or from old accounts)
		// Only set it if document doesn't exist (shouldn't happen since signup creates it)
		if (existingCreatedAt) {
			userProfile.created_at = existingCreatedAt
		} else {
			userProfile.created_at = new Date().toISOString()
		}

		await setDoc(docRef, userProfile, { merge: true })
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

/**
 * Save marketing email opt-in preference and sync email/verification status
 * @param {string} userId
 * @param {boolean} enabled
 * @param {'signup' | 'settings'} method
 * @param {string} [email] - Optional email address to store
 * @param {boolean} [emailVerified] - Optional email verification status to store
 * @param {string} [accountCreatedAt] - Optional ISO string for account creation time (from Auth metadata)
 */
export async function saveMarketingOptIn(
	userId,
	enabled,
	method,
	email = null,
	emailVerified = null,
	accountCreatedAt = null
) {
	if (!userId) throw new Error('User ID is required')

	try {
		const db = getFirestore()
		const docRef = doc(db, 'users', userId)
		const docSnap = await getDoc(docRef)
		const isNewDocument = !docSnap.exists()

		const optInData = {
			marketing_opt_in: {
				enabled,
				timestamp: new Date().toISOString(),
				method
			}
		}

		// Include email if provided
		if (email !== null) {
			optInData.email = email
		}

		// Include email_verified if provided
		if (emailVerified !== null) {
			optInData.email_verified = emailVerified
		}

		// Set created_at only for new documents (when account is first created)
		// For old accounts without user records, use provided accountCreatedAt or current time
		if (isNewDocument) {
			optInData.created_at = accountCreatedAt || new Date().toISOString()
		}

		await setDoc(docRef, optInData, { merge: true })
		return optInData
	} catch (error) {
		console.error('Error saving marketing opt-in:', error)
		throw error
	}
}

/**
 * Update email verification status in user document
 * @param {string} userId
 * @param {boolean} emailVerified
 */
export async function updateEmailVerifiedStatus(userId, emailVerified) {
	if (!userId) throw new Error('User ID is required')

	try {
		const db = getFirestore()
		await setDoc(doc(db, 'users', userId), { email_verified: emailVerified }, { merge: true })
	} catch (error) {
		console.error('Error updating email verified status:', error)
		throw error
	}
}

/**
 * Check if user has opted in to marketing emails
 * @param {Object} userProfile - User profile document
 * @returns {boolean}
 */
export function hasMarketingOptIn(userProfile) {
	return userProfile?.marketing_opt_in?.enabled === true
}