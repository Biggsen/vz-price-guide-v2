const SAFE_LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi

export function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

const HEADING_CLASSES = {
	1: 'text-2xl font-bold text-gray-900 mt-2 mb-3',
	2: 'text-xl font-semibold text-gray-900 mt-2 mb-3',
	3: 'text-lg font-semibold text-gray-900 mt-2 mb-2'
}

export function markdownToPreviewHtml(markdown) {
	const escaped = escapeHtml(markdown || '')
	const withLinks = escaped.replace(
		SAFE_LINK,
		'<a href="$2" target="_blank" rel="noopener noreferrer" class="underline text-indigo-700">$1</a>'
	)
	const withBold = withLinks.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
	const withItalic = withBold.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
	const withHeadings = withItalic.replace(/^(#{1,3})\s+(.+)$/gm, (_, hashes, text) => {
		const level = hashes.length
		return `<h${level} class="${HEADING_CLASSES[level]}">${text}</h${level}>`
	})
	return withHeadings
		.split(/\n{2,}/)
		.map((block) => {
			if (/<h[1-3]\b/.test(block)) {
				return block.replace(/\n/g, '')
			}
			return `<p class="mb-4 last:mb-0">${block.replace(/\n/g, '<br>')}</p>`
		})
		.join('')
}

export function wrapSelection(text, start, end, before, after = before) {
	const selected = text.slice(start, end)
	return {
		value: `${text.slice(0, start)}${before}${selected}${after}${text.slice(end)}`,
		cursorStart: start + before.length,
		cursorEnd: end + before.length
	}
}

export function wrapLink(text, start, end, url) {
	const selected = text.slice(start, end) || 'link text'
	const formatted = `[${selected}](${url})`
	return {
		value: `${text.slice(0, start)}${formatted}${text.slice(end)}`,
		cursorStart: start,
		cursorEnd: start + formatted.length
	}
}
