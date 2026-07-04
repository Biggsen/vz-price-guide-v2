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

function extractInfoboxImageUrl(pageHtml, itemLabel = '') {
	const $ = cheerio.load(pageHtml)
	const normalizedLabel = String(itemLabel || '')
		.toLowerCase()
		.replace(/_/g, ' ')

	const candidates = []
	$('.infobox-imagearea img.mw-file-element').each((_, el) => {
		const img = $(el)
		const alt = (img.attr('alt') || '').trim()
		if (!alt.includes('Infobox image')) return
		if (/^Invicon\b/i.test(alt) || alt.includes('Inventory sprite')) return

		const raw = pickBestSrc(img)
		const url = resolveImageUrl(raw)
		if (!url) return

		let score = 0
		if (normalizedLabel && alt.toLowerCase().includes(normalizedLabel)) score += 10
		if (alt.includes('Infobox image for Minecraft block')) score += 1
		if (alt.includes('Infobox image for Minecraft item')) score += 1

		candidates.push({ url, score })
	})

	if (!candidates.length) return null
	candidates.sort((a, b) => b.score - a.score)
	return candidates[0].url
}

function normalizeItemLabel(itemLabel = '') {
	return String(itemLabel || '')
		.toLowerCase()
		.replace(/_/g, ' ')
		.trim()
}

function extractInviconImageUrl(pageHtml, itemLabel = '') {
	const $ = cheerio.load(pageHtml)
	const normalizedLabel = normalizeItemLabel(itemLabel)
	const titleLabel = toWikiTitle(itemLabel).replace(/_/g, ' ').toLowerCase()

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

		let score = 0
		const altLower = alt.toLowerCase()
		if (normalizedLabel && altLower.includes(normalizedLabel)) score += 20
		if (titleLabel && altLower.includes(titleLabel)) score += 15
		if (/^Invicon\b/i.test(alt)) score += 5
		if (url.includes('/Invicon_')) score += 3

		candidates.push({ url, score, alt })
	})

	if (!candidates.length) return null
	candidates.sort((a, b) => b.score - a.score)
	return candidates[0].url
}

async function fetchWikiPageImageForItem(item, extractFn) {
	const label = item.material_id || item.name
	const candidates = getWikiCandidates(item)

	for (const wikiUrl of candidates) {
		try {
			const { data } = await axios.get(wikiUrl, {
				headers: { 'User-Agent': WIKI_USER_AGENT },
				timeout: 20000
			})
			const imageUrl = extractFn(data, label)
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

async function downloadImageToPublicItems(imageUrl, materialId) {
	if (!materialId) throw new Error('material_id is required to save image')
	ensureOutputDir()

	const ext = inferExtensionFromUrl(imageUrl)
	const filename = `${materialId}${ext}`
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
	ensureOutputDir()

	const filename = `${materialId}.webp`
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
	getWikiCandidates
}
