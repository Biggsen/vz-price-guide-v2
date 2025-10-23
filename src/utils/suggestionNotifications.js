import { collection, query, where, getDocs } from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'

const db = getFirestore()

/**
 * Check if user has unseen suggestion updates
 */
export async function checkSuggestionUpdates(userId) {
	if (!userId) return false

	try {
		// Get user's suggestions
		const suggestionsRef = collection(db, 'suggestions')
		const q = query(suggestionsRef, where('userId', '==', userId))
		const snapshot = await getDocs(q)

		if (snapshot.empty) return false

		// Get the last time user checked suggestions
		const lastCheckedKey = `lastCheckedSuggestions_${userId}`
		const lastChecked = localStorage.getItem(lastCheckedKey)

		if (!lastChecked) {
			// First time checking - set current time and return false (no notification)
			localStorage.setItem(lastCheckedKey, Date.now().toString())
			return false
		}

		// Check if any suggestion has been updated since last check
		const lastCheckedTime = parseInt(lastChecked)
		const hasUpdates = snapshot.docs.some((doc) => {
			const suggestion = doc.data()
			const lastActivityAt = suggestion.lastActivityAt

			if (!lastActivityAt) return false

			// Convert Firestore timestamp to milliseconds
			const updateTime = lastActivityAt.toDate
				? lastActivityAt.toDate().getTime()
				: lastActivityAt
			return updateTime > lastCheckedTime
		})

		return hasUpdates
	} catch (error) {
		console.error('Error checking suggestion updates:', error)
		return false
	}
}

/**
 * Mark suggestions as seen (called when user visits suggestions page)
 */
export function markSuggestionsAsSeen(userId) {
	if (!userId) return

	const lastCheckedKey = `lastCheckedSuggestions_${userId}`
	localStorage.setItem(lastCheckedKey, Date.now().toString())
}

/**
 * Get the stored last checked time for a user
 */
export function getLastCheckedTime(userId) {
	if (!userId) return null

	const lastCheckedKey = `lastCheckedSuggestions_${userId}`
	const lastChecked = localStorage.getItem(lastCheckedKey)
	return lastChecked ? parseInt(lastChecked) : null
}
