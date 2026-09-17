const fs = require('fs')
const path = require('path')
const axios = require('axios')
const cheerio = require('cheerio')
const sharp = require('sharp')

const WIKI_BASE = 'https://minecraft.wiki'
const WIKI_USER_AGENT = 'vz-price-guide/1.0 (wiki image scrape)'
const REQUEST_DELAY_MS = 250
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'public', 'images', 'items')
const INVICON_SIZE = 64

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function toWikiTitle(value) {
	return String(value || '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase())
		.replace(/ /g, '_')
}

function getWikiCandidates(item) {
	const candidates = []
	if (item.url && typeof item.url === 'string' && !item.url.includes('fandom.com')) {
		candidates.push(item.url)
	}
	if (item.material_id) {
		candidates.push(`${WIKI_BASE}/w/${encodeURIComponent(toWikiTitle(item.material_id))}`)
	}
	if (item.name) {
		const fromName = `${WIKI_BASE}/w/${encodeURIComponent(toWikiTitle(item.name))}`
		if (!candidates.includes(fromName)) candidates.push(fromName)
	}
	if (item.material_id === 'light' || item.name === 'light') {
		const lightBlock = `${WIKI_BASE}/w/Light_(block)`
		if (!candidates.includes(lightBlock)) candidates.push(lightBlock)
	}
	return candidates
}

function resolveImageUrl(raw) {
	if (!raw) return null
	let url = raw.split('?')[0]
	if (url.startsWith('//')) url = `https:${url}`
	else if (url.startsWith('/')) url = `${WIKI_BASE}${url}`

	const extMatch = url.match(/\.(png|gif|webp|jpg|jpeg)(\?|$)/i)
	if (extMatch) {
		const ext = extMatch[0].replace(/\?$/, '')
		const idx = url.toLowerCase().indexOf(ext.toLowerCase())
		if (idx !== -1) url = url.slice(0, idx + ext.length)
	}
	return url
}

function pickBestSrc(img) {
	const srcset = img.attr('srcset')
	if (srcset) {
		const entries = srcset
			.split(',')
			.map((part) => part.trim().split(/\s+/))
			.filter((parts) => parts[0])
		entries.sort((a, b) => {
			const ax = parseFloat(String(a[1] || '1x').replace('x', '')) || 1
			const bx = parseFloat(String(b[1] || '1x').replace('x', '')) || 1
			return bx - ax
		})
		return entries[0][0]
	}
	return img.attr('src')
}

const LABEL_STOPWORDS = new Set([
	'a',
	'an',
	'and',
	'for',
	'in',
	'of',
	'on',
	'the',
	'with',
	'invicon',
	'infobox',
	'image',
	'inventory',
	'sprite'
])

function tokenize(...values) {
	const tokens = new Set()
	for (const value of values) {
		if (!value) continue
		const parts = String(value)
			.toLowerCase()
			.replace(/[_-]+/g, ' ')
			.split(/[^a-z0-9]+/)
		for (const part of parts) {
			if (!part || part.length < 2 || LABEL_STOPWORDS.has(part)) continue
			tokens.add(part)
		}
	}
	return tokens
}

function getItemTokens(item) {
	return tokenize(item?.material_id, item?.name)
}

function extractSpriteLabel(alt = '', url = '') {
	const altTitle = String(alt)
		.split(':')[0]
		.replace(/\.(png|gif|webp|jpg|jpeg)$/i, '')
		.replace(/^invicon\s+/i, '')
		.replace(/^infobox image(?: for minecraft (?:block|item))?/i, '')
		.trim()

	let urlTitle = ''
	const match = String(url).match(/\/(?:Invicon_)?([^/?#]+)$/i)
	if (match) {
		urlTitle = decodeURIComponent(match[1])
			.replace(/^Invicon_/i, '')
			.replace(/\.(png|gif|webp|jpg|jpeg)$/i, '')
			.replace(/_/g, ' ')
	}

	return `${altTitle} ${urlTitle}`.trim()
}

function scoreSpriteAgainstItem(itemTokens, alt, url, baseScore = 0) {
	const spriteTokens = tokenize(extractSpriteLabel(alt, url))
	const haystack = tokenize(alt, url.replace(/_/g, ' '), extractSpriteLabel(alt, url))

	if (!itemTokens.size) {
		return { complete: false, score: baseScore + 1 }
	}

	let complete = true
	for (const token of itemTokens) {
		if (!haystack.has(token)) {
			complete = false
			break
		}
	}

	let extraCount = 0
	for (const token of spriteTokens) {
		if (!itemTokens.has(token)) extraCount += 1
	}

	const tokenScore = complete ? itemTokens.size * 20 - extraCount * 8 : 0
	return { complete, score: baseScore + tokenScore }
}

function pickBestScoredUrl(candidates) {
	if (!candidates.length) return null
	const complete = candidates.filter((candidate) => candidate.complete)
	const pool = complete.length ? complete : candidates
	pool.sort((a, b) => b.score - a.score)
	return pool[0].url
}

function extractInfoboxImageUrl(pageHtml, item = {}) {
	const $ = cheerio.load(pageHtml)
	const itemTokens = getItemTokens(item)

	const candidates = []
	$('.infobox-imagearea img.mw-file-element').each((_, el) => {
		const img = $(el)
		const alt = (img.attr('alt') || '').trim()
		if (!alt.includes('Infobox image')) return
		if (/^Invicon\b/i.test(alt) || alt.includes('Inventory sprite')) return

		const raw = pickBestSrc(img)
		const url = resolveImageUrl(raw)
		if (!url) return

		let baseScore = 0
		if (alt.includes('Infobox image for Minecraft block')) baseScore += 1
		if (alt.includes('Infobox image for Minecraft item')) baseScore += 1

		candidates.push({ url, ...scoreSpriteAgainstItem(itemTokens, alt, url, baseScore) })
	})

	return pickBestScoredUrl(candidates)
}

function extractInviconImageUrl(pageHtml, item = {}) {
	const $ = cheerio.load(pageHtml)
	const itemTokens = getItemTokens(item)

	const candidates = []
	$('.infobox-imagearea img.mw-file-element, .invslot img').each((_, el) => {
		const img = $(el)
		const alt = (img.attr('alt') || '').trim()
		const isInviconAlt =
			/^Invicon\b/i.test(alt) || alt.includes('Inventory sprite') || alt.includes('Invicon ')
		if (!isInviconAlt) return

		const raw = img.attr('src') || pickBestSrc(img)
		const url = resolveImageUrl(raw)
		if (!url) return

		let baseScore = 0
		if (/^Invicon\b/i.test(alt)) baseScore += 5
		if (url.includes('/Invicon_')) baseScore += 3

		candidates.push({ url, ...scoreSpriteAgainstItem(itemTokens, alt, url, baseScore) })
	})

	return pickBestScoredUrl(candidates)
}

async function fetchWikiPageImageForItem(item, extractFn) {
	const candidates = getWikiCandidates(item)

	for (const wikiUrl of candidates) {
		try {
			const { data } = await axios.get(wikiUrl, {
				headers: { 'User-Agent': WIKI_USER_AGENT },
				timeout: 20000
			})
			const imageUrl = extractFn(data, item)
			if (imageUrl) return { imageUrl, wikiUrl }
		} catch (_) {
			// try next candidate URL
		}
		await sleep(REQUEST_DELAY_MS)
	}
	return { imageUrl: null, wikiUrl: candidates[0] || null }
}

async function fetchWikiImageForItem(item) {
	return fetchWikiPageImageForItem(item, extractInfoboxImageUrl)
}

async function fetchWikiInviconForItem(item) {
	return fetchWikiPageImageForItem(item, extractInviconImageUrl)
}

function inferExtensionFromUrl(imageUrl) {
	try {
		const pathname = new URL(imageUrl).pathname
		const match = pathname.match(/\.([a-zA-Z0-9]+)(?:$|\?)/)
		if (match) {
			const ext = match[1].toLowerCase()
			if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return `.${ext}`
		}
	} catch (_) {}
	return '.png'
}

function ensureOutputDir() {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

function sanitizeMaterialIdForFilename(materialId) {
	return String(materialId || '')
		.toLowerCase()
		.replace(/\s+/g, '_')
		.replace(/[^a-z0-9_\-\.]/g, '')
}

async function downloadImageToPublicItems(imageUrl, materialId) {
	if (!materialId) throw new Error('material_id is required to save image')
	const safeMaterialId = sanitizeMaterialIdForFilename(materialId)
	if (!safeMaterialId) throw new Error('material_id is invalid for filename')
	ensureOutputDir()

	const ext = inferExtensionFromUrl(imageUrl)
	const filename = `${safeMaterialId}${ext}`
	const outputPath = path.join(OUTPUT_DIR, filename)
	const publicPath = `/images/items/${filename}`

	const response = await axios.get(imageUrl, {
		responseType: 'arraybuffer',
		timeout: 20000,
		headers: { 'User-Agent': WIKI_USER_AGENT }
	})
	fs.writeFileSync(outputPath, response.data)

	return publicPath
}

async function downloadInviconToPublicItems(imageUrl, materialId) {
	if (!materialId) throw new Error('material_id is required to save image')
	const safeMaterialId = sanitizeMaterialIdForFilename(materialId)
	if (!safeMaterialId) throw new Error('material_id is invalid for filename')
	ensureOutputDir()

	const filename = `${safeMaterialId}.webp`
	const outputPath = path.join(OUTPUT_DIR, filename)
	const publicPath = `/images/items/${filename}`

	const response = await axios.get(imageUrl, {
		responseType: 'arraybuffer',
		timeout: 20000,
		headers: { 'User-Agent': WIKI_USER_AGENT }
	})

	const resizedBuffer = await sharp(Buffer.from(response.data))
		.resize(INVICON_SIZE, INVICON_SIZE, {
			kernel: sharp.kernel.nearest,
			fit: 'fill'
		})
		.webp()
		.toBuffer()

	fs.writeFileSync(outputPath, resizedBuffer)

	return publicPath
}

async function fetchAndSaveWikiImage(item) {
	const { imageUrl, wikiUrl } = await fetchWikiImageForItem(item)
	if (!imageUrl) {
		const err = new Error('No infobox image found on minecraft.wiki')
		err.code = 'NOT_FOUND'
		err.wikiUrl = wikiUrl
		throw err
	}

	const imagePath = await downloadImageToPublicItems(imageUrl, item.material_id)
	return { imagePath, wikiUrl, remoteUrl: imageUrl }
}

async function fetchAndSaveWikiInviconImage(item) {
	const { imageUrl, wikiUrl } = await fetchWikiInviconForItem(item)
	if (!imageUrl) {
		const err = new Error('No Invicon image found on minecraft.wiki')
		err.code = 'NOT_FOUND'
		err.wikiUrl = wikiUrl
		throw err
	}

	const imagePath = await downloadInviconToPublicItems(imageUrl, item.material_id)
	return { imagePath, wikiUrl, remoteUrl: imageUrl }
}

module.exports = {
	WIKI_BASE,
	fetchWikiImageForItem,
	fetchWikiInviconForItem,
	fetchAndSaveWikiImage,
	fetchAndSaveWikiInviconImage,
	downloadImageToPublicItems,
	downloadInviconToPublicItems,
	extractInfoboxImageUrl,
	extractInviconImageUrl,
	getWikiCandidates,
	sanitizeMaterialIdForFilename
}
