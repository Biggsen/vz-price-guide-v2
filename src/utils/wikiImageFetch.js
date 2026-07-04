/**
 * Dev-only client for the Vite wiki image scrape API (see vite.config.js).
 * @param {{ material_id?: string, name?: string, url?: string }} item
 * @param {{ mode?: 'infobox' | 'invicon' }} [options]
 * @returns {Promise<{ imagePath: string, wikiUrl: string, remoteUrl: string, mode: string }>}
 */
export async function fetchWikiImageFromDevApi(item, options = {}) {
	const mode = options.mode === 'invicon' ? 'invicon' : 'infobox'
	const response = await fetch('/api/wiki-image', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			material_id: item.material_id,
			name: item.name,
			url: item.url,
			mode
		})
	})

	const data = await response.json().catch(() => ({}))
	if (!response.ok || !data.ok) {
		const err = new Error(data.error || `Wiki image fetch failed (${response.status})`)
		err.wikiUrl = data.wikiUrl
		throw err
	}

	return {
		imagePath: data.imagePath,
		wikiUrl: data.wikiUrl,
		remoteUrl: data.remoteUrl,
		mode: data.mode || mode
	}
}
