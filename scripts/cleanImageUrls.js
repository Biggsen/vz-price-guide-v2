// scripts/cleanImageUrls.js
// Node.js script to clean up image URLs in Firestore
// Requires: npm install firebase-admin

const admin = require('firebase-admin')

// TODO: Set the path to your Firebase service account key JSON file
const serviceAccount = require('../service-account.json')

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// DRY RUN mode: set to true to only log what would be updated, false to actually update Firestore
const DRY_RUN = false

function cleanImageUrl(url) {
	if (!url) return url
	const lower = url.toLowerCase()
	let idx = -1
	if (lower.includes('.png')) {
		idx = lower.indexOf('.png') + 4
	} else if (lower.includes('.gif')) {
		idx = lower.indexOf('.gif') + 4
	}
	if (idx !== -1 && url.length > idx) {
		return url.slice(0, idx)
	}
	return url
}

async function main() {
	const itemsSnapshot = await db.collection('items').get()
	let updated = 0,
		failed = 0
	for (const doc of itemsSnapshot.docs) {
		const item = doc.data()
		if (!item.image) continue
		const lower = item.image.toLowerCase()
		if (lower.endsWith('.png') || lower.endsWith('.gif')) continue
		const cleaned = cleanImageUrl(item.image)
		if (cleaned !== item.image) {
			if (DRY_RUN) {
				console.log(
					`[DRY RUN] Would update ${item.name} (${doc.id}) image: ${item.image} -> ${cleaned}`
				)
			} else {
				try {
					await db.collection('items').doc(doc.id).update({ image: cleaned })
					updated++
					console.log(
						`Updated ${item.name} (${doc.id}) image: ${item.image} -> ${cleaned}`
					)
				} catch (e) {
					failed++
					console.error(`Failed to update ${item.name} (${doc.id}):`, e.message)
				}
			}
		}
	}
	if (!DRY_RUN) {
		console.log(`\nUpdate complete. Updated: ${updated}, Failed: ${failed}`)
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
