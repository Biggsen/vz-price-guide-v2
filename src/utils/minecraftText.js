/**
 * Strip Minecraft-style formatting from a string.
 * Supports MiniMessage-like tags (`<red>`) and legacy `§` color codes.
 */
export function stripColorCodes(text) {
	if (!text) return ''

	// Remove <color> format (e.g., <red>, <blue>, <#ff0000>)
	let cleaned = text.replace(/<[^>]*>/g, '')

	// Remove § format color codes (e.g., §c, §4, §r)
	cleaned = cleaned.replace(/§[0-9a-fk-or]/gi, '')

	return cleaned.trim()
}

