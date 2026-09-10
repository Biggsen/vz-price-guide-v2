const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { defineSecret } = require('firebase-functions/params')
const admin = require('firebase-admin')
const { FieldValue } = require('firebase-admin/firestore')
const { Resend } = require('resend')

const resendApiKey = defineSecret('RESEND_API_KEY')

const REGION = 'us-central1'
const SITE_URL = 'https://minecraft-economy-price-guide.net'
const FROM = 'vz price guide <support@minecraft-economy-price-guide.net>'
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

function layoutHtml({ heading, intro, rows, linkHref, linkLabel }) {
	const rowHtml = rows
		.map(
			([label, value]) =>
				`<p style="margin:0 0 12px 0;"><strong>${escapeHtml(
					label
				)}:</strong><br>${value}</p>`
		)
		.join('')

	return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937;">
	<p>${escapeHtml(heading)}</p>
	<p>${escapeHtml(intro)}</p>
	${rowHtml}
	<p><a href="${escapeHtml(linkHref)}">${escapeHtml(linkLabel)}</a></p>
</body>
</html>`
}

async function claimAndSend({ eventKey, logData, to, subject, html, text }) {
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
			return
		}
		throw error
	}

	try {
		const resend = new Resend(resendApiKey.value())
		const { error } = await resend.emails.send({
			from: FROM,
			to,
			subject,
			html,
			text
		})
		if (error) {
			throw new Error(error.message || 'Resend send failed')
		}
		await logRef.update({
			status: 'sent',
			sentAt: FieldValue.serverTimestamp()
		})
	} catch (error) {
		await logRef.delete()
		throw error
	}
}

async function sendAdminReplyToAuthor({ suggestionId, messageId, message, suggestion }) {
	if (message.userId === suggestion.userId) {
		console.log('Skipping admin reply email for own suggestion', suggestionId)
		return
	}

	const recipient = await getAuthUser(suggestion.userId)
	if (!recipient?.email) {
		console.log('Skipping admin reply email; no recipient email', suggestion.userId)
		return
	}

	const title = suggestion.title || 'Untitled suggestion'
	const adminName = message.userDisplayName || 'Staff'
	const body = message.body || ''
	const link = suggestionLink('/suggestions', suggestionId)
	const quotedTitle = `\u201c${title}\u201d`
	const quotedBody = `\u201c${body}\u201d`

	await claimAndSend({
		eventKey: `admin_message:${suggestionId}:${messageId}`,
		logData: {
			userId: suggestion.userId,
			suggestionId,
			messageId,
			type: 'admin_message'
		},
		to: recipient.email,
		subject: `New reply to your suggestion: "${title}"`,
		html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937;">
	<p>You\u2019ve got a reply</p>
	<p>${escapeHtml(adminName)} replied to your suggestion ${escapeHtml(quotedTitle)}:</p>
	<p>${escapeHtml(quotedBody).replace(/\n/g, '<br>')}</p>
	<p><a href="${escapeHtml(link)}">View conversation \u2192</a></p>
</body>
</html>`,
		text: [
			'You\u2019ve got a reply',
			'',
			`${adminName} replied to your suggestion ${quotedTitle}:`,
			'',
			quotedBody,
			'',
			`View conversation \u2192 ${link}`
		].join('\n')
	})
}

async function sendUserReplyToSupport({ suggestionId, messageId, message, suggestion }) {
	const title = suggestion.title || 'Untitled suggestion'
	const authorName = message.userDisplayName || suggestion.userDisplayName || 'A user'
	const body = message.body || ''
	const link = suggestionLink('/admin/suggestions', suggestionId)

	await claimAndSend({
		eventKey: `user_message:${suggestionId}:${messageId}`,
		logData: {
			userId: message.userId || suggestion.userId,
			suggestionId,
			messageId,
			type: 'user_message'
		},
		to: SUPPORT_EMAIL,
		subject: `Reply on suggestion: "${title}"`,
		html: layoutHtml({
			heading: 'New reply on a suggestion',
			intro: `${authorName} replied on an existing thread.`,
			rows: [
				['Author', escapeHtml(authorName)],
				['Title', escapeHtml(title)],
				['Reply', escapeHtml(body).replace(/\n/g, '<br>')]
			],
			linkHref: link,
			linkLabel: 'Open in admin suggestions'
		}),
		text: [
			`${authorName} replied on an existing thread.`,
			`Author: ${authorName}`,
			`Title: ${title}`,
			`Reply: ${body}`,
			'',
			`Open in admin suggestions: ${link}`
		].join('\n')
	})
}

exports.sendSuggestionMessageEmail = onDocumentCreated(
	{
		document: 'suggestions/{suggestionId}/suggestionMessages/{messageId}',
		region: REGION,
		database: '(default)',
		secrets: [resendApiKey]
	},
	async (event) => {
		const snap = event.data
		if (!snap) return

		const message = snap.data() || {}
		const { suggestionId, messageId } = event.params
		const author = await getAuthUser(message.userId)
		const suggestionSnap = await admin
			.firestore()
			.collection('suggestions')
			.doc(suggestionId)
			.get()

		if (!suggestionSnap.exists) {
			console.log('Suggestion missing for message email', suggestionId)
			return
		}

		const suggestion = suggestionSnap.data() || {}

		if (hasAdminClaim(author)) {
			await sendAdminReplyToAuthor({ suggestionId, messageId, message, suggestion })
			return
		}

		await sendUserReplyToSupport({ suggestionId, messageId, message, suggestion })
	}
)

exports.sendNewSuggestionEmail = onDocumentCreated(
	{
		document: 'suggestions/{suggestionId}',
		region: REGION,
		database: '(default)',
		secrets: [resendApiKey]
	},
	async (event) => {
		const snap = event.data
		if (!snap) return

		const suggestion = snap.data() || {}
		const { suggestionId } = event.params
		const author = await getAuthUser(suggestion.userId)

		if (hasAdminClaim(author)) {
			console.log('Skipping new-suggestion email for admin author', suggestion.userId)
			return
		}

		const title = suggestion.title || 'Untitled suggestion'
		const body = suggestion.body || ''
		const authorName = suggestion.userDisplayName || author?.displayName || 'A user'
		const status = suggestion.status || 'open'
		const link = suggestionLink('/admin/suggestions', suggestionId)

		await claimAndSend({
			eventKey: `new_suggestion:${suggestionId}`,
			logData: {
				userId: suggestion.userId || '',
				suggestionId,
				type: 'new_suggestion'
			},
			to: SUPPORT_EMAIL,
			subject: `New suggestion: "${title}"`,
			html: layoutHtml({
				heading: 'New suggestion submitted',
				intro: `${authorName} posted a new suggestion.`,
				rows: [
					['Author', escapeHtml(authorName)],
					['Title', escapeHtml(title)],
					['Status', escapeHtml(status)],
					['Details', escapeHtml(body).replace(/\n/g, '<br>')]
				],
				linkHref: link,
				linkLabel: 'Open in admin suggestions'
			}),
			text: [
				`${authorName} posted a new suggestion.`,
				`Author: ${authorName}`,
				`Title: ${title}`,
				`Status: ${status}`,
				`Details: ${body}`,
				'',
				`Open in admin suggestions: ${link}`
			].join('\n')
		})
	}
)
