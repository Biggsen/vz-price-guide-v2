const { defineSecret } = require('firebase-functions/params')
const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const { Resend } = require('resend')

const resendApiKey = defineSecret('RESEND_API_KEY')

const REGION = 'us-central1'
const SITE_URL = 'https://minecraft-economy-price-guide.net'
const FROM = 'vz price guide <support@minecraft-economy-price-guide.net>'
const NEWSLETTER_FROM = 'vz price guide <updates@minecraft-economy-price-guide.net>'
const SUPPORT_EMAIL = 'support@minecraft-economy-price-guide.net'

function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

function isAlreadyExists(error) {
	return error?.code === 6 || error?.code === 'already-exists'
}

async function getAuthUser(uid) {
	if (!uid) return null
	try {
		return await admin.auth().getUser(uid)
	} catch (error) {
		console.warn('Auth user not found', uid, error.message)
		return null
	}
}

function hasAdminClaim(user) {
	return user?.customClaims?.admin === true
}

function suggestionLink(path, suggestionId) {
	return `${SITE_URL}${path}?id=${encodeURIComponent(suggestionId)}`
}

function createResend() {
	const key = resendApiKey.value() || process.env.RESEND_API_KEY
	if (!key) {
		throw new Error('RESEND_API_KEY is not available on this function')
	}
	return new Resend(key)
}

async function claimAndSend({ eventKey, logData, to, subject, html, text, from = FROM, extraSend = {} }) {
	const db = admin.firestore()
	const logRef = db.collection('email_logs').doc(eventKey)

	try {
		await logRef.create({
			...logData,
			status: 'pending',
			sentAt: null
		})
	} catch (error) {
		if (isAlreadyExists(error)) {
			console.log('Skipping duplicate email', eventKey)
			return { skipped: true }
		}
		throw error
	}

	try {
		const resend = createResend()
		const { data, error } = await resend.emails.send({
			from,
			to,
			subject,
			html,
			text,
			...extraSend
		})
		if (error) {
			throw new Error(error.message || 'Resend send failed')
		}
		await logRef.update({
			status: 'sent',
			sentAt: FieldValue.serverTimestamp(),
			resendId: data?.id || null
		})
		return { skipped: false, resendId: data?.id || null }
	} catch (error) {
		await logRef.delete()
		throw error
	}
}

module.exports = {
	resendApiKey,
	REGION,
	SITE_URL,
	FROM,
	NEWSLETTER_FROM,
	SUPPORT_EMAIL,
	escapeHtml,
	isAlreadyExists,
	getAuthUser,
	hasAdminClaim,
	suggestionLink,
	createResend,
	claimAndSend
}
