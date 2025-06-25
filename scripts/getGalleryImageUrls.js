// scripts/getGalleryImageUrls.js
// Usage: node scripts/getGalleryImageUrls.js item:Allium
// Requires: npm install axios cheerio

const axios = require('axios')
const cheerio = require('cheerio')
const admin = require('firebase-admin')
const path = require('path')

// Initialize Firebase Admin
const serviceAccount = require(path.resolve(__dirname, '../service-account.json'))
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
})
const db = admin.firestore()

const DRY_RUN = false // Set to false to actually update Firestore

function parseArgs() {
	const itemArg = process.argv.find((a) => a.startsWith('item:'))
	const tabbedArg = process.argv.find((a) => a.startsWith('tabbed:'))
	const galleryArg = process.argv.find((a) => a.startsWith('gallery:'))
	const altsuffixArg = process.argv.find((a) => a.startsWith('altsuffix:'))
	if (!itemArg) {
		console.error(
			'Usage: node scripts/getGalleryImageUrls.js item:ItemName [tabbed:VariantAlt] [gallery:GalleryAlt or [a, b, c]] [altsuffix:AltSuffix]'
		)
		process.exit(1)
	}
	let gallery = galleryArg ? galleryArg.slice(8) : null
	// Parse gallery as array if in [a, b, c] form
	if (gallery && gallery.startsWith('[') && gallery.endsWith(']')) {
		gallery = gallery
			.slice(1, -1)
			.split(',')
			.map((s) => s.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, ''))
	}
	return {
		itemName: itemArg.slice(5),
		tabbed: tabbedArg ? tabbedArg.slice(7) : null,
		gallery,
		altsuffix: altsuffixArg ? altsuffixArg.slice(10) : null
	}
}

function getWikiUrl(item) {
	// Replace underscores with spaces and capitalize words
	const name = item.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
	return `https://minecraft.fandom.com/wiki/${encodeURIComponent(name.replace(/ /g, '_'))}`
}

async function fetchFinalUrl(url) {
	// Follow redirects to get the final URL
	try {
		const response = await axios.get(url, { maxRedirects: 5 })
		return { data: response.data, url: response.request.res.responseUrl || url }
	} catch (err) {
		console.error('Failed to fetch page:', err.message)
		process.exit(1)
	}
}

async function fetchGalleryImageUrl(pageHtml, itemName) {
	const $ = cheerio.load(pageHtml)
	let found = null
	// Find all gallerybox images
	$('li.gallerybox img').each((_, img) => {
		const alt = $(img).attr('alt')?.trim().toLowerCase()
		if (alt === itemName.toLowerCase()) {
			// Prioritize data-src, then src
			let url = $(img).attr('data-src') || $(img).attr('src')
			if (!url) return
			// Remove query params and trim after .png
			url = url.split('?')[0]
			const pngIndex = url.toLowerCase().indexOf('.png')
			if (pngIndex !== -1) {
				url = url.slice(0, pngIndex + 4)
			}
			found = url
			return false // break
		}
	})
	return found
}

async function fetchTabbedImageUrl(pageHtml, variantAlt) {
	const $ = cheerio.load(pageHtml)
	let found = null
	// Look for <aside> and then all .wds-tab__content divs
	$('aside .wds-tab__content').each((_, tab) => {
		const img = $(tab).find('img').first()
		const alt = img.attr('alt')?.trim().toLowerCase()
		if (alt === variantAlt.toLowerCase()) {
			// Prioritize data-src, then srcset, then src
			let url = img.attr('data-src') || img.attr('srcset') || img.attr('src')
			if (!url) return
			// If srcset, get first URL
			if (url.includes(',')) {
				url = url.split(',')[0].split(' ')[0]
			}
			url = url.split('?')[0]
			const pngIndex = url.toLowerCase().indexOf('.png')
			if (pngIndex !== -1) {
				url = url.slice(0, pngIndex + 4)
			}
			found = url
			return false // break
		}
	})
	return found
}

async function updateItemInFirestore(itemName, imageUrl, _wikiUrl) {
	// Query for the item by name (case-insensitive)
	const itemsRef = db.collection('items')
	const snapshot = await itemsRef.where('name', '==', itemName).get()
	if (snapshot.empty) {
		console.log(`No Firestore item found with name '${itemName}'`)
		return
	}
	for (const doc of snapshot.docs) {
		if (DRY_RUN) {
			console.log(
				`[DRY RUN] Would update Firestore item '${itemName}' with image: ${imageUrl}`
			)
		} else {
			await doc.ref.update({ image: imageUrl })
			console.log(`Updated Firestore item '${itemName}' with image.`)
		}
	}
}

async function main() {
	const { itemName, tabbed, gallery, altsuffix } = parseArgs()
	const wikiUrl = getWikiUrl(itemName)
	const { data: pageHtml, url: finalUrl } = await fetchFinalUrl(wikiUrl)

	if (Array.isArray(gallery) && gallery.length > 0) {
		for (const galleryItem of gallery) {
			const altText = altsuffix ? `${galleryItem} ${altsuffix}` : galleryItem
			const imageUrl = await fetchGalleryImageUrl(pageHtml, altText)
			if (imageUrl) {
				console.log(
					`Image URL for '${itemName}' (gallery: ${galleryItem}${
						altsuffix ? ' ' + altsuffix : ''
					}): ${imageUrl}`
				)
				console.log(`Wiki page: ${finalUrl}`)
				await updateItemInFirestore(
					`${galleryItem} ${altsuffix || ''}`.trim(),
					imageUrl,
					finalUrl
				)
			} else {
				console.log(
					`No image found for '${itemName}' (gallery: ${galleryItem}${
						altsuffix ? ' ' + altsuffix : ''
					}) on ${finalUrl}`
				)
			}
		}
	} else {
		let imageUrl
		if (tabbed) {
			imageUrl = await fetchTabbedImageUrl(pageHtml, tabbed)
		} else {
			const galleryAlt = gallery || itemName
			imageUrl = await fetchGalleryImageUrl(pageHtml, galleryAlt)
		}
		if (imageUrl) {
			console.log(
				`Image URL for '${itemName}'${tabbed ? ` (tabbed: ${tabbed})` : ''}${
					gallery ? ` (gallery: ${gallery})` : ''
				}: ${imageUrl}`
			)
			console.log(`Wiki page: ${finalUrl}`)
			await updateItemInFirestore(itemName, imageUrl, finalUrl)
		} else {
			console.log(
				`No image found for '${itemName}'${tabbed ? ` (tabbed: ${tabbed})` : ''}${
					gallery ? ` (gallery: ${gallery})` : ''
				} on ${finalUrl}`
			)
		}
	}
}

main()
