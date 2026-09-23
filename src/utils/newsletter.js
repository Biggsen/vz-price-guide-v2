import {
	addDoc,
	collection,
	doc,
	getCountFromServer,
	getDoc,
	query,
	serverTimestamp,
	updateDoc,
	where
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../firebase'

export function emptyCampaignStats() {
	return {
		delivered: 0,
		uniqueOpened: 0,
		uniqueClicked: 0,
		bounced: 0,
		complained: 0,
		unsubscribed: 0,
		clicksByUrl: {}
	}
}

export async function createNewsletterDraft({ subject, bodyMarkdown, createdBy }) {
	const ref = await addDoc(collection(db, 'newsletters'), {
		subject: subject || '',
		bodyMarkdown: bodyMarkdown || '',
		status: 'draft',
		createdBy,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp()
	})
	return ref.id
}

export async function updateNewsletterDraft(newsletterId, { subject, bodyMarkdown }) {
	await updateDoc(doc(db, 'newsletters', newsletterId), {
		subject,
		bodyMarkdown,
		updatedAt: serverTimestamp()
	})
}

export async function getNewsletter(newsletterId) {
	const snap = await getDoc(doc(db, 'newsletters', newsletterId))
	if (!snap.exists()) return null
	return { id: snap.id, ...snap.data() }
}

export async function countNewsletterRecipients() {
	const recipientQuery = query(
		collection(db, 'users'),
		where('marketing_opt_in.enabled', '==', true),
		where('email_verified', '==', true)
	)
	const snapshot = await getCountFromServer(recipientQuery)
	return snapshot.data().count
}

export function callableErrorMessage(error) {
	if (typeof error?.details === 'string' && error.details.trim()) {
		return error.details
	}
	const message = String(error?.message || '').replace(/^Firebase:\s*/i, '').trim()
	if (message && !/^INTERNAL$/i.test(message) && message !== 'internal') {
		return message
	}
	return 'Could not send the email. Deploy the newsletter Cloud Functions if you have not already.'
}

export async function sendNewsletterTest(newsletterId) {
	const sendTest = httpsCallable(functions, 'sendNewsletterTest')
	const result = await sendTest({ newsletterId })
	return result.data
}

export async function sendNewsletter(newsletterId) {
	const send = httpsCallable(functions, 'sendNewsletter', { timeout: 540000 })
	const result = await send({ newsletterId })
	return result.data
}

export function getUnsubscribeFunctionUrl() {
	const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID
	const useEmulators =
		(import.meta.env.VITE_FIREBASE_EMULATORS || '').toString().toLowerCase() === '1' ||
		(import.meta.env.VITE_FIREBASE_EMULATORS || '').toString().toLowerCase() === 'true'
	if (useEmulators && typeof window !== 'undefined') {
		return `http://${window.location.hostname}:5001/${projectId}/us-central1/unsubscribeMarketing`
	}
	return `https://us-central1-${projectId}.cloudfunctions.net/unsubscribeMarketing`
}

export async function requestUnsubscribe(token) {
	const url = `${getUnsubscribeFunctionUrl()}?token=${encodeURIComponent(token)}`
	const response = await fetch(url, { method: 'GET' })
	const payload = await response.json().catch(() => ({ status: 'invalid' }))
	if (!response.ok) {
		return { status: payload.status || 'invalid' }
	}
	return payload
}

export function formatCampaignDate(value) {
	if (!value) return ''
	const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value)
	if (Number.isNaN(date.getTime())) return ''
	return date.toLocaleString('en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
		hour12: false
	})
}

export function clicksByUrlRows(clicksByUrl) {
	if (!clicksByUrl || typeof clicksByUrl !== 'object') return []
	return Object.entries(clicksByUrl)
		.map(([url, count]) => ({ url, count: Number(count) || 0 }))
		.sort((a, b) => b.count - a.count)
}
