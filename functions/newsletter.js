const crypto = require('crypto')
const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const admin = require('firebase-admin')
const { FieldPath, FieldValue } = require('firebase-admin/firestore')
const {
	REGION,
	SITE_URL,
	NEWSLETTER_FROM,
	isAlreadyExists,
	hasAdminClaim,
	createResend,
	claimAndSend
} = require('./emailShared')
const {
	markdownToHtml,
	markdownToText,
	wrapCampaignHtml,
	wrapCampaignText
} = require('./newsletterMarkdown')

const resendApiKey = defineSecret('RESEND_API_KEY')
const resendWebhookSecret = defineSecret('RESEND_WEBHOOK_SECRET')
const unsubscribeSecret = defineSecret('NEWSLETTER_UNSUBSCRIBE_SECRET')

const BATCH_SIZE = 100

function emptyStats() {
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

function projectId() {
	if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT
	if (process.env.GCP_PROJECT) return process.env.GCP_PROJECT
	try {
		return JSON.parse(process.env.FIREBASE_CONFIG || '{}').projectId
	} catch {
		return null
	}
}

function httpFunctionUrl(name) {
	const id = projectId()
	if (process.env.FUNCTIONS_EMULATOR) {
		return `http://127.0.0.1:5001/${id}/${REGION}/${name}`
	}
	return `https://${REGION}-${id}.cloudfunctions.net/${name}`
}

function getUnsubscribeSigningSecret() {
	try {
		return unsubscribeSecret.value()
	} catch (error) {
		if (process.env.FUNCTIONS_EMULATOR) {
			return process.env.NEWSLETTER_UNSUBSCRIBE_SECRET || 'emulator-unsubscribe-secret'
		}
		throw error
	}
}

function isUnsubscribeClickUrl(url) {
	if (!url) return false
	const value = String(url)
	try {
		const parsed = new URL(value)
		if (parsed.pathname === '/unsubscribe' || parsed.pathname.startsWith('/unsubscribe/')) {
			return true
		}
		if (parsed.pathname.includes('unsubscribeMarketing')) {
			return true
		}
	} catch {
		return value.includes('/unsubscribe') || value.includes('unsubscribeMarketing')
	}
	return false
}

function rethrowSendError(error) {
	if (error instanceof HttpsError) throw error
	const message = error?.message || 'Email send failed'
	throw new HttpsError('failed-precondition', message)
}

function timingSafeEqualStr(a, b) {
	const bufA = Buffer.from(String(a))
	const bufB = Buffer.from(String(b))
	if (bufA.length !== bufB.length) return false
	return crypto.timingSafeEqual(bufA, bufB)
}

function signUnsubscribeToken({ uid, newsletterId }) {
	const body = Buffer.from(JSON.stringify({ uid, n: newsletterId })).toString('base64url')
	const sig = crypto
		.createHmac('sha256', getUnsubscribeSigningSecret())
		.update(body)
		.digest('base64url')
	return `${body}.${sig}`
}

function verifyUnsubscribeToken(token) {
	if (!token || typeof token !== 'string' || !token.includes('.')) {
		return null
	}
	const [body, sig] = token.split('.')
	if (!body || !sig) return null
	const expected = crypto
		.createHmac('sha256', getUnsubscribeSigningSecret())
		.update(body)
		.digest('base64url')
	if (!timingSafeEqualStr(sig, expected)) return null
	try {
		const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
		if (!payload?.uid || !payload?.n) return null
		return { uid: payload.uid, newsletterId: payload.n }
	} catch {
		return null
	}
}

function unsubscribePageUrl(token) {
	return `${SITE_URL}/unsubscribe?token=${encodeURIComponent(token)}`
}

function unsubscribeHttpUrl(token) {
	return `${httpFunctionUrl('unsubscribeMarketing')}?token=${encodeURIComponent(token)}`
}

function hashUrl(url) {
	return crypto.createHash('sha256').update(String(url)).digest('hex').slice(0, 32)
}

async function requireAdmin(request) {
	if (!request.auth) {
		throw new HttpsError('unauthenticated', 'You must be signed in')
	}
	const user = await admin.auth().getUser(request.auth.uid)
	if (!hasAdminClaim(user)) {
		throw new HttpsError('permission-denied', 'Only admins can send newsletters')
	}
	return user
}

async function claimUniqueEvent(eventId, data) {
	try {
		await admin
			.firestore()
			.collection('newsletter_events')
			.doc(eventId)
			.create({
				...data,
				createdAt: FieldValue.serverTimestamp()
			})
		return true
	} catch (error) {
		if (isAlreadyExists(error)) return false
		throw error
	}
}

function renderCampaignEmail({ bodyMarkdown, token }) {
	const pageUrl = unsubscribePageUrl(token)
	const bodyHtml = markdownToHtml(bodyMarkdown)
	const bodyText = markdownToText(bodyMarkdown)
	return {
		html: wrapCampaignHtml({ bodyHtml, unsubscribeUrl: pageUrl }),
		text: wrapCampaignText({ bodyText, unsubscribeUrl: pageUrl }),
		headers: {
			'List-Unsubscribe': `<${unsubscribeHttpUrl(token)}>`,
			'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
		}
	}
}

async function loadEligibleRecipients() {
	const snap = await admin
		.firestore()
		.collection('users')
		.where('marketing_opt_in.enabled', '==', true)
		.where('email_verified', '==', true)
		.get()

	return snap.docs
		.map((docSnap) => {
			const data = docSnap.data() || {}
			return {
				uid: docSnap.id,
				email: data.email || null
			}
		})
		.filter((row) => typeof row.email === 'string' && row.email.includes('@'))
}

async function applyUnsubscribe({ uid, newsletterId }) {
	const db = admin.firestore()
	const userRef = db.collection('users').doc(uid)
	const userSnap = await userRef.get()
	if (!userSnap.exists) {
		return 'invalid'
	}

	const alreadyOff = userSnap.data()?.marketing_opt_in?.enabled !== true

	await userRef.set(
		{
			marketing_opt_in: {
				enabled: false,
				timestamp: new Date().toISOString(),
				method: 'unsubscribe'
			}
		},
		{ merge: true }
	)

	if (!alreadyOff && newsletterId) {
		const claimed = await claimUniqueEvent(`${newsletterId}_${uid}_unsubscribed`, {
			newsletterId,
			uid,
			type: 'unsubscribed'
		})
		if (claimed) {
			await db
				.collection('newsletters')
				.doc(newsletterId)
				.update({
					'stats.unsubscribed': FieldValue.increment(1)
				})
				.catch((error) => {
					console.warn('Could not increment unsubscribe stats', newsletterId, error.message)
				})
		}
	}

	return alreadyOff ? 'already' : 'unsubscribed'
}

exports.countNewsletterRecipients = onCall({ region: REGION }, async (request) => {
	try {
		await requireAdmin(request)
		const recipients = await loadEligibleRecipients()
		return { count: recipients.length }
	} catch (error) {
		rethrowSendError(error)
	}
})

exports.sendNewsletterTest = onCall(
	{
		region: REGION,
		secrets: [resendApiKey, unsubscribeSecret]
	},
	async (request) => {
		try {
			const adminUser = await requireAdmin(request)
			const newsletterId = request.data?.newsletterId
			if (!newsletterId || typeof newsletterId !== 'string') {
				throw new HttpsError('invalid-argument', 'newsletterId is required')
			}
			if (!adminUser.email) {
				throw new HttpsError('failed-precondition', 'Your account has no email address')
			}

			const snap = await admin.firestore().collection('newsletters').doc(newsletterId).get()
			if (!snap.exists) {
				throw new HttpsError('not-found', 'Campaign not found')
			}
			const campaign = snap.data() || {}
			const subject = (campaign.subject || '').trim()
			const bodyMarkdown = campaign.bodyMarkdown || ''
			if (!subject) {
				throw new HttpsError('failed-precondition', 'Add a subject before sending a test')
			}

			const token = signUnsubscribeToken({ uid: adminUser.uid, newsletterId })
			const rendered = renderCampaignEmail({ bodyMarkdown, token })

			await claimAndSend({
				eventKey: `newsletter_test:${newsletterId}:${adminUser.uid}:${Date.now()}`,
				logData: {
					userId: adminUser.uid,
					newsletterId,
					type: 'newsletter_test'
				},
				to: adminUser.email,
				from: NEWSLETTER_FROM,
				subject: `[Test] ${subject}`,
				html: rendered.html,
				text: rendered.text,
				extraSend: {
					headers: rendered.headers
				}
			})

			return { success: true, to: adminUser.email }
		} catch (error) {
			rethrowSendError(error)
		}
	}
)

exports.sendNewsletter = onCall(
	{
		region: REGION,
		secrets: [resendApiKey, unsubscribeSecret],
		timeoutSeconds: 540,
		memory: '512MiB'
	},
	async (request) => {
		try {
			await requireAdmin(request)
		const newsletterId = request.data?.newsletterId
		if (!newsletterId || typeof newsletterId !== 'string') {
			throw new HttpsError('invalid-argument', 'newsletterId is required')
		}

		const db = admin.firestore()
		const campaignRef = db.collection('newsletters').doc(newsletterId)
		const snap = await campaignRef.get()
		if (!snap.exists) {
			throw new HttpsError('not-found', 'Campaign not found')
		}

		const campaign = snap.data() || {}
		if (!['draft', 'sending', 'failed'].includes(campaign.status)) {
			throw new HttpsError('failed-precondition', 'This campaign has already been sent')
		}

		const subject = (campaign.subject || '').trim()
		const bodyMarkdown = campaign.bodyMarkdown || ''
		if (!subject || !bodyMarkdown.trim()) {
			throw new HttpsError('failed-precondition', 'Subject and body are required')
		}

		const recipients = await loadEligibleRecipients()
		if (recipients.length === 0) {
			throw new HttpsError('failed-precondition', 'No eligible subscribers')
		}

		const sendingUpdate = {
			status: 'sending',
			recipientCount: recipients.length,
			sentCount: campaign.sentCount || 0,
			failedCount: campaign.failedCount || 0,
			updatedAt: FieldValue.serverTimestamp()
		}
		if (!campaign.stats) {
			sendingUpdate.stats = emptyStats()
		}
		await campaignRef.set(sendingUpdate, { merge: true })

		const pending = []
		for (const recipient of recipients) {
			const eventKey = `newsletter:${newsletterId}:${recipient.uid}`
			const logRef = db.collection('email_logs').doc(eventKey)
			try {
				await logRef.create({
					userId: recipient.uid,
					newsletterId,
					type: 'newsletter',
					email: recipient.email,
					status: 'pending',
					sentAt: null,
					resendId: null
				})
				pending.push(recipient)
			} catch (error) {
				if (isAlreadyExists(error)) {
					const existing = await logRef.get()
					if (existing.data()?.status !== 'sent') {
						pending.push(recipient)
					}
					continue
				}
				throw error
			}
		}

		const resend = createResend()
		let sentCount = 0
		let failedCount = 0

		for (let i = 0; i < pending.length; i += BATCH_SIZE) {
			const batch = pending.slice(i, i + BATCH_SIZE)
			const emails = batch.map((recipient) => {
				const token = signUnsubscribeToken({ uid: recipient.uid, newsletterId })
				const rendered = renderCampaignEmail({ bodyMarkdown, token })
				return {
					from: NEWSLETTER_FROM,
					to: [recipient.email],
					subject,
					html: rendered.html,
					text: rendered.text,
					headers: rendered.headers,
					tags: [
						{ name: 'newsletter_id', value: newsletterId },
						{ name: 'uid', value: recipient.uid }
					]
				}
			})

			try {
				const { data, error } = await resend.batch.send(emails)
				if (error) {
					throw new Error(error.message || 'Resend batch send failed')
				}
				const ids = Array.isArray(data) ? data : data?.data || []
				await Promise.all(
					batch.map(async (recipient, index) => {
						const resendId = ids[index]?.id || null
						await db
							.collection('email_logs')
							.doc(`newsletter:${newsletterId}:${recipient.uid}`)
							.update({
								status: 'sent',
								sentAt: FieldValue.serverTimestamp(),
								resendId
							})
					})
				)
				sentCount += batch.length
			} catch (error) {
				console.error('Newsletter batch failed', error)
				await Promise.all(
					batch.map((recipient) =>
						db
							.collection('email_logs')
							.doc(`newsletter:${newsletterId}:${recipient.uid}`)
							.delete()
					)
				)
				failedCount += batch.length
			}
		}

		const previousSent = campaign.sentCount || 0
		const finalSent = previousSent + sentCount
		const totalFailed = (campaign.failedCount || 0) + failedCount
		const status = failedCount === 0 ? 'sent' : 'failed'

		await campaignRef.set(
			{
				status,
				sentCount: finalSent,
				failedCount: totalFailed,
				sentAt: FieldValue.serverTimestamp(),
				updatedAt: FieldValue.serverTimestamp()
			},
			{ merge: true }
		)

		return {
			success: failedCount === 0,
			recipientCount: recipients.length,
			sentCount: finalSent,
			failedCount: totalFailed
		}
		} catch (error) {
			rethrowSendError(error)
		}
	}
)

function tokenFromRequest(req) {
	if (req.query?.token) return String(req.query.token)
	if (req.body && typeof req.body === 'object' && req.body.token) {
		return String(req.body.token)
	}
	return ''
}

exports.unsubscribeMarketing = onRequest(
	{
		region: REGION,
		cors: true,
		invoker: 'public',
		secrets: [unsubscribeSecret]
	},
	async (req, res) => {
		if (req.method !== 'GET' && req.method !== 'POST') {
			res.status(405).send('Method not allowed')
			return
		}

		const payload = verifyUnsubscribeToken(tokenFromRequest(req))
		if (!payload) {
			if (req.method === 'POST') {
				res.status(400).send('Invalid token')
				return
			}
			res.status(400).json({ status: 'invalid' })
			return
		}

		try {
			const status = await applyUnsubscribe(payload)
			if (req.method === 'POST') {
				res.status(200).send('OK')
				return
			}
			res.status(200).json({ status })
		} catch (error) {
			console.error('Unsubscribe failed', error)
			if (req.method === 'POST') {
				res.status(500).send('Error')
				return
			}
			res.status(500).json({ status: 'invalid' })
		}
	}
)

function parseTags(data) {
	const map = {}
	const tags = data?.tags
	if (Array.isArray(tags)) {
		for (const tag of tags) {
			if (tag?.name) map[tag.name] = tag.value
		}
	} else if (tags && typeof tags === 'object') {
		Object.assign(map, tags)
	}
	return {
		newsletterId: map.newsletter_id || map.newsletterId || null,
		uid: map.uid || null
	}
}

function verifyResendWebhook(rawBody, headers, secret) {
	const id = headers['svix-id']
	const timestamp = headers['svix-timestamp']
	const signatureHeader = headers['svix-signature']
	if (!id || !timestamp || !signatureHeader || !secret) {
		throw new Error('Missing webhook signature')
	}
	const secretBytes = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64')
	const toSign = `${id}.${timestamp}.${rawBody}`
	const expected = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64')
	const signatures = String(signatureHeader)
		.split(' ')
		.map((part) => {
			const pieces = part.split(',')
			return pieces.length > 1 ? pieces.slice(1).join(',') : pieces[0]
		})
		.filter(Boolean)
	if (!signatures.some((sig) => timingSafeEqualStr(sig, expected))) {
		throw new Error('Invalid webhook signature')
	}
}

async function applyTrackingEvent(eventType, data) {
	const { newsletterId, uid } = parseTags(data)
	if (!newsletterId || !uid) {
		return
	}

	const campaignRef = admin.firestore().collection('newsletters').doc(newsletterId)
	const clickUrl = data?.click?.link || data?.link || null

	if (eventType === 'email.delivered') {
		const claimed = await claimUniqueEvent(`${newsletterId}_${uid}_delivered`, {
			newsletterId,
			uid,
			type: 'delivered'
		})
		if (claimed) {
			await campaignRef.update({ 'stats.delivered': FieldValue.increment(1) })
		}
		return
	}

	if (eventType === 'email.opened') {
		const claimed = await claimUniqueEvent(`${newsletterId}_${uid}_opened`, {
			newsletterId,
			uid,
			type: 'opened'
		})
		if (claimed) {
			await campaignRef.update({ 'stats.uniqueOpened': FieldValue.increment(1) })
		}
		return
	}

	if (eventType === 'email.clicked') {
		if (isUnsubscribeClickUrl(clickUrl)) {
			return
		}
		const uniqueAny = await claimUniqueEvent(`${newsletterId}_${uid}_clicked`, {
			newsletterId,
			uid,
			type: 'clicked'
		})
		if (uniqueAny) {
			await campaignRef.update({ 'stats.uniqueClicked': FieldValue.increment(1) })
		}
		if (clickUrl) {
			const uniqueUrl = await claimUniqueEvent(
				`${newsletterId}_${uid}_clicked_${hashUrl(clickUrl)}`,
				{
					newsletterId,
					uid,
					type: 'clicked_url',
					url: clickUrl
				}
			)
			if (uniqueUrl) {
				await campaignRef.update(
					new FieldPath('stats', 'clicksByUrl', clickUrl),
					FieldValue.increment(1)
				)
			}
		}
		return
	}

	if (eventType === 'email.bounced') {
		const claimed = await claimUniqueEvent(`${newsletterId}_${uid}_bounced`, {
			newsletterId,
			uid,
			type: 'bounced'
		})
		if (claimed) {
			await campaignRef.update({ 'stats.bounced': FieldValue.increment(1) })
		}
		return
	}

	if (eventType === 'email.complained') {
		const claimed = await claimUniqueEvent(`${newsletterId}_${uid}_complained`, {
			newsletterId,
			uid,
			type: 'complained'
		})
		if (claimed) {
			await campaignRef.update({ 'stats.complained': FieldValue.increment(1) })
		}
	}
}

exports.resendWebhook = onRequest(
	{
		region: REGION,
		cors: true,
		invoker: 'public',
		secrets: [resendWebhookSecret]
	},
	async (req, res) => {
		if (req.method !== 'POST') {
			res.status(405).send('Method not allowed')
			return
		}

		const rawBody = req.rawBody
			? req.rawBody.toString('utf8')
			: typeof req.body === 'string'
				? req.body
				: JSON.stringify(req.body || {})

		try {
			let secret = null
			try {
				secret = resendWebhookSecret.value()
			} catch (error) {
				if (!process.env.FUNCTIONS_EMULATOR) throw error
			}
			if (secret) {
				verifyResendWebhook(rawBody, req.headers, secret)
			}
		} catch (error) {
			console.warn('Webhook signature rejected', error.message)
			res.status(401).send('Invalid signature')
			return
		}

		let payload
		try {
			payload = typeof req.body === 'object' && req.body ? req.body : JSON.parse(rawBody)
		} catch {
			res.status(400).send('Invalid JSON')
			return
		}

		const eventType = payload.type
		const data = payload.data || {}

		try {
			await applyTrackingEvent(eventType, data)
			res.status(200).send('OK')
		} catch (error) {
			console.error('Webhook handling failed', error)
			res.status(500).send('Error')
		}
	}
)
