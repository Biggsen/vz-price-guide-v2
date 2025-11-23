/**
 * Format a date string to a relative date (Today, Yesterday, X days ago)
 * @param {string|Date} dateString - Date to format
 * @returns {string} Formatted date string
 */
export function formatRelativeDate(dateString) {
	if (!dateString) return '—'

	const date = new Date(dateString)
	const now = new Date()
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
	const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

	const diffTime = today.getTime() - itemDate.getTime()
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

	if (diffDays === 0) {
		return 'Today'
	} else if (diffDays === 1) {
		return 'Yesterday'
	} else {
		return `${diffDays} days ago`
	}
}

