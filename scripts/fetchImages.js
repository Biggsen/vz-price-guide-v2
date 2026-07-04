// scripts/fetchImages.js
// Fetches infobox image URLs from minecraft.wiki for Firestore items missing images.
// Usage: node scripts/fetchImages.js

const admin = require('firebase-admin')
const { fetchWikiImageForItem } = require('./lib/wikiImageScrape')

const serviceAccount = require('../service-account.json')

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// Set to true to only log what would be updated
const DRY_RUN = true

const REQUEST_DELAY_MS = 250

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
	const itemsSnapshot = await db.collection('items').get()
	let updated = 0
	let failed = 0
	let skipped = 0
	let notFound = 0

	for (const doc of itemsSnapshot.docs) {
		const item = doc.data()
		if (item.image && item.image.trim() !== '') {
			skipped++
			continue
		}

		await sleep(REQUEST_DELAY_MS)

		let imageUrl
		let wikiUrl
		try {
			const result = await fetchWikiImageForItem(item)
			imageUrl = result.imageUrl
			wikiUrl = result.wikiUrl
		} catch (e) {
			failed++
			console.error(`${item.name}: Request failed (${e.message})`)
			continue
		}

		if (imageUrl) {
			try {
				if (DRY_RUN) {
					console.log(
						`[DRY RUN] Would update ${item.name} (${doc.id}) with image: ${imageUrl} and url: ${wikiUrl}`
					)
					updated++
				} else {
					await db.collection('items').doc(doc.id).update({ image: imageUrl, url: wikiUrl })
					updated++
					console.log(
						`Updated ${item.name} (${doc.id}) with image: ${imageUrl} and url: ${wikiUrl}`
					)
				}
			} catch (e) {
				failed++
				console.error(`Failed to update ${item.name} (${doc.id}):`, e.message)
			}
		} else {
			notFound++
			console.log(`${item.name}: No image found (${wikiUrl || 'no wiki URL'})`)
		}
	}

	console.log(
		`\nComplete. Would update/updated: ${updated}, No image: ${notFound}, Skipped (has image): ${skipped}, Failed: ${failed}`
	)
	if (DRY_RUN) console.log('DRY_RUN is enabled — no Firestore writes were made.')
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
