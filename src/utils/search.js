export const SEARCH_INPUT_TIP =
	'Tip: Use commas for multiple terms, - to exclude terms'

function pushToken(tokens, exclude, value) {
	const normalized = value.trim().toLowerCase()
	if (normalized) {
		tokens.push({ exclude, value: normalized })
	}
}

function tokenizeSearchQuery(query) {
	const tokens = []
	let current = ''
	let i = 0

	const pushCurrent = () => {
		if (!current.trim()) {
			current = ''
			return
		}

		const term = current.trim()
		if (term.startsWith('-')) {
			pushToken(tokens, true, term.slice(1))
		} else {
			pushToken(tokens, false, term)
		}
		current = ''
	}

	while (i < query.length) {
		const char = query[i]

		if (char === '"') {
			const closeIndex = query.indexOf('"', i + 1)
			if (closeIndex === -1) {
				current += char
				i++
				continue
			}

			const phrase = query.slice(i + 1, closeIndex)
			const prefix = current.trim()

			if (prefix === '-') {
				pushToken(tokens, true, phrase)
			} else {
				if (prefix) {
					pushToken(tokens, false, prefix)
				}
				pushToken(tokens, false, phrase)
			}

			current = ''
			i = closeIndex + 1
			continue
		}

		if (char === ',') {
			pushCurrent()
			i++
			continue
		}

		current += char
		i++
	}

	pushCurrent()
	return tokens
}

export function processSearchTerms(query) {
	const include = []
	const exclude = []

	if (!query?.trim()) {
		return { include, exclude }
	}

	for (const token of tokenizeSearchQuery(query)) {
		if (token.exclude) {
			exclude.push(token.value)
		} else {
			include.push(token.value)
		}
	}

	return { include, exclude }
}

export function hasActiveSearchTerms(searchTerms) {
	return searchTerms.include.length > 0 || searchTerms.exclude.length > 0
}

export function countSearchTerms(searchTerms) {
	return searchTerms.include.length + searchTerms.exclude.length
}

export function textMatchesSearch(text, searchTerms) {
	const haystack = (text ?? '').toLowerCase()

	if (!hasActiveSearchTerms(searchTerms)) return true

	if (searchTerms.include.length > 0 && !searchTerms.include.some((term) => haystack.includes(term))) {
		return false
	}

	if (searchTerms.exclude.some((term) => haystack.includes(term))) {
		return false
	}

	return true
}

export function filterItemsBySearch(items, searchTerms) {
	if (!hasActiveSearchTerms(searchTerms)) return items

	return items.filter((item) => {
		if (!item.name) return false
		return textMatchesSearch(item.name, searchTerms)
	})
}
