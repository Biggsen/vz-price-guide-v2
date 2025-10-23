import {
	collection,
	addDoc,
	updateDoc,
	deleteDoc,
	doc,
	query,
	orderBy,
	serverTimestamp
} from 'firebase/firestore'
import { getFirestore } from 'firebase/firestore'

const db = getFirestore()

/**
 * Add a new message to a suggestion
 */
export async function addSuggestionMessage(suggestionId, messageData) {
	const messagesRef = collection(db, 'suggestions', suggestionId, 'suggestionMessages')

	const message = {
		...messageData,
		createdAt: serverTimestamp(),
		editedAt: null
	}

	const messageDoc = await addDoc(messagesRef, message)

	// Update the suggestion's lastActivityAt timestamp
	const { updateDoc, doc } = await import('firebase/firestore')
	const suggestionRef = doc(db, 'suggestions', suggestionId)
	await updateDoc(suggestionRef, {
		lastActivityAt: serverTimestamp()
	})

	return messageDoc
}

/**
 * Update an existing message
 */
export async function updateSuggestionMessage(suggestionId, messageId, updates) {
	const messageRef = doc(db, 'suggestions', suggestionId, 'suggestionMessages', messageId)

	const updateData = {
		...updates,
		editedAt: serverTimestamp()
	}

	await updateDoc(messageRef, updateData)

	// Update the suggestion's lastActivityAt timestamp
	const { updateDoc: updateSuggestion, doc: suggestionDoc } = await import('firebase/firestore')
	const suggestionRef = suggestionDoc(db, 'suggestions', suggestionId)
	await updateSuggestion(suggestionRef, {
		lastActivityAt: serverTimestamp()
	})
}

/**
 * Delete a message
 */
export async function deleteSuggestionMessage(suggestionId, messageId) {
	const messageRef = doc(db, 'suggestions', suggestionId, 'suggestionMessages', messageId)
	return await deleteDoc(messageRef)
}

/**
 * Get messages query for a suggestion
 */
export function getSuggestionMessagesQuery(suggestionId) {
	const messagesRef = collection(db, 'suggestions', suggestionId, 'suggestionMessages')
	return query(messagesRef, orderBy('createdAt', 'asc'))
}

/**
 * Format message timestamp for display
 */
export function formatSuggestionMessageTime(timestamp) {
	if (!timestamp) return ''

	const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
	const now = new Date()
	const diffMs = now - date
	const diffMins = Math.floor(diffMs / 60000)
	const diffHours = Math.floor(diffMins / 60)
	const diffDays = Math.floor(diffHours / 24)

	if (diffMins < 1) return 'Just now'
	if (diffMins < 60) return `${diffMins}m ago`
	if (diffHours < 24) return `${diffHours}h ago`
	if (diffDays < 7) return `${diffDays}d ago`

	return date.toLocaleDateString()
}
