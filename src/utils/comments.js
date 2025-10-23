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
 * Add a new comment to a suggestion
 */
export async function addComment(suggestionId, commentData) {
	const commentsRef = collection(db, 'suggestions', suggestionId, 'comments')

	const comment = {
		...commentData,
		createdAt: serverTimestamp(),
		editedAt: null
	}

	return await addDoc(commentsRef, comment)
}

/**
 * Update an existing comment
 */
export async function updateComment(suggestionId, commentId, updates) {
	const commentRef = doc(db, 'suggestions', suggestionId, 'comments', commentId)

	const updateData = {
		...updates,
		editedAt: serverTimestamp()
	}

	return await updateDoc(commentRef, updateData)
}

/**
 * Delete a comment
 */
export async function deleteComment(suggestionId, commentId) {
	const commentRef = doc(db, 'suggestions', suggestionId, 'comments', commentId)
	return await deleteDoc(commentRef)
}

/**
 * Get comments query for a suggestion
 */
export function getCommentsQuery(suggestionId) {
	const commentsRef = collection(db, 'suggestions', suggestionId, 'comments')
	return query(commentsRef, orderBy('createdAt', 'asc'))
}

/**
 * Format comment timestamp for display
 */
export function formatCommentTime(timestamp) {
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



