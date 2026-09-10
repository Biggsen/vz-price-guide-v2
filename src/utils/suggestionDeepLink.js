export function suggestionElementId(suggestionId) {
	return `suggestion-${suggestionId}`
}

export function querySuggestionId(route) {
	const id = route.query.id
	return typeof id === 'string' && id.length > 0 ? id : null
}

/**
 * Scroll to a suggestion card and briefly highlight it.
 * @param {import('vue').Ref<string | null>} highlightedId
 * @returns {boolean} whether the element was found
 */
export function highlightSuggestionCard(suggestionId, highlightedId) {
	const el = document.getElementById(suggestionElementId(suggestionId))
	if (!el) return false

	el.scrollIntoView({ behavior: 'smooth', block: 'center' })
	highlightedId.value = suggestionId
	window.setTimeout(() => {
		if (highlightedId.value === suggestionId) {
			highlightedId.value = null
		}
	}, 2500)
	return true
}

export function suggestionHighlightClass(suggestionId, highlightedId) {
	return highlightedId === suggestionId
		? 'ring-4 ring-gray-asparagus ring-offset-2 transition duration-500'
		: 'transition duration-500'
}
