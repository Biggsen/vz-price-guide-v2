const { escapeHtml } = require('./emailShared')

function markdownToHtml(markdown) {
	const escaped = escapeHtml(markdown || '')
	const withLinks = escaped.replace(
		/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi,
		'<a href="$2">$1</a>'
	)
	const withBold = withLinks.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
	const withItalic = withBold.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
	return withItalic
		.split(/\n{2,}/)
		.map((block) => `<p style="margin:0 0 16px 0;">${block.replace(/\n/g, '<br>')}</p>`)
		.join('')
}

function markdownToText(markdown) {
	return String(markdown || '')
		.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi, '$1 ($2)')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1$2')
}

function wrapCampaignHtml({ bodyHtml, unsubscribeUrl }) {
	return `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937;max-width:640px;margin:0 auto;padding:16px;">
	${bodyHtml}
	<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
	<p style="font-size:12px;color:#6b7280;">
		You are receiving this because you opted in to occasional updates from verzion's economy price guide.
		<a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a>
	</p>
</body>
</html>`
}

function wrapCampaignText({ bodyText, unsubscribeUrl }) {
	return `${bodyText}

---
You are receiving this because you opted in to occasional updates from verzion's economy price guide.
Unsubscribe: ${unsubscribeUrl}`
}

module.exports = {
	markdownToHtml,
	markdownToText,
	wrapCampaignHtml,
	wrapCampaignText
}
