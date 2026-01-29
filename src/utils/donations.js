import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

// Feature flag check
export function isDonationsEnabled() {
	return import.meta.env.VITE_DONATIONS_ENABLED === 'true'
}

// Session storage key for export intent
const EXPORT_INTENT_KEY = 'exportIntent'
const DOWNLOADED_SESSIONS_KEY = 'downloadedSessions'
const TTL_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Creates a Stripe Checkout session for donation
 * @param {Object} params
 * @param {number} params.amount - Amount in dollars (will be converted to cents)
 * @param {Object} params.exportConfig - Export configuration
 * @param {string} params.exportConfig.format - 'json' or 'yml'
 * @param {string} params.exportConfig.version - Minecraft version
 * @param {number} params.exportConfig.itemCount - Number of items
 * @returns {Promise<{sessionId: string, url: string}>}
 */
export async function createDonationCheckout({ amount, exportConfig }) {
	const createCheckout = httpsCallable(functions, 'createDonationCheckout')

	const baseUrl = window.location.origin
	const successUrl = `${baseUrl}/export-success?session_id={CHECKOUT_SESSION_ID}`
	const cancelUrl = `${baseUrl}/?donation_cancelled=true`

	const result = await createCheckout({
		amount: Math.round(amount * 100), // Convert dollars to cents
		currency: 'usd',
		exportConfig,
		successUrl,
		cancelUrl
	})

	return result.data
}

/**
 * Verifies a Stripe Checkout session was paid
 * @param {string} sessionId - Stripe session ID
 * @returns {Promise<{verified: boolean, amount?: number, currency?: string, metadata?: Object}>}
 */
export async function verifyDonationSession(sessionId) {
	const verify = httpsCallable(functions, 'verifyDonationSession')

	const result = await verify({ sessionId })
	return result.data
}

/**
 * Saves export intent to sessionStorage before redirecting to Stripe
 * @param {Object} config - Export configuration
 */
export function saveExportIntent(config) {
	const intent = {
		...config,
		timestamp: Date.now()
	}
	sessionStorage.setItem(EXPORT_INTENT_KEY, JSON.stringify(intent))
}

/**
 * Retrieves and validates export intent from sessionStorage
 * @returns {Object|null} Export config or null if invalid/expired
 */
export function getExportIntent() {
	try {
		const stored = sessionStorage.getItem(EXPORT_INTENT_KEY)
		if (!stored) return null

		const intent = JSON.parse(stored)

		// Check TTL (30 minutes)
		if (Date.now() - intent.timestamp > TTL_MS) {
			clearExportIntent()
			return null
		}

		return intent
	} catch {
		return null
	}
}

/**
 * Clears export intent from sessionStorage
 */
export function clearExportIntent() {
	sessionStorage.removeItem(EXPORT_INTENT_KEY)
}

/**
 * Checks if a session has already been downloaded (idempotency)
 * @param {string} sessionId
 * @returns {boolean}
 */
export function hasSessionBeenDownloaded(sessionId) {
	try {
		const downloaded = JSON.parse(localStorage.getItem(DOWNLOADED_SESSIONS_KEY) || '[]')
		return downloaded.includes(sessionId)
	} catch {
		return false
	}
}

/**
 * Marks a session as downloaded
 * @param {string} sessionId
 */
export function markSessionAsDownloaded(sessionId) {
	try {
		const downloaded = JSON.parse(localStorage.getItem(DOWNLOADED_SESSIONS_KEY) || '[]')
		downloaded.push(sessionId)
		// Keep only last 50 sessions
		localStorage.setItem(DOWNLOADED_SESSIONS_KEY, JSON.stringify(downloaded.slice(-50)))
	} catch {
		// Ignore localStorage errors
	}
}
