// scripts/downloadImages.js
// Bulk-download item images to the local public folder and optionally update Firestore paths
// Usage:
//   1) Configure the constants below (DRY_RUN, UPDATE_FIRESTORE, DOWNLOAD_IMAGES, OVERWRITE, CONCURRENCY, LIMIT)
//   2) Run: node scripts/downloadImages.js

const fs = require('fs')
const path = require('path')
const urlLib = require('url')
const axios = require('axios')
const admin = require('firebase-admin')

// Load service account (not committed to repo). Place your credentials at project root as service-account.json
const serviceAccount = require('../service-account.json')

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
})

const firestoreDb = admin.firestore()

// Static configuration (no CLI flags)
// Set DRY_RUN to false to perform writes
const DRY_RUN = false
const UPDATE_FIRESTORE = true
const DOWNLOAD_IMAGES = false
const OVERWRITE = false
const CONCURRENCY = 5
const LIMIT = Infinity

// Target output directory served statically by Vite/hosting
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images', 'items')

function ensureDirectoryExists(dirPath) {
	fs.mkdirSync(dirPath, { recursive: true })
}

function isHttpUrl(value) {
	if (typeof value !== 'string') return false
	return value.startsWith('http://') || value.startsWith('https://')
}

function sanitizeBaseName(name) {
	return name
		.toLowerCase()
		.replace(/\s+/g, '_')
		.replace(/[^a-z0-9_\-\.]/g, '')
}

function inferExtensionFromUrl(imageUrl) {
	try {
		const { pathname } = new urlLib.URL(imageUrl)
		const match = pathname.match(/\.([a-zA-Z0-9]+)(?:$|\?)/)
		if (match) {
			const ext = match[1].toLowerCase()
			if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return `.${ext}`
		}
	} catch (_) {}
	return '.png'
}

function buildLocalFilenameForItem(item, imageUrl) {
	const preferredBase = item.material_id || item.name || item.id
	const safeBase = sanitizeBaseName(String(preferredBase || 'item'))
	const ext = inferExtensionFromUrl(imageUrl)
	return `${safeBase}${ext}`
}

async function downloadImageToFile(imageUrl, targetFilePath) {
	const response = await axios.get(imageUrl, { responseType: 'arraybuffer', timeout: 20000 })
	fs.writeFileSync(targetFilePath, response.data)
}

async function updateItemImagePath(docRef, newPublicPath) {
	await docRef.update({ image: newPublicPath })
}

async function main() {
	console.log('[downloadImages] Starting...')
	ensureDirectoryExists(OUTPUT_DIR)

	const snapshot = await firestoreDb.collection('items').get()

	const tasks = []
	let processed = 0
	let downloaded = 0
	let skipped = 0
	let updated = 0
	let failed = 0
	let scheduled = 0

	for (const doc of snapshot.docs) {
		const item = doc.data()
		const imageUrl = item.image
		if (!isHttpUrl(imageUrl)) {
			skipped++
			continue
		}

		if (scheduled >= LIMIT) break

		const filename = buildLocalFilenameForItem(item, imageUrl)
		const outputPath = path.join(OUTPUT_DIR, filename)
		const publicPath = `/images/items/${filename}`

		const shouldDownload = DOWNLOAD_IMAGES && (OVERWRITE || !fs.existsSync(outputPath))
		const task = async () => {
			try {
				if (DOWNLOAD_IMAGES) {
					if (shouldDownload) {
						if (DRY_RUN) {
							console.log(`[DRY] Would download ${imageUrl} -> ${publicPath}`)
						} else {
							await downloadImageToFile(imageUrl, outputPath)
							downloaded++
							console.log(`Downloaded ${imageUrl} -> ${publicPath}`)
						}
					} else {
						skipped++
					}
				}

				if (UPDATE_FIRESTORE) {
					if (DRY_RUN) {
						console.log(`[DRY] Would update Firestore ${doc.id} image -> ${publicPath}`)
					} else {
						await updateItemImagePath(doc.ref, publicPath)
						updated++
					}
				}
			} catch (err) {
				failed++
				console.error(
					`Failed for ${doc.id} (${item.name || item.material_id || ''}):`,
					err.message
				)
			} finally {
				processed++
			}
		}

		tasks.push(task)
		scheduled++
	}

	// Run with simple concurrency control
	async function runWithConcurrency(taskFns, concurrency) {
		const queue = [...taskFns]
		const runners = new Array(Math.min(concurrency, queue.length)).fill(null).map(async () => {
			while (queue.length) {
				const fn = queue.shift()
				if (!fn) break
				await fn()
			}
		})
		await Promise.all(runners)
	}

	await runWithConcurrency(tasks, CONCURRENCY)

	console.log('\n[downloadImages] Complete:')
	console.log(`  Processed:   ${processed}`)
	console.log(`  Scheduled:   ${scheduled}`)
	console.log(`  Downloaded:  ${downloaded}`)
	console.log(`  Skipped:     ${skipped}`)
	console.log(`  Updated DB:  ${updated}`)
	console.log(`  Failed:      ${failed}`)
	console.log('\nOutput folder:', OUTPUT_DIR)
	console.log('Public URL base: /images/items/')
	if (DRY_RUN)
		console.log('\nNote: DRY_RUN is true; no files written and no DB updates performed.')
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
